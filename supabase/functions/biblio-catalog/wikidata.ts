// supabase/functions/biblio-catalog/wikidata.ts
// Convierte una entidad de Wikidata en los campos de un Item: creador real, géneros en español, año, duración,
// sinopsis de Wikipedia y popularidad por número de Wikipedias. Sin claves: APIs públicas de Wikimedia.

const USER_AGENT = 'Biblioteca/0.1 ( contact@biblioteca-social.vercel.app )'

type Entity = any

// Quién firma la obra según el tipo: dirección, autoría, creación, diseño…
const CREATOR_PROPS: Record<string, string[]> = {
  movie: ['P57'], // director
  series: ['P170', 'P162', 'P57'], // creador, productor, director
  book: ['P50'], // autor
  boardgame: ['P287', 'P50', 'P170'], // diseñador
  artist: [],
}

const UNIT_MINUTES: Record<string, number> = {
  Q7727: 1, // minuto
  Q25235: 60, // hora
  Q11574: 1 / 60, // segundo
}

/** Ids de las declaraciones vigentes de una propiedad (preferentes primero, sin las obsoletas). */
export function claimIds(entity: Entity, prop: string): string[] {
  const claims = (entity?.claims?.[prop] ?? []).filter((c: any) => c.rank !== 'deprecated')
  claims.sort((a: any, b: any) => (b.rank === 'preferred' ? 1 : 0) - (a.rank === 'preferred' ? 1 : 0))
  return claims.map((c: any) => c.mainsnak?.datavalue?.value?.id).filter((id: unknown): id is string => typeof id === 'string')
}

/** Año más antiguo entre fecha de publicación, inicio y creación (las películas tienen una fecha por país). */
export function earliestYear(entity: Entity): number | null {
  for (const prop of ['P577', 'P580', 'P571']) {
    const years = (entity?.claims?.[prop] ?? [])
      .map((c: any) => c.mainsnak?.datavalue?.value?.time as string | undefined)
      .map((t: string | undefined) => (t ? parseInt(t.slice(0, 5), 10) : NaN))
      .filter((y: number) => Number.isFinite(y) && y > 0)
    if (years.length) return Math.min(...years)
  }
  return null
}

export function durationMinutes(entity: Entity): number | undefined {
  const v = entity?.claims?.P2047?.[0]?.mainsnak?.datavalue?.value
  if (!v?.amount) return undefined
  const unit = String(v.unit || '').split('/').pop() || 'Q7727'
  const mins = Math.round(parseFloat(v.amount) * (UNIT_MINUTES[unit] ?? 1))
  return mins > 0 ? mins : undefined
}

/**
 * Quita el formato y deja el género: «película de ciencia ficción» → «Ciencia ficción», «cine épico» → «Épico»,
 * «drama televisivo» → «Drama»; «novela negra» se queda igual.
 */
export function cleanGenre(label: string): string {
  const s = label
    .trim()
    .replace(/^(película|películas|cine|filme|serie de televisión|serie|telenovela|videojuego|juego de mesa|género)\s+(de|del)\s+/i, '')
    .replace(/^(cine|televisión)\s+(?=\S+$)/i, '')
    .replace(/\s+(film|films|television series|TV series|televisivo|televisiva|cinematográfico|cinematográfica)$/i, '')
    .trim()
  return s ? s[0].toUpperCase() + s.slice(1) : ''
}

/** Etiquetas en español (o inglés si no hay) de varias entidades en una sola llamada. */
export async function labelsOf(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const unique = [...new Set(ids)].slice(0, 50)
  if (!unique.length) return map
  try {
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${unique.join('|')}&props=labels&languages=es|en&format=json`
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) return map
    const data = await res.json()
    for (const [id, e] of Object.entries<any>(data.entities ?? {})) {
      const label = e.labels?.es?.value || e.labels?.en?.value
      if (label) map.set(id, label)
    }
  } catch {
    // sin etiquetas: se usan los valores por defecto
  }
  return map
}

/** Primer párrafo del artículo de Wikipedia en español (o inglés), sin HTML. */
export async function wikipediaSummary(entity: Entity): Promise<string | null> {
  for (const lang of ['es', 'en']) {
    const title = entity?.sitelinks?.[`${lang}wiki`]?.title
    if (!title) continue
    try {
      const res = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`, {
        headers: { 'User-Agent': USER_AGENT },
      })
      if (!res.ok) continue
      const data = await res.json()
      if (typeof data.extract === 'string' && data.extract.length > 40) return data.extract
    } catch {
      // probar el siguiente idioma
    }
  }
  return null
}

/** Popularidad 0-100 aproximada por cuántas Wikipedias tienen artículo (100 idiomas ≈ 90). */
export const popularityFromLangs = (n: number) => Math.min(95, Math.round(30 + Math.log2(1 + n) * 9))

export interface WikidataFields {
  title: string
  year: number | null
  creator: string | null
  genres: string[]
  synopsis: string
  durationMin?: number
  seasons?: number
  pages?: number
  posterUrl: string | null
  imdbId: string | null
  wikiLangs: number
  popularity: number
}

/** Lee la entidad y completa lo que haga falta con una llamada de etiquetas y otra a Wikipedia. */
export async function wikidataFields(entity: Entity, type: string): Promise<WikidataFields> {
  const title =
    entity.labels?.es?.value || entity.labels?.en?.value || (Object.values(entity.labels || {})[0] as any)?.value || 'Sin título'

  let creatorIds: string[] = []
  for (const prop of CREATOR_PROPS[type] ?? []) {
    creatorIds = claimIds(entity, prop)
    if (creatorIds.length) break
  }
  creatorIds = creatorIds.slice(0, 2)
  const genreIds = claimIds(entity, 'P136').slice(0, 4)

  const [labels, summary] = await Promise.all([labelsOf([...creatorIds, ...genreIds]), wikipediaSummary(entity)])

  const creatorNames = creatorIds.map((id) => labels.get(id)).filter(Boolean) as string[]
  const genres = [...new Set(genreIds.map((id) => labels.get(id)).filter(Boolean).map((l) => cleanGenre(l!)).filter(Boolean))].slice(0, 3)

  const amount = (prop: string) => {
    const v = parseFloat(entity.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value?.amount ?? '')
    return Number.isFinite(v) && v > 0 ? Math.round(v) : undefined
  }

  // P3383 = póster de cine. P18 (imagen) solo en libros y juegos, donde suele ser la cubierta; en pelis suele ser un logo
  const poster =
    entity.claims?.P3383?.[0]?.mainsnak?.datavalue?.value ||
    (type === 'book' || type === 'boardgame' ? entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value : undefined)
  const wikiLangs = Object.keys(entity.sitelinks ?? {}).filter((k) => /^[a-z_]+wiki$/.test(k) && k !== 'commonswiki').length

  return {
    title,
    year: earliestYear(entity),
    creator: creatorNames.length ? creatorNames.join(' y ') : null,
    genres,
    synopsis: summary || entity.descriptions?.es?.value || entity.descriptions?.en?.value || '',
    durationMin: durationMinutes(entity),
    seasons: type === 'series' ? amount('P2437') : undefined,
    pages: type === 'book' ? amount('P1104') : undefined,
    posterUrl: poster ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(poster)}?width=400` : null,
    imdbId: entity.claims?.P345?.[0]?.mainsnak?.datavalue?.value ?? null,
    wikiLangs,
    popularity: popularityFromLangs(wikiLangs),
  }
}
