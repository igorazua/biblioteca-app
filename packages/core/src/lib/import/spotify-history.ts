import { unzipSync } from 'fflate'
import type { ImportRow } from './types'
import type { Stars } from '../../types'
import { SHELF_ENABLED } from '../../config'
import { cleanDisplayTitle } from '../cleanTitle'

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
  // Mapa de canción -> { title, creator, count, latestAt }
  const songMap = new Map<string, { title: string; creator: string; count: number; latestAt: number }>()

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

        const existingArtist = artistMap.get(artist)
        if (!existingArtist) {
          artistMap.set(artist, { count: 1, latestAt: at })
        } else {
          existingArtist.count++
          if (at > existingArtist.latestAt) existingArtist.latestAt = at
        }

        // Agrupar canciones limpiando coletillas de remasters y versiones
        const rawTrack = (item.master_metadata_track_name || item.trackName || '').trim()
        if (SHELF_ENABLED.song && rawTrack) {
          const cleanTitle = cleanDisplayTitle(rawTrack)
          if (cleanTitle) {
            const songKey = `${cleanTitle.toLowerCase()}:::${artist.toLowerCase()}`
            const existingSong = songMap.get(songKey)
            if (!existingSong) {
              songMap.set(songKey, { title: cleanTitle, creator: artist, count: 1, latestAt: at })
            } else {
              existingSong.count++
              if (at > existingSong.latestAt) existingSong.latestAt = at
            }
          }
        }
      }
    } catch {}
  }

  // Ordenar artistas por reproducciones
  const sortedArtists = Array.from(artistMap.entries()).sort((a, b) => b[1].count - a[1].count)
  const artistRows: ImportRow[] = sortedArtists.map(([artist, data], idx): ImportRow => {
    const stars: Stars | undefined = idx < 20 ? 5 : undefined
    return {
      type: 'artist',
      title: artist,
      status: 'seen',
      stars,
      at: data.latestAt > 0 ? data.latestAt : undefined,
    }
  })

  if (!SHELF_ENABLED.song) {
    return artistRows
  }

  // Ordenar canciones por reproducciones y marcar top 20 con 5 estrellas
  const sortedSongs = Array.from(songMap.values()).sort((a, b) => b.count - a.count)
  const songRows: ImportRow[] = sortedSongs.map((s, idx): ImportRow => {
    const stars: Stars | undefined = idx < 20 ? 5 : undefined
    return {
      type: 'song',
      title: s.title,
      creator: s.creator,
      status: 'seen',
      stars,
      at: s.latestAt > 0 ? s.latestAt : undefined,
    }
  })

  return [...artistRows, ...songRows]
}
