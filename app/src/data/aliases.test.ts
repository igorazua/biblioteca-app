import { describe, it, expect } from 'vitest'
import { canonicalId, canonicalizeUserData, collapseCloudRows } from './aliases'
import { mergeCloudAndLocal } from '../lib/sync'
import { getItem, items } from './catalog'
import type { ShelfType, UserEntry } from '../types'

const ES = 'movie:cadena-perpetua-1994'
const EN = 'movie:the-shawshank-redemption-1994'
const empty = (): Record<ShelfType, string[]> => ({ movie: [], series: [], book: [], artist: [], boardgame: [], song: [] })
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

  it('nube: una fila sin nota más reciente de la otra gemela no pisa la entrada fusionada', () => {
    const local = canonicalizeUserData({
      entries: { [EN]: entry(EN, { stars: 5, ranked: true, updatedAt: 1000 }), [ES]: entry(ES, { comment: 'me marcó', updatedAt: 500 }) },
      rankings: { ...empty(), movie: [EN] },
      lists: [],
    })
    const row = (item_id: string, patch: object) => ({
      id: item_id, user_id: 'u', item_id, shelf: 'movie', status: 'seen' as const,
      score: null, comment: null, rank_position: null, updated_at: new Date(1000).toISOString(), ...patch,
    })
    const rows = collapseCloudRows([
      row(ES, { comment: 'me marcó', updated_at: new Date(5000).toISOString() }),
      row(EN, { score: 5, rank_position: 1, updated_at: new Date(1000).toISOString() }),
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ item_id: ES, score: 5, comment: 'me marcó', rank_position: 1 })

    const merged = mergeCloudAndLocal(local.entries, local.rankings, rows)
    expect(merged.entries[ES]).toMatchObject({ stars: 5, comment: 'me marcó' })
    expect(merged.entries[EN]).toBeUndefined()
    expect(merged.rankings.movie).toEqual([ES])
  })

  it('los ids eliminados por duplicado manual (twins-manual) resuelven a su gemela', () => {
    expect(canonicalId('book:the-hobbit-1937')).toBe('book:el-hobbit-1937')
    expect(canonicalId('book:the-art-of-war-1900')).toBe('book:el-arte-de-la-guerra--500')
    expect(canonicalId('book:the-picture-of-dorian-gray-1890')).toBe('book:el-retrato-de-dorian-gray-1890')
    expect(canonicalId('book:the-prince-1515')).toBe('book:el-principe-1532')
  })
})
