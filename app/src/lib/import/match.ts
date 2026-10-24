import type { Item } from '../../types'
import type { ImportRow } from './types'

export const normTitle = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

export interface LocalIndex {
  byWikidata: Map<string, Item>
  byTitle: Map<string, Item[]>
}

/**
 * Índices del catálogo local para casar imports sin red. Con dos obras del mismo Wikidata ID (gemelas del seed con
 * título en español y en inglés) gana la primera, que es la del título en español.
 */
export function buildLocalIndex(items: Item[]): LocalIndex {
  const byWikidata = new Map<string, Item>()
  const byTitle = new Map<string, Item[]>()
  for (const it of items) {
    if (it.wikidataId) {
      const k = `${it.type}|${it.wikidataId}`
      if (!byWikidata.has(k)) byWikidata.set(k, it)
    }
    // también por título original: Letterboxd e IMDb exportan «Back to the Future», no «Regreso al futuro»
    for (const t of new Set([it.title, it.originalTitle].filter(Boolean) as string[])) {
      const k = `${it.type}|${normTitle(t)}`
      const list = byTitle.get(k)
      if (list) list.push(it)
      else byTitle.set(k, [it])
    }
  }
  return { byWikidata, byTitle }
}

/** Casa una fila con el catálogo local: primero por Wikidata (vía IMDb ID), luego por título (o título original) y año. */
export function matchLocal(row: ImportRow, index: LocalIndex, qid?: string): Item | undefined {
  if (qid) {
    const hit = index.byWikidata.get(`${row.type}|${qid}`)
    if (hit) return hit
  }
  const tolerance = row.type === 'series' ? 1 : 0
  const found = new Map<string, Item>()
  for (const title of [row.title, row.originalTitle]) {
    if (!title) continue
    for (const it of index.byTitle.get(`${row.type}|${normTitle(title)}`) ?? []) {
      if (row.type === 'song' && row.creator && it.creator) {
        const normRowCreator = normTitle(row.creator)
        const normItCreator = normTitle(it.creator)
        if (!normItCreator.includes(normRowCreator) && !normRowCreator.includes(normItCreator)) {
          continue
        }
      }
      if (row.year && it.year && Math.abs(it.year - row.year) > tolerance) continue
      const key = it.wikidataId ?? it.id
      if (!found.has(key)) found.set(key, index.byWikidata.get(`${it.type}|${it.wikidataId}`) ?? it)
    }
  }
  // Varias obras distintas con el mismo título y sin año que desempate: mejor que lo decida el catálogo vivo
  return found.size === 1 ? [...found.values()][0] : undefined
}

/** IMDb tt… → Wikidata Q…, en lotes, con la consulta SPARQL pública de Wikidata (sin clave). */
export async function imdbToQids(imdbIds: string[], fetchImpl: typeof fetch = fetch): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const ids = [...new Set(imdbIds.filter((id) => /^tt\d+$/.test(id)))]
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200)
    const sparql = `SELECT ?item ?imdb WHERE { VALUES ?imdb { ${chunk.map((id) => `"${id}"`).join(' ')} } ?item wdt:P345 ?imdb . }`
    try {
      const res = await fetchImpl('https://query.wikidata.org/sparql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/sparql-results+json' },
        body: new URLSearchParams({ query: sparql }).toString(),
      })
      if (!res.ok) continue
      const data = await res.json()
      for (const b of data.results?.bindings ?? []) {
        const qid = b.item?.value?.split('/').pop()
        if (qid && b.imdb?.value && !map.has(b.imdb.value)) map.set(b.imdb.value, qid)
      }
    } catch {
      // sin Wikidata se casa por título y año
    }
  }
  return map
}
