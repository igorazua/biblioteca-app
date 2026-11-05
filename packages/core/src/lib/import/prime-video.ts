import { parseCsv } from './csv'
import type { ImportRow } from './types'

const PRIME_SERIES_REGEX = /[-:]\s*(?:Temporada|Season|Temp\.|T\d+|S\d+|Episodio|Episode|Capítulo|Capitulo|Part|Parte)\b/i

export function parsePrimeVideo(csvText: string): ImportRow[] {
  const rows = parseCsv(csvText)
  const map = new Map<string, ImportRow>()

  for (const r of rows) {
    const rawTitle = (r.Title || r.title || r['Title Name'] || r['title name'] || '').trim()
    if (!rawTitle) continue

    const dateStr = r.Date || r.date || r['Playback Date'] || r['playback date'] || r['Playback Time']
    let at: number | undefined
    if (dateStr) {
      const parsed = new Date(dateStr).getTime()
      if (!isNaN(parsed)) at = parsed
    }

    const match = rawTitle.match(PRIME_SERIES_REGEX)
    if (match && match.index !== undefined && match.index > 0) {
      // Es una serie
      const seriesTitle = rawTitle.slice(0, match.index).trim()
      const key = `series::${seriesTitle.toLowerCase()}`
      const existing = map.get(key)
      if (!existing) {
        map.set(key, {
          type: 'series',
          title: seriesTitle,
          status: 'seen',
          at,
        })
      } else if (at && (!existing.at || at > existing.at)) {
        existing.at = at
      }
    } else {
      // Es una película
      const movieTitle = rawTitle.trim()
      const key = `movie::${movieTitle.toLowerCase()}`
      const existing = map.get(key)
      if (!existing) {
        map.set(key, {
          type: 'movie',
          title: movieTitle,
          status: 'seen',
          at,
        })
      } else if (at && (!existing.at || at > existing.at)) {
        existing.at = at
      }
    }
  }

  return Array.from(map.values())
}
