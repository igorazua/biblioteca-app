import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { items, getItem } from '../data/catalog'
import { canonicalId, canonicalizeUserData } from '../data/aliases'
import { clampStars, insertAt, starBand, pairKey, repairRankingsAndEntries } from '../lib/ranking'
import { SHELVES, type List, type Profile, type Settings, type ShelfType, type Stars, type Status, type UserEntry, type DeckLearn, type DeckLearnShelf, type DuelRecord } from '../types'
import { computeUserVector } from '../lib/engine/userVec'
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
  nudgeDismiss: Record<string, { count: number; lastDismissedAt: number }>
  deckLearn: DeckLearn
  recentOrienters: Record<ShelfType, string[][]>
  userVectors: Record<ShelfType, number[] | null>
  duels: Record<ShelfType, Record<string, DuelRecord>>
  ratings: Record<ShelfType, Record<string, number>>
  lastCompared: Record<ShelfType, number>

  completeOnboarding: (p: Partial<Profile>) => void
  setProfile: (p: Partial<Profile>) => void
  setSettings: (s: Partial<Settings>) => void
  dismissNudge: (id: string) => void
  decayDeckLearn: (shelf?: ShelfType) => void
  recordOrienters: (shelf: ShelfType, ids: string[]) => void
  recomputeUserVectors: () => void
  recordDuel: (shelf: ShelfType, a: string, b: string, winner: string) => void
  deleteDuel: (shelf: ShelfType, a: string, b: string) => void
  touchLastCompared: (shelf: ShelfType) => void
  swipe: (itemId: string, dir: 'left' | 'right' | 'up') => void
  undoSwipe: () => string | null
  rate: (itemId: string, patch: { stars?: Stars | null; comment?: string }) => void
  setStatus: (itemId: string, status: Status | null) => void
  applyRanking: (shelf: ShelfType, ranking: string[], placedId?: string, ratingsPatch?: Record<string, number>) => void
  setRatings: (shelf: ShelfType, ratings: Record<string, number>) => void
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
  rankings: { movie: [], series: [], book: [], artist: [], boardgame: [], song: [] } as Record<ShelfType, string[]>,
  lists: [] as List[],
  settings: { commentBoxInPairs: true, rateOnSwipe: true } as Settings,
  categoryVotes: {} as Record<string, boolean>,
  history: [] as HistoryItem[],
  pendingSave: null as PendingSave | null,
  nudgeDismiss: {} as Record<string, { count: number; lastDismissedAt: number }>,
  deckLearn: {
    movie: { byMacro: {}, byDecade: {} },
    series: { byMacro: {}, byDecade: {} },
    book: { byMacro: {}, byDecade: {} },
    artist: { byMacro: {}, byDecade: {} },
    boardgame: { byMacro: {}, byDecade: {} },
    song: { byMacro: {}, byDecade: {} },
  } as DeckLearn,
  recentOrienters: {
    movie: [],
    series: [],
    book: [],
    artist: [],
    boardgame: [],
    song: [],
  } as Record<ShelfType, string[][]>,
  userVectors: {
    movie: null,
    series: null,
    book: null,
    artist: null,
    boardgame: null,
    song: null,
  } as Record<ShelfType, number[] | null>,
  duels: {
    movie: {},
    series: {},
    book: {},
    artist: {},
    boardgame: {},
    song: {},
  } as Record<ShelfType, Record<string, DuelRecord>>,
  ratings: {
    movie: {},
    series: {},
    book: {},
    artist: {},
    boardgame: {},
    song: {},
  } as Record<ShelfType, Record<string, number>>,
  lastCompared: {
    movie: 0,
    series: 0,
    book: 0,
    artist: 0,
    boardgame: 0,
    song: 0,
  } as Record<ShelfType, number>,
})

export const shelfOf = (id: string, entry?: UserEntry): ShelfType =>
  (entry?.shelf ?? useStore.getState?.()?.entries?.[id]?.shelf ?? getItem(id)?.type ?? 'movie') as ShelfType
const uid = () => Math.random().toString(36).slice(2, 10)

function recomputeVectorForShelf(entries: Record<string, UserEntry>, rankings: Record<ShelfType, string[]>, shelf: ShelfType): number[] | null {
  const vec = computeUserVector({
    shelf,
    entries,
    ranking: rankings[shelf] || [],
  })
  return vec ? Array.from(vec) : null
}

export function migrateStore(persistedState: unknown, version: number) {
  const state = persistedState as Partial<State>
  if (state && state.rankings) {
    for (const shelf of SHELVES) {
      if (!Array.isArray(state.rankings[shelf])) {
        state.rankings[shelf] = []
      }
    }
  }
  // v3: gemelas fusionadas (aliases.json) → las entradas, rankings y listas pasan a la obra que se conserva
  if (version < 3 && state?.entries && state.rankings) {
    const c = canonicalizeUserData({ entries: state.entries, rankings: state.rankings, lists: state.lists ?? [] })
    state.entries = c.entries
    state.rankings = c.rankings
    state.lists = c.lists
    state.history = []
    if (state.pendingSave) state.pendingSave = { ...state.pendingSave, ids: [...new Set(state.pendingSave.ids.map(canonicalId))] }
  }
  // v4: historial de duelos persistido y última sesión por estantería (T16)
  if (version < 4 && state) {
    if (!state.duels) {
      state.duels = { movie: {}, series: {}, book: {}, artist: {}, boardgame: {}, song: {} }
    }
    if (!state.ratings) {
      state.ratings = { movie: {}, series: {}, book: {}, artist: {}, boardgame: {}, song: {} }
    }
    if (!state.lastCompared) {
      state.lastCompared = { movie: 0, series: 0, book: 0, artist: 0, boardgame: 0, song: 0 }
    }
  }
  // v5: reparación de consistencia entre entries.ranked y rankings (§3)
  if (version < 5 && state) {
    const defaultRks = { movie: [], series: [], book: [], artist: [], boardgame: [], song: [] }
    const repaired = repairRankingsAndEntries(
      (state.entries as Record<string, UserEntry>) || {},
      (state.rankings as Record<ShelfType, string[]>) || defaultRks,
    )
    state.entries = repaired.entries
    state.rankings = repaired.rankings
  }
  return state
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...defaults(),

      completeOnboarding: (p) => set((s) => ({ onboarded: true, profile: { ...s.profile, ...p } })),
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      dismissNudge: (id) =>
        set((s) => {
          const prev = s.nudgeDismiss?.[id] || { count: 0, lastDismissedAt: 0 }
          return {
            nudgeDismiss: {
              ...(s.nudgeDismiss || {}),
              [id]: { count: prev.count + 1, lastDismissedAt: Date.now() },
            },
          }
        }),

      decayDeckLearn: (shelf) =>
        set((s) => {
          const shelvesToDecay: ShelfType[] = shelf ? [shelf] : (Object.keys(s.deckLearn || {}) as ShelfType[])
          const nextLearn = { ...s.deckLearn }
          for (const sh of shelvesToDecay) {
            const cur = nextLearn[sh]
            if (!cur) continue
            const byMacro: Record<string, any> = {}
            for (const [m, stat] of Object.entries(cur.byMacro || {})) {
              byMacro[m] = {
                shown: stat.shown * 0.8,
                seen: stat.seen * 0.8,
                up: stat.up * 0.8,
                left: stat.left * 0.8,
              }
            }
            const byDecade: Record<string, any> = {}
            for (const [d, stat] of Object.entries(cur.byDecade || {})) {
              byDecade[d] = {
                shown: stat.shown * 0.8,
                seen: stat.seen * 0.8,
                up: stat.up * 0.8,
                left: stat.left * 0.8,
              }
            }
            nextLearn[sh] = { byMacro, byDecade }
          }
          return { deckLearn: nextLearn }
        }),

      recordOrienters: (shelf, ids) =>
        set((s) => {
          const prev = s.recentOrienters?.[shelf] || []
          const updated = [ids, ...prev].slice(0, 3)
          return {
            recentOrienters: {
              ...s.recentOrienters,
              [shelf]: updated,
            },
          }
        }),

      recomputeUserVectors: () =>
        set((s) => {
          const userVectors = { ...s.userVectors }
          for (const shelf of SHELVES) {
            userVectors[shelf] = recomputeVectorForShelf(s.entries, s.rankings, shelf)
          }
          return { userVectors }
        }),

      recordDuel: (shelf, a, b, winner) =>
        set((s) => {
          const key = pairKey(a, b)
          const shelfDuels = { ...(s.duels?.[shelf] || {}) }
          shelfDuels[key] = { w: winner, at: Date.now() }
          return {
            duels: {
              ...(s.duels || {}),
              [shelf]: shelfDuels,
            },
            lastCompared: {
              ...(s.lastCompared || {}),
              [shelf]: Date.now(),
            },
          }
        }),

      deleteDuel: (shelf, a, b) =>
        set((s) => {
          const key = pairKey(a, b)
          const shelfDuels = { ...(s.duels?.[shelf] || {}) }
          delete shelfDuels[key]
          return {
            duels: {
              ...(s.duels || {}),
              [shelf]: shelfDuels,
            },
          }
        }),

      touchLastCompared: (shelf) =>
        set((s) => ({
          lastCompared: {
            ...(s.lastCompared || {}),
            [shelf]: Date.now(),
          },
        })),

      swipe: (itemId, dir) =>
        set((s) => {
          const prevEntry = s.entries[itemId]
          const shelf = shelfOf(itemId, prevEntry)
          const now = Date.now()
          const newStatus = dir === 'left' ? 'dismissed' : dir === 'up' ? 'pending' : 'seen'
          const entry: UserEntry = {
            itemId,
            shelf,
            status: newStatus,
            ranked: false,
            updatedAt: now,
            ...(dir === 'left' ? { dismissedAt: now } : {}),
          }
          const history = [...s.history, { itemId, prev: prevEntry ?? null, prevRanking: s.rankings[shelf] ?? [], shelf }].slice(-20)

          // Actualizar deckLearn (MOTOR §7.6)
          const it = getItem(itemId)
          const macro = it?.genres?.[0] || 'General'
          const decade = it?.year ? String(Math.floor(it.year / 10) * 10) : 'unknown'
          const prevShelfLearn = s.deckLearn?.[shelf] || { byMacro: {}, byDecade: {} }
          const macroStat = prevShelfLearn.byMacro[macro] || { shown: 0, seen: 0, up: 0, left: 0 }
          const decadeStat = prevShelfLearn.byDecade[decade] || { shown: 0, seen: 0, up: 0, left: 0 }

          const updatedShelfLearn: DeckLearnShelf = {
            byMacro: {
              ...prevShelfLearn.byMacro,
              [macro]: {
                shown: macroStat.shown + 1,
                seen: macroStat.seen + (dir === 'right' ? 1 : 0),
                up: macroStat.up + (dir === 'up' ? 1 : 0),
                left: macroStat.left + (dir === 'left' ? 1 : 0),
              },
            },
            byDecade: {
              ...prevShelfLearn.byDecade,
              [decade]: {
                shown: decadeStat.shown + 1,
                seen: decadeStat.seen + (dir === 'right' ? 1 : 0),
                up: decadeStat.up + (dir === 'up' ? 1 : 0),
                left: decadeStat.left + (dir === 'left' ? 1 : 0),
              },
            },
          }

          const deckLearn = {
            ...s.deckLearn,
            [shelf]: updatedShelfLearn,
          }

          track('entry_status', {
            shelf,
            itemId,
            data: { from: prevEntry?.status ?? null, to: newStatus, via: 'deck' },
          })

          const nextEntries = { ...s.entries, [itemId]: entry }
          const userVectors = {
            ...s.userVectors,
            [shelf]: recomputeVectorForShelf(nextEntries, s.rankings, shelf),
          }

          return { entries: nextEntries, history, deckLearn, userVectors }
        }),

      undoSwipe: () => {
        const h = get().history
        if (!h.length) return null
        const last = h[h.length - 1]
        set((s) => {
          const entries = { ...s.entries }
          if (last.prev) entries[last.itemId] = last.prev
          else delete entries[last.itemId]
          const nextRankings = { ...s.rankings, [last.shelf]: last.prevRanking ?? [] }
          const userVectors = {
            ...s.userVectors,
            [last.shelf]: recomputeVectorForShelf(entries, nextRankings, last.shelf),
          }
          return { entries, rankings: nextRankings, history: h.slice(0, -1), userVectors }
        })
        return last.itemId
      },

      rate: (itemId, patch) =>
        set((s) => {
          const cur = s.entries[itemId]
          const shelf = shelfOf(itemId, cur)
          const next: UserEntry = { ...(cur ?? { itemId, ranked: false }), itemId, shelf, status: 'seen', updatedAt: Date.now() } as UserEntry
          if (patch.stars === null) { delete next.stars }
          else if (patch.stars !== undefined) next.stars = patch.stars
          if (patch.comment !== undefined) { const c = patch.comment.trim(); if (c) next.comment = c; else delete next.comment }
          const nextEntries = { ...s.entries, [itemId]: next }
          const userVectors = {
            ...s.userVectors,
            [shelf]: recomputeVectorForShelf(nextEntries, s.rankings, shelf),
          }
          return { entries: nextEntries, userVectors }
        }),

      setStatus: (itemId, status) =>
        set((s) => {
          const entries = { ...s.entries }
          const cur = entries[itemId]
          const shelf = shelfOf(itemId, cur)
          let ranking = s.rankings[shelf] ?? []
          if (status === null) { delete entries[itemId]; ranking = ranking.filter((x) => x !== itemId) }
          else {
            if (status === 'seen') entries[itemId] = { ...(cur ?? { itemId, ranked: false }), itemId, shelf, status, updatedAt: Date.now() } as UserEntry
            else {
              entries[itemId] = { itemId, shelf, status, ranked: false, ...(cur?.origin ? { origin: cur.origin } : {}), updatedAt: Date.now(), ...(status === 'dismissed' ? { dismissedAt: Date.now() } : {}) }
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
          const nextRankings = { ...s.rankings, [shelf]: ranking }
          const userVectors = {
            ...s.userVectors,
            [shelf]: recomputeVectorForShelf(entries, nextRankings, shelf),
          }
          return { entries, rankings: nextRankings, userVectors }
        }),

      // §5.3: manda el A/B; las estrellas de cada item se ajustan a las de sus vecinos
      applyRanking: (shelf, ranking, placedId, ratingsPatch) =>
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
          const nextRankings = { ...s.rankings, [shelf]: ranking }
          const nextRatings = ratingsPatch
            ? { ...(s.ratings || {}), [shelf]: { ...(s.ratings?.[shelf] || {}), ...ratingsPatch } }
            : s.ratings
          const userVectors = {
            ...s.userVectors,
            [shelf]: recomputeVectorForShelf(entries, nextRankings, shelf),
          }
          return { entries, rankings: nextRankings, ratings: nextRatings, userVectors }
        }),

      setRatings: (shelf, shelfRatings) =>
        set((s) => ({
          ratings: {
            ...(s.ratings || {}),
            [shelf]: shelfRatings,
          },
        })),

      // Colocación provisional SIN comparaciones: con estrellas, en el límite inferior de su franja (Comparar la afina)
      placeProvisional: (itemId) =>
        set((s) => {
          const e = s.entries[itemId]
          const shelf = shelfOf(itemId, e)
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
          const nextEntries = { ...s.entries, [itemId]: { ...e, shelf, ranked: true, provisional: true } }
          const nextRankings = { ...s.rankings, [shelf]: ranking }
          const userVectors = {
            ...s.userVectors,
            [shelf]: recomputeVectorForShelf(nextEntries, nextRankings, shelf),
          }
          return { entries: nextEntries, rankings: nextRankings, userVectors }
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
          const affectedShelves = new Set<ShelfType>()
          for (const id of ids)
            if (!entries[id] || entries[id].status === 'dismissed') {
              const shelf = shelfOf(id, entries[id])
              affectedShelves.add(shelf)
              entries[id] = { itemId: id, shelf, status: 'pending', ranked: false, origin, updatedAt: Date.now() }
              n++
            }
          const userVectors = { ...s.userVectors }
          for (const sh of affectedShelves) {
            userVectors[sh] = recomputeVectorForShelf(entries, s.rankings, sh)
          }
          return { entries, userVectors }
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
          const quota: Record<ShelfType, number> = { movie: 10, series: 6, book: 4, artist: 4, boardgame: 4, song: 0 }
          for (const t of SHELVES) {
            const pool = items.filter((i) => i.type === t && !entries[i.id]).sort((a, b) => b.popularity - a.popularity).slice(0, quota[t])
            for (const it of pool) entries[it.id] = { itemId: it.id, status: 'seen', ranked: false, updatedAt: Date.now() }
          }
          const userVectors = { ...s.userVectors }
          for (const t of SHELVES) {
            userVectors[t] = recomputeVectorForShelf(entries, s.rankings, t)
          }
          return { entries, userVectors }
        }),

      resetAll: () => set({ ...defaults() }),
    }),
    {
      name: 'biblioteca-v1',
      version: 5,
      migrate: migrateStore,
      merge: (persistedState: unknown, currentState: State) => {
        const p = (persistedState as Partial<State>) ?? {}
        const mergedRankings = { ...currentState.rankings, ...(p.rankings || {}) }
        for (const shelf of SHELVES) {
          if (!Array.isArray(mergedRankings[shelf])) {
            mergedRankings[shelf] = []
          }
        }
        const rawEntries = (p.entries as Record<string, UserEntry>) || currentState.entries || {}
        // Reparación de consistencia al cargar (§3)
        const repaired = repairRankingsAndEntries(rawEntries, mergedRankings)
        const mergedEntries = repaired.entries
        const finalRankings = repaired.rankings

        const mergedVectors = { ...currentState.userVectors, ...(p.userVectors || {}) }
        for (const shelf of SHELVES) {
          if (!mergedVectors[shelf] && Object.values(mergedEntries).some((e) => e.shelf === shelf)) {
            mergedVectors[shelf] = recomputeVectorForShelf(mergedEntries, finalRankings, shelf)
          }
        }
        const mergedDuels = { ...currentState.duels, ...(p.duels || {}) }
        for (const shelf of SHELVES) {
          if (!mergedDuels[shelf]) mergedDuels[shelf] = {}
        }
        const mergedRatings = { ...currentState.ratings, ...(p.ratings || {}) }
        for (const shelf of SHELVES) {
          if (!mergedRatings[shelf]) mergedRatings[shelf] = {}
        }
        const mergedLastCompared = { ...currentState.lastCompared, ...(p.lastCompared || {}) }
        for (const shelf of SHELVES) {
          if (typeof mergedLastCompared[shelf] !== 'number') mergedLastCompared[shelf] = 0
        }
        return {
          ...currentState,
          ...p,
          entries: mergedEntries,
          rankings: finalRankings,
          userVectors: mergedVectors,
          duels: mergedDuels,
          ratings: mergedRatings,
          lastCompared: mergedLastCompared,
        }
      },
    },
  ),
)

export const starsOfEntries = (entries: Record<string, UserEntry>) => (id: string) => entries[id]?.stars
