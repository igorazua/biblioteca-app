import { useSyncExternalStore } from 'react'
import { subscribeCatalog, type ShelfType } from '@biblioteca/core'
import type { IconName } from '../Icon'

/** Colores y iconos de cada estantería (Shelf.tsx:22-23 de la PWA). `song` no está en tokens: se usa el color de la PWA. */
export const SHELF_ICON: Record<ShelfType, IconName> = { movie: 'film', series: 'tv', book: 'bookOpen', artist: 'music', boardgame: 'dice', song: 'disc' }

/** Color de la PWA para el porcentaje de «ordenado» (`pctColor`, CompareHome.tsx:26). Hace falta en Biblioteca y Estantería. */
export function pctColor(p: number): string {
  if (p >= 80) return '#3ec878'
  if (p >= 55) return '#e8c547'
  if (p >= 30) return '#f2913a'
  return '#ef4b4b'
}

/** Las seis estanterías de la PWA para «Votar nuevas estanterías» (Library.tsx:31-35), con su base de votos de ejemplo. */
export const FUTURE_SHELVES: [string, number][] = [
  ['Documentales', 214], ['Anime', 187], ['Podcasts', 163], ['Videojuegos', 241],
  ['Cómics y manga', 152], ['Canales de YouTube', 121], ['Restaurantes', 233],
]

let catalogTick = 0
const subscribeTick = (cb: () => void) =>
  subscribeCatalog(() => {
    catalogTick += 1
    cb()
  })
const getTick = () => catalogTick

/** Vuelve a pintar la pantalla cuando cambia el catálogo (llega el detalle de una estantería). */
export function useCatalogTick(): number {
  return useSyncExternalStore(subscribeTick, getTick)
}
