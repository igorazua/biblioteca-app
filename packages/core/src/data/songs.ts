/**
 * songs.ts — Registro del catálogo de canciones (T28 §28.4)
 *
 * Antes descargaba public/data/songs.json (fetch en el navegador, fs en los tests) y traía un hook de React.
 * Ahora la app carga el JSON (solo si SHELF_ENABLED.song está en true) y lo entrega con `setSongs`; se registra
 * en el índice general de catalog.ts (getItem / itemsOfType). `subscribeSongs` (catalog.ts) avisa cuando llegan.
 */

import { SHELF_ENABLED } from '../config'
import type { Item } from '../types'
import { registerLoadedSongs } from './catalog'

let songsLoaded = false

export function isSongsLoaded(): boolean {
  return songsLoaded
}

/** Entrega las canciones ya cargadas. Con el interruptor de canciones apagado no hace nada y devuelve []. */
export function setSongs(data: Item[]): Item[] {
  if (!SHELF_ENABLED.song) return []
  songsLoaded = true
  registerLoadedSongs(data)
  return data
}
