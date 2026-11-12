import { describe, expect, it } from 'vitest'
import { pairKey } from '@biblioteca/core'
import { useStore, migrateStore } from '../store/useStore'

// Casos de lib/ranking.test.ts que prueban el store de la PWA; el resto vive en packages/core/src/lib/ranking.test.ts.
describe('T30 — Duelos largos y mezclados (Bradley-Terry)', () => {
  it('deshacer quita el registro del duelo', () => {
    const st = useStore.getState()
    st.recordDuel('movie', 'peli1', 'peli2', 'peli1')
    const key = pairKey('peli1', 'peli2')
    expect(useStore.getState().duels.movie[key]).toEqual({ w: 'peli1', at: expect.any(Number) })

    st.deleteDuel('movie', 'peli1', 'peli2')
    expect(useStore.getState().duels.movie[key]).toBeUndefined()
  })

  it('la migración del store conserva las entradas y rankings y crea duels vacío', () => {
    const v3State = {
      entries: {
        'movie:el-padrino-1972': {
          itemId: 'movie:el-padrino-1972',
          status: 'seen',
          ranked: true,
          updatedAt: 1000,
        },
      },
      rankings: {
        movie: ['movie:el-padrino-1972'],
        series: [],
        book: [],
        artist: [],
        boardgame: [],
        song: [],
      },
    }

    const migrated = migrateStore(v3State, 3)
    expect(migrated).toBeDefined()
    expect(migrated?.entries?.['movie:el-padrino-1972']).toBeDefined()
    expect(migrated?.rankings?.movie).toEqual(['movie:el-padrino-1972'])
    expect(migrated?.duels).toEqual({
      movie: {},
      series: {},
      book: {},
      artist: {},
      boardgame: {},
      song: {},
    })
    expect(migrated?.lastCompared).toEqual({
      movie: 0,
      series: 0,
      book: 0,
      artist: 0,
      boardgame: 0,
      song: 0,
    })
  })

  it('migrateStore v5 repara inconsistencias entre ranked y array del ranking', () => {
    const v4State = {
      entries: {
        'book:ghost': { itemId: 'book:ghost', shelf: 'book', status: 'seen', ranked: true },
      },
      rankings: {
        movie: [],
        series: [],
        book: [],
        artist: [],
        boardgame: [],
      },
    }
    const migrated = migrateStore(v4State, 4)
    expect(migrated?.entries?.['book:ghost']?.ranked).toBe(false)
  })
})
