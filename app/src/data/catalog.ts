import seed from './seed.json'
import type { Friend, FriendEntry, Item, ShelfType } from '../types'
import { friendRanks } from '../lib/rank'

import { useCatalog, setSeedChecker } from '../store/useCatalog'
import { canonicalId } from './aliases'

export const items = seed.items as Item[]
export const friends = seed.friends as Friend[]

export const itemsById = new Map<string, Item>(items.map((i) => [i.id, i]))
setSeedChecker((id) => itemsById.has(canonicalId(id)))

/** Los ids de gemelas fusionadas (aliases.json) devuelven la obra que se conservó. */
export const getItem = (id: string): Item | undefined => {
  const cid = canonicalId(id)
  return itemsById.get(cid) || useCatalog.getState().items[cid]
}

export const isKnownItem = (id: string): boolean => {
  const cid = canonicalId(id)
  return itemsById.has(cid) || Boolean(useCatalog.getState().items[cid])
}

export const itemsOfType = (t: ShelfType): Item[] => {
  const seedList = items.filter((i) => i.type === t)
  const liveItems = Object.values(useCatalog.getState().items).filter((i) => i.type === t)
  if (liveItems.length === 0) return seedList
  const seenIds = new Set(seedList.map((i) => i.id))
  const extras = liveItems.filter((i) => !seenIds.has(i.id))
  return [...seedList, ...extras]
}

export interface FriendHit { friend: Friend; entry: FriendEntry }

const byItem = new Map<string, FriendHit[]>()
for (const f of friends)
  for (const e of f.entries) {
    const arr = byItem.get(e.itemId) ?? []
    arr.push({ friend: f, entry: e })
    byItem.set(e.itemId, arr)
  }
for (const arr of byItem.values())
  arr.sort((a, b) => (a.entry.status === b.entry.status ? (b.entry.score ?? 0) - (a.entry.score ?? 0) : a.entry.status === 'seen' ? -1 : 1))

let friendHitsProvider: ((itemId: string) => FriendHit[]) | null = null
export const setFriendHitsProvider = (fn: (itemId: string) => FriendHit[]) => {
  friendHitsProvider = fn
}

export const friendHits = (itemId: string): FriendHit[] => {
  if (friendHitsProvider) return friendHitsProvider(itemId)
  return byItem.get(itemId) ?? []
}

/** Media de las notas de amigos (0-10) o null. */
/**
 * Cuánto les gusta a tus amigos, en escala 0-10 para los pesos internos, calculado como el PERCENTIL medio
 * de la obra en el ranking de cada amigo (D25). Nunca se muestra: la interfaz solo enseña puestos.
 */
export function friendsMean(itemId: string): number | null {
  const pcts = friendHits(itemId)
    .filter((h) => h.entry.status === 'seen')
    .map((h) => friendRanks(h.friend, getItem)[itemId]?.pct)
    .filter((p): p is number => p !== undefined)
  return pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length / 10 : null
}

export const fmtDuration = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}` : `${min} min`)

/** «1 h 58» · «3 temporadas · 47 min» · «417 págs» · «2-4 jug. · 45 min» */
export function itemFacts(it: Item): string {
  if (it.type === 'movie') return it.durationMin ? fmtDuration(it.durationMin) : ''
  if (it.type === 'series')
    return [it.seasons ? `${it.seasons} temporada${it.seasons > 1 ? 's' : ''}` : '', it.durationMin ? `${it.durationMin} min` : ''].filter(Boolean).join(' · ')
  if (it.type === 'book')
    return it.pages ? `${it.pages} págs${it.depth ? ' · ' + it.depth : ''}` : ''
  if (it.type === 'boardgame')
    return [it.players ? `${it.players} jug.` : '', it.durationMin ? `${it.durationMin} min` : ''].filter(Boolean).join(' · ')
  if (it.type === 'artist')
    return it.genres.slice(0, 2).join(' · ')
  return ''
}

export const typeName = (t: ShelfType) => {
  switch (t) {
    case 'movie': return 'Película'
    case 'series': return 'Serie'
    case 'book': return 'Libro'
    case 'artist': return 'Artista'
    case 'boardgame': return 'Juego de mesa'
  }
}

