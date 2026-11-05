import { parseCsv } from './csv'
import type { ImportRow } from './types'
import type { ShelfType, Stars } from '../../types'

function parseImdbRating(r: string | undefined): Stars | undefined {
  if (!r) return undefined
  const val = parseFloat(r)
  if (isNaN(val) || val <= 0) return undefined
  // estrellas = ceil(nota / 2) -> 1 a 5
  const stars = Math.min(5, Math.max(1, Math.ceil(val / 2)))
  return stars as Stars
}

/**
 * Estantería según «Title Type» de IMDb («Movie», «TV Series», «TV Mini Series», «TV Movie», «TV Episode», «Video Game»…;
 * los exports antiguos usan «movie», «tvSeries», «tvMiniSeries»…). Devuelve null para lo que no se importa:
 * episodios sueltos (su serie ya cuenta), videojuegos y pódcasts.
 */
export function imdbShelf(titleType: string): ShelfType | null {
  const t = titleType.toLowerCase().replace(/[\s_-]/g, '')
  if (!t) return 'movie'
  if (t.includes('episode') || t.includes('videogame') || t.includes('podcast')) return null
  if (t === 'tvseries' || t === 'tvminiseries') return 'series'
  return 'movie' // Movie, TV Movie, TV Special, Short, Video…
}

export function parseImdb(
  csvText: string,
  defaultStatus: 'seen' | 'pending' = 'seen'
): ImportRow[] {
  const rows = parseCsv(csvText)
  const results: ImportRow[] = []
  // El export de la watchlist trae «Position» y no tiene notas: todo lo que no esté valorado es pendiente
  const isWatchlist = rows.length > 0 && ('Position' in rows[0] || 'position' in rows[0])
  const fallbackStatus = isWatchlist ? 'pending' : defaultStatus

  for (const r of rows) {
    const title = r.Title || r.title
    if (!title) continue

    const constId = r.Const || r.const || ''
    const imdbId = constId.startsWith('tt') ? constId : undefined
    const type = imdbShelf(r['Title Type'] || r['title type'] || r.TitleType || '')
    if (!type) continue

    const year = parseInt(r.Year || r.year || '', 10) || undefined
    const rawRating = r['Your Rating'] || r['your rating']
    const stars = parseImdbRating(rawRating)

    // Con nota siempre es 'seen'; sin nota depende de si es la watchlist
    const status: 'seen' | 'pending' = stars ? 'seen' : fallbackStatus

    const originalTitle = r['Original Title'] || r['original title']
    const creator = (r.Directors || r.directors || '').split(',')[0].trim() || undefined

    const dateStr = r['Date Rated'] || r['date rated'] || r.Created || r.created || r.Modified || r.modified
    const at = dateStr ? new Date(dateStr).getTime() : undefined

    results.push({
      type,
      title,
      ...(originalTitle && originalTitle !== title ? { originalTitle } : {}),
      year,
      creator,
      imdbId,
      status,
      stars,
      at: isNaN(at as number) ? undefined : at,
    })
  }

  return results
}
