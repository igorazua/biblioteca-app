// AniList: GraphQL público, directo desde el navegador y sin clave. Una lista de anime pública es suficiente.
import type { Connector, Connection } from './types'
import { ConnectorUserError } from './types'
import type { ImportRow } from '../import/types'
import type { Stars } from '../../types'

const QUERY = `query ($u: String) {
  MediaListCollection(userName: $u, type: ANIME) {
    lists { entries {
      status
      score(format: POINT_5)
      completedAt { year month day }
      media { format seasonYear startDate { year } title { romaji english } }
    } }
  }
}`

interface AlEntry {
  status: string
  score: number
  completedAt?: { year?: number | null; month?: number | null; day?: number | null }
  media: { format?: string; seasonYear?: number | null; startDate?: { year?: number | null }; title: { romaji?: string; english?: string } }
}

export function anilistUsername(raw: string): string {
  const s = raw.trim().replace(/^@/, '')
  const m = s.match(/anilist\.co\/user\/([^/?#\s]+)/i)
  return m ? m[1] : s
}

export const anilist: Connector = {
  id: 'anilist',
  method: 'username',
  shelves: ['series', 'movie'],
  async fetchRows(conn: Connection) {
    const user = anilistUsername(conn.handle ?? '')
    if (!user) throw new ConnectorUserError('Escribe tu usuario de AniList.')
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { u: user } }),
    })
    const data = await res.json().catch(() => null)
    if (data?.errors?.length) {
      const msg: string = data.errors[0].message ?? ''
      if (/private/i.test(msg)) throw new ConnectorUserError('Esa lista es privada. Hazla pública en los ajustes de AniList.')
      if (/not found/i.test(msg)) throw new ConnectorUserError('No encontramos ese usuario en AniList.')
      throw new Error(msg || 'AniList')
    }
    if (!res.ok || !data) throw new Error(`AniList ${res.status}`)
    const seen = new Set<string>()
    const rows: ImportRow[] = []
    for (const list of data.data?.MediaListCollection?.lists ?? []) {
      for (const e of list.entries as AlEntry[]) {
        const t = e.media.title
        const title = t.english || t.romaji
        if (!title || seen.has(title)) continue
        seen.add(title)
        const status: ImportRow['status'] | null =
          e.status === 'COMPLETED' || e.status === 'REPEATING' ? 'seen' : e.status === 'PLANNING' ? 'pending' : null
        if (!status) continue // viendo, pausado o abandonado: no lo tratamos como visto ni pendiente
        const c = e.completedAt
        const at = c?.year ? Date.UTC(c.year, (c.month ?? 1) - 1, c.day ?? 1) : undefined
        rows.push({
          type: e.media.format === 'MOVIE' ? 'movie' : 'series',
          title,
          originalTitle: t.romaji && t.romaji !== title ? t.romaji : undefined,
          year: e.media.seasonYear ?? e.media.startDate?.year ?? undefined,
          status,
          stars: e.score >= 1 && e.score <= 5 ? (Math.round(e.score) as Stars) : undefined,
          at,
        })
      }
    }
    return rows
  },
}
