import { describe, it, expect } from 'vitest'
import { mergeCloudAndLocal } from './sync'
import type { UserEntry, ShelfType } from '../types'

describe('mergeCloudAndLocal', () => {
  const emptyRankings: Record<ShelfType, string[]> = {
    movie: [],
    series: [],
    book: [],
    artist: [],
    boardgame: [],
  }

  it('adopta la versión de la nube si es más reciente', () => {
    const localEntries: Record<string, UserEntry> = {
      'movie:item-1': {
        itemId: 'movie:item-1',
        shelf: 'movie',
        status: 'pending',
        stars: undefined,
        ranked: false,
        updatedAt: 1000,
      },
    }

    const cloudRows = [
      {
        id: 'row-1',
        user_id: 'user-1',
        item_id: 'movie:item-1',
        shelf: 'movie',
        status: 'seen' as const,
        score: 4,
        comment: 'Excelente',
        rank_position: 1,
        updated_at: new Date(2000).toISOString(),
      },
    ]

    const result = mergeCloudAndLocal(localEntries, emptyRankings, cloudRows)
    expect(result.entries['movie:item-1']).toEqual({
      itemId: 'movie:item-1',
      shelf: 'movie',
      status: 'seen',
      stars: 4,
      comment: 'Excelente',
      ranked: true,
      updatedAt: 2000,
    })
    expect(result.rankings.movie).toContain('movie:item-1')
  })

  it('mantiene la versión local si es más reciente que la nube', () => {
    const localEntries: Record<string, UserEntry> = {
      'movie:item-1': {
        itemId: 'movie:item-1',
        shelf: 'movie',
        status: 'seen',
        stars: 5,
        ranked: true,
        updatedAt: 3000,
      },
    }

    const cloudRows = [
      {
        id: 'row-1',
        user_id: 'user-1',
        item_id: 'movie:item-1',
        shelf: 'movie',
        status: 'pending' as const,
        score: null,
        comment: null,
        rank_position: null,
        updated_at: new Date(1500).toISOString(),
      },
    ]

    const result = mergeCloudAndLocal(localEntries, emptyRankings, cloudRows)
    expect(result.entries['movie:item-1'].status).toBe('seen')
    expect(result.entries['movie:item-1'].stars).toBe(5)
    expect(result.entries['movie:item-1'].updatedAt).toBe(3000)
  })

  it('incorpora entradas de la nube que no estaban en local', () => {
    const localEntries: Record<string, UserEntry> = {}
    const cloudRows = [
      {
        id: 'row-2',
        user_id: 'user-1',
        item_id: 'book:item-99',
        shelf: 'book',
        status: 'pending' as const,
        score: null,
        comment: null,
        rank_position: null,
        updated_at: new Date(5000).toISOString(),
      },
    ]

    const result = mergeCloudAndLocal(localEntries, emptyRankings, cloudRows)
    expect(result.entries['book:item-99']).toBeDefined()
    expect(result.entries['book:item-99'].shelf).toBe('book')
    expect(result.entries['book:item-99'].status).toBe('pending')
  })

  it('conserva entradas locales que aún no están en la nube', () => {
    const localEntries: Record<string, UserEntry> = {
      'series:local-only': {
        itemId: 'series:local-only',
        shelf: 'series',
        status: 'seen',
        ranked: false,
        updatedAt: 1234,
      },
    }

    const result = mergeCloudAndLocal(localEntries, emptyRankings, [])
    expect(result.entries['series:local-only']).toBeDefined()
    expect(result.entries['series:local-only'].itemId).toBe('series:local-only')
  })

  it('repara inconsistencias entre ranked y ranking tras fusionar con la nube (T19 §3)', () => {
    // Fila en la nube marcada como ranked sin estar en el array local ni de nube
    const localEntries: Record<string, UserEntry> = {
      'movie:ghost': {
        itemId: 'movie:ghost',
        shelf: 'movie',
        status: 'seen',
        ranked: true,
        updatedAt: 1000,
      },
    }
    const result = mergeCloudAndLocal(localEntries, emptyRankings, [])
    // Debe haber pasado a ranked: false porque no está en rankings.movie
    expect(result.entries['movie:ghost'].ranked).toBe(false)
  })
})
