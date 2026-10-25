import { describe, expect, it } from 'vitest'
import {
  BOARDGAME_RATIO,
  boardgameDeckLayout,
  boardgameDetailAspect,
  posterAspectClass,
  posterRadius,
  posterShape,
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
