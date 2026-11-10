import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isAlias, isSeedItem, setLiveItems, subscribeCatalog, type Item } from '@biblioteca/core'
import { supabase } from '../lib/supabase'
import { jsonStorage } from '../lib/storage'
import { markHydrated } from './hydrationFlags'

export interface CatalogState {
  /** Caché viva: obras que no están en el catálogo semilla (añadidas por el usuario o traídas de la nube). Se entrega a core con `setLiveItems`. */
  items: Record<string, Item>
  /** Sube cuando cambia el catálogo (obra viva nueva, o llega el índice o el detalle de una estantería): las pantallas lo seleccionan para refrescarse. */
  version: number
  _hasHydrated: boolean
  setHasHydrated: (v: boolean) => void
  addItems: (newItems: Item[]) => void
  ensureItems: (ids: string[]) => Promise<void>
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
            // la nube aún puede devolver la gemela fusionada (p. ej. «inception-2010»): la del seed ya la cubre
            if (item && item.id && !isAlias(item.id)) {
              next[item.id] = item
              changed = true
            }
          }
          if (!changed) return state
          return { items: next, version: state.version + 1 }
        })
      },

      // Trae de Supabase (`biblio_catalog`) las obras que faltan, en trozos de 100: las que no son del catálogo semilla ni están
      // ya en la caché viva. Sin Supabase (sin `.env.local`) no hace nada, como la PWA sin conexión.
      ensureItems: async (ids) => {
        if (!ids || ids.length === 0 || !supabase) return
        const missing = Array.from(new Set(ids)).filter((id) => !isSeedItem(id) && !get().items[id])
        if (missing.length === 0) return

        for (let i = 0; i < missing.length; i += 100) {
          const chunk = missing.slice(i, i + 100)
          try {
            const { data, error } = await supabase.from('biblio_catalog').select('data').in('id', chunk)
            if (!error && data && data.length > 0) {
              const fetched = data.map((d: { data: Item }) => d.data).filter(Boolean)
              if (fetched.length > 0) get().addItems(fetched)
            }
          } catch (err) {
            console.warn('Error fetching items from biblio_catalog:', err)
          }
        }
      },
    }),
    {
      name: 'biblio-catalog-cache',
      storage: jsonStorage(),
      skipHydration: true, // la rehidratación la lanza `hydrateAll` cuando el catálogo ya está cargado
      partialize: (state) => ({ items: state.items, version: state.version }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
        markHydrated('catalog')
      },
    }
  )
)

// La caché viva vive en core: se le entrega cada vez que cambia `items` (acciones, `setState` directo o rehidratación).
useCatalog.subscribe((s, prev) => {
  if (s.items !== prev.items) setLiveItems(s.items)
})

// Sustituye al `version++` que la PWA hacía en `catalog.ts` al llegar el índice o el detalle de una estantería.
subscribeCatalog(() => useCatalog.setState((s) => ({ version: s.version + 1 })))
