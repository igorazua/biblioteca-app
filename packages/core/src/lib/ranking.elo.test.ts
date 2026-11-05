// Duelos de la sesión de Comparar (Igor, 27/10): «hice 7 u 8 duelos y solo una subió y otra bajó».
// Un duelo solo puede mover a las dos obras del duelo; el resto del ranking no se recoloca aunque no tenga Elo.
import { describe, expect, it } from 'vitest'
import { applyDuelToRanking, seedMissingRatings } from './ranking'

const ids = Array.from({ length: 20 }, (_, i) => `m${i + 1}`)

/** Igual que CompareSession: modo incremental, guardando el ranking y los Elo que devuelve cada duelo. */
function session(start: Record<string, number>, duels: [string, string, string][]) {
  let ranking = [...ids]
  let ratings = { ...start }
  const record: Record<string, { w: string; at: number }> = {}
  duels.forEach(([a, b, w], i) => {
    record[`${a}|${b}`] = { w, at: i + 1 }
    const before = [...ranking]
    const res = applyDuelToRanking({ ranking, anchor: ids, duels: record, lastDuel: { a, b, winner: w }, ratings })
    // las demás conservan su orden entre sí y como mucho se corren un puesto (lo que deja o lo que ocupa una del duelo)
    const others = (rk: string[]) => rk.filter((id) => id !== a && id !== b)
    expect(others(res.ranking)).toEqual(others(before))
    for (const id of others(before)) {
      expect(Math.abs(res.ranking.indexOf(id) - before.indexOf(id))).toBeLessThanOrEqual(1)
    }
    ranking = res.ranking
    ratings = { ...ratings, ...res.ratings }
  })
  return ranking
}

const duels: [string, string, string][] = [
  ['m3', 'm4', 'm4'], ['m10', 'm11', 'm10'], ['m1', 'm15', 'm15'], ['m7', 'm8', 'm7'],
  ['m12', 'm2', 'm12'], ['m5', 'm6', 'm5'], ['m19', 'm20', 'm20'], ['m9', 'm13', 'm9'],
]

describe('Comparar: un duelo no recoloca obras que nadie ha tocado', () => {
  it('sin ningún Elo guardado', () => {
    session({}, duels)
  })

  it('con Elo solo en algunas (colocadas, importadas o de antes del Elo)', () => {
    session({ m1: 1790, m4: 1700, m9: 1560, m16: 1300 }, duels)
  })

  it('con todas con Elo', () => {
    const all: Record<string, number> = {}
    ids.forEach((id, i) => { all[id] = 1800 - i * 30 })
    session(all, duels)
  })

  it('las sorpresas suben: la última que gana a la primera escala puestos', () => {
    const rk = session({}, [['m1', 'm20', 'm20']])
    expect(rk.indexOf('m20')).toBeLessThan(19)
  })

  it('si eliges la de abajo frente a su vecina, sube por encima aunque las dos lleven muchos duelos', () => {
    const all: Record<string, number> = {}
    ids.forEach((id, i) => { all[id] = 1800 - i * 31 })
    const record: Record<string, { w: string; at: number }> = {}
    // m8 y m9 ya llevan 5 duelos cada una (K bajo)
    ;['m1', 'm2', 'm3', 'm4', 'm5'].forEach((o, i) => { record[`m8|${o}`] = { w: o, at: i }; record[`m9|m1${i}`] = { w: 'm9', at: i } })
    record['m8|m9'] = { w: 'm9', at: 99 }
    const res = applyDuelToRanking({ ranking: ids, duels: record, lastDuel: { a: 'm8', b: 'm9', winner: 'm9' }, ratings: all })
    expect(res.ranking.indexOf('m9')).toBeLessThan(res.ranking.indexOf('m8'))
  })

  it('seedMissingRatings respeta el orden actual', () => {
    const r: Record<string, number> = { m3: 1600, m10: 1500 }
    seedMissingRatings(ids, r)
    for (let i = 1; i < ids.length; i++) expect(r[ids[i - 1]]).toBeGreaterThanOrEqual(r[ids[i]])
  })
})
