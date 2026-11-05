import type { Friend, FriendEntry, Item, ShelfType } from '../types'
import { friendRanks } from '../lib/rank'

import { canonicalId } from './aliases'

const COVER_BASE = 'https://pvewnpemlwmvaduzhjso.supabase.co/storage/v1/object/public/biblio-covers'

function restorePosterUrl(id: string, shelf: ShelfType, p: string | null | undefined): string | null {
  if (p === null) return null
  if (!p) return `${COVER_BASE}/${shelf}/${id.split(':')[1]}.webp?v=2`
  if (p.startsWith('http://') || p.startsWith('https://')) return p
  return `${COVER_BASE}/${p}`
}

type CompactRow = [
  id: string,
  title: string,
  year: number,
  creator: string,
  popularity: number,
  poster: string | null,
  posterRatio: number,
  popPct: number,
  notoriety: number,
  fameTier: number,
  isCanon: number,
  dur: number,
  seas: number,
  pg: number,
  play: string,
  depth: string,
  orig: string,
  g: string[],
  coop: number,
  mech: string[],
  weight: number,
  minAge: number,
  local: NonNullable<Item['local']> | 0
]

// Las carátulas de versiones locales se guardan relativas a COVER_BASE, como posterUrl.
function restoreLocal(raw: NonNullable<Item['local']>): Item['local'] {
  const out: NonNullable<Item['local']> = {}
  for (const [lang, v] of Object.entries(raw)) {
    if (!v) continue
    const poster = v.poster && !v.poster.startsWith('http') ? `${COVER_BASE}/${v.poster}` : v.poster
    out[lang] = { ...v, ...(poster ? { poster } : {}) }
  }
  return out
}

/** Forma del archivo `catalog-index.json` (lo carga la app y lo entrega con `setCatalogIndex`). */
export interface CatalogIndexData {
  items: unknown[]
  friends: unknown[]
  [k: string]: unknown
}

function expandRow(row: CompactRow): Item {
  const [id, title, year, creator, popularity, poster, posterRatio, popPct, notoriety, fameTier, isCanon, dur, seas, pg, play, depth, orig, g, coop, mech, weight, minAge, loc] = row
  const shelf = id.split(':')[0] as ShelfType
  const it: Item = {
    id,
    type: shelf,
    title,
    year,
    creator,
    popularity,
    genres: g || [],
    synopsis: '',
    posterUrl: restorePosterUrl(id, shelf, poster),
  }
  if (posterRatio) it.posterRatio = posterRatio
  if (popPct) it.popPct = popPct
  if (notoriety) it.notoriety = notoriety
  if (fameTier) it.fameTier = fameTier as 1 | 2 | 3 | 4
  if (isCanon) it.isCanon = true
  if (dur) it.durationMin = dur
  if (seas) it.seasons = seas
  if (pg) it.pages = pg
  if (play) it.players = play
  if (depth) it.depth = depth as Item['depth']
  if (orig) it.originalTitle = orig
  if (coop === 1) it.cooperative = true
  else if (coop === -1) it.cooperative = false
  if (mech && mech.length > 0) it.mechanics = mech
  if (weight) it.weight = weight
  if (minAge) it.minAge = minAge
  if (loc) it.local = restoreLocal(loc)
  return it
}

/** Forma del archivo `catalog-index.json`: lo carga la app y lo entrega con `setCatalogIndex`. */
export interface CatalogIndexData {
  items: unknown[]
  friends: unknown[]
}

export const items: Item[] = []
export const friends: Friend[] = []
export const itemsById = new Map<string, Item>()

export interface FriendHit { friend: Friend; entry: FriendEntry }
const byItem = new Map<string, FriendHit[]>()

/** Entrega el índice ligero del catálogo (`catalog-index.json`). Hay que llamarlo una vez, al arrancar, antes de usar el catálogo. */
export function setCatalogIndex(indexData: CatalogIndexData): void {
  items.length = 0
  friends.length = 0
  itemsById.clear()
  byItem.clear()
  loadedShelves.clear()
  for (const row of indexData.items as CompactRow[]) items.push(expandRow(row))
  for (const f of indexData.friends as Friend[]) friends.push(f)
  for (const it of items) itemsById.set(it.id, it)
  for (const f of friends)
    for (const e of f.entries) {
      const arr = byItem.get(e.itemId) ?? []
      arr.push({ friend: f, entry: e })
      byItem.set(e.itemId, arr)
    }
  for (const arr of byItem.values())
    arr.sort((a, b) => (a.entry.status === b.entry.status ? (b.entry.score ?? 0) - (a.entry.score ?? 0) : a.entry.status === 'seen' ? -1 : 1))
  detailStamp++
  notifyCatalogChange()
}

/** Obras que la app ha ido trayendo de la nube (lo que antes vivía en `useCatalog.items`); la app las entrega con `setLiveItems`. */
let liveCache: Record<string, Item> = {}
export function setLiveItems(live: Record<string, Item>): void {
  liveCache = live
}

const loadedShelves = new Set<ShelfType>()
const catalogListeners = new Set<() => void>()
function notifyCatalogChange() {
  for (const l of catalogListeners) l()
}
/** Avisa cada vez que cambia el catálogo en memoria (llega el índice o el detalle de una estantería). La app lo usa para refrescar pantallas. */
export function subscribeCatalog(listener: () => void) {
  catalogListeners.add(listener)
  return () => {
    catalogListeners.delete(listener)
  }
}

let detailStamp = 0
/** Cambia cada vez que llega el detalle de una estantería: los cachés del motor (rasgos) se rehacen al verlo cambiar. */
export const catalogDetailStamp = () => detailStamp

export function isShelfLoaded(shelf: ShelfType): boolean {
  return loadedShelves.has(shelf)
}

/** ¿Está esta obra en el catálogo semilla (el índice)? Para la caché viva de la app. */
export const isSeedItem = (id: string): boolean => itemsById.has(canonicalId(id))

/** Estanterías con detalle cargable, en el orden en que se precargan: primero la que se está usando. */
export function shelfPrefetchOrder(first?: ShelfType): ShelfType[] {
  return [...new Set([...(first ? [first] : []), 'movie', 'series', 'book', 'boardgame', 'artist'])] as ShelfType[]
}

/**
 * Entrega los detalles completos de una estantería (el contenido de `shelves/<shelf>.json`, que carga la app) y los
 * fusiona en el catálogo en memoria. Antes: `ensureShelfCatalog` con un `import()` dinámico.
 */
export function setShelfCatalog(shelf: ShelfType, shelfItems: Item[]): void {
  if (shelf === 'song') return
  for (const it of shelfItems) {
    const cid = canonicalId(it.id)
    const existing = itemsById.get(cid)
    if (existing) {
      Object.assign(existing, it)
    } else {
      itemsById.set(cid, it)
      items.push(it)
    }
  }
  loadedShelves.add(shelf)
  detailStamp++
  notifyCatalogChange()
}

let dynamicSongs: Item[] = []
const songsListeners = new Set<() => void>()

export function registerLoadedSongs(raw: Item[]) {
  // songs.json no trae géneros ni sinopsis: sin esto, el mazo de Descubrir se caía al pintar la primera canción
  const songs = raw.map((s) => ({ ...s, genres: s.genres ?? [], synopsis: s.synopsis ?? '' }))
  dynamicSongs = songs
  for (const s of songs) {
    itemsById.set(s.id, s)
  }
  for (const listener of songsListeners) {
    listener()
  }
}

export function subscribeSongs(listener: () => void) {
  songsListeners.add(listener)
  return () => {
    songsListeners.delete(listener)
  }
}

/** Los ids de gemelas fusionadas (aliases.json) devuelven la obra que se conservó. */
export const getItem = (id: string): Item | undefined => {
  const cid = canonicalId(id)
  return itemsById.get(cid) || liveCache[cid]
}

export const isKnownItem = (id: string): boolean => {
  const cid = canonicalId(id)
  return itemsById.has(cid) || Boolean(liveCache[cid])
}

export const itemsOfType = (t: ShelfType): Item[] => {
  if (t === 'song') {
    const liveItems = Object.values(liveCache).filter((i) => i.type === 'song')
    if (liveItems.length === 0) return dynamicSongs
    const seenIds = new Set(dynamicSongs.map((i) => i.id))
    const extras = liveItems.filter((i) => !seenIds.has(i.id))
    return [...dynamicSongs, ...extras]
  }
  const seedList = items.filter((i) => i.type === t)
  const liveItems = Object.values(liveCache).filter((i) => i.type === t)
  if (liveItems.length === 0) return seedList
  const seenIds = new Set(seedList.map((i) => i.id))
  const extras = liveItems.filter((i) => !seenIds.has(i.id))
  return [...seedList, ...extras]
}

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
  if (it.type === 'song')
    return [it.album, it.durationSec ? `${Math.floor(it.durationSec / 60)}:${String(it.durationSec % 60).padStart(2, '0')}` : ''].filter(Boolean).join(' · ')
  return ''
}

export const typeName = (t: ShelfType) => {
  switch (t) {
    case 'movie': return 'Película'
    case 'series': return 'Serie'
    case 'book': return 'Libro'
    case 'artist': return 'Artista'
    case 'boardgame': return 'Juego de mesa'
    case 'song': return 'Canción'
  }
}
