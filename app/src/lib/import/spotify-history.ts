import { unzipSync } from 'fflate'
import type { ImportRow } from './types'
import type { Stars } from '../../types'

interface SpotifyStream {
  artistName?: string
  master_metadata_album_artist_name?: string
  trackName?: string
  master_metadata_track_name?: string
  msPlayed?: number
  ms_played?: number
  endTime?: string
  ts?: string
}

export function parseSpotifyHistory(input: string | Uint8Array): ImportRow[] {
  const jsonStrings: string[] = []

  if (input instanceof Uint8Array) {
    const unzipped = unzipSync(input)
    const decoder = new TextDecoder()
    for (const [path, data] of Object.entries(unzipped)) {
      const lower = path.toLowerCase()
      if (
        lower.endsWith('.json') &&
        (lower.includes('streaminghistory_music') ||
          lower.includes('streaming_history_audio') ||
          lower.includes('streaminghistory') ||
          lower.includes('endsong'))
      ) {
        jsonStrings.push(decoder.decode(data))
      }
    }
  } else {
    jsonStrings.push(input)
  }

  // Mapa de artista -> { count, latestAt }
  const artistMap = new Map<string, { count: number; latestAt: number }>()

  for (const jsonStr of jsonStrings) {
    try {
      const parsed = JSON.parse(jsonStr)
      const list: SpotifyStream[] = Array.isArray(parsed) ? parsed : []

      for (const item of list) {
        const artist = (item.master_metadata_album_artist_name || item.artistName || '').trim()
        if (!artist || artist === 'Unknown Artist') continue

        // Tiempo reproducido: ignorar saltos < 10 segundos si existe el dato
        const ms = item.ms_played ?? item.msPlayed ?? 30000
        if (ms < 10000) continue

        let at = 0
        const dateStr = item.ts || item.endTime
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
    } catch {}
  }

  // Ordenar por número de reproducciones descendente
  const sorted = Array.from(artistMap.entries()).sort((a, b) => b[1].count - a[1].count)

  return sorted.map(([artist, data], idx): ImportRow => {
    // Los primeros 20 artistas se marcan con 5 estrellas (favoritos según T18)
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
