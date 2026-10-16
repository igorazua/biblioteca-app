// Links compartibles sin backend: los datos viajan dentro de la URL (JSON compacto + lz-string).
import LZString from 'lz-string'
import type { ShelfType } from '../types'

export interface SharedList {
  t: string // título
  d?: string // descripción
  a: string // autor
  c: string // color del avatar del autor
  i: [string, string?][] // [itemId, nota?]
}

export interface SharedProfile {
  k: 'p'
  n: string
  c: string
  top: Partial<Record<ShelfType, string[]>> // top 3 por estantería
}

const encode = (obj: unknown) => LZString.compressToEncodedURIComponent(JSON.stringify(obj))

function decode<T>(payload: string): T | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(payload)
    return json ? (JSON.parse(json) as T) : null
  } catch {
    return null
  }
}

export const encodeList = (l: SharedList) => encode(l)
export const encodeProfile = (p: SharedProfile) => encode(p)

export interface DecodedList { list: SharedList; items: [string, string?][]; missing: number }

/** Devuelve null si el link está corrupto. Los itemIds desconocidos se descartan (y se cuentan en `missing`). */
export function decodeList(payload: string, isKnown: (id: string) => boolean): DecodedList | null {
  const l = decode<SharedList>(payload)
  if (!l || typeof l.t !== 'string' || !Array.isArray(l.i)) return null
  const valid = l.i.filter((e) => Array.isArray(e) && typeof e[0] === 'string')
  const items = valid.filter(([id]) => isKnown(id))
  return { list: { ...l, a: l.a || 'Alguien', c: l.c || '#F5B544' }, items, missing: valid.length - items.length }
}

export function decodeProfile(payload: string, isKnown: (id: string) => boolean): SharedProfile | null {
  const p = decode<SharedProfile>(payload)
  if (!p || p.k !== 'p' || typeof p.n !== 'string' || typeof p.top !== 'object' || !p.top) return null
  const top: SharedProfile['top'] = {}
  for (const [shelf, ids] of Object.entries(p.top))
    if (Array.isArray(ids)) top[shelf as ShelfType] = ids.filter((id) => typeof id === 'string' && isKnown(id))
  return { ...p, c: p.c || '#F5B544', top }
}

export const listUrl = (origin: string, l: SharedList) => `${origin}/l/${encodeList(l)}`
export const profileUrl = (origin: string, p: SharedProfile) => `${origin}/p/${encodeProfile(p)}`
