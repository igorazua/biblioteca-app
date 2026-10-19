import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { friends as seedFriends, setFriendHitsProvider } from '../data/catalog'
import { useCatalog } from './useCatalog'
import { canonicalId } from '../data/aliases'
import type { Friend, FriendEntry } from '../types'

export interface FriendHit {
  friend: Friend
  entry: FriendEntry
}

interface FriendsState {
  realFriends: Friend[]
  loading: boolean
  inviteLink: string | null

  loadFriends: () => Promise<void>
  createInvite: () => Promise<string | null>
  acceptInvite: (code: string) => Promise<{ success: boolean; creatorName?: string; error?: string }>
  getFriendHits: (itemId: string) => FriendHit[]
}

export const useFriends = create<FriendsState>((set, get) => ({
  realFriends: [],
  loading: false,
  inviteLink: null,

  loadFriends: async () => {
    const user = useAuth.getState().user
    if (!supabase || !user) {
      set({ realFriends: [], loading: false })
      return
    }

    set({ loading: true })
    try {
      // 1. Obtener amistades aceptadas
      const { data: friendships, error: fErr } = await supabase
        .from('biblio_friends')
        .select('friend_id')
        .eq('user_id', user.id)
        .eq('status', 'accepted')

      if (fErr || !friendships || friendships.length === 0) {
        set({ realFriends: [], loading: false })
        return
      }

      const friendIds = friendships.map((f) => f.friend_id)

      // 2. Obtener perfiles
      const { data: profiles } = await supabase
        .from('biblio_profiles')
        .select('*')
        .in('id', friendIds)

      // 3. Obtener entradas de esos amigos
      const { data: entries } = await supabase
        .from('biblio_entries')
        .select('*')
        .in('user_id', friendIds)

      // Asegurar que las obras de los amigos están en el catálogo
      const friendItemIds = (entries || []).map((e) => canonicalId(e.item_id))
      if (friendItemIds.length > 0) {
        await useCatalog.getState().ensureItems(friendItemIds)
      }

      const colors = ['#F5B544', '#5B9CF5', '#3EC878', '#FF6B6B', '#A78BFA', '#F472B6']

      const mappedFriends: Friend[] = (profiles || []).map((p, idx) => {
        const all: FriendEntry[] = (entries || [])
          .filter((e) => e.user_id === p.id && (e.status === 'seen' || e.status === 'pending'))
          .map((e) => ({
            itemId: canonicalId(e.item_id),
            status: e.status as 'seen' | 'pending',
            score: e.score ? Number(e.score) : undefined,
            comment: e.comment || undefined,
          }))
        // si guardó las dos gemelas, una sola entrada: vista antes que pendiente, luego la de más nota
        const best = new Map<string, FriendEntry>()
        for (const e of all) {
          const b = best.get(e.itemId)
          if (!b || (e.status !== b.status ? e.status === 'seen' : (e.score ?? 0) > (b.score ?? 0))) best.set(e.itemId, e)
        }
        const friendEntries = all.filter((e) => best.get(e.itemId) === e)

        return {
          id: p.id,
          name: p.display_name,
          avatarColor: colors[idx % colors.length],
          avatarUrl: p.avatar_url || undefined,
          entries: friendEntries,
        }
      })

      set({ realFriends: mappedFriends, loading: false })
    } catch (err) {
      console.warn('Error loading real friends:', err)
      set({ loading: false })
    }
  },

  createInvite: async () => {
    const user = useAuth.getState().user
    if (!supabase || !user) return null

    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { error } = await supabase.from('biblio_invites').insert({
      code,
      creator_id: user.id,
    })

    if (error) {
      console.error('Error creating invite:', error)
      return null
    }

    const link = `${window.location.origin}/unete/${code}`
    set({ inviteLink: link })
    return link
  },

  acceptInvite: async (code: string) => {
    const user = useAuth.getState().user
    if (!supabase || !user) return { success: false, error: 'Inicia sesión para unirte' }

    // 1. Buscar la invitación
    const { data: invite, error } = await supabase
      .from('biblio_invites')
      .select('id, creator_id, expires_at')
      .eq('code', code.toUpperCase())
      .single()

    if (error || !invite) return { success: false, error: 'Invitación no válida o caducada' }
    if (invite.creator_id === user.id) return { success: false, error: 'Es tu propio enlace de invitación' }

    // 2. Crear amistad bidireccional
    await supabase.from('biblio_friends').upsert([
      { user_id: user.id, friend_id: invite.creator_id, status: 'accepted' },
      { user_id: invite.creator_id, friend_id: user.id, status: 'accepted' },
    ], { onConflict: 'user_id,friend_id' })

    // 3. Obtener nombre del creador
    const { data: creatorProfile } = await supabase
      .from('biblio_profiles')
      .select('display_name')
      .eq('id', invite.creator_id)
      .single()

    // Recargar amigos
    await get().loadFriends()

    return { success: true, creatorName: creatorProfile?.display_name || 'tu amigo' }
  },

  getFriendHits: (itemId: string): FriendHit[] => {
    const { realFriends } = get()
    // Si el usuario tiene amigos reales, usamos sus amigos reales. Si no, usamos los amigos demo (seed)
    const activeFriends = realFriends.length > 0 ? realFriends : seedFriends

    const hits: FriendHit[] = []
    for (const f of activeFriends) {
      for (const e of f.entries) {
        if (e.itemId === itemId) {
          hits.push({ friend: f, entry: e })
        }
      }
    }

    return hits.sort((a, b) => {
      if (a.entry.status === b.entry.status) {
        return (b.entry.score ?? 0) - (a.entry.score ?? 0)
      }
      return a.entry.status === 'seen' ? -1 : 1
    })
  },
}))

setFriendHitsProvider((id) => useFriends.getState().getFriendHits(id))
