/**
 * loadEngine.ts — Carga los vectores de cada estantería en la app (Igor, 27/10/2026).
 *
 * Hasta ahora `engine/<shelf>.json` no se cargaba nunca fuera de los tests: Descubrir, Decidir y el vector de
 * usuario trabajaban sin el espacio de obras. Ahora se cargan perezosamente (un trozo por estantería) y, cada vez
 * que llega uno, se recalcula el vector de usuario, que siempre queda en el espacio de la versión cargada.
 */
import { loadShelfEngine } from './features'
import { useStore } from '../../store/useStore'
import { ACTIVE_SHELVES, type ShelfType } from '../../types'

const loading = new Map<ShelfType, Promise<boolean>>()

/** Carga la estantería (una sola vez) y recalcula los vectores de usuario cuando llega. */
export function ensureShelfEngine(shelf: ShelfType): Promise<boolean> {
  const hit = loading.get(shelf)
  if (hit) return hit
  const p = loadShelfEngine(shelf).then((e) => {
    if (e) useStore.getState().recomputeUserVectors()
    return Boolean(e)
  })
  loading.set(shelf, p)
  return p
}

/** Tras pintar la app: primero la estantería que se está usando, luego las demás, una detrás de otra. */
export function prefetchEngines(first?: ShelfType): void {
  const order = [...new Set([...(first ? [first] : []), ...ACTIVE_SHELVES])].filter((s) => s !== 'song')
  let chain: Promise<unknown> = Promise.resolve()
  for (const s of order) chain = chain.then(() => ensureShelfEngine(s)).catch(() => false)
}
