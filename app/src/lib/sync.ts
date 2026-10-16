import { supabase } from './supabase'
import { getItem } from '../data/catalog'
import { useStore } from '../store/useStore'
import { useAuth } from '../store/useAuth'
import type { ShelfType, UserEntry } from '../types'

const shelfOf = (id: string): ShelfType => (getItem(id)?.type ?? 'movie') as ShelfType

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
export async function pushLocalEntriesToCloud(userId: string) {
  if (!supabase) return
  const { entries, rankings } = useStore.getState()
  const rows = Object.values(entries).map((e) => {
    const shelf = shelfOf(e.itemId)
    const shelfRanking = rankings[shelf] ?? []
    const rankPos = e.ranked ? shelfRanking.indexOf(e.itemId) + 1 : null
    return {
      user_id: userId,
      item_id: e.itemId,
      shelf,
      status: e.status,
      score: e.stars ?? null,
      comment: e.comment ?? null,
      rank_position: rankPos && rankPos > 0 ? rankPos : null,
      updated_at: new Date(e.updatedAt || Date.now()).toISOString(),
    }
  })

  if (rows.length === 0) return

  // Upsert en lotes de 100
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100)
    await supabase.from('biblio_entries').upsert(chunk, { onConflict: 'user_id,item_id' })
  }
}

/** Descarga las entradas de Supabase y las fusiona con el store local */
export async function pullCloudEntries(userId: string) {
  if (!supabase) return
  const { data, error } = await supabase
    .from('biblio_entries')
    .select('*')
    .eq('user_id', userId)

  if (error || !data || data.length === 0) return

  const store = useStore.getState()
  const newEntries = { ...store.entries }
  const newRankings: Record<ShelfType, string[]> = {
    movie: [...(store.rankings.movie ?? [])],
    series: [...(store.rankings.series ?? [])],
    book: [...(store.rankings.book ?? [])],
    artist: [...(store.rankings.artist ?? [])],
    boardgame: [...(store.rankings.boardgame ?? [])],
  }

  for (const row of data as CloudEntry[]) {
    const existing = newEntries[row.item_id]
    const rowUpdatedAt = new Date(row.updated_at).getTime()

    // Si la versión de la nube es más reciente o no existe en local
    if (!existing || rowUpdatedAt > (existing.updatedAt || 0)) {
      newEntries[row.item_id] = {
        itemId: row.item_id,
        status: row.status,
        stars: row.score ? (Math.round(row.score) as any) : undefined,
        comment: row.comment || undefined,
        ranked: Boolean(row.rank_position),
        updatedAt: rowUpdatedAt,
      }

      if (row.rank_position && row.shelf in newRankings) {
        const shelfKey = row.shelf as ShelfType
        if (!newRankings[shelfKey].includes(row.item_id)) {
          newRankings[shelfKey].push(row.item_id)
        }
      }
    }
  }

  useStore.setState({ entries: newEntries, rankings: newRankings })
}

/** Guarda un único cambio de entrada en la nube si hay usuario conectado */
export async function syncSingleEntry(userId: string, entry: UserEntry) {
  if (!supabase) return
  const shelf = shelfOf(entry.itemId)
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
