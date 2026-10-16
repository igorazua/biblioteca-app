import { describe, it, expect } from 'vitest'
import { nextCards } from './deck'
import type { Item, Profile, UserEntry, Friend } from '../../types'

const makeItem = (id: string, overrides: Partial<Item> = {}): Item => ({
  id,
  type: 'movie',
  title: id,
  year: 2010,
  creator: 'Director A',
  genres: ['Drama'],
  synopsis: 'Synopsis',
  posterUrl: null,
  popularity: 70,
  ...overrides,
})

describe('nextCards (MOTOR.md §7)', () => {
  const defaultProfile: Profile = {
    name: 'Tú',
    avatarColor: '#F5B544',
    platforms: ['Netflix'],
    birthYear: 1990,
    country: 'ES',
    lang: 'es',
  }

  it('guarantees first cards come from seen_likely or social', () => {
    const items = [
      makeItem('m1', { popularity: 95 }),
      makeItem('m2', { popularity: 90 }),
      makeItem('m3', { popularity: 85 }),
      makeItem('m4', { popularity: 80 }),
      makeItem('m5', { popularity: 75 }),
      makeItem('m6', { popularity: 70 }),
    ]

    const cards = nextCards({
      shelf: 'movie',
      items,
      entries: {},
      rankings: { movie: [], series: [], book: [], artist: [], boardgame: [] },
      profile: defaultProfile,
      friends: [],
      affinity: () => null,
      friendPct: () => null,
    }, [], 5)

    expect(cards.length).toBe(5)
    for (const c of cards) {
      expect(['seen_likely', 'social']).toContain(c.bucket)
    }
  })

  it('ensures platforms never filter out items', () => {
    // Only item has platform HBO (user has Netflix)
    const items = [makeItem('m1', { platforms: ['HBO'] })]

    const cards = nextCards({
      shelf: 'movie',
      items,
      entries: {},
      rankings: { movie: [], series: [], book: [], artist: [], boardgame: [] },
      profile: { ...defaultProfile, platforms: ['Netflix'] },
      friends: [],
      affinity: () => null,
      friendPct: () => null,
    }, [], 1)

    expect(cards.length).toBe(1)
    expect(cards[0].item.id).toBe('m1')
  })

  it('enforces diversity rules (max 2 consecutive same creator)', () => {
    const items = [
      makeItem('c1_1', { creator: 'Nolan', popularity: 99 }),
      makeItem('c1_2', { creator: 'Nolan', popularity: 98 }),
      makeItem('c1_3', { creator: 'Nolan', popularity: 97 }),
      makeItem('c2_1', { creator: 'Tarantino', popularity: 80 }),
    ]

    const cards = nextCards({
      shelf: 'movie',
      items,
      entries: {},
      rankings: { movie: [], series: [], book: [], artist: [], boardgame: [] },
      profile: defaultProfile,
      friends: [],
      affinity: () => null,
      friendPct: () => null,
    }, [], 4)

    // Cannot have 3 Nolan in a row
    const creators = cards.map((c) => c.item.creator)
    let consecutiveNolan = 0
    let maxConsecutive = 0
    for (const c of creators) {
      if (c === 'Nolan') {
        consecutiveNolan++
        maxConsecutive = Math.max(maxConsecutive, consecutiveNolan)
      } else {
        consecutiveNolan = 0
      }
    }
    expect(maxConsecutive).toBeLessThanOrEqual(2)
  })

  it('enforces diversity rules (no two from same collection within 6 cards)', () => {
    const items = [
      makeItem('hp1', { collection: 'Harry Potter', genres: ['Fantasia'], creator: 'Colubmus', popularity: 99 }),
      makeItem('hp2', { collection: 'Harry Potter', genres: ['Fantasia'], creator: 'Cuaron', popularity: 98 }),
      makeItem('other1', { creator: 'Dir 1', genres: ['Comedia'], popularity: 90 }),
      makeItem('other2', { creator: 'Dir 2', genres: ['Drama'], popularity: 89 }),
      makeItem('other3', { creator: 'Dir 3', genres: ['Accion'], popularity: 88 }),
      makeItem('other4', { creator: 'Dir 4', genres: ['Terror'], popularity: 87 }),
      makeItem('other5', { creator: 'Dir 5', genres: ['Sci-Fi'], popularity: 86 }),
    ]

    const cards = nextCards({
      shelf: 'movie',
      items,
      entries: {},
      rankings: { movie: [], series: [], book: [], artist: [], boardgame: [] },
      profile: defaultProfile,
      friends: [],
      affinity: () => null,
      friendPct: () => null,
    }, [], 7)

    const hpIndices = cards
      .map((c, i) => (c.item.collection === 'Harry Potter' ? i : -1))
      .filter((i) => i !== -1)

    if (hpIndices.length >= 2) {
      expect(hpIndices[1] - hpIndices[0]).toBeGreaterThanOrEqual(6)
    }
  })

  it('brings back dismissed items after DISMISS_RETURN_D days', () => {
    const now = 2000000000000
    const DAY_MS = 24 * 3600 * 1000
    const item = makeItem('oldDismissed')

    const entries: Record<string, UserEntry> = {
      oldDismissed: {
        itemId: 'oldDismissed',
        status: 'dismissed',
        ranked: false,
        dismissedAt: now - 370 * DAY_MS, // 370 days ago (> 365)
        updatedAt: now - 370 * DAY_MS,
      },
    }

    const cards = nextCards({
      shelf: 'movie',
      items: [item],
      entries,
      rankings: { movie: [], series: [], book: [], artist: [], boardgame: [] },
      profile: defaultProfile,
      friends: [],
      affinity: () => null,
      friendPct: () => null,
      now,
    }, [], 1)

    expect(cards.length).toBe(1)
    expect(cards[0].item.id).toBe('oldDismissed')
  })

  it('handles empty shelf or fully reviewed shelf gracefully', () => {
    const cards = nextCards({
      shelf: 'movie',
      items: [],
      entries: {},
      rankings: { movie: [], series: [], book: [], artist: [], boardgame: [] },
      profile: defaultProfile,
      friends: [],
      affinity: () => null,
      friendPct: () => null,
    }, [], 10)

    expect(cards).toEqual([])
  })
})
