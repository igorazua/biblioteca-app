import { describe, expect, it } from 'vitest'
import {
  answerPlacement, answerRefine, clampStars, finishPlacement, formatScore, insertAt, newRefineState,
  nextRefinePair, placementOpponent, scoresForShelf, startPlacement, starBand,
  pairKey, planNextDuel, advancePlacementWithDuels, repairRankingsAndEntries, RANK_DUELS_FOR_DONE,
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

describe('T16 — Lógica de duelos y planNextDuel', () => {
  it('planNextDuel nunca devuelve una pareja que ya está en el historial (simulación 300 duelos)', () => {
    const ranking = Array.from({ length: 30 }, (_, i) => `item_${i}`)
    const duels: Record<string, DuelRecord> = {}
    const cmp: Record<string, number> = {}

    for (let step = 0; step < 300; step++) {
      const planned = planNextDuel({
        ranking,
        duels,
        cmp,
      })
      expect(planned).not.toBeNull()
      if (!planned) break

      const key = pairKey(planned.a, planned.b)
      // Comprobar que NUNCA se repite ninguna pareja
      expect(duels[key]).toBeUndefined()

      // Registrar respuesta al azar
      const winner = Math.random() < 0.5 ? planned.a : planned.b
      duels[key] = { w: winner, at: Date.now() }
      cmp[planned.a] = (cmp[planned.a] ?? 0) + 1
      cmp[planned.b] = (cmp[planned.b] ?? 0) + 1
    }
  })

  it('con todas las parejas jugadas devuelve null', () => {
    const ranking = ['a', 'b', 'c']
    const duels: Record<string, DuelRecord> = {
      [pairKey('a', 'b')]: { w: 'a', at: 1 },
      [pairKey('a', 'c')]: { w: 'a', at: 2 },
      [pairKey('b', 'c')]: { w: 'b', at: 3 },
    }
    const planned = planNextDuel({ ranking, duels, cmp: {} })
    expect(planned).toBeNull()
  })

  it('la colocación salta a los rivales ya jugados y usa su resultado', () => {
    const ranking = ['a', 'b', 'c', 'd', 'e']
    const duels: Record<string, DuelRecord> = {
      // 'x' ya se enfrentó a 'c' y le ganó
      [pairKey('x', 'c')]: { w: 'x', at: 100 },
    }

    const p = startPlacement(ranking, () => undefined, 'x')
    // Inicialmente el rival del medio es 'c'
    expect(placementOpponent(p)).toBe('c')

    // Al avanzar con duels, 'c' se salta automáticamente usando el resultado guardado
    const pAdv = advancePlacementWithDuels(p, duels)
    expect(placementOpponent(pAdv)).not.toBe('c')
    expect(pAdv.comparisons).toBe(1)
    expect(pAdv.hi).toBe(2) // Al ganar a 'c', la cota superior baja a 2

    // Y planNextDuel devuelve directamente el siguiente rival no jugado
    const planned = planNextDuel({
      ranking,
      unranked: [{ itemId: 'x' }],
      duels,
      cmp: {},
      sessionIndex: 0,
    })
    expect(planned).not.toBeNull()
    expect(planned?.kind).toBe('place')
    expect(planned?.opponent).not.toBe('c')
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
