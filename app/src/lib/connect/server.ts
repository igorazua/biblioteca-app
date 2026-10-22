// Conectores que necesitan servidor (RSS sin CORS): llaman a la función de Supabase `biblio-connect`.
// Si la función no responde (aún sin desplegar) se enseña «Disponible muy pronto», no un error.
import { supabase } from '../supabase'
import { ConnectorUnavailable, ConnectorUserError, type Connection, type Connector } from './types'
import type { ImportRow } from '../import/types'
import type { ShelfType } from '../../types'

async function callServer(service: string, user: string): Promise<ImportRow[]> {
  if (!supabase) throw new ConnectorUnavailable()
  let data: { rows?: ImportRow[]; error?: string } | null = null
  try {
    const res = await supabase.functions.invoke('biblio-connect', { body: { service, user } })
    if (res.error) {
      // 4xx con cuerpo propio (usuario inexistente…): la función lo explica; 404/5xx/red = no desplegada
      const ctx = (res.error as { context?: Response }).context
      const status = ctx?.status
      if (status && status >= 400 && status < 500 && status !== 404) {
        const body = await ctx!.json().catch(() => null)
        if (body?.error) throw new ConnectorUserError(body.error)
      }
      throw new ConnectorUnavailable()
    }
    data = res.data
  } catch (e) {
    if (e instanceof ConnectorUserError || e instanceof ConnectorUnavailable) throw e
    throw new ConnectorUnavailable()
  }
  if (!data || !Array.isArray(data.rows)) throw new ConnectorUnavailable()
  return data.rows
}

/** Quita lo que rodea al usuario si pega la URL del perfil. */
export function letterboxdUsername(raw: string): string {
  const s = raw.trim().replace(/^@/, '')
  const m = s.match(/letterboxd\.com\/([^/?#\s]+)/i)
  return m ? m[1] : s
}

/** Goodreads necesita el id numérico: sale de la URL del perfil (goodreads.com/user/show/12345-nombre). */
export function goodreadsId(raw: string): string | null {
  const s = raw.trim()
  const m = s.match(/goodreads\.com\/(?:user\/show|review\/list(?:_rss)?)\/(\d+)/i)
  if (m) return m[1]
  return /^\d{1,12}$/.test(s) ? s : null
}

function make(id: string, shelves: ShelfType[], normalize: (c: Connection) => string): Connector {
  return {
    id,
    method: 'username',
    shelves,
    fetchRows: (conn) => callServer(id, normalize(conn)),
  }
}

export const letterboxd = make('letterboxd', ['movie'], (c) => {
  const u = letterboxdUsername(c.handle ?? '')
  if (!u) throw new ConnectorUserError('Escribe tu usuario de Letterboxd.')
  return u
})

export const goodreads = make('goodreads', ['book'], (c) => {
  const id = goodreadsId(c.handle ?? '')
  if (!id) throw new ConnectorUserError('Pega la dirección de tu perfil de Goodreads (con el número, como goodreads.com/user/show/12345-nombre).')
  return id
})
