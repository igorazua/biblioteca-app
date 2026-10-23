import { describe, it, expect } from 'vitest'
import { recog, eraFactor, inferBirthYear } from './recog'
import type { Item, UserEntry } from '../../types'

describe('Motor R: Reconocibilidad (recog.ts)', () => {
  const dummyItem: Item = {
    id: 'movie:test-2005',
    type: 'movie',
    title: 'Película Test',
    year: 2005,
    creator: 'Director Test',
    genres: ['Drama'],
    synopsis: 'Sinopsis de prueba',
    posterUrl: null,
    popularity: 90,
    popPct: 95,
    notoriety: 0.85,
  }

  it('asigna R = 1.0 si la obra ya está vista por el usuario', () => {
    const entries: Record<string, UserEntry> = {
      'movie:test-2005': { itemId: 'movie:test-2005', status: 'seen', ranked: false, updatedAt: 1704067200000 },
    }
    const r = recog(dummyItem, { entries })
    expect(r).toBe(1.0)
  })

  it('asigna R = 0.9 si la obra está pendiente por el usuario', () => {
    const entries: Record<string, UserEntry> = {
      'movie:test-2005': { itemId: 'movie:test-2005', status: 'pending', ranked: false, updatedAt: 1704067200000 },
    }
    const r = recog(dummyItem, { entries })
    expect(r).toBe(0.9)
  })

  it('en arranque en frío puntúa antes una obra muy notoria en España de su época que una extranjera poco notoria', () => {
    const userBirthYear = 1990

    const obraEspanolaNotoria: Item = {
      id: 'series:aqui-no-hay-quien-viva-2003',
      type: 'series',
      title: 'Aquí no hay quien viva',
      year: 2003,
      creator: 'Alberto Caballero',
      genres: ['Comedia'],
      synopsis: 'Comedia española',
      posterUrl: null,
      popularity: 90,
      notoriety: 0.85,
    }

    const obraExtranjeraDesconocida: Item = {
      id: 'series:foreign-unknown-1965',
      type: 'series',
      title: 'Unknown 1965 foreign show',
      year: 1965,
      creator: 'Unknown',
      genres: ['Drama'],
      synopsis: 'Show antiguo desconocido',
      posterUrl: null,
      popularity: 30,
      notoriety: 0.15,
    }

    const rEspanola = recog(obraEspanolaNotoria, { birthYear: userBirthYear, country: 'ES' })
    const rExtranjera = recog(obraExtranjeraDesconocida, { birthYear: userBirthYear, country: 'ES' })

    expect(rEspanola).toBeGreaterThan(0.65)
    expect(rExtranjera).toBeLessThan(0.15)
    expect(rEspanola).toBeGreaterThan(rExtranjera * 4)
  })

  it('calcula la curva eraFactor con ventana formativa máxima entre 12 y 25 años', () => {
    const birthYear = 1990
    // e = 2005 - 1990 = 15 años (dentro de [12, 25]) -> 1.0
    expect(eraFactor(2005, birthYear)).toBe(1.0)

    // e < 0 (antes de nacer) sin canon -> 0.35
    expect(eraFactor(1980, birthYear)).toBe(0.35)

    // e < 0 con canon -> 0.90
    expect(eraFactor(1980, birthYear, { isCanon: true })).toBe(0.90)
  })

  it('infiere el año de nacimiento correctamente a partir de un historial', () => {
    const items: Item[] = [
      { id: '1', type: 'movie', title: 'O1', year: 2004, creator: '', genres: [], synopsis: '', posterUrl: null, popularity: 50 },
      { id: '2', type: 'movie', title: 'O2', year: 2005, creator: '', genres: [], synopsis: '', posterUrl: null, popularity: 50 },
      { id: '3', type: 'movie', title: 'O3', year: 2006, creator: '', genres: [], synopsis: '', posterUrl: null, popularity: 50 },
      { id: '4', type: 'movie', title: 'O4', year: 2007, creator: '', genres: [], synopsis: '', posterUrl: null, popularity: 50 },
      { id: '5', type: 'movie', title: 'O5', year: 2008, creator: '', genres: [], synopsis: '', posterUrl: null, popularity: 50 },
    ]
    const entries: Record<string, UserEntry> = {
      '1': { itemId: '1', status: 'seen', ranked: false, updatedAt: 1704067200000 },
      '2': { itemId: '2', status: 'seen', ranked: false, updatedAt: 1704067200000 },
      '3': { itemId: '3', status: 'seen', ranked: false, updatedAt: 1704067200000 },
      '4': { itemId: '4', status: 'seen', ranked: false, updatedAt: 1704067200000 },
      '5': { itemId: '5', status: 'seen', ranked: false, updatedAt: 1704067200000 },
    }
    // Mediana ~ 2006. ERA_MEDIAN_AGE = 25 -> 2006 - 25 = 1981
    const inferred = inferBirthYear(entries, items)
    expect(inferred).toBe(1981)
  })

  it('usuario nuevo (contexto vacío, España): nivel 1 con notoriedad >= 0.9 da R >= 0.85, nivel 4 da R < 0.5 (T17 §A.4)', () => {
    const itemNivel1: Item = {
      id: 'movie:titanic-1997',
      type: 'movie',
      title: 'Titanic',
      year: 1997,
      creator: 'James Cameron',
      genres: ['Drama', 'Romance'],
      synopsis: 'Titanic',
      posterUrl: null,
      popularity: 95,
      notoriety: 0.95,
      fameTier: 1,
    }

    const itemNivel4: Item = {
      id: 'movie:obscure-2010',
      type: 'movie',
      title: 'Obra oscura',
      year: 2010,
      creator: 'Indie',
      genres: ['Drama'],
      synopsis: 'Poco conocida',
      posterUrl: null,
      popularity: 20,
      notoriety: 0.30,
      fameTier: 4,
    }

    // Contexto completamente vacío (usuario recién llegado)
    const rNivel1 = recog(itemNivel1, {})
    const rNivel4 = recog(itemNivel4, {})

    expect(rNivel1).toBeGreaterThanOrEqual(0.85)
    expect(rNivel4).toBeLessThan(0.50)
  })
})
