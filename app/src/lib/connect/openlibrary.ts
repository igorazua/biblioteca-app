// Open Library: registro de lectura público, directo desde el navegador (API abierta con CORS, sin clave).
import type { Connector, Connection } from './types'
import { ConnectorUserError } from './types'
import type { ImportRow } from '../import/types'

const PAGE = 100

interface OlEntry {
  work?: { title?: string; author_names?: string[]; first_publish_year?: number }
  logged_date?: string
}

/** Acepta «mekBot», «@mekBot» o la URL del perfil (openlibrary.org/people/mekBot). */
export function olUsername(raw: string): string {
  const s = raw.trim().replace(/^@/, '')
  const m = s.match(/openlibrary\.org\/people\/([^/?#\s]+)/i)
  return (m ? m[1] : s).replace(/\/+$/, '')
}

async function readShelf(user: string, shelf: 'already-read' | 'want-to-read', status: 'seen' | 'pending'): Promise<ImportRow[]> {
  const rows: ImportRow[] = []
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(`https://openlibrary.org/people/${encodeURIComponent(user)}/books/${shelf}.json?page=${page}&limit=${PAGE}`)
    if (res.status === 404 || res.status === 403) throw new ConnectorUserError('No encontramos ese usuario o su registro de lectura es privado.')
    if (!res.ok) throw new Error(`Open Library ${res.status}`)
    const data = (await res.json()) as { reading_log_entries?: OlEntry[] }
    const entries = data.reading_log_entries ?? []
    for (const e of entries) {
      const title = e.work?.title
      if (!title) continue
      const at = e.logged_date ? Date.parse(e.logged_date.slice(0, 10).replace(/\//g, '-')) : NaN
      rows.push({
        type: 'book',
        title,
        creator: e.work?.author_names?.[0],
        year: e.work?.first_publish_year,
        status,
        at: Number.isNaN(at) ? undefined : at,
      })
    }
    if (entries.length < PAGE) break
  }
  return rows
}

export const openLibrary: Connector = {
  id: 'openlibrary',
  method: 'username',
  shelves: ['book'],
  async fetchRows(conn: Connection) {
    const user = olUsername(conn.handle ?? '')
    if (!user) throw new ConnectorUserError('Escribe tu usuario de Open Library.')
    const [read, want] = await Promise.all([readShelf(user, 'already-read', 'seen'), readShelf(user, 'want-to-read', 'pending')])
    return [...read, ...want]
  },
}
