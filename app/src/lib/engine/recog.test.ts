import { describe, expect, it } from 'vitest'
import { eraFactor, inferBirthYear, recog, type RecogContext } from './recog'
import type { Item, UserEntry } from '../../types'

describe('Motor R - Reconocibilidad (recog.ts)', () => {
  const spanishClassic: Item = {
    id: 'movie:torrente-1998',
    type: 'movie',
    title: 'Torrente, el brazo tonto de la ley',
    year: 1998,
    creator: 'Santiago Segura',
    genres: ['Comedia'],
    synopsis: 'Comedia española muy conocida',
    posterUrl: null,
    popularity: 90,
    notoriety: { ES: 0.95, MX: 0.20 },
  }

  const foreignObscure: Item = {
    id: 'movie:foreign-obscure-1998',
    type: 'movie',
    title: 'Obscure Foreign Film',
    year: 1998,
    creator: 'Unknown Director',
    genres: ['Drama'],
    synopsis: 'Película extranjera poco conocida',
    posterUrl: null,
    popularity: 15,
    notoriety: { ES: 0.05, US: 0.10 },
  }

  it('arranque en frío ordena antes una obra muy notoria en España de la época del usuario que una extranjera poco notoria', () => {
    // Usuario español nacido en 1980 (en 1998 tenía 18 años, justo en su ventana formativa [12, 25])
    const ctxColdES: RecogContext = {
      user: {
        country: 'ES',
        birthYear: 1980,
      },
    }

    const rSpanish = recog(spanishClassic, ctxColdES)
    const rForeign = recog(foreignObscure, ctxColdES)

    expect(rSpanish).toBeGreaterThan(0.7)
    expect(rForeign).toBeLessThan(0.2)
    expect(rSpanish).toBeGreaterThan(rForeign)
  })

  it('devuelve R = 1.0 si la obra está marcada como vista y R = 0.9 si está pendiente', () => {
    const ctxSeen: RecogContext = {
      user: { country: 'ES', birthYear: 1990 },
      entries: {
        [foreignObscure.id]: {
          itemId: foreignObscure.id,
          shelf: 'movie',
          status: 'seen',
          ranked: false,
          updatedAt: Date.now(),
        },
      },
    }

    const ctxPending: RecogContext = {
      user: { country: 'ES', birthYear: 1990 },
      entries: {
        [foreignObscure.id]: {
          itemId: foreignObscure.id,
          shelf: 'movie',
          status: 'pending',
          ranked: false,
          updatedAt: Date.now(),
        },
      },
    }

    expect(recog(foreignObscure, ctxSeen)).toBe(1.0)
    expect(recog(foreignObscure, ctxPending)).toBe(0.9)
  })

  it('inferBirthYear da un año razonable con un historial o mazo de ejemplo', () => {
    // DeckLearn con pico de tarjetas vistas en los 1990s
    const deckLearnSample = {
      byMacro: {},
      byDecade: {
        '1970': { shown: 20, seen: 2, up: 1, left: 17 },
        '1980': { shown: 25, seen: 5, up: 2, left: 18 },
        '1990': { shown: 30, seen: 22, up: 2, left: 6 }, // 73% vista
        '2000': { shown: 25, seen: 6, up: 3, left: 16 },
      },
    }

    const inferred = inferBirthYear(undefined, undefined, deckLearnSample)
    expect(inferred).toBeDefined()
    // 1990 + 5 - 25 = 1970
    expect(inferred).toBe(1970)
  })

  it('eraFactor aplica la ventana formativa y transiciones suaves', () => {
    // Usuario nacido en 1980
    // En 1995 tiene 15 años (dentro de ventana formativa [12, 25]) -> 1.0
    expect(eraFactor(1995, 1980)).toBe(1.0)

    // Obra estrenada antes de nacer sin canon -> menor de 0.5
    expect(eraFactor(1975, 1980)).toBeLessThan(0.5)

    // Obra estrenada antes de nacer que es canon -> 0.9
    expect(eraFactor(1975, 1980, { isCanon: true })).toBe(0.9)

    // Obra de juego de mesa -> 0.8 constante
    expect(eraFactor(1990, 1980, { type: 'boardgame' })).toBe(0.8)
  })
})
