import { supabase } from './supabase'
import { getItem } from '../data/catalog'
import { collapseCloudRows } from '../data/aliases'
import { useStore } from '../store/useStore'
import { useAuth } from '../store/useAuth'
import { useCatalog } from '../store/useCatalog'
import type { ShelfType, UserEntry } from '../types'

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

/** Escucha cambios en useStore para sincronizar entradas individuales si hay usuario conectado */
export function initStoreSync() {
  return useStore.subscribe((state, prevState) => {
    if (state.entries !== prevState.entries) {
      const user = useAuth.getState().user
      if (!user) return
      for (const [id, entry] of Object.entries(state.entries)) {
        if (entry !== prevState.entries[id]) {
          syncSingleEntry(user.id, entry)
        }
      }
    }
  })
}
