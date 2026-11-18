import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { getItem, ACTIVE_SHELVES, type Item, type ShelfType } from '@biblioteca/core'
import { displayTitle } from '@biblioteca/core/src/lib/locale'
import { userLang } from '../lib/userLang'
import { ensureShelfCatalog } from '../data/loadData'
import { useStore } from '../store/useStore'
import { useCatalog } from '../store/useCatalog'

/** Color de cada estantería (los mismos tonos que `--color-shelf-*`). */
export const SHELF_TINT: Record<ShelfType, string> = {
  movie: 'var(--color-shelf-movie)',
  series: 'var(--color-shelf-series)',
  book: 'var(--color-shelf-book)',
  artist: 'var(--color-shelf-artist)',
  boardgame: 'var(--color-shelf-boardgame)',
  song: '#c084fc',
}

export const isShelf = (s: string | undefined): s is ShelfType => !!s && (ACTIVE_SHELVES as readonly string[]).includes(s)

export const titleOf = (it: Item) => displayTitle(it, userLang())

/**
 * Carga en segundo plano el catálogo detallado de las estanterías y se suscribe a la versión del catálogo,
 * para que pósteres y títulos se repinten al llegar (como ItemDetail).
 */
export function useCatalogFor(shelves: readonly ShelfType[]): number {
  const version = useCatalog((s) => s.version)
  const key = shelves.join(',')
  useEffect(() => {
    for (const s of shelves) ensureShelfCatalog(s)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return version
}

export interface ShelfData {
  shelf: ShelfType
  /** ranking real (fuente de verdad), solo obras que existen en el catálogo */
  ranked: string[]
  /** vistas que aún no están colocadas (nuevas o provisionales) */
  unranked: string[]
  pending: string[]
  seen: number
}

/** Ranking, nuevas y pendientes de una estantería, leídos del store como en Shelf.tsx. */
export function useShelfData(shelf: ShelfType): ShelfData {
  const entries = useStore((s) => s.entries)
  const ranking = useStore((s) => s.rankings[shelf])
  const version = useCatalog((s) => s.version)
  return useMemo(() => shelfData(shelf, entries, ranking ?? []), [shelf, entries, ranking, version])
}

export function shelfData(shelf: ShelfType, entries: ReturnType<typeof useStore.getState>['entries'], ranking: string[]): ShelfData {
  const mine = Object.values(entries).filter((e) => (e.shelf ?? getItem(e.itemId)?.type) === shelf)
  const seenE = mine.filter((e) => e.status === 'seen')
  const prov = new Set(seenE.filter((e) => e.provisional).map((e) => e.itemId))
  const ranked = ranking.filter((id) => !prov.has(id) && getItem(id))
  const inRank = new Set(ranked)
  return {
    shelf,
    ranked,
    unranked: seenE.filter((e) => !inRank.has(e.itemId) && getItem(e.itemId)).map((e) => e.itemId),
    pending: mine.filter((e) => e.status === 'pending' && getItem(e.itemId)).map((e) => e.itemId),
    seen: seenE.length,
  }
}

/** Alto de la ventana, reactivo (para dimensionar carátulas y escenarios). */
export function useViewportH(): number {
  return useSyncExternalStore(
    (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) },
    () => window.innerHeight,
    () => 900,
  )
}

export function useViewportW(): number {
  return useSyncExternalStore(
    (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) },
    () => window.innerWidth,
    () => 1440,
  )
}

/** Todas las estanterías activas de golpe (para Inicio). */
export function useAllShelves(order: readonly ShelfType[]): ShelfData[] {
  const entries = useStore((s) => s.entries)
  const rankings = useStore((s) => s.rankings)
  const version = useCatalog((s) => s.version)
  return useMemo(() => order.map((s) => shelfData(s, entries, rankings[s] ?? [])), [order, entries, rankings, version])
}
