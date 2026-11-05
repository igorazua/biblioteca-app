import type { ImportRow } from './types'
import type { Stars } from '../../types'
import { SHELF_ENABLED } from '../../config'
import { cleanDisplayTitle } from '../cleanTitle'

interface YtMusicEntry {
  header?: string
  title?: string
  titleUrl?: string
  subtitles?: Array<{ name?: string; url?: string }>
  time?: string
}

export function parseYouTubeMusic(jsonText: string): ImportRow[] {
  let list: YtMusicEntry[] = []
  try {
    const parsed = JSON.parse(jsonText)
    list = Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }

  const artistMap = new Map<string, { count: number; latestAt: number }>()
  const songMap = new Map<string, { title: string; creator: string; count: number; latestAt: number }>()

  for (const entry of list) {
    if (entry.header !== 'YouTube Music') continue

    // El artista va en subtitles[0].name, habitualmente con " - Topic" añadido por YouTube
    const rawArtist = entry.subtitles?.[0]?.name
    if (!rawArtist) continue

    const artist = rawArtist.replace(/\s*-\s*Topic$/i, '').trim()
    if (!artist) continue

    let at = 0
    if (entry.time) {
      const t = new Date(entry.time).getTime()
      if (!isNaN(t)) at = t
    }

    const existing = artistMap.get(artist)
    if (!existing) {
      artistMap.set(artist, { count: 1, latestAt: at })
    } else {
      existing.count++
      if (at > existing.latestAt) existing.latestAt = at
    }

    // El título de la canción habitualmente viene con "Watched " por YouTube
    const rawTitle = entry.title?.replace(/^Watched\s+/i, '').trim()
    if (SHELF_ENABLED.song && rawTitle) {
      const cleanTitle = cleanDisplayTitle(rawTitle)
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

  const sorted = Array.from(artistMap.entries()).sort((a, b) => b[1].count - a[1].count)
  const artistRows: ImportRow[] = sorted.map(([artist, data], idx): ImportRow => {
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
