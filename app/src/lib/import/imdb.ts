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

export function parseImdb(
  csvText: string,
  defaultStatus: 'seen' | 'pending' = 'seen'
): ImportRow[] {
  const rows = parseCsv(csvText)
  const results: ImportRow[] = []

  for (const r of rows) {
    const title = r.Title || r.title
    if (!title) continue

    const constId = r.Const || r.const || ''
    const imdbId = constId.startsWith('tt') ? constId : undefined
    const titleType = (r['Title Type'] || r['title type'] || r.TitleType || '').toLowerCase()

    // Clasificación de estantería según Title Type
    const type: ShelfType = titleType.includes('tv') || titleType.includes('series') ? 'series' : 'movie'
    const year = parseInt(r.Year || r.year || '', 10) || undefined
    const rawRating = r['Your Rating'] || r['your rating'] || r.Rating || r.rating
    const stars = parseImdbRating(rawRating)

    // Si tiene nota, siempre es 'seen'. Si no, depende de defaultStatus o si viene de watchlist
    const status: 'seen' | 'pending' = stars ? 'seen' : defaultStatus

    const dateStr = r['Date Rated'] || r['date rated'] || r.Created || r.created || r.Modified || r.modified
    const at = dateStr ? new Date(dateStr).getTime() : undefined

    results.push({
      type,
      title,
      year,
      imdbId,
      status,
      stars,
      at: isNaN(at as number) ? undefined : at,
    })
  }

  return results
}
