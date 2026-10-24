/**
 * songs.ts — Carga dinámica en cliente del catálogo de canciones (T28 §28.4)
 *
 * Solo descarga public/data/songs.json si SHELF_ENABLED.song está en true.
 * Las canciones se registran en el índice general de catalog.ts (getItem / itemsOfType).
 */

import { useEffect, useState } from 'react'
import { SHELF_ENABLED } from '../config'
import type { Item } from '../types'
import { registerLoadedSongs, subscribeSongs } from './catalog'

let loadPromise: Promise<Item[]> | null = null
let songsLoaded = false

export function isSongsLoaded(): boolean {
  return songsLoaded
}

export async function loadSongs(): Promise<Item[]> {
  if (!SHELF_ENABLED.song) {
    return []
  }
  if (loadPromise) {
    return loadPromise
  }

  loadPromise = (async () => {
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
          const p = path.resolve(process.cwd(), 'app/public/data/songs.json')
          const altP = path.resolve(process.cwd(), 'public/data/songs.json')
          const file = fs.existsSync(p) ? p : fs.existsSync(altP) ? altP : null
          if (file) {
            data = JSON.parse(fs.readFileSync(file, 'utf8')) as Item[]
          }
        } catch {
          data = []
        }
      }

      songsLoaded = true
      registerLoadedSongs(data)
      return data
    } catch (err) {
      console.warn('Error al cargar songs.json:', err)
      return []
    }
  })()

  return loadPromise
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
