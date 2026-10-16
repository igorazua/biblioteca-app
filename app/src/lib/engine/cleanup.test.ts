import { describe, it, expect } from 'vitest'
import { cleanupOrder } from './cleanup'
import type { Item, UserEntry } from '../../types'

const makeItem = (id: string): Item => ({
  id,
  type: 'movie',
  title: id,
  year: 2020,
  creator: 'Director',
  genres: ['Drama'],
  synopsis: 'Synopsis',
  posterUrl: null,
  popularity: 50,
})

describe('cleanupOrder (MOTOR.md §9)', () => {
  const now = 1000000000000
  const DAY_MS = 24 * 3600 * 1000

  it('orders oldest unreviewed items first', () => {
    const items = [makeItem('item1'), makeItem('item2'), makeItem('item3')]
    const entries: Record<string, UserEntry> = {
      item1: { itemId: 'item1', status: 'pending', ranked: false, updatedAt: now - 10 * DAY_MS },
      item2: { itemId: 'item2', status: 'pending', ranked: false, updatedAt: now - 100 * DAY_MS },
      item3: { itemId: 'item3', status: 'pending', ranked: false, updatedAt: now - 30 * DAY_MS },
    }

    const ordered = cleanupOrder(items, entries, undefined, now)
    // item2 (100d ago) -> item3 (30d ago) -> item1 (10d ago)
    expect(ordered.map((i) => i.id)).toEqual(['item2', 'item3', 'item1'])
  })

  it('prioritizes unreviewed items with recent friend activity', () => {
    const items = [makeItem('item1'), makeItem('item2')]
    const entries: Record<string, UserEntry> = {
      item1: { itemId: 'item1', status: 'pending', ranked: false, updatedAt: now - 100 * DAY_MS },
      item2: { itemId: 'item2', status: 'pending', ranked: false, updatedAt: now - 10 * DAY_MS },
    }

    // item2 has recent friend activity
    const getFriendsRecent = (id: string) => id === 'item2'

    const ordered = cleanupOrder(items, entries, getFriendsRecent, now)
    expect(ordered[0].id).toBe('item2')
    expect(ordered[1].id).toBe('item1')
  })

  it('puts items reviewed within 60 days at the end', () => {
    const items = [makeItem('recentReview'), makeItem('unreviewed')]
    const entries: Record<string, UserEntry> = {
      recentReview: {
        itemId: 'recentReview',
        status: 'pending',
        ranked: false,
        updatedAt: now - 200 * DAY_MS,
        reviewedAt: now - 10 * DAY_MS, // Reviewed 10 days ago (<60d)
      },
      unreviewed: {
        itemId: 'unreviewed',
        status: 'pending',
        ranked: false,
        updatedAt: now - 30 * DAY_MS,
      },
    }

    const ordered = cleanupOrder(items, entries, undefined, now)
    expect(ordered[0].id).toBe('unreviewed')
    expect(ordered[1].id).toBe('recentReview')
  })

  it('handles empty list and missing entry records gracefully', () => {
    expect(cleanupOrder([], {})).toEqual([])
    const items = [makeItem('unknown')]
    expect(cleanupOrder(items, {})).toEqual(items)
  })
})
