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

// ── Duelos de juegos de mesa (T31) ─────────────────────────────────────────────────────────────
export type DuelFit = 'alto' | 'area' | 'caja'
export const DUEL_FIT_KEY = 'duelFit'
export const DUEL_FIT_DEFAULT: DuelFit = 'area'
export const DUEL_FIT_EVENT = 'duel-fit-change'

export function getDuelFit(): DuelFit {
  try {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(DUEL_FIT_KEY)
      if (val === 'alto' || val === 'area' || val === 'caja') return val
    }
  } catch {}
  return DUEL_FIT_DEFAULT
}

export function setDuelFit(fit: DuelFit): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DUEL_FIT_KEY, fit)
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(DUEL_FIT_EVENT))
    }
  } catch {}
}

/**
 * Tamaño de cada carta de un duelo de juegos de mesa dentro de su hueco (boxW × boxH) (T31.2).
 * ratio es ancho / alto de esta carta y other, el de la otra.
 */
export function duelCardSize(
  ratio: number,
  other: number,
  boxW: number,
  boxH: number,
  fit: DuelFit,
): { w: number; h: number } {
  const r = Math.max(0.01, ratio)
  const ro = Math.max(0.01, other)
  const bw = Math.max(1, boxW)
  const bh = Math.max(1, boxH)

  if (fit === 'alto') {
    // 1. alto: las dos cartas miden lo mismo de alto y el ancho sale de su proporción.
    // Si una apaisada no cabe a lo ancho, las dos bajan de altura a la vez hasta que quepa.
    const h = Math.min(bh, bw / r, bw / ro)
    const w = h * r
    return { w, h }
  }

  if (fit === 'caja') {
    // 3. caja: cada carta ocupa todo lo que puede de su hueco sin deformarse (como object-contain).
    const w = Math.min(bw, bh * r)
    const h = w / r
    return { w, h }
  }

  // 2. area: las dos ocupan la misma superficie, que es la mayor posible sin salirse del hueco:
  // w = √(S·r) y h = √(S/r).
  const maxS = Math.min(
    (bw * bw) / r,
    bh * bh * r,
    (bw * bw) / ro,
    bh * bh * ro,
  )
  const w = Math.sqrt(maxS * r)
  const h = Math.sqrt(maxS / r)
  return { w, h }
}

/** Tamaño de la carta elegida al crecer a pantalla completa con su propia proporción (FIT_MARGIN = 26). */
export function duelFitSize(
  ratio: number,
  w: number,
  h: number,
  margin: number = 26,
): { fitW: number; fitH: number } {
  const maxW = Math.max(10, w - 2 * margin)
  const maxH = Math.max(10, h - 2 * margin)
  const r = Math.max(0.01, ratio)
  const fitW = Math.min(maxW, maxH * r)
  const fitH = fitW / r
  return { fitW, fitH }
}

