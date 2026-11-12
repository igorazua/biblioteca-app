import { buildLocalIndex, imdbToQids, matchLocal, type ImportRow, type Item } from '@biblioteca/core'

// Emparejado de filas con el catálogo: la parte pura de useImportFlow.ts de la PWA, con sus dependencias entregadas
// (catálogo, llamada al servidor y caché viva) para poder probarla sin React ni Supabase.
export interface MatchedPair {
  row: ImportRow
  item: Item
}

export interface DoubtfulPair {
  row: ImportRow
  candidates: any[]
  chosenItem?: Item | null
}

export interface MatchResult {
  matched: MatchedPair[]
  doubts: DoubtfulPair[]
  none: ImportRow[]
}

export interface MatchDeps {
  /** El catálogo semilla (`items` de core). */
  seedItems: Item[]
  /** Llama a la función de servidor `biblio-catalog`; `null` sin Supabase (lo que no está en el catálogo local queda «sin encontrar»). */
  invoke: ((body: unknown) => Promise<{ data: any; error: any }>) | null
  /** Mete obras nuevas en la caché viva. */
  addItems: (items: Item[]) => void
  /** Obra por id (si la nube devuelve una gemela ya fusionada, la del seed que la sustituye). */
  getItem: (id: string) => Item | undefined
  /** IMDb ID → Wikidata (por defecto la de core). */
  imdbToQids?: (ids: string[]) => Promise<Map<string, string>>
  onProgress?: (p: { current: number; total: number } | null) => void
}

export const MATCH_CHUNK = 10

export async function matchRows(rows: ImportRow[], deps: MatchDeps): Promise<MatchResult> {
  const matched: MatchedPair[] = []
  const remaining: ImportRow[] = []

  // 1. Catálogo local: IMDb ID → Wikidata (no depende del idioma del título) y, si no, título y año
  const qids = await (deps.imdbToQids ?? ((ids: string[]) => imdbToQids(ids)))(rows.map((r) => r.imdbId ?? ''))
  const index = buildLocalIndex(deps.seedItems)
  for (const row of rows) {
    const localMatch = matchLocal(row, index, row.imdbId ? qids.get(row.imdbId) : undefined)
    if (localMatch) matched.push({ row, item: localMatch })
    else remaining.push(row)
  }

  // 2. Lo que queda va al catálogo vivo, en lotes pequeños (cada fila puede consultar varias fuentes)
  const doubts: DoubtfulPair[] = []
  const none: ImportRow[] = []
  if (remaining.length > 0 && deps.invoke) {
    for (let i = 0; i < remaining.length; i += MATCH_CHUNK) {
      deps.onProgress?.({ current: i, total: remaining.length })
      const chunk = remaining.slice(i, i + MATCH_CHUNK)
      try {
        const { data, error } = await deps.invoke({
          action: 'match',
          rows: chunk.map((r) => ({
            type: r.type,
            title: r.title,
            originalTitle: r.originalTitle,
            year: r.year,
            imdbId: r.imdbId,
            isbn13: r.isbn13,
          })),
        })
        if (!error && data?.matches) {
          for (let j = 0; j < chunk.length; j++) {
            const row = chunk[j]
            const m = data.matches[j]
            if (m?.status === 'sure' && m.item) {
              // si la nube devuelve una gemela ya fusionada, se usa la obra del seed que la sustituye
              deps.addItems([m.item])
              matched.push({ row, item: deps.getItem(m.item.id) ?? m.item })
            } else if (m?.status === 'doubt' && m.candidates?.length) {
              doubts.push({ row, candidates: m.candidates })
            } else {
              none.push(row)
            }
          }
        } else {
          none.push(...chunk)
        }
      } catch {
        none.push(...chunk)
      }
    }
  } else {
    none.push(...remaining)
  }

  return { matched, doubts, none }
}
