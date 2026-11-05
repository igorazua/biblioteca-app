// app/src/lib/nudges.test.ts
import { describe, expect, it } from 'vitest'
import { evaluateNudges, canShowNudge, type NudgeInput } from './nudges'
import type { ShelfType, UserEntry } from '../types'

const baseInput = (): NudgeInput => ({
  hasAccount: false,
  entries: {},
  rankings: { movie: [], series: [], book: [], artist: [], boardgame: [], song: [] },
  hasImported: true,
  friendsCount: 0,
  hasUsedDecide: false,
  isStandalonePwa: true,
  isMobile: false,
  daysOfUsage: 1,
  dismissHistory: {},
  sessionNudgeShown: false,
  now: 1700000000000,
})

const makeEntries = (n: number, status: 'seen' | 'pending' = 'seen', shelf: ShelfType = 'movie') => {
  const entries: Record<string, UserEntry> = {}
  for (let i = 0; i < n; i++) {
    entries[`item-${i}`] = {
      itemId: `item-${i}`,
      shelf,
      status,
      ranked: false,
      updatedAt: 1000,
    }
  }
  return entries
}

describe('nudges engine', () => {
  it('returns null when sessionNudgeShown is true', () => {
    const input = { ...baseInput(), sessionNudgeShown: true, entries: makeEntries(10) }
    expect(evaluateNudges(input)).toBeNull()
  })

  it('triggers login nudge when without account and >= 5 saved items', () => {
    const input = { ...baseInput(), hasAccount: false, entries: makeEntries(6) }
    const nudge = evaluateNudges(input)
    expect(nudge?.id).toBe('login')
    expect(nudge?.actionType).toBe('login')
  })

  it('triggers import nudge when never imported and low shelf count', () => {
    const input = {
      ...baseInput(),
      hasAccount: true,
      hasImported: false,
      entries: makeEntries(4),
    }
    const nudge = evaluateNudges(input)
    expect(nudge?.id).toBe('import')
    expect(nudge?.targetRoute).toBe('/importar')
  })

  it('triggers explore nudge when one shelf has >= 10 and another is untouched', () => {
    const input = {
      ...baseInput(),
      hasAccount: true,
      entries: makeEntries(12, 'seen', 'movie'),
    }
    const nudge = evaluateNudges(input)
    expect(nudge?.id).toBe('explore')
    expect(nudge?.shelf).toBeDefined()
  })

  it('triggers rank nudge when >= 5 unranked seen items', () => {
    const entries = makeEntries(5, 'seen', 'movie')
    const input = {
      ...baseInput(),
      hasAccount: true,
      entries,
    }
    const nudge = evaluateNudges(input)
    expect(nudge?.id).toBe('rank')
  })

  it('triggers invite nudge when with account, >= 15 items and 0 friends', () => {
    const entries = makeEntries(16, 'seen', 'movie')
    for (const k of Object.keys(entries)) entries[k].ranked = true
    // Touch all shelves so explore doesn't preempt
    for (const s of ['series', 'book', 'artist', 'boardgame', 'song'] as const) {
      entries[`dummy-${s}`] = { itemId: `dummy-${s}`, shelf: s, status: 'seen', ranked: true, updatedAt: 1000 }
    }
    const input = {
      ...baseInput(),
      hasAccount: true,
      friendsCount: 0,
      entries,
    }
    const nudge = evaluateNudges(input)
    expect(nudge?.id).toBe('invite')
  })

  it('triggers decide nudge when >= 10 pending and never used decide', () => {
    const entries = makeEntries(11, 'pending', 'movie')
    // Touch all shelves so explore doesn't preempt
    for (const s of ['series', 'book', 'artist', 'boardgame', 'song'] as const) {
      entries[`dummy-${s}`] = { itemId: `dummy-${s}`, shelf: s, status: 'seen', ranked: true, updatedAt: 1000 }
    }
    const input = {
      ...baseInput(),
      hasAccount: true,
      friendsCount: 2,
      entries,
      hasUsedDecide: false,
    }
    const nudge = evaluateNudges(input)
    expect(nudge?.id).toBe('decide')
  })

  it('triggers install nudge on mobile day 2 without standalone PWA', () => {
    const input = {
      ...baseInput(),
      hasAccount: true,
      isMobile: true,
      isStandalonePwa: false,
      daysOfUsage: 2,
      friendsCount: 1,
    }
    const nudge = evaluateNudges(input)
    expect(nudge?.id).toBe('install')
  })

  it('respects dismiss cooldown (3 days) and max dismiss count (3)', () => {
    const now = 1700000000000
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    const fourDaysAgo = now - 4 * 24 * 60 * 60 * 1000

    expect(canShowNudge('login', { login: { count: 1, lastDismissedAt: oneDayAgo } }, now)).toBe(false)
    expect(canShowNudge('login', { login: { count: 1, lastDismissedAt: fourDaysAgo } }, now)).toBe(true)
    expect(canShowNudge('login', { login: { count: 3, lastDismissedAt: fourDaysAgo } }, now)).toBe(false)
  })
})
