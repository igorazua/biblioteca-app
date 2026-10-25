import type { ShelfType } from '../types'

export type PosterShape = 'portrait' | 'square'

/** Igor decide si los artistas van en círculo; de momento, cuadrados. Cambiar solo aquí. */
export const ARTIST_ROUND = false

const SQUARE_SHELVES = new Set<string>(['artist', 'song'])

/** Cómo se pinta la portada de un juego de mesa en la ficha y en la tarjeta del mazo (T29). */
export type BoardgameLayout =
  | { mode: 'portrait' }                  // como ahora: hueco vertical a sangre, imagen entera y relleno difuminado
  | { mode: 'top'; aspect: number }       // imagen arriba a todo el ancho con esta proporción (ancho / alto) e información debajo

export const BOARDGAME_RATIO = { deckTopFrom: 0.9, deckMin: 1, deckMax: 1.6, detailMin: 0.75, detailMax: 1.6 }

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max)
}

export function boardgameDeckLayout(ratio?: number): BoardgameLayout {
  if (ratio == null || ratio < BOARDGAME_RATIO.deckTopFrom) {
    return { mode: 'portrait' }
  }
  return { mode: 'top', aspect: clamp(ratio, BOARDGAME_RATIO.deckMin, BOARDGAME_RATIO.deckMax) }
}

export function boardgameDetailAspect(ratio?: number): number | null {
  if (ratio == null) return null
  return clamp(ratio, BOARDGAME_RATIO.detailMin, BOARDGAME_RATIO.detailMax)
}

/** artist y song → 'square'; el resto → 'portrait' */
export function posterShape(type?: ShelfType | null): PosterShape {
  return type && SQUARE_SHELVES.has(type) ? 'square' : 'portrait'
}

/** 'aspect-square' | 'aspect-[2/3]' */
export function posterAspectClass(type?: ShelfType | null): string {
  return posterShape(type) === 'square' ? 'aspect-square' : 'aspect-[2/3]'
}

/** Con ARTIST_ROUND, '50%' para artistas; si no, el radio base */
export function posterRadius(type?: ShelfType | null, base: number = 10): number | string {
  if (ARTIST_ROUND && type === 'artist') return '50%'
  return base
}
