// Solo para tests: entrega al motor los vectores de una estantería (engine/<shelf>.json de la PWA), como hace la app.
import { setShelfEngine, type ShelfEngine } from '../lib/engine/features'
import type { ShelfType } from '../types'

const loaders: Partial<Record<ShelfType, () => Promise<{ default: unknown }>>> = {
  movie: () => import('@data/engine/movie.json'),
  series: () => import('@data/engine/series.json'),
  book: () => import('@data/engine/book.json'),
  boardgame: () => import('@data/engine/boardgame.json'),
  artist: () => import('@data/engine/artist.json'),
}

export async function loadShelfEngine(shelf: ShelfType): Promise<ShelfEngine | null> {
  const loader = loaders[shelf]
  if (!loader) return null
  try {
    const mod = await loader()
    return setShelfEngine(shelf, mod.default as ShelfEngine)
  } catch {
    return null
  }
}
