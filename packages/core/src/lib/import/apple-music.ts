import { parseCsv } from './csv'
import type { ImportRow } from './types'
import type { Stars } from '../../types'
import { SHELF_ENABLED } from '../../config'
import { cleanDisplayTitle } from '../cleanTitle'

export function parseAppleMusic(csvText: string): ImportRow[] {
  const rows = parseCsv(csvText)
  const artistMap = new Map<string, { count: number; latestAt: number }>()
  const songMap = new Map<string, { title: string; creator: string; count: number; latestAt: number }>()

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

    const existingArtist = artistMap.get(artist)
    if (!existingArtist) {
      artistMap.set(artist, { count: 1, latestAt: at })
    } else {
      existingArtist.count++
      if (at > existingArtist.latestAt) existingArtist.latestAt = at
    }

    // Nombre de la canción si viene en el CSV
    const rawTrack = (
      r['Song Name'] ||
      r['song name'] ||
      r['song_name'] ||
      r['Track Name'] ||
      r['track name'] ||
      r['Title'] ||
      r['title'] ||
      ''
    ).trim()

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
