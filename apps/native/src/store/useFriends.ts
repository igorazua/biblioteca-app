import { create } from 'zustand'
import { friends as seedFriends, setFriendHitsProvider, type Friend, type FriendHit } from '@biblioteca/core'

export type { FriendHit }

interface FriendsState {
  realFriends: Friend[]
  loading: boolean
  inviteLink: string | null

  loadFriends: () => Promise<void>
  createInvite: () => Promise<string | null>
  acceptInvite: (code: string) => Promise<{ success: boolean; creatorName?: string; error?: string }>
  getFriendHits: (itemId: string) => FriendHit[]
}

// Sin cuenta (D7): no hay amigos reales y se usan los de prueba del catálogo, igual que la PWA cuando no hay sesión.
// Fase 3: `loadFriends` leerá de Supabase (`biblio_friends`, `biblio_profiles`, `biblio_entries`) y `createInvite` / `acceptInvite`
// llamarán a las funciones `biblio_create_invite` y `biblio_accept_invite`.
export const useFriends = create<FriendsState>((set, get) => ({
  realFriends: [],
  loading: false,
  inviteLink: null,

  loadFriends: async () => {
    set({ realFriends: [], loading: false })
  },

  createInvite: async () => null,

  acceptInvite: async () => ({ success: false, error: 'Inicia sesión para unirte' }),

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
