import { describe, expect, it } from 'vitest'
import { computeCompareOverview } from './compareOverview'
import { pairKey, RANK_DUELS_FOR_DONE } from './ranking'
import type { ShelfType, UserEntry, DuelRecord } from '../types'

describe('compareOverview', () => {
  it('calcula pulido, ordenado, sinOrdenar y disponible correctamente', () => {
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
      song: [],
    }
    // Ranking has 3 items -> 2 adjacent pairs: (1, 2) and (2, 3)
    // Duelos registrados para que movie:1 tenga 3 duelos:
    const duels: Record<ShelfType, Record<string, DuelRecord>> = {
      movie: {
        [pairKey('movie:1', 'movie:2')]: { w: 'movie:1', at: 100 },
        [pairKey('movie:1', 'movie:3')]: { w: 'movie:1', at: 101 },
        [pairKey('movie:1', 'movie:other')]: { w: 'movie:1', at: 102 },
      },
      series: {},
      book: {},
      artist: {},
      boardgame: {},
      song: {},
    }
    const lastCompared: Record<ShelfType, number> = {
      movie: 123456,
      series: 0,
      book: 0,
      artist: 0,
      boardgame: 0,
      song: 0,
    }

    const overview = computeCompareOverview(entries, rankings, duels, lastCompared)

    const movie = overview.shelves.movie
    expect(movie.enRanking).toBe(3)
    expect(movie.sinOrdenar).toBe(1)
    // 1 de 2 parejas adyacentes enfrentadas = 50%
    expect(movie.pulido).toBe(50)
    // movie:1 tiene 3 duelos (>= 3). movie:2 tiene 1 duelo. movie:3 tiene 1 duelo. movie:4 tiene 0.
    // 1 bien ordenada de 4 vistas = 25%
    expect(movie.ordenado).toBe(25)
    expect(movie.ultima).toBe(123456)
    expect(movie.disponible).toBe(true)
    expect(movie.completo).toBe(false)
    expect(overview.total).toBe(25)
  })

  it('sinOrdenar se rige por el array del ranking, no por la marca ranked: true (T19 §3)', () => {
    // Caso de Igor: 3 libros en el array del ranking, pero 3 libros marcados ranked: true fuera del array
    const entries: Record<string, UserEntry> = {
      'book:1': { itemId: 'book:1', shelf: 'book', status: 'seen', ranked: true, updatedAt: 1 },
      'book:2': { itemId: 'book:2', shelf: 'book', status: 'seen', ranked: true, updatedAt: 2 },
      'book:3': { itemId: 'book:3', shelf: 'book', status: 'seen', ranked: true, updatedAt: 3 },
      'book:4': { itemId: 'book:4', shelf: 'book', status: 'seen', ranked: true, updatedAt: 4 }, // fuera del array!
      'book:5': { itemId: 'book:5', shelf: 'book', status: 'seen', ranked: true, updatedAt: 5 }, // fuera del array!
      'book:6': { itemId: 'book:6', shelf: 'book', status: 'seen', ranked: true, updatedAt: 6 }, // fuera del array!
    }
    const rankings: Record<ShelfType, string[]> = {
      movie: [],
      series: [],
      book: ['book:1', 'book:2', 'book:3'],
      artist: [],
      boardgame: [],
      song: [],
    }

    const overview = computeCompareOverview(
      entries,
      rankings,
      { movie: {}, series: {}, book: {}, artist: {}, boardgame: {}, song: {} },
      { movie: 0, series: 0, book: 0, artist: 0, boardgame: 0, song: 0 },
    )

    const book = overview.shelves.book
    expect(book.enRanking).toBe(3)
    // Las 3 que no están en el array cuentan como sin ordenar
    expect(book.sinOrdenar).toBe(3)
    expect(book.completo).toBe(false)
  })

  it('completo NO se da cuando pulido === 100 si aún quedan parejas por jugar (T19 §3)', () => {
    // 4 items en ranking. Parejas vecinas (1,2), (2,3), (3,4) están jugadas -> pulido === 100%
    // Pero parejas no vecinas (1,3), (1,4), (2,4) no están jugadas -> planNextDuel devuelve duelo -> completo es false!
    const entries: Record<string, UserEntry> = {
      'movie:1': { itemId: 'movie:1', shelf: 'movie', status: 'seen', ranked: true, updatedAt: 1 },
      'movie:2': { itemId: 'movie:2', shelf: 'movie', status: 'seen', ranked: true, updatedAt: 2 },
      'movie:3': { itemId: 'movie:3', shelf: 'movie', status: 'seen', ranked: true, updatedAt: 3 },
      'movie:4': { itemId: 'movie:4', shelf: 'movie', status: 'seen', ranked: true, updatedAt: 4 },
    }
    const rankings: Record<ShelfType, string[]> = {
      movie: ['movie:1', 'movie:2', 'movie:3', 'movie:4'],
      series: [],
      book: [],
      artist: [],
      boardgame: [],
      song: [],
    }
    const duels: Record<ShelfType, Record<string, DuelRecord>> = {
      movie: {
        [pairKey('movie:1', 'movie:2')]: { w: 'movie:1', at: 100 },
        [pairKey('movie:2', 'movie:3')]: { w: 'movie:2', at: 101 },
        [pairKey('movie:3', 'movie:4')]: { w: 'movie:3', at: 102 },
      },
      series: {},
      book: {},
      artist: {},
      boardgame: {},
      song: {},
    }

    const overview = computeCompareOverview(
      entries,
      rankings,
      duels,
      { movie: 0, series: 0, book: 0, artist: 0, boardgame: 0, song: 0 },
    )

    const movie = overview.shelves.movie
    expect(movie.pulido).toBe(100)
    expect(movie.sinOrdenar).toBe(0)
    // A pesar de pulido === 100, no está completo porque quedan parejas libres no jugadas
    expect(movie.completo).toBe(false)
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
      song: [],
    }
    const overview = computeCompareOverview(
      entries,
      rankings,
      { movie: {}, series: {}, book: {}, artist: {}, boardgame: {}, song: {} },
      { movie: 0, series: 0, book: 0, artist: 0, boardgame: 0, song: 0 },
    )
    expect(overview.shelves.book.disponible).toBe(false)
  })
})
