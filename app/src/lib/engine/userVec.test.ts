import { describe, it, expect } from 'vitest'
import { computeUserVector, cosineWithUser, calcDecay } from './userVec'
import { scoreItem, DEFAULT_RANKER_WEIGHTS } from './ranker'
import { loadShelfEngine } from './features'
import type { UserEntry } from '../../types'

describe('userVec (MOTOR §2c.4)', () => {
  it('calcula decaimiento temporal con vida media de 365 días', () => {
    const now = Date.now()
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000
    const twoYearsAgo = now - 2 * 365 * 24 * 60 * 60 * 1000

    expect(calcDecay(now, now)).toBeCloseTo(1.0, 3)
    expect(calcDecay(oneYearAgo, now)).toBeCloseTo(0.5, 2)
    expect(calcDecay(twoYearsAgo, now)).toBeCloseTo(0.25, 2)
  })

  it('calcula vector de usuario normalizado a partir de entradas y duelos', async () => {
    await loadShelfEngine('movie')

    const entries: Record<string, UserEntry> = {
      'movie:el-padrino-1972': {
        itemId: 'movie:el-padrino-1972',
        status: 'seen',
        ranked: true,
        updatedAt: Date.now(),
      },
      'movie:pulp-fiction-1994': {
        itemId: 'movie:pulp-fiction-1994',
        status: 'pending',
        ranked: false,
        updatedAt: Date.now(),
      },
    }

    const u = computeUserVector({
      shelf: 'movie',
      entries,
      ranking: ['movie:el-padrino-1972'],
      duelHistory: [{ winner: 'movie:el-padrino-1972', loser: 'movie:pulp-fiction-1994' }],
    })

    expect(u).not.toBeNull()
    if (u) {
      expect(u.length).toBe(48)
      // Longitud unitaria
      let normSq = 0
      for (let i = 0; i < u.length; i++) normSq += u[i] * u[i]
      expect(Math.sqrt(normSq)).toBeCloseTo(1.0, 2)

      const simElPadrino = cosineWithUser(u, 'movie', 'movie:el-padrino-1972')
      expect(simElPadrino).toBeGreaterThan(0.5)
    }
  })

  it('retorna null si no hay obras con vectores disponibles', () => {
    const u = computeUserVector({
      shelf: 'movie',
      entries: {},
    })
    expect(u).toBeNull()
    expect(cosineWithUser(null, 'movie', 'any')).toBe(0.5)
  })
})

describe('ranker (MOTOR §2c.4, T11.2)', () => {
  it('combina señales y genera una probabilidad calibrada en [0, 1]', () => {
    const pDeck = scoreItem(
      {
        cosUser: 0.8,
        recog: 0.9,
        quality: 0.85,
        social: 0.5,
        popPct: 0.7,
        novelty: 0.3,
      },
      'deck'
    )
    expect(pDeck).toBeGreaterThan(0.5)
    expect(pDeck).toBeLessThanOrEqual(1.0)

    const pLow = scoreItem(
      {
        cosUser: 0.0,
        recog: 0.0,
        quality: 0.0,
        social: 0.0,
        popPct: 0.0,
        trend: 0.0,
        moodFit: 0.0,
        platformFit: 0.0,
        novelty: 0.0,
      },
      'deck'
    )
    expect(pLow).toBeLessThan(0.3)
  })

  it('dispone de pesos calibrados independientes para deck, decide y recommend', () => {
    expect(DEFAULT_RANKER_WEIGHTS.deck.wRecog).toBeGreaterThan(0)
    expect(DEFAULT_RANKER_WEIGHTS.decide.wMoodFit).toBeGreaterThan(0)
    expect(DEFAULT_RANKER_WEIGHTS.recommend.wCosUser).toBeGreaterThan(0)
  })
})
