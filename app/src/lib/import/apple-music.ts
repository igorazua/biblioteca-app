import { parseCsv } from './csv'
import type { ImportRow } from './types'
import type { Stars } from '../../types'

export function parseAppleMusic(csvText: string): ImportRow[] {
  const rows = parseCsv(csvText)
  const artistMap = new Map<string, { count: number; latestAt: number }>()

  for (const r of rows) {
    // Normalizar acceso a claves sin importar mayúsculas
    const artist = (
      r['Artist Name'] ||
      r['artist name'] ||
      r['artist_name'] ||
      r['Artist'] ||
      r['artist'] ||
      ''
    ).trim()

    if (!artist) continue

    // Duración de escucha mínima (si existe el dato) para filtrar saltos accidentales
    const msStr = r['Play Duration Milliseconds'] || r['play duration milliseconds'] || r['ms_played']
    if (msStr) {
      const ms = parseFloat(msStr)
      if (!isNaN(ms) && ms < 10000) continue
    }

    const dateStr =
      r['Play Date Timestamp'] ||
      r['play date timestamp'] ||
      r['Event Start Timestamp'] ||
      r['Timestamp'] ||
      r['Date'] ||
      r['date']

    let at = 0
    if (dateStr) {
      const t = new Date(dateStr).getTime()
      if (!isNaN(t)) at = t
    }

    const existing = artistMap.get(artist)
    if (!existing) {
      artistMap.set(artist, { count: 1, latestAt: at })
    } else {
      existing.count++
      if (at > existing.latestAt) existing.latestAt = at
    }
  }

  const sorted = Array.from(artistMap.entries()).sort((a, b) => b[1].count - a[1].count)

  return sorted.map(([artist, data], idx): ImportRow => {
    const stars: Stars | undefined = idx < 20 ? 5 : undefined
    return {
      type: 'artist',
      title: artist,
      status: 'seen',
      stars,
      at: data.latestAt > 0 ? data.latestAt : undefined,
    }
  })
}
