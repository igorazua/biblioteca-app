import type { ImportRow } from './types'
import type { Stars } from '../../types'

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
