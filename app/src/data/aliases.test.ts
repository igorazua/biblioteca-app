import { describe, it, expect } from 'vitest'
import { canonicalizeUserData, collapseCloudRows, type ShelfType, type UserEntry } from '@biblioteca/core'
import { mergeCloudAndLocal } from '../lib/sync'

const ES = 'movie:cadena-perpetua-1994'
const EN = 'movie:the-shawshank-redemption-1994'
const empty = (): Record<ShelfType, string[]> => ({ movie: [], series: [], book: [], artist: [], boardgame: [], song: [] })
const entry = (itemId: string, patch: Partial<UserEntry> = {}): UserEntry => ({ itemId, status: 'seen', ranked: false, updatedAt: 1, ...patch })

// El resto de estos casos vive en packages/core/src/data/aliases.test.ts; este sigue aquí porque usa lib/sync de la PWA.
describe('Gemelas fusionadas (aliases)', () => {
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
})
