import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { items, getItem } from '../data/catalog'
import { clampStars, insertAt, starBand } from '../lib/ranking'
import { SHELVES, type List, type Profile, type Settings, type ShelfType, type Stars, type Status, type UserEntry } from '../types'
import { track } from './useEvents'

interface HistoryItem {
  itemId: string
  prev: UserEntry | null
  prevRanking: string[]
  shelf: ShelfType
}

export interface PendingSave { ids: string[]; origin: string }

interface State {
  onboarded: boolean
  profile: Profile
  entries: Record<string, UserEntry>
  rankings: Record<ShelfType, string[]>
  lists: List[]
  settings: Settings
  categoryVotes: Record<string, boolean>
  history: HistoryItem[]
  pendingSave: PendingSave | null

  completeOnboarding: (p: Partial<Profile>) => void
  setProfile: (p: Partial<Profile>) => void
  setSettings: (s: Partial<Settings>) => void
  swipe: (itemId: string, dir: 'left' | 'right' | 'up') => void
  undoSwipe: () => string | null
  rate: (itemId: string, patch: { stars?: Stars | null; comment?: string }) => void
  setStatus: (itemId: string, status: Status | null) => void
  applyRanking: (shelf: ShelfType, ranking: string[], placedId?: string) => void
  placeProvisional: (itemId: string) => void
  markPlaced: (itemId: string) => void
  bumpCompared: (ids: string[]) => void
  addComment: (itemId: string, comment: string) => void
  saveList: (l: Omit<List, 'id' | 'createdAt'> & { id?: string }) => string
  deleteList: (id: string) => void
  toggleVote: (key: string) => void
  setPendingSave: (p: PendingSave | null) => void
  applyPendingSave: () => number
  saveItemsAsPending: (ids: string[], origin: string) => number
  loadSample: () => void
  resetAll: () => void
}

const defaults = () => ({
  onboarded: false,
  profile: { name: 'Tú', avatarColor: '#F5B544', platforms: [], country: 'ES', lang: 'es' } as Profile,
  entries: {} as Record<string, UserEntry>,
  rankings: { movie: [], series: [], book: [], artist: [], boardgame: [] } as Record<ShelfType, string[]>,
  lists: [] as List[],
  settings: { commentBoxInPairs: true, rateOnSwipe: true } as Settings,
  categoryVotes: {} as Record<string, boolean>,
  history: [] as HistoryItem[],
  pendingSave: null as PendingSave | null,
})

const shelfOf = (id: string): ShelfType => (getItem(id)?.type ?? 'movie') as ShelfType
const uid = () => Math.random().toString(36).slice(2, 10)

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...defaults(),

      completeOnboarding: (p) => set((s) => ({ onboarded: true, profile: { ...s.profile, ...p } })),
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),

      swipe: (itemId, dir) =>
        set((s) => {
          const shelf = shelfOf(itemId)
          const now = Date.now()
          const prevEntry = s.entries[itemId]
          const newStatus = dir === 'left' ? 'dismissed' : dir === 'up' ? 'pending' : 'seen'
          const entry: UserEntry = {
            itemId,
            status: newStatus,
            ranked: false,
            updatedAt: now,
            ...(dir === 'left' ? { dismissedAt: now } : {}),
          }
          const history = [...s.history, { itemId, prev: prevEntry ?? null, prevRanking: s.rankings[shelf] ?? [], shelf }].slice(-20)

          track('entry_status', {
            shelf,
            itemId,
            data: { from: prevEntry?.status ?? null, to: newStatus, via: 'deck' },
          })

          return { entries: { ...s.entries, [itemId]: entry }, history }
        }),

      undoSwipe: () => {
        const h = get().history
        if (!h.length) return null
        const last = h[h.length - 1]
        set((s) => {
          const entries = { ...s.entries }
          if (last.prev) entries[last.itemId] = last.prev
          else delete entries[last.itemId]
          return { entries, rankings: { ...s.rankings, [last.shelf]: last.prevRanking ?? [] }, history: h.slice(0, -1) }
        })
        return last.itemId
      },

      rate: (itemId, patch) =>
        set((s) => {
          const cur = s.entries[itemId]
          const next: UserEntry = { ...(cur ?? { itemId, ranked: false }), itemId, status: 'seen', updatedAt: Date.now() } as UserEntry
          if (patch.stars === null) { delete next.stars }
          else if (patch.stars !== undefined) next.stars = patch.stars
          if (patch.comment !== undefined) { const c = patch.comment.trim(); if (c) next.comment = c; else delete next.comment }
          return { entries: { ...s.entries, [itemId]: next } }
        }),

      setStatus: (itemId, status) =>
        set((s) => {
          const shelf = shelfOf(itemId)
          const entries = { ...s.entries }
          const cur = entries[itemId]
          let ranking = s.rankings[shelf] ?? []
          if (status === null) { delete entries[itemId]; ranking = ranking.filter((x) => x !== itemId) }
          else {
            if (status === 'seen') entries[itemId] = { ...(cur ?? { itemId, ranked: false }), itemId, status, updatedAt: Date.now() } as UserEntry
            else {
              entries[itemId] = { itemId, status, ranked: false, ...(cur?.origin ? { origin: cur.origin } : {}), updatedAt: Date.now(), ...(status === 'dismissed' ? { dismissedAt: Date.now() } : {}) }
              ranking = ranking.filter((x) => x !== itemId)
            }
          }
          if (cur?.status !== status) {
            track('entry_status', {
              shelf,
              itemId,
              data: { from: cur?.status ?? null, to: status, via: 'other' },
            })
          }
          return { entries, rankings: { ...s.rankings, [shelf]: ranking } }
        }),

      // §5.3: manda el A/B; las estrellas de cada item se ajustan a las de sus vecinos
      applyRanking: (shelf, ranking, placedId) =>
        set((s) => {
          const entries = { ...s.entries }
          const starsOf = (id: string) => entries[id]?.stars
          for (const id of ranking) {
            const c = clampStars(ranking, starsOf, id)
            entries[id] = { ...entries[id], ranked: true, ...(c ? { stars: c } : {}) }
          }
          if (placedId && entries[placedId]) {
            const { provisional: _p, ...rest } = entries[placedId]
            entries[placedId] = rest
            const pos = ranking.indexOf(placedId) + 1
            const total = ranking.length
            const pct = total > 1 ? (total - pos) / (total - 1) : 1
            track('entry_ranked', {
              shelf,
              itemId: placedId,
              data: { pos, total, pct },
            })
          }
          return { entries, rankings: { ...s.rankings, [shelf]: ranking } }
        }),

      // Colocación provisional SIN comparaciones: con estrellas, en el límite inferior de su franja (Comparar la afina)
      placeProvisional: (itemId) =>
        set((s) => {
          const e = s.entries[itemId]
          const shelf = shelfOf(itemId)
          if (!e || e.status !== 'seen' || !e.stars) return s
          const base = (s.rankings[shelf] ?? []).filter((x) => x !== itemId)
          const [, hi] = starBand(base, (id) => s.entries[id]?.stars, e.stars)
          const ranking = insertAt(base, itemId, hi)
          const pos = ranking.indexOf(itemId) + 1
          const total = ranking.length
          const pct = total > 1 ? (total - pos) / (total - 1) : 1
          track('entry_ranked', {
            shelf,
            itemId,
            data: { pos, total, pct },
          })
          return { entries: { ...s.entries, [itemId]: { ...e, ranked: true, provisional: true } }, rankings: { ...s.rankings, [shelf]: ranking } }
        }),

      bumpCompared: (ids) =>
        set((s) => {
          const entries = { ...s.entries }
          for (const id of ids) if (entries[id]) entries[id] = { ...entries[id], cmp: (entries[id].cmp ?? 0) + 1 }
          return { entries }
        }),

      markPlaced: (itemId) =>
        set((s) => {
          const e = s.entries[itemId]
          if (!e) return s
          const { provisional: _p, ...rest } = e
          return { entries: { ...s.entries, [itemId]: { ...rest, ranked: true } } }
        }),

      addComment: (itemId, comment) =>
        set((s) => {
          const c = comment.trim()
          if (!c || !s.entries[itemId]) return s
          return { entries: { ...s.entries, [itemId]: { ...s.entries[itemId], comment: c, updatedAt: Date.now() } } }
        }),

      saveList: (l) => {
        const id = l.id ?? uid()
        set((s) => {
          const existing = s.lists.find((x) => x.id === id)
          const next: List = { ...l, id, createdAt: existing?.createdAt ?? Date.now() }
          return { lists: existing ? s.lists.map((x) => (x.id === id ? next : x)) : [next, ...s.lists] }
        })
        return id
      },
      deleteList: (id) => set((s) => ({ lists: s.lists.filter((l) => l.id !== id) })),
      toggleVote: (key) => set((s) => ({ categoryVotes: { ...s.categoryVotes, [key]: !s.categoryVotes[key] } })),

      setPendingSave: (p) => set({ pendingSave: p }),
      saveItemsAsPending: (ids, origin) => {
        let n = 0
        set((s) => {
          const entries = { ...s.entries }
          for (const id of ids)
            if (!entries[id] || entries[id].status === 'dismissed') { entries[id] = { itemId: id, status: 'pending', ranked: false, origin, updatedAt: Date.now() }; n++ }
          return { entries }
        })
        return n
      },
      applyPendingSave: () => {
        const p = get().pendingSave
        if (!p) return 0
        const n = get().saveItemsAsPending(p.ids, p.origin)
        set({ pendingSave: null })
        return n
      },

      // ~25 populares como vistos y sin ordenar (simula importar un CSV de Letterboxd / FilmAffinity)
      loadSample: () =>
        set((s) => {
          const entries = { ...s.entries }
          const quota: Record<ShelfType, number> = { movie: 10, series: 6, book: 4, artist: 4, boardgame: 4 }
          for (const t of SHELVES) {
            const pool = items.filter((i) => i.type === t && !entries[i.id]).sort((a, b) => b.popularity - a.popularity).slice(0, quota[t])
            for (const it of pool) entries[it.id] = { itemId: it.id, status: 'seen', ranked: false, updatedAt: Date.now() }
          }
          return { entries }
        }),

      resetAll: () => set({ ...defaults() }),
    }),
    {
      name: 'biblioteca-v1',
      version: 2,
      migrate: (persistedState: unknown) => {
        const state = persistedState as Partial<State>
        if (state && state.rankings) {
          for (const shelf of SHELVES) {
            if (!Array.isArray(state.rankings[shelf])) {
              state.rankings[shelf] = []
            }
          }
        }
        return state
      },
      merge: (persistedState: unknown, currentState: State) => {
        const p = (persistedState as Partial<State>) ?? {}
        const mergedRankings = { ...currentState.rankings, ...(p.rankings || {}) }
        for (const shelf of SHELVES) {
          if (!Array.isArray(mergedRankings[shelf])) {
            mergedRankings[shelf] = []
          }
        }
        return {
          ...currentState,
          ...p,
          rankings: mergedRankings,
        }
      },
    },
  ),
)

export const starsOfEntries = (entries: Record<string, UserEntry>) => (id: string) => entries[id]?.stars
