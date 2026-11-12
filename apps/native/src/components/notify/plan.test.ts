import { describe, expect, it } from 'vitest'
import type { UserEntry } from '@biblioteca/core'
import { FALLBACK_BODY, SLOTS, nextDates, planReminders, type ReminderInput } from './plan'

const entry = (status: 'seen' | 'pending', shelf = 'movie', ranked = false): UserEntry => ({ itemId: 'x', status, shelf, ranked, at: 0 }) as unknown as UserEntry
const many = (n: number, status: 'seen' | 'pending', shelf = 'movie') => Object.fromEntries(Array.from({ length: n }, (_, i) => [`${shelf}${status}${i}`, entry(status, shelf)]))
const base = (over: Partial<ReminderInput> = {}): ReminderInput => ({
  hasAccount: true,
  entries: {},
  rankings: { movie: [], series: [], book: [], boardgame: [], artist: [], song: [] },
  friendsCount: 2,
  hasUsedDecide: false,
  now: new Date(2026, 10, 12, 10, 0).getTime(), // jueves 12/11/2026 10:00
  ...over,
})

describe('avisos locales', () => {
  it('sin frecuencia («none») no programa nada', () => {
    expect(planReminders('none', base({ entries: many(20, 'pending') }))).toEqual([])
  })

  it('«Solo importantes» = un aviso a la semana, 2 semanas, sin relleno si no hay nada que decir', () => {
    expect(planReminders('important', base())).toEqual([])
    const spread = { ...many(3, 'pending', 'movie'), ...many(3, 'pending', 'series'), ...many(3, 'pending', 'book'), ...many(3, 'pending', 'boardgame'), ...many(3, 'pending', 'artist') }
    const plan = planReminders('important', base({ entries: spread }))
    expect(plan).toHaveLength(2)
    expect(plan[0].body).toContain('15 pendientes')
    expect(plan[0].route).toBe('/decidir')
    // y con una estantería vacía, el aviso de explorarla tiene prioridad
    expect(planReminders('important', base({ entries: many(12, 'pending') }))[0].body).toContain('Aún no has mirado')
  })

  it('«Todas» = dos a la semana y cae al texto por defecto', () => {
    const plan = planReminders('all', base())
    expect(plan).toHaveLength(4)
    expect(plan.every((p) => p.body === FALLBACK_BODY)).toBe(true)
  })

  it('nunca avisa de iniciar sesión ni de importar, aunque apliquen como recordatorios', () => {
    const plan = planReminders('all', base({ hasAccount: false, entries: many(6, 'pending') }))
    expect(plan.some((p) => /Entra para no perderlas|Letterboxd/.test(p.body))).toBe(false)
  })

  it('máximo 2 por semana y todos entre las 9:00 y las 22:00', () => {
    const plan = planReminders('all', base({ entries: many(12, 'pending') }))
    for (const p of plan) {
      const h = new Date(p.at).getHours()
      expect(h).toBeGreaterThanOrEqual(9)
      expect(h).toBeLessThan(22)
    }
    expect(plan[0].at).toBeGreaterThan(base().now!)
  })

  it('las franjas caen en el día de la semana pedido y en el futuro', () => {
    for (const slot of [...SLOTS.important, ...SLOTS.all]) {
      const dates = nextDates(slot, base().now!)
      expect(dates).toHaveLength(2)
      for (const d of dates) {
        expect(d.getDay()).toBe(slot.weekday)
        expect(d.getTime()).toBeGreaterThan(base().now!)
      }
    }
  })
})
