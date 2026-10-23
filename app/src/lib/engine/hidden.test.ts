import { describe, expect, it } from 'vitest'
import { nextCards } from './deck'
import { nextDuel, initDecideSession } from './decide'
import type { Item, Profile } from '../../types'

const defaultProfile: Profile = {
  name: 'Test',
  avatarColor: '#ff0000',
  platforms: ['Netflix'],
  birthYear: 1990,
  country: 'ES',
  lang: 'es',
}

const makeItem = (id: string, overrides: Partial<Item> = {}): Item => ({
  id,
  type: 'movie',
  title: id,
  year: 2020,
  creator: 'Director A',
  genres: ['Drama'],
  synopsis: 'Synopsis',
  posterUrl: null,
  popularity: 70,
  fameLlm: { ES: 1 },
  fameTier: 1,
  ...overrides,
})

describe('T20.1 — Obras ocultas (hidden)', () => {
  it('una obra oculta no sale en nextCards ni en nextDuel', () => {
    const visibleItem1 = makeItem('movie:visible-1', { title: 'Visible 1' })
    const visibleItem2 = makeItem('movie:visible-2', { title: 'Visible 2' })
    const hiddenItem = makeItem('movie:hidden-trash', { title: 'Obra Basura Oculta', hidden: true })

    const allItems = [visibleItem1, visibleItem2, hiddenItem]

    // 1. Comprobación en nextCards (Descubrir)
    const cards = nextCards(
      {
        shelf: 'movie',
        items: allItems,
        entries: {},
        rankings: { movie: [], series: [], book: [], artist: [], boardgame: [] },
        profile: defaultProfile,
        friends: [],
        affinity: () => null,
        friendPct: () => null,
      },
      [],
      10
    )

    const cardIds = cards.map((c) => c.item.id)
    expect(cardIds).not.toContain('movie:hidden-trash')
    expect(cardIds).toContain('movie:visible-1')

    // 2. Comprobación en nextDuel (Decidir)
    const session = initDecideSession({
      shelf: 'movie',
      items: allItems,
      entries: {},
      rankings: { movie: [], series: [], book: [], artist: [], boardgame: [] },
      profile: defaultProfile,
      friends: [],
      answers: { mood: 'emocionante' },
      affinity: () => null,
      friendPct: () => null,
    })

    const duel = nextDuel(session, allItems, new Set())
    expect(duel).not.toBeNull()
    if (duel) {
      expect(duel.a.id).not.toBe('movie:hidden-trash')
      expect(duel.b.id).not.toBe('movie:hidden-trash')
    }
  })
})
