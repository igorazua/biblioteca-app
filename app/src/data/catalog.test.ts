import { describe, it, expect, beforeEach } from 'vitest'
import { getItem, isKnownItem, itemsOfType } from './catalog'
import { useCatalog } from '../store/useCatalog'
import { useStore, shelfOf } from '../store/useStore'
import type { Item, UserEntry } from '../types'

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
