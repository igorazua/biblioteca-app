import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isAlias, setLiveItems, subscribeCatalog, type Item } from '@biblioteca/core'
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
    (set) => ({
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

      // Sin cuenta (D7) no hay nube de la que traer obras. Fase 3: aquí se pedirán a Supabase (`biblio_catalog`) las que falten,
      // saltando las del catálogo semilla (`isSeedItem`) y las que ya estén en `items`, en trozos de 100.
      ensureItems: async () => {},
    }),
    {
      name: 'biblio-catalog-cache',
      storage: jsonStorage(),
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
