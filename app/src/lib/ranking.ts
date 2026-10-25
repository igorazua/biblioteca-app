// Motor de valoración a pares. Funciones PURAS: la UI conduce las máquinas de estados.
// Convenciones: `ranking` es una lista de itemIds, mejor primero. `starsOf` da las estrellas de un item.
import { getItem } from '../data/catalog'
import { SHELVES, type Stars, type DuelRecord, type ShelfType, type UserEntry } from '../types'

export type StarsOf = (id: string) => number | undefined
export type Rng = () => number

/* ============================ Constantes de T30 (exportadas con comentario) ============================ */

/** Ventana sin repetición: número de duelos recientes en los que no puede repetirse ninguna obra */
export const NO_REPEAT_WINDOW = 2

/** Hito de duelos para mostrar aviso discreto sin bloquear la sesión */
export const DUEL_MILESTONE = 25

/** Número de vecinos por arriba y por abajo en la lista ordenada por nota para generar candidatas */
export const NEIGHBORS_COUNT = 8

/** Número de obras candidatas al azar de toda la estantería para verificar el orden general */
export const RANDOM_CANDIDATES_COUNT = 4

/** Factor de novedad para una pareja que ya se jugó en el historial */
export const REPEAT_NOVELTY = 0.1

/** Utilidad mínima para considerar que un duelo merece jugarse; por debajo no quedan duelos */
export const MIN_UTILITY = 0.005

/** Peso (precisión) de la prior para obras que ya estaban en el ranking (poca incertidumbre) */
export const PRIOR_WEIGHT_RANKED = 1.5

/**
 * Pulido con ancla (Claude, 25/10): la prior sale del ranking al EMPEZAR la sesión, no del de cada turno. Con el del
 * turno, cada duelo contaba dos veces (ya estaba dentro del ranking) y los errores se quedaban pegados: en la simulación
 * justa el orden de lo ya colocado caía de 0,89 a 0,58 a los 50 duelos. Peso y escala elegidos con esa simulación.
 */
export const ANCHOR_PRIOR_WEIGHT = 3
/** La nota de la prior va de +3·escala (1.ª) a −3·escala (última) */
export const ANCHOR_PRIOR_SCALE = 2
/** Peso de la prior de una obra colocada en esta sesión (su sitio sale de su búsqueda binaria, que ya cuenta en los duelos) */
export const PLACED_PRIOR_WEIGHT = 1
/** Proporción de duelos de colocación cuando hay obras sin colocar: n / (n + este número), acotada */
export const PLACE_SHARE_K = 4
export const PLACE_SHARE_MIN = 0.35
export const PLACE_SHARE_MAX = 0.7
/** Distancia máxima (en puestos) entre las dos obras de un duelo de pulido */
export const POLISH_MAX_DIST = 3

/** Peso (precisión) de la prior para obras sin colocar (mucha incertidumbre) */
export const PRIOR_WEIGHT_UNRANKED = 0.5

/** Número de duelos necesarios para que una obra sin colocar pase de provisional a colocada */
export const RANK_DUELS_FOR_DONE = 3

/** Máximo de comparaciones binarias por colocación en PlaceFlow */
export const PLACEMENT_MAX_COMPARISONS = 4

/**
 * Repara consistencia entre entries y rankings:
 * 1. Las IDs de un ranking que no son una vista ('seen') se quitan.
 * 2. Las entradas 'ranked: true' que no están en el array de ranking pasan a 'ranked: false'.
 * 3. Las entradas 'seen' en el ranking y no provisionales tienen 'ranked: true'.
 */
export function repairRankingsAndEntries(
  entries: Record<string, UserEntry>,
  rankings: Record<ShelfType, string[]>,
): { entries: Record<string, UserEntry>; rankings: Record<ShelfType, string[]>; changed: boolean } {
  let changed = false
  const nextRankings: Record<ShelfType, string[]> = {
    movie: [...(rankings.movie ?? [])],
    series: [...(rankings.series ?? [])],
    book: [...(rankings.book ?? [])],
    artist: [...(rankings.artist ?? [])],
    boardgame: [...(rankings.boardgame ?? [])],
    song: [...(rankings.song ?? [])],
  }

  // 1. Quitar de rankings las IDs que no sean status === 'seen'
  for (const s of SHELVES) {
    const orig = nextRankings[s] ?? []
    const filtered = orig.filter((id) => entries[id]?.status === 'seen')
    if (filtered.length !== orig.length) {
      nextRankings[s] = filtered
      changed = true
    }
  }

  // 2. Corregir flag ranked en entries
  const nextEntries: Record<string, UserEntry> = { ...entries }
  for (const [id, e] of Object.entries(entries)) {
    const shelf = (e.shelf ?? getItem(id)?.type) as ShelfType
    const inRanking = (nextRankings[shelf] ?? []).includes(id)
    if (e.ranked && !inRanking) {
      nextEntries[id] = { ...e, ranked: false }
      changed = true
    } else if (!e.ranked && inRanking && e.status === 'seen' && !e.provisional) {
      nextEntries[id] = { ...e, ranked: true }
      changed = true
    }
  }

  return { entries: nextEntries, rankings: nextRankings, changed }
}

/* ============================ Colocación binaria (PlaceFlow) ============================ */

export interface Placement {
  id: string
  stars?: number
  lo: number
  hi: number
  base: readonly string[]
  comparisons: number
  maxComparisons: number
  done: boolean
  insertIndex: number | null
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
  if (stars !== undefined && hi - lo === 1) return { ...p, done: true, insertIndex: hi }
  return settle(p)
}

function settle(p: Placement): Placement {
  if (p.lo >= p.hi) return { ...p, done: true, insertIndex: p.lo }
  if (p.comparisons >= p.maxComparisons) return { ...p, done: true, insertIndex: Math.floor((p.lo + p.hi) / 2) }
  return p
}

export function placementOpponent(p: Placement): string | null {
  if (p.done) return null
  return p.base[Math.floor((p.lo + p.hi) / 2)]
}

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

/* ============================ Refinado y rachas (compatibilidad) ============================ */

export const STREAK_TRIGGER = 3

export interface RefineState {
  subject: string | null
  wins: number
  losses: number
  counts: Record<string, number>
  last: [string, string] | null
}

export const newRefineState = (): RefineState => ({ subject: null, wins: 0, losses: 0, counts: {}, last: null })

export type PairKind = 'neighbor' | 'jumpUp' | 'jumpDown'
export interface RefinePair {
  subject: string
  opponent: string
  kind: PairKind
  target?: number
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
    if (st.wins > 0 && idx > 0 && !samePair(st.last, st.subject, ranking[idx - 1]))
      return { subject: st.subject, opponent: ranking[idx - 1], kind: 'neighbor' }
    if (st.losses > 0 && idx < n - 1 && !samePair(st.last, st.subject, ranking[idx + 1]))
      return { subject: st.subject, opponent: ranking[idx + 1], kind: 'neighbor' }
  }

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
  return { subject: ranking[0], opponent: ranking[1], kind: 'neighbor' }
}

export interface RefineResult {
  ranking: string[]
  state: RefineState
  jumped: boolean
  movers: string[]
}

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

export const formatScore = (x: number) => (Math.round(x * 10) / 10).toFixed(1).replace('.', ',')

/** Clave canónica de un par de obras (orden alfabético). */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

export function advancePlacementWithDuels(
  placement: Placement,
  duels?: Record<string, DuelRecord>,
): Placement {
  if (!duels) return placement
  let cur = placement
  while (!cur.done) {
    const opp = placementOpponent(cur)
    if (!opp) break
    const key = pairKey(cur.id, opp)
    const rec = duels[key]
    if (!rec) break
    const won = rec.w === cur.id
    cur = answerPlacement(cur, won)
  }
  return cur
}

/* ============================ T30: Modelo Bradley-Terry y Duelos Largos ============================ */

export interface ItemPrior {
  mean: number
  weight: number
}

export interface RatingFitResult {
  ratings: Record<string, number>
  uncertainties: Record<string, number>
}

/**
 * Ajuste Bradley-Terry MAP (Maximum A Posteriori) con prior normal (T30.2).
 * Calcula la habilidad latente (rating) y su incertidumbre para cada obra.
 */
export function fitRatings(
  itemIds: readonly string[],
  duels: Record<string, DuelRecord> = {},
  priors: Record<string, ItemPrior> = {},
  maxIterations = 25,
): RatingFitResult {
  const n = itemIds.length
  if (n === 0) return { ratings: {}, uncertainties: {} }

  const idx = new Map<string, number>()
  for (let i = 0; i < n; i++) idx.set(itemIds[i], i)

  const beta = new Float64Array(n)
  const mu = new Float64Array(n)
  const lambda = new Float64Array(n)
  const wins = new Float32Array(n)
  const duelCounts = new Int32Array(n)

  for (let i = 0; i < n; i++) {
    const id = itemIds[i]
    const p = priors[id] || { mean: 0, weight: PRIOR_WEIGHT_RANKED }
    mu[i] = p.mean
    lambda[i] = p.weight
    beta[i] = p.mean
  }

  const duelKeys = Object.keys(duels)
  const m = duelKeys.length
  const pairA = new Int32Array(m)
  const pairB = new Int32Array(m)
  let validM = 0

  for (let k = 0; k < m; k++) {
    const key = duelKeys[k]
    const sep = key.indexOf('|')
    if (sep <= 0) continue
    const idA = key.slice(0, sep)
    const idB = key.slice(sep + 1)
    const i = idx.get(idA)
    const j = idx.get(idB)
    if (i === undefined || j === undefined) continue
    const rec = duels[key]
    if (!rec) continue
    pairA[validM] = i
    pairB[validM] = j
    validM++
    duelCounts[i]++
    duelCounts[j]++
    if (rec.w === idA) wins[i]++
    else if (rec.w === idB) wins[j]++
  }

  // Estructura CSR (Compressed Sparse Row) para recorrido ultra-rápido en memoria continua
  const rowPtr = new Int32Array(n + 1)
  for (let k = 0; k < validM; k++) {
    rowPtr[pairA[k] + 1]++
    rowPtr[pairB[k] + 1]++
  }
  for (let i = 0; i < n; i++) rowPtr[i + 1] += rowPtr[i]

  const colIdx = new Int32Array(validM * 2)
  const currentPos = new Int32Array(rowPtr)
  for (let k = 0; k < validM; k++) {
    const u = pairA[k]
    const v = pairB[k]
    colIdx[currentPos[u]++] = v
    colIdx[currentPos[v]++] = u
  }

  // Newton-Raphson amortiguado sobre la log-posterior (T30.2)
  for (let it = 0; it < maxIterations; it++) {
    let maxChange = 0
    for (let i = 0; i < n; i++) {
      const b_i = beta[i]
      const start = rowPtr[i]
      const end = rowPtr[i + 1]
      let sumP = 0
      let sumVar = 0
      for (let pIdx = start; pIdx < end; pIdx++) {
        const j = colIdx[pIdx]
        const diff = b_i - beta[j]
        if (diff > 8) {
          sumP += 1.0
        } else if (diff < -8) {
          // p ~ 0, sumVar ~ 0
        } else {
          const expNeg = Math.exp(-diff)
          const p = 1 / (1 + expNeg)
          sumP += p
          sumVar += p * (1 - p)
        }
      }
      const grad = wins[i] - sumP - lambda[i] * (b_i - mu[i])
      const hess = sumVar + lambda[i]
      let step = grad / hess
      if (step > 1.0) step = 1.0
      else if (step < -1.0) step = -1.0
      beta[i] += step
      const absStep = Math.abs(step)
      if (absStep > maxChange) maxChange = absStep
    }
    if (maxChange < 3e-3) break
  }

  const ratings: Record<string, number> = {}
  const uncertainties: Record<string, number> = {}
  for (let i = 0; i < n; i++) {
    const id = itemIds[i]
    ratings[id] = beta[i]
    uncertainties[id] = 1 / Math.sqrt(duelCounts[i] + lambda[i])
  }
  return { ratings, uncertainties }
}

/**
 * Construye el punto de partida (prior) de cada obra (T30.2):
 * - Ya en el ranking: nota según su posición actual con poca incertidumbre (PRIOR_WEIGHT_RANKED).
 * - Sin colocar con estrellas: nota del centro de su franja de estrellas con mucha incertidumbre (PRIOR_WEIGHT_UNRANKED).
 * - Sin colocar y sin estrellas: nota del centro del ranking con mucha incertidumbre (PRIOR_WEIGHT_UNRANKED).
 */
export function buildPriors(
  ranking: readonly string[],
  unranked: readonly (string | UnrankedItem)[],
  starsOf: StarsOf = () => undefined,
): Record<string, ItemPrior> {
  const priors: Record<string, ItemPrior> = {}
  const N = Math.max(ranking.length, 1)

  for (let i = 0; i < ranking.length; i++) {
    const id = ranking[i]
    const mean = N === 1 ? 0 : 3.0 - (6.0 * i) / (N - 1)
    priors[id] = { mean, weight: PRIOR_WEIGHT_RANKED }
  }

  for (const u of unranked) {
    const id = typeof u === 'string' ? u : u.itemId
    const stars = typeof u === 'string' ? starsOf(u) : (u.stars ?? starsOf(u.itemId))
    let mean = 0
    if (stars !== undefined) {
      let a = -1
      let b = -1
      ranking.forEach((rkId, i) => {
        if (starsOf(rkId) === stars) {
          if (a < 0) a = i
          b = i + 1
        }
      })
      let mid = (ranking.length - 1) / 2
      if (a >= 0) {
        mid = (a + b - 1) / 2
      } else {
        for (let i = 0; i < ranking.length; i++) {
          const s = starsOf(ranking[i])
          if (s !== undefined && s < stars) {
            mid = i
            break
          }
        }
      }
      mean = N === 1 ? 0 : 3.0 - (6.0 * mid) / (N - 1)
    }
    priors[id] = { mean, weight: PRIOR_WEIGHT_UNRANKED }
  }

  return priors
}

/**
 * Reconstruye el ranking tras los duelos a partir de las notas de Bradley-Terry (T30.2).
 * Contiene todas las obras que han jugado >= 1 duelo más las que ya estaban en el ranking.
 */
export function updateRankingFromRatings(
  currentRanking: readonly string[],
  allSeenIds: readonly string[],
  ratings: Record<string, number>,
  duels: Record<string, DuelRecord>,
  priors: Record<string, ItemPrior>,
): string[] {
  const duelCounts: Record<string, number> = {}
  for (const key of Object.keys(duels)) {
    const sep = key.indexOf('|')
    if (sep > 0) {
      const a = key.slice(0, sep)
      const b = key.slice(sep + 1)
      duelCounts[a] = (duelCounts[a] || 0) + 1
      duelCounts[b] = (duelCounts[b] || 0) + 1
    }
  }

  const eligible = allSeenIds.filter((id) => (duelCounts[id] ?? 0) >= 1 || currentRanking.includes(id))

  return [...eligible].sort((a, b) => {
    const diff = (ratings[b] ?? 0) - (ratings[a] ?? 0)
    if (Math.abs(diff) > 1e-6) return diff
    const priorDiff = (priors[b]?.mean ?? 0) - (priors[a]?.mean ?? 0)
    if (Math.abs(priorDiff) > 1e-6) return priorDiff
    const idxA = currentRanking.indexOf(a)
    const idxB = currentRanking.indexOf(b)
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return a.localeCompare(b)
  })
}

/* ============================ T30 (corrección): colocar y pulir mezclados ============================ */

const normUnranked = (u: readonly (string | UnrankedItem)[]): UnrankedItem[] =>
  u.map((x) => (typeof x === 'string' ? { itemId: x } : x))

/**
 * Prior del pulido: las obras del ancla (ranking al empezar la sesión) según su puesto en él; las colocadas después,
 * con la media de sus vecinas del ancla en el ranking actual y menos peso.
 */
export function anchorPriors(anchor: readonly string[], ranking: readonly string[]): Record<string, ItemPrior> {
  const priors: Record<string, ItemPrior> = {}
  const N = anchor.length
  const meanAt = (i: number) => (N <= 1 ? 0 : ANCHOR_PRIOR_SCALE * (3 - (6 * i) / (N - 1)))
  const inAnchor = new Set(anchor)
  anchor.forEach((id, i) => { priors[id] = { mean: meanAt(i), weight: ANCHOR_PRIOR_WEIGHT } })
  ranking.forEach((id, i) => {
    if (inAnchor.has(id)) return
    let up: number | undefined
    let down: number | undefined
    for (let k = i - 1; k >= 0; k--) if (inAnchor.has(ranking[k])) { up = priors[ranking[k]].mean; break }
    for (let k = i + 1; k < ranking.length; k++) if (inAnchor.has(ranking[k])) { down = priors[ranking[k]].mean; break }
    const top = meanAt(0) + 1
    const bottom = meanAt(Math.max(N - 1, 0)) - 1
    const mean = ((up ?? top) + (down ?? bottom)) / 2
    priors[id] = { mean, weight: PLACED_PRIOR_WEIGHT }
  })
  return priors
}

export interface MixedPlacement { done: boolean; insertIndex: number; opponent: string | null; played: number }

/**
 * Búsqueda binaria que no depende del orden del ranking en cada momento: el hueco de la obra sale de TODOS sus
 * resultados contra las colocadas (por debajo de las que le ganaron, por encima de las que perdieron), dentro de su
 * franja de estrellas. Hace falta porque entre dos duelos suyos el pulido puede reordenar el ranking.
 */
export function mixedPlacement(
  ranking: readonly string[],
  id: string,
  stars: number | undefined,
  duels: Record<string, DuelRecord>,
  starsOf: StarsOf,
  maxComparisons = PLACEMENT_MAX_COMPARISONS,
  /** rivales que no pueden salir ahora (ventana sin repetición): se usa el más cercano al medio que sí pueda */
  avoid: ReadonlySet<string> = new Set(),
): MixedPlacement {
  const base = ranking.filter((x) => x !== id)
  let [lo, hi] = stars !== undefined ? starBand(base, starsOf, stars) : [0, base.length]
  let played = 0
  base.forEach((r, i) => {
    const rec = duels[pairKey(id, r)]
    if (!rec) return
    played++
    if (rec.w === id) hi = Math.min(hi, i)
    else lo = Math.max(lo, i + 1)
  })
  if (lo >= hi) return { done: true, insertIndex: Math.min(Math.max(Math.round((lo + hi) / 2), 0), base.length), opponent: null, played }
  if (played >= maxComparisons) return { done: true, insertIndex: Math.floor((lo + hi) / 2), opponent: null, played }
  // rival: el del medio del hueco; si ya se jugó (el ranking se movió), el más cercano al medio sin jugar
  const mid = Math.floor((lo + hi) / 2)
  let opponent: string | null = null
  for (let d = 0; d <= hi - lo && !opponent; d++) {
    for (const k of [mid - d, mid + d]) {
      if (k >= lo && k < hi && !duels[pairKey(id, base[k])] && !avoid.has(base[k])) { opponent = base[k]; break }
    }
  }
  if (!opponent) {
    // todos los del hueco jugados: terminada; si solo estaban ocupados por la ventana, se espera a otro turno
    const free = base.slice(lo, hi).some((r) => !duels[pairKey(id, r)])
    return { done: !free, insertIndex: mid, opponent: null, played }
  }
  return { done: false, insertIndex: mid, opponent, played }
}

/** Coloca, con el historial, todas las obras sin colocar cuya búsqueda binaria ya ha terminado. */
export function settlePlacements(
  ranking: readonly string[],
  unranked: readonly (string | UnrankedItem)[],
  duels: Record<string, DuelRecord>,
  starsOf: StarsOf,
): { ranking: string[]; placed: string[] } {
  let rk = [...ranking]
  const placed: string[] = []
  let changed = true
  // Al colocar una obra cambia el ranking y otra puede quedar resuelta: se repite hasta que no cambie nada
  while (changed) {
    changed = false
    for (const u of normUnranked(unranked)) {
      if (rk.includes(u.itemId)) continue
      const p = mixedPlacement(rk, u.itemId, u.stars ?? starsOf(u.itemId), duels, starsOf)
      if (p.done) {
        rk = insertAt(rk, u.itemId, p.insertIndex)
        placed.push(u.itemId)
        changed = true
      }
    }
  }
  return { ranking: rk, placed }
}

/**
 * Tras cada duelo: coloca las obras ya resueltas y reordena las colocadas por su nota (Bradley-Terry con la prior del
 * ancla). Las obras sin colocar no entran en el ranking hasta que su búsqueda termina.
 */
export function applyDuelToRanking(input: {
  ranking: readonly string[]
  anchor?: readonly string[]
  unranked: readonly (string | UnrankedItem)[]
  duels: Record<string, DuelRecord>
  starsOf: StarsOf
}): { ranking: string[]; placed: string[] } {
  const un = normUnranked(input.unranked)
  const unIds = new Set(un.map((u) => u.itemId))
  // las provisionales que T30 metió en el ranking tras un solo duelo vuelven a tratarse como sin colocar
  const base = input.ranking.filter((id) => !unIds.has(id))
  const settled = settlePlacements(base, un, input.duels, input.starsOf)
  const anchor = (input.anchor ?? input.ranking).filter((id) => !unIds.has(id) || settled.placed.includes(id))
  const priors = anchorPriors(anchor, settled.ranking)
  const { ratings } = fitRatings(settled.ranking, input.duels, priors)
  const pos = new Map(settled.ranking.map((id, i) => [id, i]))
  const ranking = [...settled.ranking].sort((a, b) => {
    const d = (ratings[b] ?? 0) - (ratings[a] ?? 0)
    return Math.abs(d) > 1e-9 ? d : (pos.get(a) ?? 0) - (pos.get(b) ?? 0)
  })
  return { ranking, placed: settled.placed }
}

/* ============================ T30.3: Asignación persistente de lados ============================ */

export interface SideAssignment {
  left: string
  right: string
  leftIsSubject: boolean
  nextSides: Record<string, 'L' | 'R'>
}

/**
 * Asigna lado a cada obra en el duelo (T30.3):
 * 1. Si una de las dos ya tiene lado, se queda en él y la otra va al contrario.
 * 2. Si las dos coinciden, se queda la que más veces ha salido en la sesión (empate: subject).
 * 3. Si ninguna tiene lado, subject va al lado donde haya menos obras guardadas (empate: izquierda).
 */
export function assignSides(
  a: string,
  b: string,
  subject: string,
  sides: Record<string, 'L' | 'R'> = {},
  seenCount: Record<string, number> = {},
): SideAssignment {
  const sideA = sides[a]
  const sideB = sides[b]

  let curLeft: string
  let curRight: string
  const nextSides = { ...sides }

  if (sideA && !sideB) {
    if (sideA === 'L') {
      curLeft = a
      curRight = b
      nextSides[b] = 'R'
    } else {
      curLeft = b
      curRight = a
      nextSides[b] = 'L'
    }
  } else if (!sideA && sideB) {
    if (sideB === 'L') {
      curLeft = b
      curRight = a
      nextSides[a] = 'R'
    } else {
      curLeft = a
      curRight = b
      nextSides[a] = 'L'
    }
  } else if (sideA && sideB) {
    if (sideA !== sideB) {
      curLeft = sideA === 'L' ? a : b
      curRight = sideA === 'L' ? b : a
    } else {
      const countA = seenCount[a] ?? 0
      const countB = seenCount[b] ?? 0
      let winnerOfSide: string
      if (countA > countB) winnerOfSide = a
      else if (countB > countA) winnerOfSide = b
      else winnerOfSide = subject === a ? a : b

      const loserOfSide = winnerOfSide === a ? b : a
      if (sideA === 'L') {
        curLeft = winnerOfSide
        curRight = loserOfSide
      } else {
        curLeft = loserOfSide
        curRight = winnerOfSide
      }
    }
  } else {
    let countL = 0
    let countR = 0
    for (const s of Object.values(sides)) {
      if (s === 'L') countL++
      else if (s === 'R') countR++
    }
    const subjectSide: 'L' | 'R' = countR < countL ? 'R' : 'L'
    const otherSide: 'L' | 'R' = subjectSide === 'L' ? 'R' : 'L'
    const other = subject === a ? b : a

    nextSides[subject] = subjectSide
    nextSides[other] = otherSide

    if (subjectSide === 'L') {
      curLeft = subject
      curRight = other
    } else {
      curLeft = other
      curRight = subject
    }
  }

  return {
    left: curLeft,
    right: curRight,
    leftIsSubject: curLeft === subject,
    nextSides,
  }
}

/* ============================ T30: Planificación de duelos ============================ */

export interface UnrankedItem {
  itemId: string
  stars?: number
}

export type PlannedDuelKind = 'place' | 'boot' | 'refine' | 'rank'

export interface PlannedDuel {
  a: string
  b: string
  kind: PlannedDuelKind
  subject: string
  opponent: string
  placement?: Placement
  pair?: RefinePair
  refinePair?: RefinePair
}

export interface PlanNextDuelInput {
  shelf?: ShelfType
  ranking: readonly string[]
  unranked?: readonly (string | UnrankedItem)[]
  duels?: Record<string, DuelRecord>
  cmp?: Record<string, number>
  sessionIndex?: number
  activePlacement?: Placement | null
  refineState?: RefineState | null
  starsOf?: StarsOf
  rng?: Rng
  recent?: string[]
  /** ranking al empezar la sesión: la prior del pulido (por defecto, ranking) */
  anchor?: readonly string[]
}

/**
 * Planifica el siguiente duelo (T30.2):
 * - Evalúa a todas las obras vistas con Bradley-Terry MAP.
 * - Candidatas: vecinas por nota (NEIGHBORS_COUNT) + aleatorias (RANDOM_CANDIDATES_COUNT).
 * - Utilidad = cercanía x incertidumbre x novedad.
 * - Respeta ventana sin repetición NO_REPEAT_WINDOW.
 * - Devuelve `{ kind: 'rank', a, b, subject, opponent }` o `null` si la estantería está completa.
 */
export function planNextDuel(input: PlanNextDuelInput): PlannedDuel | null {
  const ranking = [...input.ranking]
  const duels = input.duels ?? {}
  const rng = input.rng ?? Math.random
  const starsOf = input.starsOf ?? (() => undefined)
  const recent = input.recent ?? []
  const unrankedList = normUnranked(input.unranked ?? [])
  const unIds = new Set(unrankedList.map((u) => u.itemId))
  const placedRk = ranking.filter((id) => !unIds.has(id))
  if (placedRk.length + unrankedList.length < 2) return null

  const duelCount: Record<string, number> = {}
  for (const k of Object.keys(duels)) {
    const sep = k.indexOf('|')
    if (sep <= 0) continue
    duelCount[k.slice(0, sep)] = (duelCount[k.slice(0, sep)] ?? 0) + 1
    duelCount[k.slice(sep + 1)] = (duelCount[k.slice(sep + 1)] ?? 0) + 1
  }

  // Estantería vacía: el primer duelo enfrenta a dos sin colocar
  if (placedRk.length === 0) {
    const [a, b] = unrankedList
    if (!b) return null
    if (duels[pairKey(a.itemId, b.itemId)]) {
      const w = duels[pairKey(a.itemId, b.itemId)].w
      return planNextDuel({ ...input, ranking: [w, w === a.itemId ? b.itemId : a.itemId] })
    }
    return { kind: 'boot', a: a.itemId, b: b.itemId, subject: a.itemId, opponent: b.itemId }
  }

  // Obras sin colocar resueltas ya con el historial: se tratan como colocadas para planificar
  const settled = settlePlacements(placedRk, unrankedList, duels, starsOf)
  const rk = settled.ranking
  const pending = unrankedList.filter((u) => !settled.placed.includes(u.itemId))

  for (const win of [NO_REPEAT_WINDOW, 1, 0]) {
    const blocked = new Set(win > 0 ? recent.slice(-win * 2) : [])

    // 1. Colocar: el siguiente rival de la búsqueda binaria de cada obra sin colocar (todas a la vez, mezcladas)
    const places: PlannedDuel[] = []
    for (const u of pending) {
      if (blocked.has(u.itemId)) continue
      const p = mixedPlacement(rk, u.itemId, u.stars ?? starsOf(u.itemId), duels, starsOf, PLACEMENT_MAX_COMPARISONS, blocked)
      const opp = p.opponent
      if (!opp || blocked.has(opp)) continue
      places.push({ kind: 'place', a: u.itemId, b: opp, subject: u.itemId, opponent: opp })
    }

    // 2. Pulir: parejas cercanas entre las colocadas, ordenadas por cercanía de nota × incertidumbre × novedad
    const anchor = (input.anchor ?? ranking).filter((id) => rk.includes(id))
    const { ratings, uncertainties } = fitRatings(rk, duels, anchorPriors(anchor, rk))
    const polish: { a: string; b: string; util: number }[] = []
    for (let i = 0; i < rk.length; i++) {
      for (let j = i + 1; j <= Math.min(rk.length - 1, i + POLISH_MAX_DIST); j++) {
        const a = rk[i]
        const b = rk[j]
        if (blocked.has(a) || blocked.has(b)) continue
        const novelty = duels[pairKey(a, b)] ? REPEAT_NOVELTY : 1
        const close = 1 / (1 + Math.abs((ratings[a] ?? 0) - (ratings[b] ?? 0)))
        const util = close * ((uncertainties[a] ?? 1) + (uncertainties[b] ?? 1)) * novelty
        if (util >= MIN_UTILITY) polish.push({ a, b, util })
      }
    }
    polish.sort((x, y) => y.util - x.util)
    const top = polish.slice(0, 5)
    const onlyRepeats = top.length > 0 && top.every((c) => duels[pairKey(c.a, c.b)])

    if (!places.length && (!top.length || (onlyRepeats && pending.length === 0 && Object.keys(duels).length > 0 && rk.every((id) => (duelCount[id] ?? 0) >= RANK_DUELS_FOR_DONE)))) {
      if (win === 0) return null
      continue
    }

    const share = Math.min(PLACE_SHARE_MAX, Math.max(PLACE_SHARE_MIN, pending.length / (pending.length + PLACE_SHARE_K)))
    if (places.length && (!top.length || rng() < share)) {
      // la que menos duelos lleva; empate al azar
      const min = Math.min(...places.map((p) => duelCount[p.subject] ?? 0))
      const pool = places.filter((p) => (duelCount[p.subject] ?? 0) === min)
      return pool[Math.floor(rng() * pool.length)]
    }
    const c = top[Math.floor(rng() * top.length)]
    const aFirst = (uncertainties[c.a] ?? 0) >= (uncertainties[c.b] ?? 0)
    return { kind: 'rank', a: c.a, b: c.b, subject: aFirst ? c.a : c.b, opponent: aFirst ? c.b : c.a }
  }
  return null
}

/**
 * Coeficiente de correlación tau de Kendall entre dos listas de orden (T30.4).
 */
export function kendallTau(orderA: readonly string[], orderB: readonly string[]): number {
  const posB = new Map(orderB.map((id, i) => [id, i]))
  let concordant = 0
  let discordant = 0
  const n = orderA.length
  for (let i = 0; i < n; i++) {
    const pBi = posB.get(orderA[i])
    if (pBi === undefined) continue
    for (let j = i + 1; j < n; j++) {
      const pBj = posB.get(orderA[j])
      if (pBj === undefined) continue
      if ((pBi < pBj && i < j) || (pBi > pBj && i > j)) {
        concordant++
      } else {
        discordant++
      }
    }
  }
  const total = (n * (n - 1)) / 2
  return total > 0 ? (concordant - discordant) / total : 1
}
