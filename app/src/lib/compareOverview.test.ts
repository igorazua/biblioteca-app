import { describe, expect, it } from 'vitest'
import { computeCompareOverview } from './compareOverview'
import { pairKey } from './ranking'
import type { ShelfType, UserEntry, DuelRecord } from '../types'

describe('compareOverview', () => {
  it('calcula pulido, sinOrdenar y disponible correctamente', () => {
    const entries: Record<string, UserEntry> = {
      'movie:1': { itemId: 'movie:1', shelf: 'movie', status: 'seen', ranked: true, updatedAt: 1 },
      'movie:2': { itemId: 'movie:2', shelf: 'movie', status: 'seen', ranked: true, updatedAt: 2 },
      'movie:3': { itemId: 'movie:3', shelf: 'movie', status: 'seen', ranked: true, updatedAt: 3 },
      'movie:4': { itemId: 'movie:4', shelf: 'movie', status: 'seen', ranked: false, updatedAt: 4 },
    }
    const rankings: Record<ShelfType, string[]> = {
      movie: ['movie:1', 'movie:2', 'movie:3'],
      series: [],
      book: [],
      artist: [],
      boardgame: [],
    }
    // Ranking has 3 items -> 2 adjacent pairs: (1, 2) and (2, 3)
    // Only (1, 2) is in duels
    const duels: Record<ShelfType, Record<string, DuelRecord>> = {
      movie: {
        [pairKey('movie:1', 'movie:2')]: { w: 'movie:1', at: 100 },
      },
      series: {},
      book: {},
      artist: {},
      boardgame: {},
    }
    const lastCompared: Record<ShelfType, number> = {
      movie: 123456,
      series: 0,
      book: 0,
      artist: 0,
      boardgame: 0,
    }

    const overview = computeCompareOverview(entries, rankings, duels, lastCompared)

    const movie = overview.shelves.movie
    expect(movie.enRanking).toBe(3)
    expect(movie.sinOrdenar).toBe(1)
    // 1 de 2 parejas enfrentadas = 50%
    expect(movie.pulido).toBe(50)
    expect(movie.ultima).toBe(123456)
    expect(movie.disponible).toBe(true)
    expect(movie.completo).toBe(false)

    // total weighted: enRanking 3 (50%), sinOrdenar 1 (0%) -> (50*3 + 0*1) / (3+1) = 150 / 4 = 37.5 -> 38%
    expect(overview.total).toBe(38)
  })

  it('marca estantería no disponible si tiene menos de 2 vistas', () => {
    const entries: Record<string, UserEntry> = {
      'book:1': { itemId: 'book:1', shelf: 'book', status: 'seen', ranked: false, updatedAt: 1 },
    }
    const rankings: Record<ShelfType, string[]> = {
      movie: [],
      series: [],
      book: [],
      artist: [],
      boardgame: [],
    }
    const overview = computeCompareOverview(entries, rankings, { movie: {}, series: {}, book: {}, artist: {}, boardgame: {} }, { movie: 0, series: 0, book: 0, artist: 0, boardgame: 0 })
    expect(overview.shelves.book.disponible).toBe(false)
  })
})
