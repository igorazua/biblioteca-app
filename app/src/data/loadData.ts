// Carga perezosa de los datos grandes de la PWA (antes dentro de data/catalog.ts, data/songs.ts, lib/engine/features.ts
// y lib/engine/loadEngine.ts). @biblioteca/core no lee nada por su cuenta: aquí se cargan los JSON con `import()` (un
// trozo por archivo, como antes) y se le entregan con `setShelfCatalog`, `setShelfEngine` y `setSongs`.
// cross.json no se carga: la PWA nunca llamaba a `loadCrossEngine`, así que las recomendaciones entre estanterías
// siguen vacías, igual que antes.
import { useEffect, useState } from 'react'
import {
  SHELF_ENABLED,
  engineLoadOrder,
  isSongsLoaded,
  isShelfLoaded,
  itemsOfType,
  setShelfCatalog,
  setShelfEngine,
  setSongs,
  shelfPrefetchOrder,
  subscribeSongs,
  type Item,
  type ShelfEngine,
  type ShelfType,
} from '@biblioteca/core'
import { useStore } from '../store/useStore'

/* ------------------------------------------------------------ detalle de cada estantería */

const shelfLoaders: Partial<Record<ShelfType, () => Promise<{ default: unknown }>>> = {
  movie: () => import('./shelves/movie.json'),
  series: () => import('./shelves/series.json'),
  book: () => import('./shelves/book.json'),
  boardgame: () => import('./shelves/boardgame.json'),
  artist: () => import('./shelves/artist.json'),
}

const shelfPromises = new Map<ShelfType, Promise<Item[]>>()

/** Carga los detalles completos de una estantería y los fusiona en el catálogo en memoria. */
export function ensureShelfCatalog(shelf: ShelfType): Promise<Item[]> {
  if (shelf === 'song') return Promise.resolve(itemsOfType('song'))
  if (isShelfLoaded(shelf)) {
    return Promise.resolve(itemsOfType(shelf))
  }
  const hit = shelfPromises.get(shelf)
  if (hit) return hit

  const loader = shelfLoaders[shelf]
  if (!loader) return Promise.resolve([])

  const p = loader()
    .then((mod) => {
      const shelfItems = mod.default as Item[]
      // fusiona y avisa con `subscribeCatalog` (useCatalog sube `version` y despierta, p. ej., ItemDetail)
      setShelfCatalog(shelf, shelfItems)
      return shelfItems
    })
    .catch((err) => {
      console.error(`Error al cargar catálogo de estantería ${shelf}:`, err)
      shelfPromises.delete(shelf)
      return []
    })

  shelfPromises.set(shelf, p)
  return p
}

/** Precarga las estanterías en segundo plano sin bloquear la primera pantalla. */
export function prefetchShelfCatalogs(first?: ShelfType): void {
  let chain: Promise<unknown> = Promise.resolve()
  for (const s of shelfPrefetchOrder(first)) {
    chain = chain.then(() => ensureShelfCatalog(s)).catch(() => false)
  }
}

/* ------------------------------------------------------------ vectores del motor */

const engineLoaders: Partial<Record<ShelfType, () => Promise<{ default: unknown }>>> = {
  movie: () => import('./engine/movie.json'),
  series: () => import('./engine/series.json'),
  book: () => import('./engine/book.json'),
  boardgame: () => import('./engine/boardgame.json'),
  artist: () => import('./engine/artist.json'),
}

const engineCache = new Map<ShelfType, ShelfEngine | null>()

/** Carga engine/<shelf>.json y se lo entrega al motor. Sin archivo, o si falla, el motor degrada a géneros. */
export async function loadShelfEngine(shelf: ShelfType): Promise<ShelfEngine | null> {
  const hit = engineCache.get(shelf)
  if (hit) return hit
  try {
    const loader = engineLoaders[shelf]
    if (!loader) return null
    const mod = await loader()
    const data = setShelfEngine(shelf, ((mod as { default?: unknown }).default ?? mod) as ShelfEngine)
    if (data) engineCache.set(shelf, data)
    return data
  } catch {
    // Modo degradado: el archivo aún no existe o no se pudo cargar
    return null
  }
}

const engineLoading = new Map<ShelfType, Promise<boolean>>()

/** Carga la estantería (una sola vez) y recalcula los vectores de usuario cuando llega. */
export function ensureShelfEngine(shelf: ShelfType): Promise<boolean> {
  const hit = engineLoading.get(shelf)
  if (hit) return hit
  const p = loadShelfEngine(shelf).then((e) => {
    if (e) useStore.getState().recomputeUserVectors()
    return Boolean(e)
  })
  engineLoading.set(shelf, p)
  return p
}

/** Tras pintar la app: primero la estantería que se está usando, luego las demás, una detrás de otra. */
export function prefetchEngines(first?: ShelfType): void {
  let chain: Promise<unknown> = Promise.resolve()
  for (const s of engineLoadOrder(first)) chain = chain.then(() => ensureShelfEngine(s)).catch(() => false)
}

/* ------------------------------------------------------------ canciones (T28 §28.4) */

let songsPromise: Promise<Item[]> | null = null

/** Solo descarga public/data/songs.json si SHELF_ENABLED.song está en true; se registra en el catálogo con `setSongs`. */
export async function loadSongs(): Promise<Item[]> {
  if (!SHELF_ENABLED.song) {
    return []
  }
  if (songsPromise) {
    return songsPromise
  }

  songsPromise = (async () => {
    try {
      let data: Item[] = []
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        const res = await fetch('/data/songs.json')
        if (res.ok) {
          data = (await res.json()) as Item[]
        }
      } else {
        // Soporte para entorno de tests (Node / Vitest) sin ensuciar el empaquetado del navegador
        try {
          const fsMod = 'node:fs'
          const pathMod = 'node:path'
          const fs = await import(/* @vite-ignore */ fsMod)
          const path = await import(/* @vite-ignore */ pathMod)
          // sin tipos de Node en la PWA: process solo existe en los tests
          const cwd = (globalThis as unknown as { process: { cwd(): string } }).process.cwd()
          const p = path.resolve(cwd, 'app/public/data/songs.json')
          const altP = path.resolve(cwd, 'public/data/songs.json')
          const file = fs.existsSync(p) ? p : fs.existsSync(altP) ? altP : null
          if (file) {
            data = JSON.parse(fs.readFileSync(file, 'utf8')) as Item[]
          }
        } catch {
          data = []
        }
      }

      return setSongs(data)
    } catch (err) {
      console.warn('Error al cargar songs.json:', err)
      return []
    }
  })()

  return songsPromise
}

/** Hook reactivo para componentes que necesiten re-renderizarse al terminar la carga */
export function useSongsLoaded(): boolean {
  const [loaded, setLoaded] = useState(isSongsLoaded())

  useEffect(() => {
    if (isSongsLoaded()) {
      setLoaded(true)
      return
    }
    return subscribeSongs(() => setLoaded(true))
  }, [])

  return loaded
}
