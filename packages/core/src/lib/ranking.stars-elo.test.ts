// REVISION_MOTORES A5 (Igor, 15/11/2026): manda el duelo. Las estrellas son solo el punto de partida de una obra nueva:
// no corrigen el orden que han dado los duelos. Una obra nueva entra donde le corresponde por su Elo inicial.
import { describe, expect, it } from 'vitest'
import { applyDuelToRanking, finishPlacement, startPlacement, pairKey } from './ranking'
import { applyImportRows } from './import/apply'
import type { ImportRow } from './import/types'
import type { ShelfType, UserEntry } from '../types'

const stars: Record<string, number> = { A: 5, B: 5, C: 4, D: 2 }
const starsOf = (id: string) => stars[id]
const startRatings = { A: 1700, B: 1690, C: 1550, D: 1250 }

/** [A 5★, B 5★, C 4★, D 2★] y D gana a A: queda [D, A, B, C]. */
function afterDuel() {
  const duels = { [pairKey('A', 'D')]: { w: 'D', at: 1 } }
  const res = applyDuelToRanking({
    ranking: ['A', 'B', 'C', 'D'],
    anchor: ['A', 'B', 'C', 'D'],
    duels,
    lastDuel: { a: 'A', b: 'D', winner: 'D' },
    ratings: startRatings,
  })
  return { ranking: res.ranking, ratings: { ...startRatings, ...res.ratings } }
}

const emptyRankings = { movie: [], series: [], book: [], artist: [], boardgame: [], song: [] } as Record<ShelfType, string[]>

function entry(id: string, s: number): UserEntry {
  return { itemId: id, shelf: 'movie', status: 'seen', stars: s as UserEntry['stars'], ranked: true, updatedAt: 1 }
}

describe('A5: el duelo manda sobre las estrellas', () => {
  it('el escenario de partida: tras el duelo, D (2★) está por encima de A', () => {
    const { ranking } = afterDuel()
    expect(ranking.indexOf('D')).toBeLessThan(ranking.indexOf('A'))
  })

  it('importar una obra de 2★ no la deja por encima de las de 5★', () => {
    const { ranking, ratings } = afterDuel()
    const entries: Record<string, UserEntry> = { A: entry('A', 5), B: entry('B', 5), C: entry('C', 4), D: entry('D', 2) }
    const row: ImportRow = { type: 'movie', title: 'N', status: 'seen', stars: 2 }
    const res = applyImportRows(entries, { ...emptyRankings, movie: ranking }, [{ row, itemId: 'N' }], 'test', { ...emptyRankings, movie: ratings } as never)
    const rk = res.rankings.movie
    expect(rk.indexOf('N')).toBeGreaterThan(rk.indexOf('A'))
    expect(rk.indexOf('N')).toBeGreaterThan(rk.indexOf('B'))
    expect(rk.indexOf('N')).toBeGreaterThan(rk.indexOf('C'))
  })

  it('colocar con startPlacement una obra de 2★ tampoco entra arriba del todo', () => {
    const { ranking, ratings } = afterDuel()
    const p = startPlacement(ranking, starsOf, 'N', 2, undefined, ratings)
    // ninguna obra del ranking está a ±150 de 1250: no hay nada que comparar y entra al final
    expect(p.done).toBe(true)
    expect(finishPlacement(p)).toEqual([...ranking, 'N'])
  })

  it('la ventana de búsqueda es el tramo con Elo cercano al inicial, no una franja de estrellas', () => {
    const rk = ['a', 'b', 'c', 'd', 'e', 'f']
    const ratings = { a: 1800, b: 1700, c: 1560, d: 1500, e: 1300, f: 1100 }
    const p = startPlacement(rk, () => undefined, 'N', 4, undefined, ratings) // 4★ -> 1550
    expect(p.lo).toBe(1) // b (1700) está a 150
    expect(p.hi).toBe(4) // d (1500) está dentro; e (1300) no
  })

  it('un ranking sin notas Elo se comporta como antes (franja de estrellas)', () => {
    const rk = ['A', 'B', 'C', 'D']
    const old = startPlacement(rk, starsOf, 'N', 4)
    expect(startPlacement(rk, starsOf, 'N', 4, undefined, {})).toEqual(old)
    expect(startPlacement(rk, starsOf, 'N', 4, undefined, undefined)).toEqual(old)
    expect([old.lo, old.hi]).toEqual([2, 3])
    const entries: Record<string, UserEntry> = { A: entry('A', 5), B: entry('B', 5), C: entry('C', 4), D: entry('D', 2) }
    const row: ImportRow = { type: 'movie', title: 'N', status: 'seen', stars: 4 }
    const res = applyImportRows(entries, { ...emptyRankings, movie: rk }, [{ row, itemId: 'N' }], 'test')
    expect(res.rankings.movie).toEqual(['A', 'B', 'C', 'N', 'D'])
  })
})
