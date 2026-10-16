import { describe, it, expect } from 'vitest'
import {
  calcDeckMetrics,
  calcDecideMetrics,
  calcCleanupMetrics,
  calcAllMetrics,
} from './metrics'
import type { EngineEvent } from '../../store/useEvents'

describe('metrics.ts', () => {
  it('calculates deck metrics correctly', () => {
    const events: EngineEvent[] = [
      // Sesión 1: 3 swipes
      {
        t: 1000,
        v: 'm1.0',
        sid: 's1',
        type: 'deck_shown',
        shelf: 'movie',
        data: { bucket: 'seen_likely' },
      },
      {
        t: 1200,
        v: 'm1.0',
        sid: 's1',
        type: 'deck_swipe',
        shelf: 'movie',
        data: { dir: 'right', bucket: 'seen_likely', ms: 1200 },
      },
      {
        t: 2000,
        v: 'm1.0',
        sid: 's1',
        type: 'deck_swipe',
        shelf: 'movie',
        data: { dir: 'up', bucket: 'social', ms: 800 },
      },
      {
        t: 3000,
        v: 'm1.0',
        sid: 's1',
        type: 'deck_swipe',
        shelf: 'movie',
        data: { dir: 'left', bucket: 'explore', ms: 1000 },
      },
    ]

    const m = calcDeckMetrics(events)
    expect(m.totalSwipes).toBe(3)
    expect(m.totalSessions).toBe(1)
    expect(m.seenRate).toBe(33) // 1/3
    expect(m.discoveryRate).toBe(33) // 1/3
    expect(m.dismissRate).toBe(33) // 1/3
    expect(m.avgMsPerCard).toBe(1000) // (1200+800+1000)/3
    expect(m.byBucket.seen_likely.right).toBe(1)
    expect(m.byBucket.social.up).toBe(1)
    expect(m.byBucket.explore.left).toBe(1)
  })

  it('calculates decide metrics with acceptance and 14d conversion', () => {
    const t0 = 100000
    const events: EngineEvent[] = [
      // Sesión exitosa
      { t: t0, v: 'm1.0', sid: 'dec_1', type: 'dec_start', shelf: 'movie' },
      { t: t0 + 1000, v: 'm1.0', sid: 'dec_1', type: 'dec_duel', shelf: 'movie', data: { infoGain: 0.8 } },
      { t: t0 + 2000, v: 'm1.0', sid: 'dec_1', type: 'dec_duel', shelf: 'movie', data: { infoGain: 0.6 } },
      { t: t0 + 3000, v: 'm1.0', sid: 'dec_1', type: 'dec_accept', shelf: 'movie', itemId: 'movie:1', data: { round: 1 } },
      // Sesión abandonada
      { t: t0 + 4000, v: 'm1.0', sid: 'dec_2', type: 'dec_start', shelf: 'movie' },
      { t: t0 + 5000, v: 'm1.0', sid: 'dec_2', type: 'dec_abandon', shelf: 'movie' },
      // Evento a posteriori de la obra aceptada: se vio 2 días después y quedó en percentil 0.92
      { t: t0 + 2 * 24 * 3600 * 1000, v: 'm1.0', sid: 'later', type: 'entry_status', shelf: 'movie', itemId: 'movie:1', data: { to: 'seen' } },
      { t: t0 + 2 * 24 * 3600 * 1000, v: 'm1.0', sid: 'later', type: 'entry_ranked', shelf: 'movie', itemId: 'movie:1', data: { pct: 0.92 } },
    ]

    const m = calcDecideMetrics(events)
    expect(m.totalSessions).toBe(2)
    expect(m.acceptedSessions).toBe(1)
    expect(m.firstRoundAcceptRate).toBe(100)
    expect(m.abandonRate).toBe(50)
    expect(m.avgDuels).toBe(2)
    expect(m.avgInfoGain).toBe(0.7) // (0.8 + 0.6)/2
    expect(m.acceptedItemsCount).toBe(1)
    expect(m.realSuccessRate14d).toBe(100)
    expect(m.realAvgPercentile).toBe(0.92)
  })

  it('calculates cleanup metrics correctly', () => {
    const events: EngineEvent[] = [
      { t: 100, v: 'm1.0', sid: 'c1', type: 'clean_swipe', shelf: 'series', data: { dir: 'right' } },
      { t: 200, v: 'm1.0', sid: 'c1', type: 'clean_swipe', shelf: 'series', data: { dir: 'right' } },
      { t: 300, v: 'm1.0', sid: 'c1', type: 'clean_swipe', shelf: 'series', data: { dir: 'up' } },
      { t: 400, v: 'm1.0', sid: 'c1', type: 'clean_swipe', shelf: 'series', data: { dir: 'left' } },
    ]

    const m = calcCleanupMetrics(events)
    expect(m.totalSwipes).toBe(4)
    expect(m.rightRate).toBe(50)
    expect(m.upRate).toBe(25)
    expect(m.leftRate).toBe(25)
  })

  it('filters all metrics by version and shelf', () => {
    const events: EngineEvent[] = [
      { t: 100, v: 'm1.0', sid: 's1', type: 'deck_swipe', shelf: 'movie', data: { dir: 'right' } },
      { t: 200, v: 'm2.0', sid: 's2', type: 'deck_swipe', shelf: 'movie', data: { dir: 'left' } },
      { t: 300, v: 'm1.0', sid: 's3', type: 'deck_swipe', shelf: 'book', data: { dir: 'up' } },
    ]

    const all = calcAllMetrics(events, { version: 'm1.0', shelf: 'movie' })
    expect(all.deck.totalSwipes).toBe(1)
    expect(all.deck.seenRate).toBe(100)
  })
})
