import { describe, expect, it } from 'vitest'
import {
  calcSimilarity,
  initDecideSession,
  nextDuel,
  applyDuelChoice,
  skipDuelUnknown,
  sameFamily,
  shouldPropose,
  getProposal,
  rejectAndContinue,
  passesFilters,
  type DecideInput,
  type DuelPair,
} from './decide'
import type { Friend, Item, Profile, UserEntry } from '../../types'
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
    expect(['F1', 'coarse']).toContain(duel.phase)

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

  it('resamplePool y movimiento de pref en el espacio único (T9)', () => {
    const input: DecideInput = {
      shelf: 'movie',
      items: mockItems,
      entries: {},
      rankings: { movie: [], series: [], book: [], artist: [], boardgame: [] },
      profile: mockProfile,
      friends: mockFriends,
      answers: {},
      affinity: () => 50,
      friendPct: () => null,
    }
    let state = initDecideSession(input)
    const itemsMap = new Map(mockItems.map((i) => [i.id, i]))

    // 1er duelo con tiempo de respuesta ms
    state = applyDuelChoice(state, mockItems[0], mockItems[1], itemsMap, 1500)
    expect(state.pref).not.toBeNull()
    expect(state.duels[0].ms).toBe(1500)

    // 2do y 3er duelo (desencadena resamplePool)
    state = applyDuelChoice(state, mockItems[2], mockItems[3], itemsMap)
    state = applyDuelChoice(state, mockItems[4], mockItems[1], itemsMap)
    expect(state.duels.length).toBe(3)
    expect(state.pool.length).toBeGreaterThan(0)

    // rejectAndContinue con allItems
    const nextState = rejectAndContinue(state, mockItems[4].id, mockItems)
    expect(nextState.round).toBe(2)
    expect(nextState.rejected).toContain(mockItems[4].id)
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
      expect(['F1', 'coarse']).toContain(duel.phase)
    }
  })

  it('T2c: en Decidir con perfil nuevo, al menos 9 de cada 10 duelos en boardgame y series tienen una obra reconocible', async () => {
    const seed = (await import('../../data/seed.json')).default as { items: Item[] }
    const { recog } = await import('./recog')

    for (const shelf of ['boardgame', 'series'] as const) {
      const shelfItems = seed.items.filter((it) => it.type === shelf)
      expect(shelfItems.length).toBeGreaterThan(100)

      const input: DecideInput = {
        shelf,
        items: seed.items,
        entries: {},
        rankings: { movie: [], series: [], book: [], artist: [], boardgame: [] },
        profile: { ...mockProfile, country: 'ES', lang: 'es' },
        friends: [],
        answers: {},
        affinity: () => null,
        friendPct: () => null,
      }

      const state = initDecideSession(input)
      const shown = new Set<string>()
      let recognizedCount = 0
      const totalDuels = 10
      const ctx = { user: input.profile, entries: {}, items: seed.items }

      for (let i = 0; i < totalDuels; i++) {
        const pair = nextDuel(state, seed.items, shown)
        if (!pair) break
        shown.add(pair.a.id)
        shown.add(pair.b.id)
        state.shown.push(pair.a.id, pair.b.id)

        const rA = recog(pair.a, ctx)
        const rB = recog(pair.b, ctx)
        const notA = typeof pair.a.notoriety === 'number' ? pair.a.notoriety : pair.a.notoriety?.ES ?? 0
        const notB = typeof pair.b.notoriety === 'number' ? pair.b.notoriety : pair.b.notoriety?.ES ?? 0
        const isRecognized =
          rA >= 0.5 ||
          rB >= 0.5 ||
          notA >= 0.5 ||
          notB >= 0.5 ||
          (pair.a.popPct ?? 0) >= 70 ||
          (pair.b.popPct ?? 0) >= 70
        if (isRecognized) recognizedCount++
      }

      expect(recognizedCount).toBeGreaterThanOrEqual(9)
    }
  }, 30000)

  describe('T19 §1.4 Tests de duelos con obras conocidas', { timeout: 30000 }, () => {
    it('Usuario nuevo en libros: los 5 primeros duelos solo tienen obras de nivel 1', async () => {
      const seed = (await import('../../data/seed.json')).default as { items: Item[] }
      const input: DecideInput = {
        shelf: 'book',
        items: seed.items,
        entries: {},
        rankings: { movie: [], series: [], book: [], artist: [], boardgame: [] },
        profile: { ...mockProfile, country: 'ES', lang: 'es' },
        friends: [],
        answers: {},
        affinity: () => null,
        friendPct: () => null,
      }
      let state = initDecideSession(input)
      const shown = new Set<string>()
      const itemsMap = new Map(seed.items.map((it) => [it.id, it]))

      for (let i = 0; i < 5; i++) {
        const duel = nextDuel(state, seed.items, shown)
        expect(duel).not.toBeNull()
        if (!duel) break
        expect(duel.phase).toBe('F1')
        expect(duel.tierA).toBe(1)
        expect(duel.tierB).toBe(1)
        expect(duel.a.fameTier).toBe(1)
        expect(duel.b.fameTier).toBe(1)

        shown.add(duel.a.id)
        shown.add(duel.b.id)
        state = applyDuelChoice(state, duel.a, duel.b, itemsMap, 2500, duel.dimension)
      }
    })

    it('Usuario con 10 libros propios: en F1, al menos 1 de cada pareja es suya', async () => {
      const seed = (await import('../../data/seed.json')).default as { items: Item[] }
      const bookItems = seed.items.filter((it) => it.type === 'book')
      const ownBooks = bookItems.slice(0, 10)
      const ownIds = new Set(ownBooks.map((b) => b.id))
      const entries: Record<string, any> = {}
      for (const b of ownBooks) {
        entries[b.id] = { status: 'seen', stars: 4, updatedAt: Date.now() }
      }

      const input: DecideInput = {
        shelf: 'book',
        items: seed.items,
        entries,
        rankings: { movie: [], series: [], book: ownBooks.map((b) => b.id), artist: [], boardgame: [] },
        profile: { ...mockProfile, country: 'ES', lang: 'es' },
        friends: [],
        answers: {},
        affinity: () => null,
        friendPct: () => null,
      }
      let state = initDecideSession(input)
      const shown = new Set<string>()
      const itemsMap = new Map(seed.items.map((it) => [it.id, it]))

      for (let i = 0; i < 5; i++) {
        const duel = nextDuel(state, seed.items, shown)
        expect(duel).not.toBeNull()
        if (!duel) break
        expect(duel.phase).toBe('F1')

        const hasOwn = ownIds.has(duel.a.id) || ownIds.has(duel.b.id)
        expect(hasOwn).toBe(true)

        shown.add(duel.a.id)
        shown.add(duel.b.id)
        state = applyDuelChoice(state, duel.a, duel.b, itemsMap, 2500, duel.dimension)
      }
    })

    it('Al pulsar «Pasar»: tras pasar dos veces las obras quedan dudosas y el guion sigue con la siguiente alternativa del mismo hueco', async () => {
      const seed = (await import('../../data/seed.json')).default as { items: Item[] }
      const input: DecideInput = {
        shelf: 'book',
        items: seed.items,
        entries: {},
        rankings: { movie: [], series: [], book: [], artist: [], boardgame: [] },
        profile: { ...mockProfile, country: 'ES', lang: 'es' },
        friends: [],
        answers: {},
        affinity: () => null,
        friendPct: () => null,
      }
      const state = initDecideSession(input)
      const shown = new Set<string>()
      const itemsMap = new Map(seed.items.map((it) => [it.id, it]))

      const firstDuel = nextDuel(state, seed.items, shown)
      expect(firstDuel).not.toBeNull()
      if (!firstDuel) return

      shown.add(firstDuel.a.id)
      shown.add(firstDuel.b.id)

      // Comprobar que elegir una opción de forma normal incluso tras 6s NO marca como dudosas (se eliminó el umbral de 6000ms)
      const normalChoiceState = applyDuelChoice(state, firstDuel.a, firstDuel.b, itemsMap, 7000, firstDuel.dimension)
      expect(normalChoiceState.preferFameOrOwn).toBe(false)
      expect(normalChoiceState.doubtfulItems?.[firstDuel.a.id]).toBeUndefined()

      // «Pasar» una vez no descarta nada; la segunda vez que se pasan, las obras quedan dudosas y se activa la red de seguridad
      const onceState = skipDuelUnknown(state, firstDuel.a, firstDuel.b, 2700, firstDuel.dimension)
      expect(onceState.doubtfulItems?.[firstDuel.a.id]).toBeUndefined()
      expect(onceState.preferFameOrOwn).toBe(false)
      const unknownState = skipDuelUnknown(state, firstDuel.a, firstDuel.b, 2700, firstDuel.dimension)
      expect(unknownState.doubtfulItems?.[firstDuel.a.id]).toBeDefined()
      expect(unknownState.doubtfulItems?.[firstDuel.b.id]).toBeDefined()
      expect(unknownState.preferFameOrOwn).toBe(true)
      expect(unknownState.duels[unknownState.duels.length - 1].unknown).toBe(true)

      // Verificar que recog aplica R * 0.5 para obras dudosas
      const { recog } = await import('./recog')
      const recogCtx = {
        user: { country: 'ES', lang: 'es' },
        entries: {},
        doubtfulItems: unknownState.doubtfulItems,
      }
      const normalR = recog(firstDuel.a, { user: { country: 'ES', lang: 'es' } })
      const doubtfulR = recog(firstDuel.a, recogCtx)
      expect(doubtfulR).toBeCloseTo(normalR * 0.5, 2)

      // T22: en el guion de los 3 primeros duelos, tras pasar sale la SIGUIENTE alternativa del mismo hueco:
      // otras dos anclas (nivel 1), con la misma dimensión, nunca las que acaba de pasar.
      const { getAnchors } = await import('./anchors')
      const anchorIds = new Set(getAnchors('book').map((a) => a.id))
      const nextD = nextDuel(unknownState, seed.items, shown)
      expect(nextD).not.toBeNull()
      if (!nextD) return
      expect(nextD.scripted).toBe(true)
      expect(nextD.dimension).toBe(firstDuel.dimension)
      for (const it of [nextD.a, nextD.b]) {
        expect(shown.has(it.id)).toBe(false)
        expect(anchorIds.has(it.id)).toBe(true)
        expect(it.fameTier).toBe(1)
      }
    })
  })
})

// ───────────────────────── T22 · 22.3 y 22.4: el guion de anclas en Decidir ─────────────────────────

describe('T22 · guion de los 3 primeros duelos', () => {
  const SHELF_LIST = ['movie', 'series', 'book', 'boardgame', 'artist'] as const
  const emptyRankings = { movie: [], series: [], book: [], artist: [], boardgame: [] }
  const mulberry32 = (a: number) => () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  // localStorage de mentira: cada usuario simulado empieza sin «pasados» ni «dudosos» del anterior
  const store = new Map<string, string>()
  ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage

  const load = async () => {
    const seed = (await import('../../data/seed.json')).default as { items: Item[] }
    const anchors = await import('./anchors')
    return { items: seed.items, itemsMap: new Map(seed.items.map((i) => [i.id, i])), ...anchors }
  }

  type Sim = { offered: DuelPair[]; answered: number; shown: string[] }
  const simulate = (
    ctx: Awaited<ReturnType<typeof load>>,
    shelf: (typeof SHELF_LIST)[number],
    birthYear: number | undefined,
    seedN: number,
    recent?: string[][],
    skipProb = 0
  ): Sim => {
    const rng = mulberry32(seedN)
    store.clear()
    let state = initDecideSession({
      shelf,
      items: ctx.items,
      entries: {},
      rankings: emptyRankings,
      profile: { ...mockProfile, birthYear, country: 'ES', lang: 'es' },
      friends: [],
      answers: {},
      affinity: () => null,
      friendPct: () => null,
      recentOrienters: recent,
    })
    const offered: DuelPair[] = []
    let answered = 0
    for (let guard = 0; answered < 3 && guard < 12; guard++) {
      const duel = nextDuel(state, ctx.items, new Set(state.shown), rng)
      if (!duel) break
      offered.push(duel)
      if (!duel.scripted) break // el guion terminó: lo que sigue es la lógica de fases de siempre
      if (rng() < skipProb) {
        state = skipDuelUnknown(state, duel.a, duel.b, 3000, duel.dimension)
      } else {
        const [w, l] = rng() < 0.5 ? [duel.a, duel.b] : [duel.b, duel.a]
        state = applyDuelChoice(state, w, l, ctx.itemsMap, 2000, duel.dimension)
        answered++
      }
    }
    return { offered, answered, shown: state.shown }
  }

  const pairKey = (d: DuelPair) => [d.a.id, d.b.id].sort().join('|')

  it('22.4 · 1.000 usuarios nuevos: todo anclas, extremos opuestos, sin repetir pareja y con rotación entre sesiones', async () => {
    const ctx = await load()
    const N = 1000
    const rng = mulberry32(2210)
    type St = { duels: number; anchors: number; opposite: number; repeatedInSession: number; sessions: number; pairs2: number; repeated2: number; viaScript: number; own: number; answered3: number; first3: number; first3Scripted: number }
    const stats = {} as Record<string, St>
    const anchorIds = {} as Record<string, Set<string>>
    for (const shelf of SHELF_LIST) {
      stats[shelf] = { duels: 0, anchors: 0, opposite: 0, repeatedInSession: 0, sessions: 0, pairs2: 0, repeated2: 0, viaScript: 0, own: 0, answered3: 0, first3: 0, first3Scripted: 0 }
      anchorIds[shelf] = new Set(ctx.getAnchors(shelf).map((a) => a.id))
    }

    for (let u = 0; u < N; u++) {
      const shelf = SHELF_LIST[u % SHELF_LIST.length]
      const st = stats[shelf]
      // edades deducidas distintas: de 1950 a 2008, y alguna sin edad
      const birthYear = u % 9 === 0 ? undefined : 1950 + Math.floor(rng() * 59)
      const s1 = simulate(ctx, shelf, birthYear, 1000 + u)
      const s2 = simulate(ctx, shelf, birthYear, 5000 + u, [s1.shown])
      st.sessions++
      for (const sim of [s1, s2]) {
        if (sim.answered === 3) st.answered3++
        // los 3 primeros duelos de la sesión (si el guion se acaba antes, el siguiente ya es de la lógica de fases)
        st.first3 += 3
        st.first3Scripted += sim.offered.slice(0, 3).filter((d) => d.scripted).length
        const seenPairs = new Set<string>()
        const seenIds = new Set<string>()
        for (const d of sim.offered) {
          st.duels++
          if (!d.scripted) continue
          st.viaScript++
          if (anchorIds[shelf].has(d.a.id) && anchorIds[shelf].has(d.b.id)) st.anchors++
          if (d.isOwnA || d.isOwnB) st.own++
          const dim = (d.dimension ?? '').replace('anc:', '')
          const sa = ctx.getAnchors(shelf).find((x) => x.id === d.a.id)?.sides
          const sb = ctx.getAnchors(shelf).find((x) => x.id === d.b.id)?.sides
          const aSide = ctx.sideOfSides(shelf, sa, dim)
          const bSide = ctx.sideOfSides(shelf, sb, dim)
          if (aSide && bSide && aSide !== bSide) st.opposite++
          if (seenPairs.has(pairKey(d)) || seenIds.has(d.a.id) || seenIds.has(d.b.id)) st.repeatedInSession++
          seenPairs.add(pairKey(d))
          seenIds.add(d.a.id)
          seenIds.add(d.b.id)
        }
      }
      const p1 = new Set(s1.offered.map(pairKey))
      for (const d of s2.offered) {
        st.pairs2++
        if (p1.has(pairKey(d))) st.repeated2++
      }
    }

    const lines = SHELF_LIST.map((sh) => {
      const x = stats[sh]
      return `${sh}: ${x.sessions} usuarios x 2 sesiones · en los 3 primeros duelos ${x.first3Scripted}/${x.first3} son del guion (${((100 * x.first3Scripted) / x.first3).toFixed(1)} %) · duelos del guion ${x.viaScript}: anclas ${x.anchors}, extremos opuestos ${x.opposite} · repeticiones de pareja u obra dentro de una sesión ${x.repeatedInSession} · parejas repetidas entre 2 sesiones seguidas ${x.repeated2}/${x.pairs2} (${((100 * x.repeated2) / x.pairs2).toFixed(1)} %)`
    })
    console.log(['', '[T22 simulación]', ...lines].join('\n'))

    const complete = (shelf: (typeof SHELF_LIST)[number]) => {
      const ok = (n: import('./anchors').TreeNode | null, depth: number): boolean => (depth === 3 ? true : !!n && ok(n.A, depth + 1) && ok(n.B, depth + 1))
      return ok(ctx.getTree(shelf).root, 0)
    }
    for (const shelf of SHELF_LIST) {
      const x = stats[shelf]
      expect(x.sessions).toBeGreaterThan(0)
      // Lo que sale del guion es siempre ancla, de extremos opuestos, y no se repite dentro de la sesión
      expect(x.anchors, `${shelf}: obras del guion que no son anclas`).toBe(x.viaScript)
      expect(x.opposite, `${shelf}: duelos del guion sin extremos opuestos`).toBe(x.viaScript)
      expect(x.repeatedInSession, `${shelf}: parejas u obras repetidas en una sesión`).toBe(0)
      expect(x.repeated2 / x.pairs2, `${shelf}: parejas repetidas entre sesiones`).toBeLessThan(0.2)
      // El primer duelo es siempre del guion; los 3 primeros, el 100 % si el árbol llega a 3 niveles en todas las ramas
      expect(x.first3Scripted).toBeGreaterThanOrEqual(x.sessions * 2)
      if (complete(shelf)) expect(x.first3Scripted, `${shelf}: no todos los 3 primeros duelos son del guion`).toBe(x.first3)
    }
  }, 280000)

  it('aunque el usuario pase mucho (35 % de «Pasar»), lo que sale del guion sigue siendo anclas opuestas y sin repetir', async () => {
    const ctx = await load()
    let scripted = 0
    let total = 0
    for (let u = 0; u < 60; u++) {
      const shelf = SHELF_LIST[u % SHELF_LIST.length]
      const sim = simulate(ctx, shelf, 1960 + (u % 40), 9000 + u, undefined, 0.35)
      const ids = new Set<string>()
      for (const d of sim.offered) {
        total++
        if (!d.scripted) continue
        scripted++
        const dim = d.dimension!.replace('anc:', '')
        const anchors = ctx.getAnchors(shelf)
        const sa = ctx.sideOfSides(shelf, anchors.find((x) => x.id === d.a.id)?.sides, dim)
        const sb = ctx.sideOfSides(shelf, anchors.find((x) => x.id === d.b.id)?.sides, dim)
        expect(sa && sb && sa !== sb, `${d.a.id} / ${d.b.id} en ${dim}`).toBe(true)
        expect(ids.has(d.a.id) || ids.has(d.b.id), 'obra repetida').toBe(false)
        ids.add(d.a.id)
        ids.add(d.b.id)
      }
    }
    expect(scripted).toBeGreaterThan(total * 0.6)
  }, 120000)

  it('después de los 3 duelos del guion, la lógica de fases de siempre (T19 §1.2) sigue con obras de nivel 1', async () => {
    const ctx = await load()
    for (const shelf of ['movie', 'book'] as const) {
      store.clear()
      let state = initDecideSession({
        shelf,
        items: ctx.items,
        entries: {},
        rankings: emptyRankings,
        profile: { ...mockProfile, country: 'ES', lang: 'es' },
        friends: [],
        answers: {},
        affinity: () => null,
        friendPct: () => null,
      })
      const rng = mulberry32(7)
      const flags: boolean[] = []
      for (let i = 0; i < 5; i++) {
        const d = nextDuel(state, ctx.items, new Set(state.shown), rng)!
        expect(d, `duelo ${i + 1}`).not.toBeNull()
        flags.push(Boolean(d.scripted))
        expect(d.phase).toBe('F1')
        expect(d.tierA).toBe(1)
        expect(d.tierB).toBe(1)
        state = applyDuelChoice(state, d.a, d.b, ctx.itemsMap, 2000, d.dimension)
      }
      expect(flags).toEqual([true, true, true, false, false])
    }
  })

  it('dos victorias del mismo lado en una dimensión del guion la cierran, reflejan la de T17 y la propuesta es de ese lado', async () => {
    const ctx = await load()
    store.clear()
    const shelf = 'movie'
    let state = initDecideSession({
      shelf,
      items: ctx.items,
      entries: {},
      rankings: emptyRankings,
      profile: { ...mockProfile, country: 'ES', lang: 'es' },
      friends: [],
      answers: {},
      affinity: () => null,
      friendPct: () => null,
    })
    // Dos duelos de «realismo» ganados por la fantasía (lado A)
    const fantasy = ['movie:toy-story-1995', 'movie:avatar-2009']
    const real = ['movie:el-padrino-1972', 'movie:titanic-1997']
    for (let i = 0; i < 2; i++) {
      state = applyDuelChoice(state, ctx.itemsMap.get(fantasy[i])!, ctx.itemsMap.get(real[i])!, ctx.itemsMap, 2000, 'anc:realismo')
    }
    expect(state.prefs['anc:realismo']).toBe(2)
    expect(state.closedDims).toContain('anc:realismo')
    expect(state.prefs['realismo_fantasia']).toBe(2) // la dimensión equivalente de T17 también
    const prop = getProposal(state, ctx.itemsMap, [], mockProfile)
    expect(prop).not.toBeNull()
    expect(ctx.getAnchorDimensions(shelf).find((d) => d.id === 'anc:realismo')!.side(prop!.item)).not.toBe('B')
    expect(prop!.reasons[0]).toMatch(/fantasía/)

    // Contradecirse (+1 y luego -1) la deja a 0 y la marca como «le da igual» (T17 §C.4)
    let s2 = initDecideSession({
      shelf,
      items: ctx.items,
      entries: {},
      rankings: emptyRankings,
      profile: { ...mockProfile, country: 'ES', lang: 'es' },
      friends: [],
      answers: {},
      affinity: () => null,
      friendPct: () => null,
    })
    s2 = applyDuelChoice(s2, ctx.itemsMap.get(fantasy[0])!, ctx.itemsMap.get(real[0])!, ctx.itemsMap, 2000, 'anc:realismo')
    expect(s2.prefs['anc:realismo']).toBe(1)
    s2 = applyDuelChoice(s2, ctx.itemsMap.get(real[1])!, ctx.itemsMap.get(fantasy[1])!, ctx.itemsMap, 2000, 'anc:realismo')
    expect(s2.prefs['anc:realismo']).toBe(0)
    expect(s2.neutralDims).toContain('anc:realismo')
  })

  it('una dimensión que ya fijó una pregunta previa («para reír») no se pregunta y las parejas son de ese lado (T17 §B.2)', async () => {
    const ctx = await load()
    store.clear()
    const shelf = 'boardgame'
    const state = initDecideSession({
      shelf,
      items: ctx.items,
      entries: {},
      rankings: emptyRankings,
      profile: { ...mockProfile, country: 'ES', lang: 'es' },
      friends: [],
      answers: { mood: 'risas' },
      affinity: () => null,
      friendPct: () => null,
    })
    expect(state.prefs['juegos_ambiente_fiesta_estrategia']).toBe(2)
    const d = nextDuel(state, ctx.items, new Set(), () => 0.3)!
    expect(d.scripted).toBe(true)
    expect(d.dimension).not.toBe('anc:ambiente')
    for (const it of [d.a, d.b]) {
      const side = ctx.sideOfSides(shelf, ctx.getAnchors(shelf).find((x) => x.id === it.id)?.sides, 'ambiente')
      expect(side === 'A' || side === null, `${it.id} es del lado serio`).toBe(true)
    }
  })

  it('usuario con 5 o más obras propias: el guion usa la suya en lugar del ancla del mismo extremo', async () => {
    const ctx = await load()
    store.clear()
    const shelf = 'movie'
    const root = ctx.getTree(shelf).root!
    const banned = new Set(root.pairs.flatMap((p) => [p.a, p.b]))
    const sideOf = (id: string) => ctx.sideOfSides(shelf, ctx.getAnchors(shelf).find((x) => x.id === id)?.sides, root.dim)
    const ownIds = ctx.getAnchors(shelf).filter((a) => !banned.has(a.id) && sideOf(a.id) === 'A').slice(0, 6).map((a) => a.id)
    expect(ownIds.length).toBe(6)
    const entries: Record<string, UserEntry> = {}
    for (const id of ownIds) entries[id] = { itemId: id, status: 'seen', ranked: false, updatedAt: 1 } as UserEntry
    const state = initDecideSession({
      shelf,
      items: ctx.items,
      entries,
      rankings: emptyRankings,
      profile: { ...mockProfile, country: 'ES', lang: 'es' },
      friends: [],
      answers: {},
      affinity: () => null,
      friendPct: () => null,
    })
    const d = nextDuel(state, ctx.items, new Set(), () => 0.9)!
    expect(d.scripted).toBe(true)
    expect(d.dimension).toBe(`anc:${root.dim}`)
    expect(ownIds.includes(d.a.id) || ownIds.includes(d.b.id)).toBe(true)
  })
})

describe('sameFamily (Decidir no enfrenta obras de la misma familia)', () => {
  const mk = (title: string, creator: string) => ({ id: title, title, creator, type: 'boardgame', genres: [] }) as unknown as Item
  it('detecta expansiones, sagas y mismo autor', () => {
    expect(sameFamily(mk('Carcassonne', 'Klaus-Jürgen Wrede'), mk('Carcassonne: The Castle', 'Reiner Knizia'))).toBe(true)
    expect(sameFamily(mk('Catan', 'Klaus Teuber'), mk('Catan: Seafarers', 'Otro'))).toBe(true)
    expect(sameFamily(mk('Azul', 'Michael Kiesling'), mk('Wingspan', 'Elizabeth Hargrave, Michael Kiesling'))).toBe(true)
    expect(sameFamily(mk('Azul', 'Michael Kiesling'), mk('Wingspan', 'Elizabeth Hargrave'))).toBe(false)
  })
})
