import { describe, it, expect } from 'vitest'
import { canonicalId, canonicalizeUserData } from './aliases'
import { getItem, items } from './catalog'
import type { ShelfType, UserEntry } from '../types'

const ES = 'movie:cadena-perpetua-1994'
const EN = 'movie:the-shawshank-redemption-1994'
const empty = (): Record<ShelfType, string[]> => ({ movie: [], series: [], book: [], artist: [], boardgame: [] })
const entry = (itemId: string, patch: Partial<UserEntry> = {}): UserEntry => ({ itemId, status: 'seen', ranked: false, updatedAt: 1, ...patch })

describe('Gemelas fusionadas (aliases)', () => {
  it('el seed ya no repite Wikidata ID y el id antiguo lleva a la obra conservada', () => {
    const seen = new Set<string>()
    for (const it of items) {
      if (!it.wikidataId) continue
      const k = `${it.type}|${it.wikidataId}`
      expect(seen.has(k), k).toBe(false)
      seen.add(k)
    }
    expect(canonicalId(EN)).toBe(ES)
    expect(getItem(EN)?.id).toBe(ES)
  })

  it('pasa una entrada, su puesto y su lista al id conservado', () => {
    const rankings = empty()
    rankings.movie = ['movie:matrix-1999', EN]
    const c = canonicalizeUserData({
      entries: { [EN]: entry(EN, { stars: 5, ranked: true }) },
      rankings,
      lists: [{ id: 'l1', title: 'Cárcel', items: [{ itemId: EN, note: 'top' }], createdAt: 1 }],
    })
    expect(c.changed).toBe(true)
    expect(c.entries[ES]).toMatchObject({ itemId: ES, stars: 5, ranked: true })
    expect(c.entries[EN]).toBeUndefined()
    expect(c.rankings.movie).toEqual(['movie:matrix-1999', ES])
    expect(c.lists[0].items).toEqual([{ itemId: ES, note: 'top' }])
  })

  it('con las dos gemelas guardadas se queda una: la valorada, con el comentario de la otra y el mejor puesto', () => {
    const rankings = empty()
    rankings.movie = [EN, 'movie:matrix-1999', ES]
    const c = canonicalizeUserData({
      entries: {
        [ES]: entry(ES, { comment: 'me marcó', updatedAt: 9 }),
        [EN]: entry(EN, { stars: 4, ranked: true, updatedAt: 2 }),
      },
      rankings,
      lists: [{ id: 'l1', title: 'x', items: [{ itemId: ES }, { itemId: EN }], createdAt: 1 }],
    })
    expect(Object.keys(c.entries)).toEqual([ES])
    expect(c.entries[ES]).toMatchObject({ stars: 4, ranked: true, comment: 'me marcó' })
    expect(c.rankings.movie).toEqual([ES, 'movie:matrix-1999'])
    expect(c.lists[0].items).toEqual([{ itemId: ES }])
  })

  it('sin ids antiguos no toca nada', () => {
    const rankings = empty()
    rankings.movie = [ES]
    const lists = [{ id: 'l1', title: 'x', items: [{ itemId: ES }], createdAt: 1 }]
    const c = canonicalizeUserData({ entries: { [ES]: entry(ES) }, rankings, lists })
    expect(c.changed).toBe(false)
    expect(c.lists[0]).toBe(lists[0])
  })
})
