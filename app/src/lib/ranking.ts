// Motor de valoración a pares. Funciones PURAS: la UI conduce las máquinas de estados.
// Convenciones: `ranking` es una lista de itemIds, mejor primero. `starsOf` da las estrellas de un item.
import type { Stars } from '../types'

export type StarsOf = (id: string) => number | undefined
export type Rng = () => number

export const PLACEMENT_MAX_COMPARISONS = 4

/* ============================ Colocación (búsqueda binaria) ============================ */

export interface Placement {
  id: string
  stars?: number
  lo: number // posición de inserción mínima posible
  hi: number // posición de inserción máxima posible
  base: readonly string[] // ranking sin el item
  comparisons: number
  maxComparisons: number
  done: boolean
  insertIndex: number | null // definido cuando done
}

/** Franja contigua [a, b) de items con exactamente `stars` (el ranking mantiene las estrellas no crecientes). */
export function starBand(ranking: readonly string[], starsOf: StarsOf, stars: number): [number, number] {
  let a = -1
  let b = -1
  ranking.forEach((id, i) => {
    if (starsOf(id) === stars) {
      if (a < 0) a = i
      b = i + 1
    }
  })
  if (a >= 0) return [a, b]
  // sin ninguno con esas estrellas: frontera entre los de más y los de menos
  let at = ranking.length
  for (let i = 0; i < ranking.length; i++) {
    const s = starsOf(ranking[i])
    if (s !== undefined && s < stars) { at = i; break }
  }
  return [at, at]
}

export function startPlacement(
  ranking: readonly string[],
  starsOf: StarsOf,
  id: string,
  stars?: number,
  maxComparisons = PLACEMENT_MAX_COMPARISONS,
): Placement {
  const base = ranking.filter((x) => x !== id)
  let lo = 0
  let hi = base.length
  if (stars !== undefined) [lo, hi] = starBand(base, starsOf, stars)
  const p: Placement = { id, stars, lo, hi, base, comparisons: 0, maxComparisons, done: false, insertIndex: null }
  // Franja con un único rival: se coloca sin abrir el modal (junto a él, por debajo).
  if (stars !== undefined && hi - lo === 1) return { ...p, done: true, insertIndex: hi }
  return settle(p)
}

function settle(p: Placement): Placement {
  if (p.lo >= p.hi) return { ...p, done: true, insertIndex: p.lo }
  if (p.comparisons >= p.maxComparisons) return { ...p, done: true, insertIndex: Math.floor((p.lo + p.hi) / 2) }
  return p
}

/** El rival al que se enfrenta ahora (el elemento medio del rango). */
export function placementOpponent(p: Placement): string | null {
  if (p.done) return null
  return p.base[Math.floor((p.lo + p.hi) / 2)]
}

/** `won` = el item que se coloca gana al rival actual. */
export function answerPlacement(p: Placement, won: boolean): Placement {
  if (p.done) return p
  const mid = Math.floor((p.lo + p.hi) / 2)
  const next = { ...p, comparisons: p.comparisons + 1, lo: won ? p.lo : mid + 1, hi: won ? mid : p.hi }
  return settle(next)
}

export function insertAt(base: readonly string[], id: string, index: number): string[] {
  const out = base.filter((x) => x !== id)
  out.splice(Math.max(0, Math.min(index, out.length)), 0, id)
  return out
}

export function finishPlacement(p: Placement): string[] {
  if (!p.done || p.insertIndex === null) throw new Error('La colocación no ha terminado')
  return insertAt(p.base, p.id, p.insertIndex)
}

/* ============================ Estrellas frente a ranking (§5.3) ============================ */

/**
 * Tras mover `id`, ajusta sus estrellas para que las de los items con estrellas sigan sin crecer hacia abajo.
 * El A/B manda: el item toma las estrellas de sus vecinos. Devuelve las estrellas nuevas (o undefined si no tenía).
 */
export function clampStars(ranking: readonly string[], starsOf: StarsOf, id: string): Stars | undefined {
  const i = ranking.indexOf(id)
  const own = starsOf(id)
  if (i < 0 || own === undefined) return own as Stars | undefined
  let upper = 5
  for (let j = i - 1; j >= 0; j--) { const s = starsOf(ranking[j]); if (s !== undefined) { upper = s; break } }
  let lower = 1
  for (let j = i + 1; j < ranking.length; j++) { const s = starsOf(ranking[j]); if (s !== undefined) { lower = s; break } }
  return Math.max(lower, Math.min(upper, own)) as Stars
}

/* ============================ Refinado libre con rachas ============================ */

export const STREAK_TRIGGER = 3

export interface RefineState {
  subject: string | null
  wins: number
  losses: number
  counts: Record<string, number> // nº de comparaciones por item
  last: [string, string] | null // última pareja mostrada
}

export const newRefineState = (): RefineState => ({ subject: null, wins: 0, losses: 0, counts: {}, last: null })

export type PairKind = 'neighbor' | 'jumpUp' | 'jumpDown'
export interface RefinePair {
  subject: string
  opponent: string
  kind: PairKind
  target?: number // jumpUp/jumpDown: posición del rival
}

const samePair = (a: [string, string] | null, x: string, y: string) =>
  !!a && ((a[0] === x && a[1] === y) || (a[0] === y && a[1] === x))

export function nextRefinePair(ranking: readonly string[], st: RefineState, rng: Rng): RefinePair | null {
  const n = ranking.length
  if (n < 2) return null
  const quart = Math.max(2, Math.ceil(n / 4))

  if (st.subject && ranking.includes(st.subject)) {
    const idx = ranking.indexOf(st.subject)
    if (st.wins >= STREAK_TRIGGER && idx - quart >= 0)
      return { subject: st.subject, opponent: ranking[idx - quart], kind: 'jumpUp', target: idx - quart }
    if (st.losses >= STREAK_TRIGGER && idx + quart <= n - 1)
      return { subject: st.subject, opponent: ranking[idx + quart], kind: 'jumpDown', target: idx + quart }
    // la racha continúa contra el siguiente vecino en la misma dirección
    if (st.wins > 0 && idx > 0 && !samePair(st.last, st.subject, ranking[idx - 1]))
      return { subject: st.subject, opponent: ranking[idx - 1], kind: 'neighbor' }
    if (st.losses > 0 && idx < n - 1 && !samePair(st.last, st.subject, ranking[idx + 1]))
      return { subject: st.subject, opponent: ranking[idx + 1], kind: 'neighbor' }
  }

  // sujeto nuevo: preferencia por los que menos comparaciones llevan
  const min = Math.min(...ranking.map((id) => st.counts[id] ?? 0))
  const pool = ranking.filter((id) => (st.counts[id] ?? 0) <= min + 1)
  for (let tries = 0; tries < 20; tries++) {
    const subject = pool[Math.floor(rng() * pool.length)]
    const idx = ranking.indexOf(subject)
    const offsets = [-3, -2, -1, 1, 2, 3].filter((d) => idx + d >= 0 && idx + d < n)
    if (!offsets.length) continue
    const opp = ranking[idx + offsets[Math.floor(rng() * offsets.length)]]
    if (!samePair(st.last, subject, opp)) return { subject, opponent: opp, kind: 'neighbor' }
  }
  // sin alternativa (p. ej. solo dos items): se repite la única pareja posible
  return { subject: ranking[0], opponent: ranking[1], kind: 'neighbor' }
}

export interface RefineResult {
  ranking: string[]
  state: RefineState
  jumped: boolean
  movers: string[] // items movidos: sus estrellas hay que ajustarlas con clampStars (en este orden)
}

/** `subjectWon` = gana `pair.subject`. */
export function answerRefine(ranking: readonly string[], st: RefineState, pair: RefinePair, subjectWon: boolean): RefineResult {
  const { subject, opponent } = pair
  const counts = { ...st.counts, [subject]: (st.counts[subject] ?? 0) + 1, [opponent]: (st.counts[opponent] ?? 0) + 1 }
  const last: [string, string] = [subject, opponent]
  let out = [...ranking]
  let jumped = false
  const movers: string[] = []
  let state: RefineState

  if (pair.kind === 'jumpUp') {
    if (subjectWon) { out = insertAt(out, subject, (pair.target as number) + 1); jumped = true; movers.push(subject) }
    state = { subject: null, wins: 0, losses: 0, counts, last }
  } else if (pair.kind === 'jumpDown') {
    if (!subjectWon) { out = insertAt(out, subject, pair.target as number); jumped = true; movers.push(subject) }
    state = { subject: null, wins: 0, losses: 0, counts, last }
  } else {
    const i = out.indexOf(subject)
    const j = out.indexOf(opponent)
    // intercambio solo si el de abajo gana al de arriba
    if (subjectWon && i > j) { [out[i], out[j]] = [out[j], out[i]]; movers.push(subject, opponent) }
    if (!subjectWon && i < j) { [out[i], out[j]] = [out[j], out[i]]; movers.push(opponent, subject) }
    state = subjectWon
      ? { subject, wins: (st.subject === subject ? st.wins : 0) + 1, losses: 0, counts, last }
      : { subject, wins: 0, losses: (st.subject === subject ? st.losses : 0) + 1, counts, last }
  }
  return { ranking: out, state, jumped, movers }
}

/* ============================ Nota 0-10 (§5.4) ============================ */

const BAND: Record<number, [number, number]> = { 5: [9, 10], 4: [7, 8.9], 3: [5, 6.9], 2: [3, 4.9], 1: [0.5, 2.9] }

/** Notas 0-10 de todos los items ordenados de una estantería. */
export function scoresForShelf(ranking: readonly string[], starsOf: StarsOf): Record<string, number> {
  const n = ranking.length
  const out: Record<string, number> = {}
  const groups: Record<number, string[]> = {}
  ranking.forEach((id) => {
    const s = starsOf(id)
    if (s !== undefined) (groups[s] ||= []).push(id)
  })
  ranking.forEach((id, i) => {
    const s = starsOf(id)
    if (s === undefined) {
      out[id] = Math.min(10, Math.max(1, 10 * (1 - i / n)))
      return
    }
    const [lo, hi] = BAND[s]
    const g = groups[s]
    const k = g.indexOf(id)
    out[id] = g.length === 1 ? (lo + hi) / 2 : hi - ((hi - lo) * k) / (g.length - 1)
  })
  return out
}

/** `8,3` */
export const formatScore = (x: number) => (Math.round(x * 10) / 10).toFixed(1).replace('.', ',')
