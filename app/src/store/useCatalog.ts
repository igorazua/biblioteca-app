import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import { get, set, del } from 'idb-keyval'
import { supabase } from '../lib/supabase'
import type { Item } from '../types'

const memoryStore = new Map<string, string>()

const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof indexedDB === 'undefined') {
      return memoryStore.get(name) ?? null
    }
    try {
      return (await get(name)) || null
    } catch {
      return memoryStore.get(name) ?? null
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (typeof indexedDB === 'undefined') {
      memoryStore.set(name, value)
      return
    }
    try {
      await set(name, value)
    } catch {
      memoryStore.set(name, value)
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (typeof indexedDB === 'undefined') {
      memoryStore.delete(name)
      return
    }
    try {
      await del(name)
    } catch {
      memoryStore.delete(name)
    }
  },
}

export interface CatalogState {
  items: Record<string, Item>
  version: number
  _hasHydrated: boolean
  setHasHydrated: (v: boolean) => void
  addItems: (newItems: Item[]) => void
  ensureItems: (ids: string[]) => Promise<void>
}

let seedChecker: ((id: string) => boolean) | null = null
export const setSeedChecker = (fn: (id: string) => boolean) => {
  seedChecker = fn
}

export const useCatalog = create<CatalogState>()(
  persist(
    (set, get) => ({
      items: {},
      version: 0,
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),

      addItems: (newItems) => {
        if (!newItems || newItems.length === 0) return
        set((state) => {
          const next = { ...state.items }
          let changed = false
          for (const item of newItems) {
            if (item && item.id) {
              next[item.id] = item
              changed = true
            }
          }
          if (!changed) return state
          return { items: next, version: state.version + 1 }
        })
      },

      ensureItems: async (ids) => {
        if (!ids || ids.length === 0) return
        const currentItems = get().items
        const missing = Array.from(new Set(ids)).filter(
          (id) => (!seedChecker || !seedChecker(id)) && !currentItems[id]
        )

        if (missing.length === 0 || !supabase) return

        for (let i = 0; i < missing.length; i += 100) {
          const chunk = missing.slice(i, i + 100)
          try {
            const { data, error } = await supabase
              .from('biblio_catalog')
              .select('data')
              .in('id', chunk)

            if (!error && data && data.length > 0) {
              const fetched = data.map((d: any) => d.data as Item).filter(Boolean)
              if (fetched.length > 0) {
                get().addItems(fetched)
              }
            }
          } catch (err) {
            console.warn('Error fetching items from biblio_catalog:', err)
          }
        }
      },
    }),
    {
      name: 'biblio-catalog-cache',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({ items: state.items, version: state.version }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
