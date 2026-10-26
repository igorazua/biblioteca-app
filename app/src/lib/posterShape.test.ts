import { describe, expect, it } from 'vitest'
import {
  BOARDGAME_RATIO,
  boardgameDeckLayout,
  boardgameDetailAspect,
  posterAspectClass,
  posterBox,
  posterRadius,
  posterShape,
  duelCardSize,
  duelFitSize,
  getDuelFit,
  setDuelFit,
  type DuelFit,
  DUEL_FIT_KEY,
} from './posterShape'

describe('posterShape & ARTIST_ROUND (T27)', () => {
  it('artist y song son square; el resto portrait', () => {
    expect(posterShape('artist')).toBe('square')
    expect(posterShape('song')).toBe('square')
    expect(posterShape('movie')).toBe('portrait')
    expect(posterShape('series')).toBe('portrait')
    expect(posterShape('book')).toBe('portrait')
    expect(posterShape('boardgame')).toBe('portrait')
    expect(posterShape(null)).toBe('portrait')
    expect(posterShape(undefined)).toBe('portrait')
  })

  it('posterAspectClass devuelve aspect-square o aspect-[2/3]', () => {
    expect(posterAspectClass('artist')).toBe('aspect-square')
    expect(posterAspectClass('song')).toBe('aspect-square')
    expect(posterAspectClass('movie')).toBe('aspect-[2/3]')
  })

  it('posterBox usa la forma real de juegos de mesa y la proporción fija del resto (T32)', () => {
    expect(posterBox({ type: 'boardgame', posterRatio: 0.7 })).toEqual({ className: '', style: { aspectRatio: '0.7' } })
    expect(posterBox({ type: 'boardgame', posterRatio: 3 })).toEqual({ className: '', style: { aspectRatio: '2' } })
    expect(posterBox({ type: 'boardgame' })).toEqual({ className: 'aspect-[2/3]' })
    expect(posterBox({ type: 'movie' })).toEqual({ className: 'aspect-[2/3]' })
    expect(posterBox({ type: 'artist' })).toEqual({ className: 'aspect-square' })
  })

  it('posterRadius respeta el flag ARTIST_ROUND', () => {
    expect(posterRadius('artist', 12)).toBe(12)
    expect(posterRadius('movie', 12)).toBe(12)
  })
})

describe('T29: Formas de juegos de mesa (boardgameDeckLayout y boardgameDetailAspect)', () => {
  it('constantes BOARDGAME_RATIO están definidas según especificación', () => {
    expect(BOARDGAME_RATIO).toEqual({
      deckTopFrom: 0.9,
      deckMin: 1,
      deckMax: 1.6,
      detailMin: 0.75,
      detailMax: 1.6,
    })
  })

  it('ratio undefined → portrait en mazo, null en ficha', () => {
    expect(boardgameDeckLayout(undefined)).toEqual({ mode: 'portrait' })
    expect(boardgameDetailAspect(undefined)).toBeNull()
  })

  it('ratio 0.71 (caja vertical estrecha) → portrait en mazo, 0.75 en ficha (clamp detailMin)', () => {
    expect(boardgameDeckLayout(0.71)).toEqual({ mode: 'portrait' })
    expect(boardgameDetailAspect(0.71)).toBe(0.75)
  })

  it('ratio 0.9 (umbral inferior) → top con aspect 1 (clamp deckMin)', () => {
    expect(boardgameDeckLayout(0.9)).toEqual({ mode: 'top', aspect: 1 })
    expect(boardgameDetailAspect(0.9)).toBe(0.9)
  })

  it('ratio 1.0 (caja cuadrada) → top con aspect 1', () => {
    expect(boardgameDeckLayout(1.0)).toEqual({ mode: 'top', aspect: 1 })
    expect(boardgameDetailAspect(1.0)).toBe(1.0)
  })

  it('ratio 1.3 (caja apaisada moderada) → top con aspect 1.3', () => {
    expect(boardgameDeckLayout(1.3)).toEqual({ mode: 'top', aspect: 1.3 })
    expect(boardgameDetailAspect(1.3)).toBe(1.3)
  })

  it('ratio 2.4 (caja panorámica extrema) → top 1.6 en mazo y 1.6 en ficha (clamp max)', () => {
    expect(boardgameDeckLayout(2.4)).toEqual({ mode: 'top', aspect: 1.6 })
    expect(boardgameDetailAspect(2.4)).toBe(1.6)
  })
})

describe('T31: Duelos de juegos de mesa: tamaños de cartas adaptables', () => {
  const BOX_W = 180
  const BOX_H = 300
  const MODES: DuelFit[] = ['alto', 'area', 'caja']

  const PAIRS: { name: string; rA: number; rB: number }[] = [
    { name: 'vertical 0.7 contra apaisada 1.4', rA: 0.7, rB: 1.4 },
    { name: 'cuadrada contra cuadrada', rA: 1.0, rB: 1.0 },
    { name: 'vertical contra vertical', rA: 0.7, rB: 0.7 },
  ]

  for (const { name, rA, rB } of PAIRS) {
    describe(`Pareja: ${name}`, () => {
      for (const mode of MODES) {
        it(`modo ${mode}: respeta hueco, proporción y propiedad del modo`, () => {
          const cardA = duelCardSize(rA, rB, BOX_W, BOX_H, mode)
          const cardB = duelCardSize(rB, rA, BOX_W, BOX_H, mode)

          // 1. Ninguna carta se sale del hueco
          expect(cardA.w).toBeLessThanOrEqual(BOX_W + 1e-4)
          expect(cardA.h).toBeLessThanOrEqual(BOX_H + 1e-4)
          expect(cardB.w).toBeLessThanOrEqual(BOX_W + 1e-4)
          expect(cardB.h).toBeLessThanOrEqual(BOX_H + 1e-4)

          // 2. Se respeta la proporción de cada carta (con un margen de 0.01)
          expect(Math.abs(cardA.w / cardA.h - rA)).toBeLessThanOrEqual(0.01)
          expect(Math.abs(cardB.w / cardB.h - rB)).toBeLessThanOrEqual(0.01)

          // 3. En area, las dos superficies son iguales (con un margen del 1 %)
          if (mode === 'area') {
            const sA = cardA.w * cardA.h
            const sB = cardB.w * cardB.h
            const diff = Math.abs(sA - sB) / Math.max(sA, sB)
            expect(diff).toBeLessThanOrEqual(0.01)
          }

          // 4. En alto, las dos alturas son iguales
          if (mode === 'alto') {
            expect(Math.abs(cardA.h - cardB.h)).toBeLessThanOrEqual(0.01)
          }
        })
      }
    })
  }

  it('duelFitSize escala la carta a pantalla completa respetando márgenes y proporción', () => {
    const screenW = 390
    const screenH = 700
    const margin = 26

    // Vertical (0.7)
    const fitVert = duelFitSize(0.7, screenW, screenH, margin)
    expect(fitVert.fitW).toBeLessThanOrEqual(screenW - 2 * margin + 1e-4)
    expect(fitVert.fitH).toBeLessThanOrEqual(screenH - 2 * margin + 1e-4)
    expect(Math.abs(fitVert.fitW / fitVert.fitH - 0.7)).toBeLessThanOrEqual(0.01)

    // Apaisada (1.4)
    const fitHoriz = duelFitSize(1.4, screenW, screenH, margin)
    expect(fitHoriz.fitW).toBeLessThanOrEqual(screenW - 2 * margin + 1e-4)
    expect(fitHoriz.fitH).toBeLessThanOrEqual(screenH - 2 * margin + 1e-4)
    expect(Math.abs(fitHoriz.fitW / fitHoriz.fitH - 1.4)).toBeLessThanOrEqual(0.01)
  })

  it('persistencia de duelFit en localStorage con fallback seguro', () => {
    const store: Record<string, string> = {}
    const mockStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v
      },
      removeItem: (k: string) => {
        delete store[k]
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k])
      },
    }
    const orig = (globalThis as any).localStorage
    ;(globalThis as any).localStorage = mockStorage
    try {
      mockStorage.removeItem(DUEL_FIT_KEY)
      expect(getDuelFit()).toBe('area')

      setDuelFit('alto')
      expect(getDuelFit()).toBe('alto')

      setDuelFit('caja')
      expect(getDuelFit()).toBe('caja')

      setDuelFit('area')
      expect(getDuelFit()).toBe('area')
    } finally {
      ;(globalThis as any).localStorage = orig
    }
  })
})
