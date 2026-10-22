import { supabase } from './supabase'
import { getItem } from '../data/catalog'
import { collapseCloudRows } from '../data/aliases'
import { useStore } from '../store/useStore'
import { useAuth } from '../store/useAuth'
import { useCatalog } from '../store/useCatalog'
import { SHELVES, type ShelfType, type UserEntry, type DuelRecord } from '../types'
import { pairKey } from './ranking'

const resolveShelf = (itemId: string, shelfFromEntry?: string): ShelfType | undefined => {
  if (shelfFromEntry && shelfFromEntry in { movie: 1, series: 1, book: 1, artist: 1, boardgame: 1 }) {
    return shelfFromEntry as ShelfType
  }
  return getItem(itemId)?.type
}

export interface CloudEntry {
  id: string
  user_id: string
  item_id: string
  shelf: string
  status: 'seen' | 'pending' | 'dismissed'
  score: number | null
  comment: string | null
  rank_position: number | null
  updated_at: string
}

/** Sube las entradas locales a Supabase */
export async function pushLocalEntriesToCloud(userId: string): Promise<number> {
  if (!supabase) return 0
  const { entries, rankings } = useStore.getState()

  // Si hay obras con shelf desconocido, pedirlas antes a biblio_catalog
  const unknownIds = Object.values(entries)
    .filter((e) => !resolveShelf(e.itemId, e.shelf))
    .map((e) => e.itemId)
  if (unknownIds.length > 0) {
    await useCatalog.getState().ensureItems(unknownIds)
  }

  const rows = []
  for (const e of Object.values(entries)) {
    const shelf = resolveShelf(e.itemId, e.shelf)
    if (!shelf) continue
    const shelfRanking = rankings[shelf] ?? []
    const rankPos = e.ranked ? shelfRanking.indexOf(e.itemId) + 1 : null
    rows.push({
      user_id: userId,
      item_id: e.itemId,
      shelf,
      status: e.status,
      score: e.stars ?? null,
      comment: e.comment ?? null,
      rank_position: rankPos && rankPos > 0 ? rankPos : null,
      updated_at: new Date(e.updatedAt || Date.now()).toISOString(),
    })
  }

  if (rows.length === 0) return 0

  // Upsert en lotes de 100
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100)
    await supabase.from('biblio_entries').upsert(chunk, { onConflict: 'user_id,item_id' })
  }
  return rows.length
}

export interface MergeResult {
  entries: Record<string, UserEntry>
  rankings: Record<ShelfType, string[]>
}

/** Fusiona entradas locales con las de la nube según updatedAt (gana el más reciente) */
export function mergeCloudAndLocal(
  localEntries: Record<string, UserEntry>,
  localRankings: Record<ShelfType, string[]>,
  cloudRows: CloudEntry[]
): MergeResult {
  const newEntries = { ...localEntries }
  const newRankings: Record<ShelfType, string[]> = {
    movie: [...(localRankings.movie ?? [])],
    series: [...(localRankings.series ?? [])],
    book: [...(localRankings.book ?? [])],
    artist: [...(localRankings.artist ?? [])],
    boardgame: [...(localRankings.boardgame ?? [])],
  }

  for (const row of cloudRows) {
    const existing = newEntries[row.item_id]
    const rowUpdatedAt = new Date(row.updated_at).getTime()
    const shelf = (row.shelf in newRankings ? row.shelf : getItem(row.item_id)?.type) as ShelfType | undefined

    // Si la versión de la nube es más reciente o no existe en local
    if (!existing || rowUpdatedAt > (existing.updatedAt || 0)) {
      newEntries[row.item_id] = {
        itemId: row.item_id,
        shelf,
        status: row.status,
        stars: row.score ? (Math.round(row.score) as any) : undefined,
        comment: row.comment || undefined,
        ranked: Boolean(row.rank_position),
        updatedAt: rowUpdatedAt,
      }

      if (row.rank_position && shelf && shelf in newRankings) {
        if (!newRankings[shelf].includes(row.item_id)) {
          newRankings[shelf].push(row.item_id)
        }
      }
    }
  }

  return { entries: newEntries, rankings: newRankings }
}

/** Descarga las entradas de Supabase y las fusiona con el store local */
export async function pullCloudEntries(userId: string) {
  if (!supabase) return
  const { data, error } = await supabase
    .from('biblio_entries')
    .select('*')
    .eq('user_id', userId)

  if (error || !data || data.length === 0) return

  // Filas guardadas con el id de una gemela ya fusionada: cuentan como la obra que se conservó (una sola fila)
  const rows = collapseCloudRows(data as CloudEntry[])

  // Asegurar que las obras existen en catálogo antes de procesar
  const allIds = rows.map((r) => r.item_id)
  await useCatalog.getState().ensureItems(allIds)

  const store = useStore.getState()
  const { entries, rankings } = mergeCloudAndLocal(store.entries, store.rankings, rows)
  useStore.setState({ entries, rankings })
}

/** Guarda un único cambio de entrada en la nube si hay usuario conectado */
export async function syncSingleEntry(userId: string, entry: UserEntry) {
  if (!supabase) return
  let shelf = resolveShelf(entry.itemId, entry.shelf)
  if (!shelf) {
    await useCatalog.getState().ensureItems([entry.itemId])
    shelf = resolveShelf(entry.itemId, entry.shelf)
    if (!shelf) return
  }
  const rankings = useStore.getState().rankings[shelf] ?? []
  const rankPos = entry.ranked ? rankings.indexOf(entry.itemId) + 1 : null

  await supabase.from('biblio_entries').upsert(
    {
      user_id: userId,
      item_id: entry.itemId,
      shelf,
      status: entry.status,
      score: entry.stars ?? null,
      comment: entry.comment ?? null,
      rank_position: rankPos && rankPos > 0 ? rankPos : null,
      updated_at: new Date(entry.updatedAt).toISOString(),
    },
    { onConflict: 'user_id,item_id' }
  )
}

/** Envía un evento de analítica a la tabla biblio_events */
export async function sendCloudEvent(event: {
  userId?: string | null
  sid: string
  v: string
  t: number
  type: string
  shelf?: string
  itemId?: string
  data?: Record<string, unknown>
}) {
  if (!supabase) return
  try {
    await supabase.from('biblio_events').insert({
      user_id: event.userId || null,
      sid: event.sid,
      v: event.v,
      t: event.t,
      type: event.type,
      shelf: event.shelf || null,
      item_id: event.itemId || null,
      data: event.data || {},
    })
  } catch (err) {
    console.warn('Error sending event to cloud:', err)
  }
}

export interface CloudDuel {
  id?: string
  user_id: string
  shelf: string
  a: string
  b: string
  winner: string
  at: string
}

/** Sube el historial de duelos local a Supabase */
export async function pushLocalDuelsToCloud(userId: string): Promise<number> {
  if (!supabase) return 0
  const { duels } = useStore.getState()
  const rows: CloudDuel[] = []
  for (const s of SHELVES) {
    const shelfDuels = duels[s] || {}
    for (const [key, rec] of Object.entries(shelfDuels)) {
      const parts = key.split('|')
      if (parts.length !== 2) continue
      const [a, b] = parts
      rows.push({
        user_id: userId,
        shelf: s,
        a,
        b,
        winner: rec.w,
        at: new Date(rec.at || Date.now()).toISOString(),
      })
    }
  }
  if (rows.length === 0) return 0
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100)
    await supabase.from('biblio_duels').upsert(chunk, { onConflict: 'user_id,shelf,a,b' })
  }
  return rows.length
}

/** Descarga los duelos de Supabase y los fusiona con el store local */
export async function pullCloudDuels(userId: string) {
  if (!supabase) return
  const { data, error } = await supabase
    .from('biblio_duels')
    .select('*')
    .eq('user_id', userId)

  if (error || !data || data.length === 0) return

  const store = useStore.getState()
  const nextDuels = {
    movie: { ...(store.duels.movie || {}) },
    series: { ...(store.duels.series || {}) },
    book: { ...(store.duels.book || {}) },
    artist: { ...(store.duels.artist || {}) },
    boardgame: { ...(store.duels.boardgame || {}) },
  }

  for (const row of data as CloudDuel[]) {
    const shelf = row.shelf as ShelfType
    if (!nextDuels[shelf]) continue
    const key = pairKey(row.a, row.b)
    const existing = nextDuels[shelf][key]
    const rowAt = new Date(row.at).getTime()
    if (!existing || rowAt > existing.at) {
      nextDuels[shelf][key] = { w: row.winner, at: rowAt }
    }
  }

  useStore.setState({ duels: nextDuels })
}

/** Guarda un único duelo en Supabase si hay usuario conectado */
export async function syncSingleDuel(
  userId: string,
  shelf: ShelfType,
  a: string,
  b: string,
  winner: string,
  at: number,
) {
  if (!supabase) return
  const [canA, canB] = a < b ? [a, b] : [b, a]
  await supabase.from('biblio_duels').upsert(
    {
      user_id: userId,
      shelf,
      a: canA,
      b: canB,
      winner,
      at: new Date(at).toISOString(),
    },
    { onConflict: 'user_id,shelf,a,b' },
  )
}

/** Borra un duelo de Supabase si hay usuario conectado (deshacer) */
export async function deleteCloudDuel(userId: string, shelf: ShelfType, a: string, b: string) {
  if (!supabase) return
  const [canA, canB] = a < b ? [a, b] : [b, a]
  await supabase
    .from('biblio_duels')
    .delete()
    .eq('user_id', userId)
    .eq('shelf', shelf)
    .eq('a', canA)
    .eq('b', canB)
}

/** Escucha cambios en useStore para sincronizar entradas y duelos si hay usuario conectado */
export function initStoreSync() {
  return useStore.subscribe((state, prevState) => {
    const user = useAuth.getState().user
    if (!user) return

    if (state.entries !== prevState.entries) {
      for (const [id, entry] of Object.entries(state.entries)) {
        if (entry !== prevState.entries[id]) {
          syncSingleEntry(user.id, entry)
        }
      }
    }

    if (state.duels !== prevState.duels) {
      for (const s of SHELVES) {
        const curShelf = state.duels[s] || {}
        const prevShelf = prevState.duels[s] || {}
        if (curShelf !== prevShelf) {
          // Duelos creados o actualizados
          for (const [key, rec] of Object.entries(curShelf)) {
            if (rec !== prevShelf[key]) {
              const [a, b] = key.split('|')
              if (a && b) syncSingleDuel(user.id, s, a, b, rec.w, rec.at)
            }
          }
          // Duelos eliminados (p. ej. deshacer)
          for (const key of Object.keys(prevShelf)) {
            if (!curShelf[key]) {
              const [a, b] = key.split('|')
              if (a && b) deleteCloudDuel(user.id, s, a, b)
            }
          }
        }
      }
    }
  })
}
