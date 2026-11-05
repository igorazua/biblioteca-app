import { describe, it, expect, beforeEach } from 'vitest'
import { getItem, isKnownItem, itemsOfType, setLiveItems } from './catalog'
import type { Item } from '../types'

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
    // Limpiar estado (la caché viva de la app, antes `useCatalog.items`, entra por `setLiveItems`)
    setLiveItems({})
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
    setLiveItems({ [sampleLiveSeries.id]: sampleLiveSeries })

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

  // «shelfOf» y «arranque en frío» dependen del store de la app y siguen en app/src/data/catalog.test.ts
})
