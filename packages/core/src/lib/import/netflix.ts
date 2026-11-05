import { parseCsv } from './csv'
import type { ImportRow } from './types'

// Patrones para identificar episodios de series en español e inglés
const SERIES_SPLIT_REGEX = /:\s*(?:Temporada|Season|Parte|Part|Miniserie|Miniseries|Capítulo|Capitulo|Chapter|Episodio|Episode|Volumen|Volume)\b/i

export function parseNetflix(csvText: string): ImportRow[] {
  const rows = parseCsv(csvText)
  const map = new Map<string, ImportRow>()

  for (const r of rows) {
    const rawTitle = r.Title || r.title
    if (!rawTitle) continue

    const dateStr = r.Date || r.date
    let at: number | undefined
    if (dateStr) {
      // Las fechas de Netflix pueden venir como DD/MM/YYYY, MM/DD/YYYY o YYYY-MM-DD
      const parts = dateStr.split('/')
      if (parts.length === 3) {
        // En español suele ser DD/MM/YY o DD/MM/YYYY
        const d = parseInt(parts[0], 10)
        const m = parseInt(parts[1], 10) - 1
        let y = parseInt(parts[2], 10)
        if (y < 100) y += 2000
        at = new Date(y, m, d).getTime()
      } else {
        const parsed = new Date(dateStr).getTime()
        if (!isNaN(parsed)) at = parsed
      }
    }

    const match = rawTitle.match(SERIES_SPLIT_REGEX)
    if (match && match.index !== undefined) {
      // Es una serie
      const seriesTitle = rawTitle.slice(0, match.index).trim()
      const key = `series::${seriesTitle.toLowerCase()}`
      const existing = map.get(key)
      if (!existing) {
        map.set(key, {
          type: 'series',
          title: seriesTitle,
          status: 'seen',
          stars: undefined,
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
          stars: undefined,
          at,
        })
      } else if (at && (!existing.at || at > existing.at)) {
        existing.at = at
      }
    }
  }

  return Array.from(map.values())
}
