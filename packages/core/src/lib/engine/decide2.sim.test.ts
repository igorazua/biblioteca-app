// Banco de pruebas de Decidir (Igor, 27/10/2026): ¿qué motor acierta más y con cuántos duelos?
// Usuarios sintéticos con un gusto que el motor NO modela tal cual: interacciones («cooperativo, pero solo si es
// denso»), una parte que no ve (año preferido, gusto por lo popular), un capricho propio por obra y ruido al elegir.
// Responden con ese gusto a los duelos que les pone cada motor. Acierto = la propuesta está en su 10 % favorito.
import { appendFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { items, itemsById } from '../../data/catalog'
import * as v1 from './decide'
import * as v2 from './decide2'
import { loadShelfEngine } from '../../testing/engineData'
import { gauss, rngOf, tasteFor } from '../../testing/simUsers'
import type { Item, Profile, ShelfType } from '../../types'

const profile: Profile = { name: 'Sim', avatarColor: '#fff', platforms: [], country: 'ES', lang: 'es' }
const rankings = { movie: [], series: [], book: [], artist: [], boardgame: [], song: [] }

interface Engine {
  init: (shelf: ShelfType) => unknown
  next: (st: unknown, rng: () => number) => v1.DuelPair | null
  apply: (st: unknown, w: Item, l: Item, d?: string) => unknown
  stop: (st: unknown) => boolean
  propose: (st: unknown) => v1.DecideProposal | null
}
const input = (shelf: ShelfType) => ({
  shelf, items, entries: {}, rankings, profile, friends: [], answers: { seen: 'nueva', source: 'igual', platforms: [] },
  affinity: () => null, friendPct: () => null, recentOrienters: [], userVec: null, doubtfulItems: {},
})
const OLD: Engine = {
  init: (s) => v1.initDecideSession(input(s)),
  next: (st, r) => v1.nextDuel(st as v1.DecideState, items, new Set((st as v1.DecideState).shown), r),
  apply: (st, w, l, d) => v1.applyDuelChoice(st as v1.DecideState, w, l, itemsById, 1500, d),
  stop: (st) => v1.shouldPropose(st as v1.DecideState),
  propose: (st) => v1.getProposal(st as v1.DecideState, itemsById, [], profile),
}
const NEW: Engine = {
  init: (s) => v2.initDecideSession(input(s)),
  next: (st, r) => v2.nextDuel(st as v2.Decide2State, items, new Set(), r),
  apply: (st, w, l) => v2.applyDuelChoice(st as v2.Decide2State, w, l),
  stop: (st) => v2.shouldPropose(st as v2.Decide2State),
  propose: (st) => v2.getProposal(st as v2.Decide2State, null, []),
}

function run(engine: Engine, shelf: ShelfType, users: number) {
  let hits = 0, hits3 = 0, duels = 0, pctSum = 0
  const hist: number[] = []
  for (let u = 0; u < users; u++) {
    const r = rngOf(1000 + u * 17 + shelf.length)
    const taste = tasteFor(shelf, u, r)
    const answer = rngOf(77 + u)
    let st = engine.init(shelf)
    let n = 0
    for (; n < 8; n++) {
      if (n > 0 && engine.stop(st)) break
      const d = engine.next(st, answer)
      if (!d) break
      const aWins = taste(d.a) - taste(d.b) + gauss(answer) > 0
      st = aWins ? engine.apply(st, d.a, d.b, d.dimension) : engine.apply(st, d.b, d.a, d.dimension)
    }
    const prop = engine.propose(st)!
    const pool = items.filter((x) => x.type === shelf && !x.hidden).map(taste).sort((a, b) => b - a)
    const pct = (it: Item) => pool.filter((v) => v > taste(it)).length / pool.length
    const p = pct(prop.item)
    pctSum += p
    if (p <= 0.1) hits++
    if ([prop.item, ...(prop.alternatives ?? []).slice(0, 2)].some((x) => pct(x) <= 0.1)) hits3++
    duels += n
    hist.push(n)
  }
  return { hit: hits / users, hit3: hits3 / users, duels: duels / users, pct: pctSum / users, hist: hist.join(',') }
}

// Barrido de ajustes del motor nuevo: solo con SIM_SWEEP=1 (tarda unos minutos)
describe.runIf(process.env.SIM_SWEEP)('Decidir: barrido de ajustes', () => {
  beforeAll(async () => {
    for (const s of ['movie', 'boardgame', 'book'] as ShelfType[]) await loadShelfEngine(s)
  }, 60_000)
  it('barrido', () => {
    const configs = [
      { baseW: 0.8, stopKG: 0, stable: 2 },
      { baseW: 0.8, stopKG: 0.1, stable: 2 },
      { baseW: 0.8, stopKG: 0.2, stable: 2 },
      { baseW: 0.8, stopKG: 0.35, stable: 2 },
      { baseW: 0.8, stopKG: 0.35, stable: 1 },
    ]
    for (const c of configs) {
      Object.assign(v2.TUNE, c)
      const res = (['boardgame', 'movie', 'book'] as ShelfType[]).map((s) => run(NEW, s, 16))
      const line = `\n${JSON.stringify(c)} → ` + res.map((x, i) => `${['bg', 'mov', 'book'][i]} hit ${(x.hit * 100).toFixed(0)}/${(x.hit3 * 100).toFixed(0)} pct ${(x.pct * 100).toFixed(0)} d ${x.duels.toFixed(1)}`).join(' | ')
      if (process.env.SIM_OUT) appendFileSync(process.env.SIM_OUT, line)
    }
  }, 1_800_000)
})

// Tarda unos minutos: se lanza a mano con SIM=1 npx vitest run src/lib/engine/decide2.sim.test.ts
describe.runIf(process.env.SIM && !process.env.SIM_SWEEP)('Decidir: banco de pruebas viejo contra nuevo', () => {
  beforeAll(async () => {
    for (const s of ['movie', 'boardgame', 'book'] as ShelfType[]) await loadShelfEngine(s)
  }, 60_000)

  for (const shelf of ['boardgame', 'movie', 'book'] as ShelfType[]) {
    it(`${shelf}: el nuevo acierta al menos como el viejo`, () => {
      const USERS = Number(process.env.SIM_USERS ?? 16)
      const o = run(OLD, shelf, USERS)
      const nw = run(NEW, shelf, USERS)
      const f = (x: ReturnType<typeof run>) => `acierto ${(x.hit * 100).toFixed(0)} % · en las 3 primeras ${(x.hit3 * 100).toFixed(0)} % · percentil medio ${(x.pct * 100).toFixed(0)} % · duelos ${x.duels.toFixed(1)} [${x.hist}]`
      const line = `\n${shelf}\n  viejo: ${f(o)}\n  nuevo: ${f(nw)}`
      console.log(line)
      if (process.env.SIM_OUT) appendFileSync(process.env.SIM_OUT, line)
      // lo que vive el usuario: que la propuesta (o una de las 3 primeras) esté entre sus favoritas
      expect(nw.hit).toBeGreaterThanOrEqual(o.hit)
      expect(nw.hit3).toBeGreaterThanOrEqual(o.hit3)
    }, 600_000)
  }
})
