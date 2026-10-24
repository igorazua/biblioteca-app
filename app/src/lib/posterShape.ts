import type { ShelfType } from '../types'

export type PosterShape = 'portrait' | 'square'

/** Igor decide si los artistas van en círculo; de momento, cuadrados. Cambiar solo aquí. */
export const ARTIST_ROUND = false

const SQUARE_SHELVES = new Set<string>(['artist', 'song'])

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
