/**
 * loadEngine.ts — Orden de carga de los vectores de cada estantería (Igor, 27/10/2026).
 *
 * Antes cargaba `engine/<shelf>.json` con `import()` y recalculaba el vector de usuario del store al llegar. Ahora
 * la app carga los archivos, se los entrega a `setShelfEngine` (features.ts) y recalcula ella los vectores de usuario;
 * aquí solo queda el orden: primero la estantería que se está usando, luego las demás.
 */
import { ACTIVE_SHELVES, type ShelfType } from '../../types'

/** Orden de precarga: la estantería en uso primero y después las activas, sin repetir ni canciones. */
export function engineLoadOrder(first?: ShelfType): ShelfType[] {
  return [...new Set([...(first ? [first] : []), ...ACTIVE_SHELVES])].filter((s) => s !== 'song')
}
