import { describe, expect, it } from 'vitest'
import { applyShaper, newShaping, nextShaperPair, scoreCandidates } from './recommend'
import { items } from '../data/catalog'

const rng = () => 0.37
const byTitle = (t: string) => items.find((i) => i.title === t)!

describe('duelos orientadores', () => {
  it('siempre son dos obras distintas de la categoría elegida', () => {
    for (const shelf of ['movie', 'series', 'book'] as const) {
      const pair = nextShaperPair(items, shelf, {}, [], rng)!
      expect(pair[0].id).not.toBe(pair[1].id)
      for (const it of pair) expect(it.type).toBe(shelf)
    }
  })
  it('no repite obras ya enseñadas', () => {
    const shown: string[] = []
    for (let i = 0; i < 8; i++) {
      const pair = nextShaperPair(items, 'movie', {}, shown, rng)!
      for (const it of pair) expect(shown).not.toContain(it.id)
      shown.push(pair[0].id, pair[1].id)
    }
  })
  it('respeta el ánimo elegido mientras haya obras de ese ánimo', () => {
    const pair = nextShaperPair(items, 'movie', { mood: 'miedo' }, [], rng)!
    for (const it of pair) expect(it.genres.some((g) => ['Terror', 'Thriller'].includes(g))).toBe(true)
  })
})

describe('candidatas', () => {
  const base = { shelf: 'movie' as const, items, answers: {}, friendsMean: () => null, platforms: [] as string[] }
  it('los orientadores enseñados nunca son candidatas', () => {
    const pair = nextShaperPair(items, 'movie', {}, [], rng)!
    const sh = { ...applyShaper(newShaping(), pair[0], pair[1]), shown: [pair[0].id, pair[1].id] }
    const out = scoreCandidates({ ...base, entries: {}, shaping: sh })
    for (const c of out) expect(sh.shown).not.toContain(c.item.id)
  })
  it('elegir un orientador sube a las obras parecidas', () => {
    const terror = byTitle('El resplandor'), comedia = byTitle('Campeones')
    let sh = newShaping()
    for (let i = 0; i < 3; i++) sh = applyShaper(sh, terror, comedia)
    sh = { ...sh, shown: [terror.id, comedia.id] }
    const top = scoreCandidates({ ...base, entries: {}, shaping: sh })[0]
    expect(top.item.genres.some((g) => terror.genres.includes(g))).toBe(true)
  })
  it('los pendientes puntúan por encima de lo no visto', () => {
    const id = byTitle('El hoyo').id
    const withPending = scoreCandidates({ ...base, shaping: newShaping(), entries: { [id]: { itemId: id, status: 'pending', ranked: false, updatedAt: 0 } } })
    const without = scoreCandidates({ ...base, shaping: newShaping(), entries: {} })
    const a = withPending.find((c) => c.item.id === id)!.score
    const b = without.find((c) => c.item.id === id)?.score
    if (b !== undefined) expect(a).toBeGreaterThan(b)
  })
  it('respeta el tiempo disponible', () => {
    const out = scoreCandidates({ ...base, entries: {}, shaping: newShaping(), answers: { time: 'corta' } })
    expect(out.length).toBeGreaterThan(0)
    for (const c of out) expect(c.item.durationMin ?? 0).toBeLessThanOrEqual(100)
  })
  it('libros: «algo real» solo propone no ficción', () => {
    const out = scoreCandidates({ ...base, shelf: 'book', entries: {}, shaping: newShaping(), answers: { kind: 'noficcion' } })
    if (out.length >= 3) for (const c of out) expect(c.item.genres.some((g) => ['Ensayo', 'Historia', 'Biografía'].includes(g))).toBe(true)
  })
  it('nunca propone lo ya visto o descartado', () => {
    const seen = Object.fromEntries(items.filter((i) => i.type === 'movie').slice(0, 70).map((i) => [i.id, { itemId: i.id, status: 'seen' as const, ranked: true, updatedAt: 0 }]))
    const out = scoreCandidates({ ...base, entries: seen, shaping: newShaping() })
    for (const c of out) expect(seen[c.item.id]).toBeUndefined()
  })
})
