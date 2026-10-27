// Motor v2 de Decidir: los casos que pidió Igor (27/10/2026), con el catálogo real.
import { beforeAll, describe, expect, it } from 'vitest'
import { items, itemsById } from '../../data/catalog'
import { applyDuelChoice, getProposal, initDecideSession, nextDuel, rejectAndContinue, sessionTaste, shouldPropose, traitWeight, type Decide2State } from './decide2'
import { loadShelfEngine } from './features'
import type { Item, Profile, ShelfType, UserEntry } from '../../types'

const profile: Profile = { name: 'Test', avatarColor: '#fff', platforms: [], country: 'ES', lang: 'es' }
const rankings = { movie: [], series: [], book: [], artist: [], boardgame: [], song: [] }
const entriesOf = (ids: string[], status: UserEntry['status'], shelf: ShelfType) =>
  Object.fromEntries(ids.map((id) => [id, { itemId: id, shelf, status, ranked: false, updatedAt: 1 } as UserEntry]))
const start = (shelf: ShelfType, answers: Record<string, string | string[]>, entries: Record<string, UserEntry> = {}) =>
  initDecideSession({ shelf, items, entries, rankings, profile, friends: [], answers, affinity: () => null, friendPct: () => null, recentOrienters: [], userVec: null, doubtfulItems: {} })

/** Sesión completa respondiendo con un gusto; devuelve el estado al proponer. */
function play(st0: Decide2State, taste: (it: Item) => number, maxDuels = 8) {
  let st = st0
  let n = 0
  const pairs: [Item, Item][] = []
  for (; n < maxDuels; n++) {
    if (n > 0 && shouldPropose(st)) break
    const d = nextDuel(st, items, new Set(), () => 0.37)
    if (!d) break
    pairs.push([d.a, d.b])
    st = taste(d.a) >= taste(d.b) ? applyDuelChoice(st, d.a, d.b) : applyDuelChoice(st, d.b, d.a)
  }
  return { st, n, pairs }
}

const games = items.filter((it) => it.type === 'boardgame' && !it.hidden)
const coop = games.filter((g) => g.cooperative).sort((a, b) => b.popularity - a.popularity)
const comp = games.filter((g) => g.cooperative === false).sort((a, b) => b.popularity - a.popularity)

describe('Decidir v2', { timeout: 120_000 }, () => {
  beforeAll(async () => { await loadShelfEngine('boardgame'); await loadShelfEngine('movie') }, 60_000)

  it('tres cooperativos elegidos → propone un cooperativo y el motivo lo dice', () => {
    let st = start('boardgame', { seen: 'nueva', source: 'igual' })
    for (const [w, l] of [[coop[0], comp[0]], [coop[3], comp[5]], [coop[7], comp[11]]] as [Item, Item][]) st = applyDuelChoice(st, w, l)
    const prop = getProposal(st, null, [])!
    expect(prop.item.cooperative).toBe(true)
    expect(prop.reasons.join(' ')).toMatch(/cooperativo/)
  })

  it('el tanteo: a quien solo le importa lo cooperativo, el motor acaba atribuyéndolo a eso y no al tema', () => {
    const { st, pairs } = play(start('boardgame', { seen: 'nueva', source: 'igual' }), (it) => (it.cooperative ? 1 : 0), 6)
    const prop = getProposal(st, null, [])!
    expect(prop.item.cooperative).toBe(true)
    // pone a prueba lo cooperativo en más de un duelo
    expect(pairs.filter(([a, b]) => Boolean(a.cooperative) !== Boolean(b.cooperative)).length).toBeGreaterThanOrEqual(2)
    expect(traitWeight(st, 'coop:si')).toBeGreaterThan(0.8)
  })

  it('un duelo en contra después de tres a favor no da la vuelta a la propuesta', () => {
    let st = start('boardgame', { seen: 'nueva', source: 'igual' })
    for (const [w, l] of [[coop[0], comp[0]], [coop[3], comp[5]], [coop[7], comp[11]], [comp[2], coop[9]]] as [Item, Item][]) st = applyDuelChoice(st, w, l)
    expect(getProposal(st, null, [])!.item.cooperative).toBe(true)
  })

  it('«Cooperativo» en las preguntas: todas las candidatas lo son y basta con pocos duelos', () => {
    const st0 = start('boardgame', { seen: 'nueva', source: 'igual', mood: 'coop' })
    expect(st0.pool.every((id) => itemsById.get(id)?.cooperative !== false)).toBe(true)
    const { st } = play(st0, () => Math.random(), 8)
    expect(getProposal(st, null, [])!.item.cooperative).toBe(true)
  })

  it('con pocas candidatas (4 vistas) propone enseguida, y solo de ellas', () => {
    const seen = items.filter((it) => it.type === 'movie' && !it.hidden).slice(0, 4).map((it) => it.id)
    const st0 = start('movie', { seen: 'vista', platforms: [] }, entriesOf(seen, 'seen', 'movie'))
    const { st, n } = play(st0, (it) => it.year, 8)
    expect(n).toBeLessThanOrEqual(2)
    const prop = getProposal(st, null, [])!
    expect(seen).toContain(prop.item.id)
    for (const a of prop.alternatives ?? []) expect(seen).toContain(a.id)
  })

  it('una sola candidata: propuesta sin duelos', () => {
    const one = items.find((it) => it.type === 'movie' && !it.hidden)!.id
    expect(shouldPropose(start('movie', { seen: 'vista', platforms: [] }, entriesOf([one], 'seen', 'movie')))).toBe(true)
  })

  it('«una que ya vi» con muchas vistas: propuesta y alternativas, todas vistas', () => {
    const seen = items.filter((it) => it.type === 'movie' && !it.hidden).sort((a, b) => b.popularity - a.popularity).slice(0, 40).map((it) => it.id)
    const { st } = play(start('movie', { seen: 'vista', platforms: [] }, entriesOf(seen, 'seen', 'movie')), (it) => (it.genres.includes('Drama') ? 1 : 0))
    const prop = getProposal(st, null, [])!
    for (const it of [prop.item, ...(prop.alternatives ?? [])]) expect(seen).toContain(it.id)
  })

  it('los 3 primeros duelos son de obras muy conocidas (nivel 1) o propias', () => {
    const { pairs } = play(start('movie', { seen: 'nueva', source: 'igual', platforms: [] }), () => Math.random(), 3)
    for (const [a, b] of pairs.slice(0, 3)) for (const it of [a, b]) expect(typeof it.fameTier === 'number' ? it.fameTier : 1).toBe(1)
  })

  it('«Seguir buscando» no repite ni propone la misma saga', () => {
    let { st } = play(start('movie', { seen: 'nueva', source: 'igual', platforms: [] }), (it) => (it.genres.includes('Animación') ? 1 : 0), 5)
    const first = getProposal(st, null, [])!.item
    st = rejectAndContinue(st, first.id)
    const second = getProposal(st, null, [])!.item
    expect(second.id).not.toBe(first.id)
  })

  it('automejora: lo aprendido en una sesión arranca la siguiente', () => {
    let st = start('boardgame', { seen: 'nueva', source: 'igual' })
    for (const [w, l] of [[coop[0], comp[0]], [coop[3], comp[5]], [coop[7], comp[11]]] as [Item, Item][]) st = applyDuelChoice(st, w, l)
    const memory = sessionTaste(st)
    expect(memory['coop:si']).toBeGreaterThan(0.3)
    const next = initDecideSession({ shelf: 'boardgame', items, entries: {}, rankings, profile, friends: [], answers: { seen: 'nueva', source: 'igual' }, affinity: () => null, friendPct: () => null, tasteMemory: memory })
    expect(traitWeight(next, 'coop:si')).toBeGreaterThan(0.3)
    // y sin duelos, la primera candidata ya tira a cooperativo
    expect(getProposal(next, null, [])!.item.cooperative).toBe(true)
  })

  it('cada duelo se calcula rápido (< 400 ms en node, con el catálogo entero)', () => {
    let st = start('movie', { seen: 'nueva', source: 'igual', platforms: [] })
    const t0 = performance.now()
    for (let i = 0; i < 4; i++) {
      const d = nextDuel(st, items, new Set(), () => 0.5)!
      st = applyDuelChoice(st, d.a, d.b)
      shouldPropose(st)
    }
    expect((performance.now() - t0) / 4).toBeLessThan(400)
  })
})
