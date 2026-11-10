// Tests de los stores portados de la PWA (app/src/data/catalog.test.ts, songs.test.ts y lib/ranking.test.ts), sin cambiar ninguna expectativa.
// Cambia solo el origen de las importaciones: la lógica viene de @biblioteca/core y los stores de aquí.
import { describe, it, expect, beforeEach } from 'vitest'
import {
  ACTIVE_SHELVES,
  SHELF_ENABLED,
  SHELVES,
  getItem,
  isKnownItem,
  itemsOfType,
  pairKey,
  type Item,
  type UserEntry,
} from '@biblioteca/core'
import { useCatalog } from './useCatalog'
import { migrateStore, shelfOf, useStore } from './useStore'

describe('Catálogo vivo y sincronización (F-B1)', () => {
  const sampleLiveSeries: Item = {
    id: 'series:obra-viva-test-2026',
    type: 'series',
    title: 'Serie Viva de Prueba',
    year: 2026,
    creator: 'Creador Test',
    genres: ['Drama'],
    synopsis: 'Una serie añadida dinámicamente.',
    posterUrl: 'https://example.com/poster.jpg',
    popularity: 80,
    seasons: 2,
  }

  beforeEach(() => {
    // Limpiar estado
    useCatalog.setState({ items: {}, version: 0, _hasHydrated: true })
    useStore.setState({
      entries: {},
      rankings: { movie: [], series: [], book: [], artist: [], boardgame: [], song: [] },
    })
  })

  it('getItem devuelve obras de la semilla y undefined para desconocidas', () => {
    const padrino = getItem('movie:el-padrino-1972')
    expect(padrino).toBeDefined()
    expect(padrino?.title).toBe('El padrino')

    expect(getItem('movie:inexistente-total-9999')).toBeUndefined()
  })

  it('getItem devuelve obras de la caché viva y itemsOfType las incluye', () => {
    expect(getItem(sampleLiveSeries.id)).toBeUndefined()
    expect(isKnownItem(sampleLiveSeries.id)).toBe(false)

    // Añadir a la caché viva
    useCatalog.getState().addItems([sampleLiveSeries])

    expect(isKnownItem(sampleLiveSeries.id)).toBe(true)
    const fetched = getItem(sampleLiveSeries.id)
    expect(fetched).toBeDefined()
    expect(fetched?.title).toBe('Serie Viva de Prueba')
    expect(fetched?.type).toBe('series')

    // itemsOfType('series') debe incluirla
    const seriesList = itemsOfType('series')
    expect(seriesList.some((s) => s.id === sampleLiveSeries.id)).toBe(true)

    // No debe aparecer en pelis
    const movieList = itemsOfType('movie')
    expect(movieList.some((m) => m.id === sampleLiveSeries.id)).toBe(false)
  })

  it('shelfOf no devuelve "movie" para una serie viva', () => {
    // Caso 1: la obra está en useCatalog
    useCatalog.getState().addItems([sampleLiveSeries])
    expect(shelfOf(sampleLiveSeries.id)).toBe('series')

    // Caso 2: la obra aún no está en la caché viva pero la UserEntry guarda su shelf
    useCatalog.setState({ items: {} }) // caché vacía
    const entry: UserEntry = {
      itemId: sampleLiveSeries.id,
      shelf: 'series',
      status: 'seen',
      ranked: true,
      updatedAt: Date.now(),
    }
    expect(shelfOf(sampleLiveSeries.id, entry)).toBe('series')
  })

  it('arranque en frío: nunca pierde entradas de obras vivas ni las manda a movie', () => {
    // 1. Simular arranque en frío: caché viva vacía (IndexedDB aún no ha cargado)
    useCatalog.setState({ items: {}, version: 0 })
    expect(getItem(sampleLiveSeries.id)).toBeUndefined()

    // 2. useStore se rehidrata desde localStorage con una entrada y puesto en series
    const entryId = sampleLiveSeries.id
    useStore.setState({
      entries: {
        [entryId]: {
          itemId: entryId,
          shelf: 'series',
          status: 'seen',
          ranked: true,
          updatedAt: 1700000000000,
        },
      },
      rankings: {
        movie: [],
        series: [entryId],
        book: [],
        artist: [],
        boardgame: [],
        song: [],
      },
    })

    // Comprobar que antes de que llegue el catálogo, la entrada sigue viva y en series
    const storeStateBefore = useStore.getState()
    expect(storeStateBefore.entries[entryId]).toBeDefined()
    expect(storeStateBefore.rankings.series).toContain(entryId)
    expect(storeStateBefore.rankings.movie).not.toContain(entryId)

    // 3. Rehidrata después la caché viva (IndexedDB termina su carga asíncrona)
    useCatalog.getState().addItems([sampleLiveSeries])

    // 4. Comprobar que la obra sigue en el ranking de series y no en el de movie
    const storeStateAfter = useStore.getState()
    expect(storeStateAfter.entries[entryId]).toBeDefined()
    expect(storeStateAfter.rankings.series).toContain(entryId)
    expect(storeStateAfter.rankings.movie).not.toContain(entryId)
    expect(getItem(entryId)?.title).toBe('Serie Viva de Prueba')
  })
})

describe('T28.0 — Interruptor de la estantería de canciones', () => {
  beforeEach(() => {
    useStore.getState().resetAll()
  })

  it('SHELVES incluye "song", pero ACTIVE_SHELVES respeta SHELF_ENABLED.song', () => {
    expect(SHELVES).toContain('song')
    if (SHELF_ENABLED.song) {
      expect(ACTIVE_SHELVES).toContain('song')
    } else {
      expect(ACTIVE_SHELVES).not.toContain('song')
    }
  })

  it('con el interruptor apagado, una entrada de canción del usuario sigue en su estado sin tocar', () => {
    const songId = 'song:bohemian-rhapsody-queen-1975'
    const songEntry: UserEntry = {
      itemId: songId,
      shelf: 'song',
      status: 'seen',
      stars: 5,
      comment: 'Una obra maestra',
      ranked: true,
      updatedAt: 1700000000,
    }

    // Guardar la entrada en el store
    useStore.setState((s) => ({
      entries: { ...s.entries, [songId]: songEntry },
      rankings: { ...s.rankings, song: [songId] },
    }))

    // Simular que el interruptor está apagado
    const originalSongEnabled = SHELF_ENABLED.song
    try {
      SHELF_ENABLED.song = false
      const activeShelvesWhenOff = SHELVES.filter((s) => SHELF_ENABLED[s])
      expect(activeShelvesWhenOff).not.toContain('song')

      // La entrada del usuario sigue exactamente intacta en el store
      const st = useStore.getState()
      expect(st.entries[songId]).toBeDefined()
      expect(st.entries[songId]?.status).toBe('seen')
      expect(st.entries[songId]?.stars).toBe(5)
      expect(st.entries[songId]?.comment).toBe('Una obra maestra')
      expect(st.entries[songId]?.ranked).toBe(true)
      expect(st.rankings.song).toContain(songId)
    } finally {
      SHELF_ENABLED.song = originalSongEnabled
    }
  })
})

describe('Store: duelos y migraciones', () => {
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
