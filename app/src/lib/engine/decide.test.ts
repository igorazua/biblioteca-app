import { describe, expect, it } from 'vitest'
import {
  calcSimilarity,
  initDecideSession,
  nextDuel,
  applyDuelChoice,
  shouldPropose,
  getProposal,
  rejectAndContinue,
  passesFilters,
  type DecideInput,
} from './decide'
import type { Friend, Item, Profile } from '../../types'
import { PLATFORMS } from '../../config'

const mockProfile: Profile = {
  name: 'Test',
  avatarColor: '#ff0000',
  platforms: ['Netflix', 'HBO Max'],
  birthYear: 1990,
  country: 'ES',
  lang: 'es',
}

const mockFriends: Friend[] = [
  {
    id: 'f1',
    name: 'Ana',
    avatarColor: '#00ff00',
    entries: [
      { itemId: 'm1', status: 'seen', score: 9.5, comment: 'Maravillosa película' },
      { itemId: 'm2', status: 'pending' },
    ],
  },
]

const mockItems: Item[] = [
  {
    id: 'm1',
    type: 'movie',
    title: 'El Padrino',
    year: 1972,
    creator: 'Francis Ford Coppola',
    durationMin: 175,
    genres: ['Drama', 'Crimen'],
    synopsis: 'Don Vito Corleone...',
    posterUrl: 'https://example.com/p1.jpg',
    popularity: 98,
    voteAvg: 9.2,
    voteCount: 19000,
  },
  {
    id: 'm2',
    type: 'movie',
    title: 'El Padrino Parte II',
    year: 1974,
    creator: 'Francis Ford Coppola',
    durationMin: 200,
    genres: ['Drama', 'Crimen'],
    synopsis: 'Michael Corleone...',
    posterUrl: 'https://example.com/p2.jpg',
    popularity: 95,
    voteAvg: 9.0,
    voteCount: 12000,
  },
  {
    id: 'm3',
    type: 'movie',
    title: 'Pulp Fiction',
    year: 1994,
    creator: 'Quentin Tarantino',
    durationMin: 154,
    genres: ['Crimen', 'Thriller'],
    synopsis: 'Historias cruzadas...',
    posterUrl: 'https://example.com/p3.jpg',
    popularity: 96,
    voteAvg: 8.9,
    voteCount: 26000,
  },
  {
    id: 'm4',
    type: 'movie',
    title: 'Toy Story',
    year: 1995,
    creator: 'John Lasseter',
    durationMin: 81,
    genres: ['Animación', 'Aventura', 'Comedia'],
    synopsis: 'Juguetes con vida...',
    posterUrl: 'https://example.com/p4.jpg',
    popularity: 88,
    voteAvg: 8.3,
    voteCount: 17000,
  },
  {
    id: 'm5',
    type: 'movie',
    title: 'Up',
    year: 2009,
    creator: 'Pete Docter',
    durationMin: 96,
    genres: ['Animación', 'Aventura', 'Drama'],
    synopsis: 'Una casa con globos...',
    posterUrl: 'https://example.com/p5.jpg',
    popularity: 85,
    voteAvg: 8.2,
    voteCount: 18000,
  },
  {
    id: 'm6',
    type: 'movie',
    title: 'El Rey León',
    year: 1994,
    creator: 'Roger Allers',
    durationMin: 88,
    genres: ['Animación', 'Drama'],
    synopsis: 'Simba...',
    posterUrl: 'https://example.com/p6.jpg',
    popularity: 92,
    voteAvg: 8.5,
    voteCount: 22000,
  },
]

describe('Motor de Decidir (F5 - decide.ts)', () => {
  it('passesFilters filtra según duración, plataforma y género', () => {
    const movieCorta = mockItems.find((i) => i.id === 'm4')! // 81 min
    const movieLarga = mockItems.find((i) => i.id === 'm1')! // 175 min

    expect(passesFilters(movieCorta, { time: 'corta' }, [])).toBe(true)
    expect(passesFilters(movieLarga, { time: 'corta' }, [])).toBe(false)
  })

  it('calcSimilarity puntúa mayor para obras del mismo creador y género', () => {
    const p1 = mockItems[0] // El Padrino
    const p2 = mockItems[1] // El Padrino II (mismo creador, mismos géneros, años cercanos)
    const toy = mockItems[3] // Toy Story

    const simPadrinos = calcSimilarity(p1, p2)
    const simPadrinoToy = calcSimilarity(p1, toy)

    expect(simPadrinos).toBeGreaterThan(0.7)
    expect(simPadrinoToy).toBeLessThan(0.3)
  })

  it('initDecideSession genera prior y post normalizado que suma 1', () => {
    const input: DecideInput = {
      shelf: 'movie',
      items: mockItems,
      entries: {},
      rankings: { movie: [], series: [], book: [], boardgame: [], artist: [] },
      profile: mockProfile,
      friends: mockFriends,
      answers: {},
      affinity: () => 80,
      friendPct: () => 95,
    }

    const state = initDecideSession(input)
    expect(state.pool.length).toBeGreaterThan(0)

    const postSum = Object.values(state.post).reduce((a, b) => a + b, 0)
    expect(postSum).toBeCloseTo(1.0, 4)
  })

  it('nextDuel selecciona orientadores y actualiza con applyDuelChoice', () => {
    const itemsMap = new Map(mockItems.map((i) => [i.id, i]))
    const input: DecideInput = {
      shelf: 'movie',
      items: mockItems.slice(0, 4), // m1, m2, m3, m4 en pool
      entries: {},
      rankings: { movie: [], series: [], book: [], boardgame: [], artist: [] },
      profile: mockProfile,
      friends: mockFriends,
      answers: {},
      affinity: () => null,
      friendPct: () => null,
    }

    const state = initDecideSession(input)
    // Orientadores disponibles fuera de pool: m5 y m6
    const duel = nextDuel(state, mockItems, new Set(), () => 0)
    expect(duel).not.toBeNull()
    if (!duel) return

    expect(duel.a.id).not.toBe(duel.b.id)
    expect(duel.phase).toBe('coarse')

    // Aplicar ganador
    const nextState = applyDuelChoice(state, duel.a, duel.b, itemsMap)
    expect(nextState.duels.length).toBe(1)
    expect(nextState.duelsInRound).toBe(1)
    expect(nextState.shown).toContain(duel.a.id)
    expect(nextState.shown).toContain(duel.b.id)
  })

  it('shouldPropose respeta 5 duelos en ronda 1 y 3 en siguientes rondas', () => {
    const state: any = {
      round: 1,
      duelsInRound: 4,
      post: {},
    }
    expect(shouldPropose(state)).toBe(false)
    state.duelsInRound = 5
    expect(shouldPropose(state)).toBe(true)

    // Ronda 2 («Seguir buscando»)
    state.round = 2
    state.duelsInRound = 2
    expect(shouldPropose(state)).toBe(false)
    state.duelsInRound = 3
    expect(shouldPropose(state)).toBe(true)
  })

  it('getProposal devuelve una propuesta con motivos dinámicos', () => {
    const itemsMap = new Map(mockItems.map((i) => [i.id, i]))
    const input: DecideInput = {
      shelf: 'movie',
      items: mockItems,
      entries: {},
      rankings: { movie: [], series: [], book: [], boardgame: [], artist: [] },
      profile: mockProfile,
      friends: mockFriends,
      answers: {},
      affinity: () => 80,
      friendPct: () => 95,
    }

    let state = initDecideSession(input)
    // Simular duelos donde gana Toy Story
    state = applyDuelChoice(state, mockItems[3], mockItems[0], itemsMap)
    state = applyDuelChoice(state, mockItems[4], mockItems[1], itemsMap)

    const prop = getProposal(state, itemsMap, mockFriends, mockProfile)
    expect(prop).not.toBeNull()
    expect(prop?.item).toBeDefined()
    expect(prop?.reasons.length).toBeGreaterThan(0)
  })

  it('rejectAndContinue incrementa la ronda y añade a rejected', () => {
    const state: any = {
      rejected: [],
      round: 1,
      duelsInRound: 5,
    }
    const next = rejectAndContinue(state, 'm1')
    expect(next.round).toBe(2)
    expect(next.duelsInRound).toBe(0)
    expect(next.rejected).toContain('m1')
  })

  it('does not throw with an item absent from data/engine/*.json (live catalog fallback)', () => {
    const liveItem: Item = {
      id: 'movie:obra-viva-decide-2026',
      type: 'movie',
      title: 'Live Movie',
      year: 2026,
      creator: 'New Director',
      durationMin: 110,
      genres: ['Acción', 'Comedia'],
      synopsis: 'Sinopsis de prueba',
      posterUrl: null,
      popularity: 70,
    }

    const input: DecideInput = {
      shelf: 'movie',
      items: [liveItem],
      entries: {},
      rankings: { movie: [], series: [], book: [], artist: [], boardgame: [] },
      profile: mockProfile,
      friends: mockFriends,
      answers: {},
      affinity: () => 50,
      friendPct: () => null,
    }

    expect(() => {
      const state = initDecideSession(input)
      expect(state).toBeDefined()
      const sim = calcSimilarity(liveItem, liveItem)
      expect(sim).toBeGreaterThanOrEqual(0)
    }).not.toThrow()
  })

  it('con todas las plataformas marcadas, una obra solo en SkyShowtime pasa el filtro', () => {
    const skyItem: Item = {
      id: 'movie:skyshowtime-exclusive',
      type: 'movie',
      title: 'Sky Movie',
      year: 2024,
      creator: 'Director',
      durationMin: 100,
      genres: ['Drama'],
      synopsis: '...',
      posterUrl: null,
      popularity: 50,
      platforms: ['SkyShowtime'],
    }
    // Con todas marcadas, la obra pasa el filtro
    expect(passesFilters(skyItem, {}, [...PLATFORMS])).toBe(true)
    // Con solo Netflix marcada, no pasa
    expect(passesFilters(skyItem, {}, ['Netflix'])).toBe(false)
  })

  it('con la estantería de artistas siempre hay pareja y nunca falla por año indefinido', () => {
    const mockArtists: Item[] = [
      {
        id: 'artist:rosalia',
        type: 'artist',
        title: 'Rosalía',
        year: 0,
        creator: 'Rosalía',
        genres: ['Flamenco', 'Pop'],
        synopsis: 'Cantante española',
        posterUrl: null,
        popularity: 95,
        notoriety: { ES: 0.95 },
      },
      {
        id: 'artist:c-tangana',
        type: 'artist',
        title: 'C. Tangana',
        year: 0,
        creator: 'C. Tangana',
        genres: ['Urbano', 'Pop'],
        synopsis: 'Músico madrileño',
        posterUrl: null,
        popularity: 92,
        notoriety: { ES: 0.92 },
      },
      {
        id: 'artist:quevedo',
        type: 'artist',
        title: 'Quevedo',
        year: 0,
        creator: 'Quevedo',
        genres: ['Reggaeton', 'Trap'],
        synopsis: 'Cantante canario',
        posterUrl: null,
        popularity: 90,
        notoriety: { ES: 0.90 },
      },
    ]

    const input: DecideInput = {
      shelf: 'artist',
      items: mockArtists,
      entries: {},
      rankings: { movie: [], series: [], book: [], artist: [], boardgame: [] },
      profile: mockProfile,
      friends: [],
      answers: {},
      affinity: () => null,
      friendPct: () => null,
    }

    const state = initDecideSession(input)
    const duel = nextDuel(state, mockArtists, new Set(), () => 0.2)
    expect(duel).not.toBeNull()
    if (duel) {
      expect(duel.a.id).not.toBe(duel.b.id)
      expect(duel.phase).toBe('coarse')
    }
  })
})
