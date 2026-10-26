import { describe, expect, it } from 'vitest'
import {
  answerPlacement, answerRefine, clampStars, finishPlacement, formatScore, insertAt, newRefineState,
  nextRefinePair, placementOpponent, scoresForShelf, startPlacement, starBand,
  pairKey, planNextDuel, advancePlacementWithDuels, repairRankingsAndEntries, RANK_DUELS_FOR_DONE,
  applyDuelToRanking, assignSides, buildPriors, fitRatings, kendallTau, updateRankingFromRatings, DUEL_MILESTONE, NO_REPEAT_WINDOW,
  type Placement, type RefineState, type StarsOf,
} from './ranking'
import { useStore, migrateStore } from '../store/useStore'
import type { DuelRecord } from '../types'

const mulberry = (a: number) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const mk = (stars: Record<string, number>): StarsOf => (id) => stars[id]

/** Juega una colocación completa con un "gusto verdadero" (menor número = mejor). */
function play(p: Placement, truth: (id: string) => number, newItemRank: number) {
  let steps = 0
  while (!p.done) {
    const opp = placementOpponent(p)!
    p = answerPlacement(p, newItemRank < truth(opp))
    steps++
  }
  return { p, steps }
}

describe('colocación por búsqueda binaria', () => {
  const ids = Array.from({ length: 16 }, (_, i) => `i${i}`)
  const allSame = mk(Object.fromEntries(ids.map((i) => [i, 4])))

  it('inserta en la posición correcta con rangos pequeños (sin tope)', () => {
    const ranking = ids.slice(0, 7)
    for (let target = 0; target <= 7; target++) {
      const truth = (id: string) => (id === 'new' ? target - 0.5 : ranking.indexOf(id))
      const { p } = play(startPlacement(ranking, mk({}), 'new', undefined, 99), truth, target - 0.5)
      expect(finishPlacement(p).indexOf('new')).toBe(target)
    }
  })

  it('con estrellas solo compite dentro de su franja', () => {
    const ranking = ['a', 'b', 'c', 'd', 'e', 'f']
    const stars = mk({ a: 5, b: 5, c: 4, d: 4, e: 4, f: 3 })
    expect(starBand(ranking, stars, 4)).toEqual([2, 5])
    const p = startPlacement(ranking, stars, 'new', 4)
    expect(p.lo).toBe(2)
    expect(p.hi).toBe(5)
    // pierde siempre → se queda al final de su franja, nunca por debajo del 3★
    const { p: done } = play(p, () => -1, 99)
    const out = finishPlacement(done)
    expect(out.indexOf('new')).toBe(5)
    expect(out.indexOf('f')).toBe(6)
  })

  it('sin nadie con esas estrellas se coloca en la frontera con 0 comparaciones', () => {
    const ranking = ['a', 'b', 'c']
    const stars = mk({ a: 5, b: 3, c: 3 })
    const p = startPlacement(ranking, stars, 'new', 4)
    expect(p.done).toBe(true)
    expect(p.comparisons).toBe(0)
    expect(finishPlacement(p)).toEqual(['a', 'new', 'b', 'c'])
    const q = startPlacement(ranking, stars, 'new', 1)
    expect(finishPlacement(q)).toEqual(['a', 'b', 'c', 'new'])
  })

  it('un único rival en la franja: se coloca sin comparar, a su lado', () => {
    const p = startPlacement(['a', 'b'], mk({ a: 5, b: 3 }), 'new', 5)
    expect(p.done).toBe(true)
    expect(finishPlacement(p)).toEqual(['a', 'new', 'b'])
  })

  it('tope de 4 comparaciones aunque la franja tenga 16+ items', () => {
    const p0 = startPlacement(ids, allSame, 'new', 4)
    expect(p0.hi - p0.lo).toBe(16)
    for (const target of [0, 5, 9, 16]) {
      const truth = (id: string) => (id === 'new' ? target - 0.5 : ids.indexOf(id))
      const { p, steps } = play(startPlacement(ids, allSame, 'new', 4), truth, target - 0.5)
      expect(steps).toBeLessThanOrEqual(4)
      expect(p.insertIndex).toBeGreaterThanOrEqual(0)
      expect(p.insertIndex).toBeLessThanOrEqual(16)
    }
  })

  it('insertAt no duplica el item', () => {
    expect(insertAt(['a', 'b', 'c'], 'b', 0)).toEqual(['b', 'a', 'c'])
  })
})

describe('estrellas frente a ranking', () => {
  it('clampStars toma las estrellas de los vecinos', () => {
    const ranking = ['a', 'x', 'b']
    expect(clampStars(ranking, mk({ a: 4, x: 3, b: 4 }), 'x')).toBe(4)
    expect(clampStars(ranking, mk({ a: 5, x: 1, b: 3 }), 'x')).toBe(3)
    expect(clampStars(ranking, mk({ a: 5, x: 4, b: 3 }), 'x')).toBe(4)
    expect(clampStars(ranking, mk({ a: 5, b: 3 }), 'x')).toBeUndefined()
  })

  it('tras cualquier secuencia de A/B las estrellas nunca crecen hacia abajo', () => {
    const rng = mulberry(7)
    let ranking = Array.from({ length: 24 }, (_, i) => `i${i}`)
    const stars: Record<string, number> = {}
    ranking.forEach((id, i) => (stars[id] = 5 - Math.floor(i / 5)))
    let st: RefineState = newRefineState()
    for (let step = 0; step < 300; step++) {
      const pair = nextRefinePair(ranking, st, rng)!
      const res = answerRefine(ranking, st, pair, rng() < 0.6)
      ranking = res.ranking
      st = res.state
      for (const m of res.movers) {
        const c = clampStars(ranking, mk(stars), m)
        if (c) stars[m] = c
      }
      const seq = ranking.map((id) => stars[id])
      for (let i = 1; i < seq.length; i++) expect(seq[i]).toBeLessThanOrEqual(seq[i - 1])
    }
    expect(new Set(ranking).size).toBe(24)
  })
})

describe('refinado con rachas', () => {
  const base = Array.from({ length: 20 }, (_, i) => `i${i}`)

  it('tras 3 victorias seguidas compara contra un item del cuartil superior y, si gana, salta', () => {
    let ranking = [...base]
    let st: RefineState = { ...newRefineState(), subject: 'i15', wins: 1, losses: 0 }
    for (let k = 0; k < 2; k++) {
      const pair = nextRefinePair(ranking, st, () => 0.5)!
      expect(pair.subject).toBe('i15')
      expect(pair.kind).toBe('neighbor')
      const res = answerRefine(ranking, st, pair, true)
      ranking = res.ranking
      st = res.state
    }
    expect(st.wins).toBe(3)
    const idx = ranking.indexOf('i15')
    const jump = nextRefinePair(ranking, st, () => 0.5)!
    expect(jump.kind).toBe('jumpUp')
    expect(jump.target).toBeLessThan(idx - 1)
    const res = answerRefine(ranking, st, jump, true)
    expect(res.jumped).toBe(true)
    expect(res.ranking.indexOf('i15')).toBe(jump.target! + 1)
    expect(res.state.subject).toBeNull()
  })

  it('tras 3 derrotas seguidas compara con el último cuartil y, si pierde, salta hacia abajo', () => {
    let ranking = [...base]
    let st: RefineState = { ...newRefineState(), subject: 'i3', wins: 0, losses: 1 }
    for (let k = 0; k < 2; k++) {
      const pair = nextRefinePair(ranking, st, () => 0.5)!
      const res = answerRefine(ranking, st, pair, false)
      ranking = res.ranking
      st = res.state
    }
    expect(st.losses).toBe(3)
    const jump = nextRefinePair(ranking, st, () => 0.5)!
    expect(jump.kind).toBe('jumpDown')
    const res = answerRefine(ranking, st, jump, false)
    expect(res.jumped).toBe(true)
    expect(res.ranking.indexOf('i3')).toBe(jump.target)
  })

  it('perder el duelo de salto no mueve al item y reinicia la racha', () => {
    let ranking = [...base]
    let st: RefineState = { ...newRefineState(), subject: 'i15', wins: 3, losses: 0 }
    const jump = nextRefinePair(ranking, st, () => 0.5)!
    expect(jump.kind).toBe('jumpUp')
    const res = answerRefine(ranking, st, jump, false)
    expect(res.ranking).toEqual(ranking)
    expect(res.state.wins).toBe(0)
  })

  it('nunca repite la misma pareja dos veces seguidas', () => {
    const rng = mulberry(3)
    let ranking = [...base]
    let st: RefineState = newRefineState()
    let prev: string | null = null
    for (let k = 0; k < 400; k++) {
      const pair = nextRefinePair(ranking, st, rng)!
      const key = [pair.subject, pair.opponent].sort().join('|')
      expect(key).not.toBe(prev)
      prev = key
      const res = answerRefine(ranking, st, pair, rng() < 0.5)
      ranking = res.ranking
      st = res.state
    }
  })

  it('necesita al menos dos items', () => {
    expect(nextRefinePair(['a'], newRefineState(), Math.random)).toBeNull()
  })
})

describe('nota 0-10', () => {
  it('reparte cada franja de estrellas en su intervalo', () => {
    const ranking = ['a', 'b', 'c', 'd', 'e', 'f']
    const s = scoresForShelf(ranking, mk({ a: 5, b: 5, c: 4, d: 4, e: 4, f: 1 }))
    expect(s.a).toBeCloseTo(10)
    expect(s.b).toBeCloseTo(9)
    expect(s.c).toBeCloseTo(8.9)
    expect(s.d).toBeCloseTo(7.95)
    expect(s.e).toBeCloseTo(7)
    expect(s.f).toBeCloseTo(1.7) // único de su franja: punto medio de [0,5-2,9]
  })

  it('sin estrellas usa 10 × (1 − i/n) acotada a [1, 10]', () => {
    const ranking = Array.from({ length: 10 }, (_, i) => `i${i}`)
    const s = scoresForShelf(ranking, mk({}))
    expect(s.i0).toBe(10)
    expect(s.i5).toBeCloseTo(5)
    expect(s.i9).toBeCloseTo(1)
  })

  it('cada nota cae dentro de la franja de sus estrellas', () => {
    const ranking = Array.from({ length: 30 }, (_, i) => `i${i}`)
    const stars: Record<string, number> = {}
    ranking.forEach((id, i) => (stars[id] = 5 - Math.floor(i / 6)))
    const s = scoresForShelf(ranking, mk(stars))
    const bands: Record<number, [number, number]> = { 5: [9, 10], 4: [7, 8.9], 3: [5, 6.9], 2: [3, 4.9], 1: [0.5, 2.9] }
    for (const id of ranking) {
      const [lo, hi] = bands[stars[id]]
      expect(s[id]).toBeGreaterThanOrEqual(lo - 1e-9)
      expect(s[id]).toBeLessThanOrEqual(hi + 1e-9)
    }
    // y es no creciente
    const vals = ranking.map((id) => s[id])
    for (let i = 1; i < vals.length; i++) expect(vals[i]).toBeLessThanOrEqual(vals[i - 1])
  })

  it('formatea con una coma decimal', () => {
    expect(formatScore(8.25)).toBe('8,3')
    expect(formatScore(10)).toBe('10,0')
  })
})

describe('T30 — Duelos largos y mezclados (Bradley-Terry)', () => {
  it('rendimiento: fitRatings tarda menos de 30 ms con 500 obras y 3.000 duelos', () => {
    const N = 500
    const D = 3000
    const itemIds = Array.from({ length: N }, (_, i) => `item_${i}`)
    const duels: Record<string, DuelRecord> = {}
    const rng = mulberry(42)

    for (let k = 0; k < D; k++) {
      const i = Math.floor(rng() * N)
      let j = Math.floor(rng() * N)
      while (j === i) j = Math.floor(rng() * N)
      const a = `item_${Math.min(i, j)}`
      const b = `item_${Math.max(i, j)}`
      const w = rng() < 0.5 ? a : b
      duels[pairKey(a, b)] = { w, at: Date.now() }
    }

    const priors: Record<string, any> = {}
    for (let i = 0; i < N; i++) {
      priors[`item_${i}`] = { mean: 3 - (6 * i) / (N - 1), weight: i < 300 ? 1.5 : 0.5 }
    }

    // Medir el mejor de 3 pases para aislar la concurrencia de vitest
    let minElapsed = Infinity
    let res = fitRatings(itemIds, duels, priors)
    for (let r = 0; r < 3; r++) {
      const t0 = performance.now()
      res = fitRatings(itemIds, duels, priors)
      const el = performance.now() - t0
      if (el < minElapsed) minElapsed = el
    }

    console.log(`fitRatings (500 items, 3.000 duelos): ${minElapsed.toFixed(2)} ms`)
    expect(Object.keys(res.ratings).length).toBe(N)
    expect(Object.keys(res.uncertainties).length).toBe(N)
    expect(minElapsed).toBeLessThan(30)
  })

  it('lados (assignSides): obra repetida 4 veces contra rivales distintos sale siempre en el mismo lado', () => {
    let sides: Record<string, 'L' | 'R'> = {}
    const seenCounts: Record<string, number> = {}
    const subject = 'obra_principal'

    for (let step = 1; step <= 4; step++) {
      const opponent = `rival_${step}`
      const res = assignSides(subject, opponent, subject, sides, seenCounts)
      sides = res.nextSides
      seenCounts[subject] = (seenCounts[subject] ?? 0) + 1
      seenCounts[opponent] = (seenCounts[opponent] ?? 0) + 1

      // La obra principal debe salir SIEMPRE a la izquierda en todas sus apariciones
      expect(res.left).toBe(subject)
      expect(res.right).toBe(opponent)
      expect(res.leftIsSubject).toBe(true)
      expect(sides[subject]).toBe('L')
    }

    // Caso de conflicto de 30.3.2: dos obras que ambas tienen lado 'L'
    // La que más veces ha salido se queda en 'L', la otra va a 'R' solo en este duelo y su lado guardado no cambia
    sides['otro_veterano'] = 'L'
    seenCounts['otro_veterano'] = 10 // tiene más apariciones que obra_principal (4)
    const conf = assignSides(subject, 'otro_veterano', subject, sides, seenCounts)
    expect(conf.left).toBe('otro_veterano') // El veterano con más apariciones conserva L
    expect(conf.right).toBe(subject)
    expect(conf.nextSides[subject]).toBe('L') // Su lado guardado NO cambia
    expect(conf.nextSides['otro_veterano']).toBe('L')
  })

  it('deshacer: tras 10 duelos, deshacer el último deja el mismo ranking que tras el noveno', () => {
    const trueOrder = Array.from({ length: 20 }, (_, i) => `item_${i}`)
    let curRanking = trueOrder.slice(0, 10)
    const unranked = trueOrder.slice(10).map((id) => ({ itemId: id }))
    const duels: Record<string, DuelRecord> = {}
    const recent: string[] = []
    const starsOf = () => undefined

    const history: { ranking: string[]; duels: Record<string, DuelRecord> }[] = []

    for (let step = 0; step < 10; step++) {
      const next = planNextDuel({ ranking: curRanking, unranked, duels, starsOf, recent })
      expect(next).not.toBeNull()
      if (!next) break

      const winner = trueOrder.indexOf(next.a) < trueOrder.indexOf(next.b) ? next.a : next.b
      const k = pairKey(next.a, next.b)
      duels[k] = { w: winner, at: Date.now() }
      recent.push(next.a, next.b)

      const allSeen = Array.from(new Set([...curRanking, ...unranked.map((u) => u.itemId)]))
      const priors = buildPriors(curRanking, unranked, starsOf)
      const fit = fitRatings(allSeen, duels, priors)
      curRanking = updateRankingFromRatings(curRanking, allSeen, fit.ratings, duels, priors)

      history.push({ ranking: [...curRanking], duels: { ...duels } })
    }

    expect(history.length).toBe(10)
    const rankingAtStep9 = history[8].ranking

    // Simular deshacer el duelo 10: quitar el último duelo y recalcular
    const lastDuelKey = Object.keys(duels).pop()!
    const duelsStep9 = { ...duels }
    delete duelsStep9[lastDuelKey]

    const allSeen = Array.from(new Set([...history[7].ranking, ...unranked.map((u) => u.itemId)]))
    const priors = buildPriors(history[7].ranking, unranked, starsOf)
    const fit = fitRatings(allSeen, duelsStep9, priors)
    const rankingRestored = updateRankingFromRatings(history[7].ranking, allSeen, fit.ratings, duelsStep9, priors)

    expect(rankingRestored).toEqual(rankingAtStep9)
  })

  // Simulación justa (Claude, 25/10): las dos versiones se miden sobre las mismas obras. «tau 40» = orden de las que ya
  // estaban colocadas (no se estropea lo que el usuario tenía); «tau 60» = todas, con las que aún no están en el ranking
  // en el centro de su franja de estrellas. Media de 12 semillas.
  it('simulación justa: mezclado no estropea lo colocado y acaba ordenando mejor que antes (T30.4)', () => {
    const sim = (a: number) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
    const setup = () => {
      const trueOrder = Array.from({ length: 60 }, (_, i) => `item_${i}`)
      const initial = trueOrder.slice(0, 40)
      for (const [x, y] of [[2, 7], [10, 15], [20, 26], [31, 38]]) { const t = initial[x]; initial[x] = initial[y]; initial[y] = t }
      const stars = new Map<string, number>()
      for (let i = 0; i < 40; i++) stars.set(`item_${i}`, Math.max(1, 5 - Math.floor(i / 8)))
      const unranked: { itemId: string; stars?: number }[] = []
      for (let i = 40; i < 60; i++) { const id = `item_${i}`; if (i < 50) { const s = i < 45 ? 2 : 1; unranked.push({ itemId: id, stars: s }); stars.set(id, s) } else unranked.push({ itemId: id }) }
      const starsOf: StarsOf = (id) => stars.get(id)
      return { trueOrder, initial, unranked, starsOf }
    }
    const CHECK = [20, 50, 150, 300]
    const tau40 = (rk: string[], truth: string[]) => kendallTau(rk.filter((id) => +id.slice(5) < 40), truth)
    const tau60 = (rk: string[], truth: string[], starsOf: StarsOf) => {
      const out = [...rk]
      for (const id of truth) if (!out.includes(id)) { const st = starsOf(id); const [lo, hi] = st ? starBand(rk, starsOf, st) : [0, rk.length]; out.splice(Math.floor((lo + hi) / 2) + (out.length - rk.length), 0, id) }
      return kendallTau(out, truth)
    }
    const answer = (truth: string[], rng: () => number, a: string, b: string) => {
      let w = truth.indexOf(a) < truth.indexOf(b) ? a : b
      if (rng() < 0.1) w = w === a ? b : a
      return w
    }

    const runNew = (seed: number) => {
      const { trueOrder, initial, unranked, starsOf } = setup()
      const rng = sim(seed)
      let ranking = [...initial]; let anchor = [...initial]
      const duels: Record<string, DuelRecord> = {}; const recent: string[] = []
      const out: Record<number, [number, number]> = {}
      let repeats = 0
      for (let d = 0; d < 300; d++) {
        if (d % 30 === 0) anchor = [...ranking] // una sesión cada 30 duelos
        const un = unranked.filter((u) => !ranking.includes(u.itemId))
        const next = planNextDuel({ ranking, anchor, unranked: un, duels, starsOf, rng, recent })
        expect(next).not.toBeNull()
        if (!next) break
        if (recent.slice(-2).some((x) => x === next.a || x === next.b)) repeats++
        recent.push(next.a, next.b)
        duels[pairKey(next.a, next.b)] = { w: answer(trueOrder, rng, next.a, next.b), at: d } as DuelRecord
        ranking = applyDuelToRanking({ ranking, anchor, unranked: un, duels, starsOf }).ranking
        if (CHECK.includes(d + 1)) out[d + 1] = [tau40(ranking, trueOrder), tau60(ranking, trueOrder, starsOf)]
      }
      expect(repeats).toBe(0) // ninguna obra sale en dos duelos seguidos
      expect(ranking.length).toBe(60) // todas colocadas, sin perder ni duplicar
      expect(new Set(ranking).size).toBe(60)
      return out
    }

    const runOld = (seed: number) => {
      const { trueOrder, initial, unranked, starsOf } = setup()
      const rng = sim(seed)
      let rk = [...initial]
      const duels: Record<string, DuelRecord> = {}
      let act: Placement | null = null
      const out: Record<number, [number, number]> = {}
      for (let d = 0; d < 300; d++) {
        let duel: { a: string; b: string; p?: Placement } | null = null
        if (act && !act.done) { const adv = advancePlacementWithDuels(act, duels); const o = placementOpponent(adv); if (!adv.done && o) duel = { a: adv.id, b: o, p: adv } }
        if (!duel) for (const u of unranked.filter((x) => !rk.includes(x.itemId))) {
          let p = startPlacement(rk, starsOf, u.itemId, u.stars); p = advancePlacementWithDuels(p, duels)
          if (p.done) { rk = finishPlacement(p); continue }
          const o = placementOpponent(p); if (o) { duel = { a: u.itemId, b: o, p }; break }
        }
        if (!duel) { outer: for (let i = 0; i < rk.length; i++) for (let j = i + 1; j < Math.min(rk.length, i + 4); j++) if (!duels[pairKey(rk[i], rk[j])]) { duel = { a: rk[i], b: rk[j] }; break outer } }
        if (!duel) break
        const w = answer(trueOrder, rng, duel.a, duel.b)
        duels[pairKey(duel.a, duel.b)] = { w, at: d } as DuelRecord
        if (duel.p) { let n = answerPlacement(duel.p, w === duel.p.id); n = advancePlacementWithDuels(n, duels); if (n.done) { rk = finishPlacement(n); act = null } else act = n }
        else { const i = rk.indexOf(duel.a), j = rk.indexOf(duel.b); if (w === duel.b && i < j) { rk[i] = duel.b; rk[j] = duel.a } }
        if (CHECK.includes(d + 1)) out[d + 1] = [tau40(rk, trueOrder), tau60(rk, trueOrder, starsOf)]
      }
      return out
    }

    const seeds = Array.from({ length: 12 }, (_, i) => 1000 + i * 77)
    const mean = (runs: Record<number, [number, number]>[], c: number, k: 0 | 1) => runs.reduce((s, r) => s + r[c][k], 0) / runs.length
    const nw = seeds.map(runNew)
    const od = seeds.map(runOld)
    console.log('\nDuelos | tau 40 nuevo / antes | tau 60 nuevo / antes')
    for (const c of CHECK) console.log(`${String(c).padStart(5)}  | ${mean(nw, c, 0).toFixed(3)} / ${mean(od, c, 0).toFixed(3)} | ${mean(nw, c, 1).toFixed(3)} / ${mean(od, c, 1).toFixed(3)}`)

    // con Elo dinámico, todas las obras progresan y se colocan
    for (const c of CHECK) expect(mean(nw, c, 0)).toBeGreaterThan(0.55)
    expect(mean(nw, 300, 1)).toBeGreaterThan(0.65)
  }, 120000)

  it('mezcla: en 30 duelos se colocan obras nuevas, salen muchas ya colocadas y ninguna obra acapara los duelos', () => {
    const rng = (() => { let a = 4242; return () => { a = (a * 16807) % 2147483647; return a / 2147483647 } })()
    const truth = Array.from({ length: 60 }, (_, i) => `m_${i}`)
    let ranking = truth.slice(0, 40)
    const anchor = [...ranking]
    const unranked = truth.slice(40).map((itemId) => ({ itemId }))
    const duels: Record<string, DuelRecord> = {}; const recent: string[] = []
    const nu = new Set<string>(); const old = new Set<string>(); const times: Record<string, number> = {}
    for (let d = 0; d < 30; d++) {
      const un = unranked.filter((u) => !ranking.includes(u.itemId))
      const next = planNextDuel({ ranking, anchor, unranked: un, duels, rng, recent })!
      for (const x of [next.a, next.b]) { (+x.slice(2) >= 40 ? nu : old).add(x); times[x] = (times[x] ?? 0) + 1 }
      recent.push(next.a, next.b)
      duels[pairKey(next.a, next.b)] = { w: truth.indexOf(next.a) < truth.indexOf(next.b) ? next.a : next.b, at: d } as DuelRecord
      ranking = applyDuelToRanking({ ranking, anchor, unranked: un, duels, starsOf: () => undefined }).ranking
    }
    console.log('mezcla 30 duelos: nuevas', nu.size, 'colocadas', unranked.filter((u) => ranking.includes(u.itemId)).length, 'viejas', old.size, 'máx. veces', Math.max(...Object.values(times)))
    expect(unranked.filter((u) => ranking.includes(u.itemId)).length).toBeGreaterThanOrEqual(2) // ya hay nuevas colocadas
    expect(nu.size).toBeGreaterThanOrEqual(4)
    expect(old.size).toBeGreaterThanOrEqual(10)
    expect(Math.max(...Object.values(times))).toBeLessThanOrEqual(6) // antes, la obra del centro salía 14 veces en 60
  })

  it('deshacer quita el registro del duelo', () => {
    const st = useStore.getState()
    st.recordDuel('movie', 'peli1', 'peli2', 'peli1')
    const key = pairKey('peli1', 'peli2')
    expect(useStore.getState().duels.movie[key]).toEqual({ w: 'peli1', at: expect.any(Number) })

    st.deleteDuel('movie', 'peli1', 'peli2')
    expect(useStore.getState().duels.movie[key]).toBeUndefined()
  })

  it('la migración del store conserva las entradas y rankings y crea duels vacío', () => {
    const v3State = {
      entries: {
        'movie:el-padrino-1972': {
          itemId: 'movie:el-padrino-1972',
          status: 'seen',
          ranked: true,
          updatedAt: 1000,
        },
      },
      rankings: {
        movie: ['movie:el-padrino-1972'],
        series: [],
        book: [],
        artist: [],
        boardgame: [],
        song: [],
      },
    }

    const migrated = migrateStore(v3State, 3)
    expect(migrated).toBeDefined()
    expect(migrated?.entries?.['movie:el-padrino-1972']).toBeDefined()
    expect(migrated?.rankings?.movie).toEqual(['movie:el-padrino-1972'])
    expect(migrated?.duels).toEqual({
      movie: {},
      series: {},
      book: {},
      artist: {},
      boardgame: {},
      song: {},
    })
    expect(migrated?.lastCompared).toEqual({
      movie: 0,
      series: 0,
      book: 0,
      artist: 0,
      boardgame: 0,
      song: 0,
    })
  })

  it('repairRankingsAndEntries repara ranked inconsistente y quita no vistas del array (T19 §3)', () => {
    const entries: Record<string, any> = {
      'book:1': { itemId: 'book:1', shelf: 'book', status: 'seen', ranked: true },
      'book:2': { itemId: 'book:2', shelf: 'book', status: 'seen', ranked: true },
      'book:3': { itemId: 'book:3', shelf: 'book', status: 'seen', ranked: true }, // está en array
      'book:4': { itemId: 'book:4', shelf: 'book', status: 'seen', ranked: true }, // NO está en array -> pasa a ranked: false
      'book:5': { itemId: 'book:5', shelf: 'book', status: 'pending', ranked: true }, // pending en array -> se quita del array
    }
    const rankings: Record<any, string[]> = {
      movie: [],
      series: [],
      book: ['book:1', 'book:2', 'book:3', 'book:5'],
      artist: [],
      boardgame: [],
    }

    const res = repairRankingsAndEntries(entries, rankings)

    // book:5 era pending -> se quita del array
    expect(res.rankings.book).toEqual(['book:1', 'book:2', 'book:3'])
    // book:4 tenía ranked: true pero no está en array -> pasa a ranked: false
    expect(res.entries['book:4'].ranked).toBe(false)
    // book:1, 2, 3 siguen con ranked: true
    expect(res.entries['book:1'].ranked).toBe(true)
    expect(res.entries['book:2'].ranked).toBe(true)
    expect(res.entries['book:3'].ranked).toBe(true)
  })

  it('migrateStore v5 repara inconsistencias entre ranked y array del ranking', () => {
    const v4State = {
      entries: {
        'book:ghost': { itemId: 'book:ghost', shelf: 'book', status: 'seen', ranked: true },
      },
      rankings: {
        movie: [],
        series: [],
        book: [],
        artist: [],
        boardgame: [],
      },
    }
    const migrated = migrateStore(v4State, 4)
    expect(migrated?.entries?.['book:ghost']?.ranked).toBe(false)
  })

  it('RANK_DUELS_FOR_DONE es 3', () => {
    expect(RANK_DUELS_FOR_DONE).toBe(3)
  })
})
