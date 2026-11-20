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

  it('la zona se lee de deckLearn.byDecade, que es la forma que guarda el store (REVISION_MOTORES A1)', () => {
    const base = recog(dummyItem, { birthYear: 1990 })
    // el mazo le enseñó 40 obras de los 2000 y solo marcó 2 como vistas: las de esa década se reconocen menos
    const learn = (shown: number, seen: number) => ({ byMacro: {}, byDecade: { '2000s': { shown, seen, up: 0, left: shown - seen } } })
    const pocas = recog(dummyItem, { birthYear: 1990, deckLearn: learn(40, 2) })
    const muchas = recog(dummyItem, { birthYear: 1990, deckLearn: learn(40, 38) })
    expect(pocas).toBeLessThan(base)
    expect(muchas).toBeGreaterThan(pocas)
    // con menos de 10 tarjetas de la década no hay dato: zona neutra
    expect(recog(dummyItem, { birthYear: 1990, deckLearn: learn(5, 0) })).toBe(base)
    // la forma plana (la de los tests antiguos) sigue valiendo
    expect(recog(dummyItem, { birthYear: 1990, deckLearn: { '2000s': { shown: 40, seen: 2 } } })).toBe(pocas)
  })

  it('sin año declarado, el año de nacimiento se infiere una vez por contexto, no por cada obra (REVISION_MOTORES A2)', () => {
    const items: Item[] = Array.from({ length: 50 }, (_, i) => ({ ...dummyItem, id: `movie:x-${i}`, year: 1980 + (i % 40) }))
    const entries: Record<string, UserEntry> = {}
    for (const it of items.slice(0, 8)) entries[it.id] = { itemId: it.id, status: 'seen', ranked: false, updatedAt: 1704067200000 }
    // inferBirthYear recorre el catálogo con `items.map`: se cuenta cuántas veces lo hace
    let walks = 0
    const map = items.map.bind(items)
    items.map = ((...args: Parameters<typeof map>) => { walks++; return map(...args) }) as typeof items.map
    const ctx = { entries, items }
    const first = items.slice(8).map((it) => recog(it, ctx))
    expect(walks).toBe(1)
    // y el resultado es el mismo que dando el año ya inferido
    const birthYear = inferBirthYear(entries, items) ?? undefined
    expect(first).toEqual(items.slice(8).map((it) => recog(it, { entries, birthYear })))
  })

  it('usuario nuevo sin datos para inferir: tampoco se reintenta por cada obra, y birthYear: null lo desactiva', () => {
    const items: Item[] = Array.from({ length: 30 }, (_, i) => ({ ...dummyItem, id: `movie:y-${i}` }))
    let walks = 0
    const map = items.map.bind(items)
    items.map = ((...args: Parameters<typeof map>) => { walks++; return map(...args) }) as typeof items.map
    const ctx = { entries: {}, items }
    for (const it of items) recog(it, ctx)
    expect(walks).toBe(1)
    walks = 0
    for (const it of items) recog(it, { entries: {}, items, birthYear: null })
    expect(walks).toBe(0)
  })

  it('el año se infiere de la tasa de «la vi» por década del mazo, en la forma que guarda el store (MOTOR §2b.3)', () => {
    const st = (shown: number, seen: number) => ({ shown, seen, up: 0, left: shown - seen })
    const byDecade = { '1980s': st(20, 4), '1990s': st(20, 6), '2000s': st(20, 15), '2010s': st(20, 5) }
    // la década con más «la vi» es la de los 2000: 2000 + 5 − 25 = 1980
    expect(inferBirthYear({}, [], { byMacro: {}, byDecade })).toBe(1980)
    expect(inferBirthYear({}, [], byDecade)).toBe(1980)
    // y recog lo usa: una obra de 2005 cae en su ventana formativa
    const conMazo = recog(dummyItem, { entries: {}, items: [], deckLearn: { byMacro: {}, byDecade } })
    expect(conMazo).toBe(recog(dummyItem, { birthYear: 1980, deckLearn: { byMacro: {}, byDecade } }))
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

describe('Motor R: suelo de época del nivel 1 (PLAN_DECIDIR M3)', () => {
  it('una obra de nivel 1 fuera de la generación del usuario baja de 0,95·notoriedad pero no de 0,8·notoriedad', () => {
    const urgencias: Item = { id: 'movie:urgencias-1994', type: 'movie', title: 'Urgencias', year: 1994, creator: 'x', genres: ['Drama'], synopsis: '', posterUrl: null, popularity: 90, notoriety: 0.95, fameTier: 1 }
    const r = recog(urgencias, { birthYear: 2005 })
    expect(r).toBeLessThan(0.95 * 0.95)
    expect(r).toBeGreaterThanOrEqual(0.8 * 0.95 - 1e-9)
    expect(r).toBeLessThan(0.8)
    // en series el suelo sigue en 0,95 (M3 solo va en pelis, libros y artistas)
    expect(recog({ ...urgencias, type: 'series' }, { birthYear: 2005 })).toBeGreaterThanOrEqual(0.95 * 0.95 - 1e-9)
    // sin año de nacimiento no cambia nada
    expect(recog(urgencias, { birthYear: null })).toBeGreaterThanOrEqual(0.9)
  })
})
