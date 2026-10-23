// Motor de valoración a pares. Funciones PURAS: la UI conduce las máquinas de estados.
// Convenciones: `ranking` es una lista de itemIds, mejor primero. `starsOf` da las estrellas de un item.
import { getItem } from '../data/catalog'
import { SHELVES, type Stars, type DuelRecord, type ShelfType, type UserEntry } from '../types'

export type StarsOf = (id: string) => number | undefined
export type Rng = () => number

export const PLACEMENT_MAX_COMPARISONS = 4
export const RANK_DUELS_FOR_DONE = 3

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

/* ============================ T16: Historial de duelos y planNextDuel ============================ */

/** Clave canónica de un par de obras (orden alfabético para evitar asimetrías). */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/**
 * Avanza una colocación binaria saltando rivales a los que esta obra ya se enfrentó en el historial.
 * Si todos los rivales restantes ya se jugaron, devuelve la colocación terminada (`p.done === true`).
 */
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

export interface UnrankedItem {
  itemId: string
  stars?: number
}

export interface PlannedDuel {
  a: string
  b: string
  kind: 'place' | 'boot' | 'refine'
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
}

/**
 * Pulir: elige la pareja más útil que nunca se haya jugado en el historial.
 * docs/TAREA_T16_COMPARAR.md §1.3
 */
export function planRefineDuel(
  ranking: readonly string[],
  duels: Record<string, DuelRecord> = {},
  cmp: Record<string, number> = {},
  refineState?: RefineState | null,
  rng: Rng = Math.random,
): PlannedDuel | null {
  const n = ranking.length
  if (n < 2) return null

  // 1. Rachas (jumpUp / jumpDown o racha de vecinos)
  if (refineState?.subject && ranking.includes(refineState.subject)) {
    const sj = refineState.subject
    const idx = ranking.indexOf(sj)
    const quart = Math.max(2, Math.ceil(n / 4))

    if (refineState.wins >= STREAK_TRIGGER) {
      const target = Math.max(0, idx - quart)
      // Buscar el rival k < idx más cercano al objetivo que no esté en el historial
      let bestK = -1
      let bestDist = Infinity
      for (let k = 0; k < idx; k++) {
        const key = pairKey(sj, ranking[k])
        if (!duels[key]) {
          const d = Math.abs(k - target)
          if (d < bestDist) {
            bestDist = d
            bestK = k
          }
        }
      }
      if (bestK >= 0) {
        const opp = ranking[bestK]
        return {
          kind: 'refine',
          pair: { subject: sj, opponent: opp, kind: 'jumpUp', target: bestK },
          a: sj,
          b: opp,
          subject: sj,
          opponent: opp,
        }
      }
    } else if (refineState.losses >= STREAK_TRIGGER) {
      const target = Math.min(n - 1, idx + quart)
      let bestK = -1
      let bestDist = Infinity
      for (let k = idx + 1; k < n; k++) {
        const key = pairKey(sj, ranking[k])
        if (!duels[key]) {
          const d = Math.abs(k - target)
          if (d < bestDist) {
            bestDist = d
            bestK = k
          }
        }
      }
      if (bestK >= 0) {
        const opp = ranking[bestK]
        return {
          kind: 'refine',
          pair: { subject: sj, opponent: opp, kind: 'jumpDown', target: bestK },
          a: sj,
          b: opp,
          subject: sj,
          opponent: opp,
        }
      }
    } else if (refineState.wins > 0) {
      // Continuación de racha contra vecino hacia arriba
      let bestK = -1
      let bestDist = Infinity
      for (let k = idx - 1; k >= 0; k--) {
        const key = pairKey(sj, ranking[k])
        if (!duels[key]) {
          const d = idx - k
          if (d < bestDist) {
            bestDist = d
            bestK = k
          }
        }
      }
      if (bestK >= 0) {
        const opp = ranking[bestK]
        return {
          kind: 'refine',
          pair: { subject: sj, opponent: opp, kind: 'neighbor' },
          a: sj,
          b: opp,
          subject: sj,
          opponent: opp,
        }
      }
    } else if (refineState.losses > 0) {
      // Continuación de racha contra vecino hacia abajo
      let bestK = -1
      let bestDist = Infinity
      for (let k = idx + 1; k < n; k++) {
        const key = pairKey(sj, ranking[k])
        if (!duels[key]) {
          const d = k - idx
          if (d < bestDist) {
            bestDist = d
            bestK = k
          }
        }
      }
      if (bestK >= 0) {
        const opp = ranking[bestK]
        return {
          kind: 'refine',
          pair: { subject: sj, opponent: opp, kind: 'neighbor' },
          a: sj,
          b: opp,
          subject: sj,
          opponent: opp,
        }
      }
    }
  }

  // 2. Candidatas: parejas (i, j) del ranking que no estén en el historial
  const top20Limit = n * 0.2
  const findCandidates = (maxDist: number) => {
    const list: { i: number; j: number; util: number }[] = []
    for (let i = 0; i < n; i++) {
      const maxJ = maxDist === Infinity ? n : Math.min(n, i + maxDist + 1)
      for (let j = i + 1; j < maxJ; j++) {
        const a = ranking[i]
        const b = ranking[j]
        const key = pairKey(a, b)
        if (duels[key]) continue

        const dist = j - i
        const cercania = 1 / dist
        const cmpA = cmp[a] ?? 0
        const cmpB = cmp[b] ?? 0
        const novedad = 1 / (1 + Math.min(cmpA, cmpB))
        const pesoArriba = i < top20Limit && j < top20Limit ? 1.5 : 1
        const util = cercania * novedad * pesoArriba
        list.push({ i, j, util })
      }
    }
    return list
  }

  // Progresión de distancias: <= 3, luego <= 6, luego cualquier distancia
  let candidates = findCandidates(3)
  if (candidates.length === 0) candidates = findCandidates(6)
  if (candidates.length === 0) candidates = findCandidates(Infinity)
  if (candidates.length === 0) return null

  // Ordenar de mayor a menor utilidad
  candidates.sort((x, y) => y.util - x.util)

  // Elegir al azar entre las hasta 3 mejores
  const top3 = candidates.slice(0, 3)
  const chosen = top3[Math.floor(rng() * top3.length)]
  const subject = ranking[chosen.i]
  const opponent = ranking[chosen.j]

  return {
    kind: 'refine',
    pair: { subject, opponent, kind: 'neighbor' },
    a: subject,
    b: opponent,
    subject,
    opponent,
  }
}

/**
 * Función pura que planifica el siguiente duelo sin modificar nada.
 * docs/TAREA_T16_COMPARAR.md §1.3
 */
export function planNextDuel(input: PlanNextDuelInput): PlannedDuel | null {
  const ranking = [...input.ranking]
  const duels = input.duels ?? {}
  const cmp = input.cmp ?? {}
  const rng = input.rng ?? Math.random
  const starsOf = input.starsOf ?? (() => undefined)

  // 1. Si hay una colocación activa en curso
  if (input.activePlacement && !input.activePlacement.done) {
    const adv = advancePlacementWithDuels(input.activePlacement, duels)
    if (!adv.done) {
      const opp = placementOpponent(adv)
      if (opp) {
        return {
          kind: 'place',
          placement: adv,
          a: adv.id,
          b: opp,
          subject: adv.id,
          opponent: opp,
        }
      }
    }
  }

  // 2. Normalizar la lista de obras sin ordenar
  const unrankedList: UnrankedItem[] = (input.unranked ?? []).map((u) =>
    typeof u === 'string' ? { itemId: u } : u,
  )

  // 3. Patrón de sesión: C C P C C P P (si unranked > 0 y ranking >= 6)
  const hasUnranked = unrankedList.length > 0
  let mode: 'C' | 'P' = 'P'
  if (hasUnranked) {
    if (ranking.length >= 6) {
      const pattern = ['C', 'C', 'P', 'C', 'C', 'P', 'P'] as const
      const idx = (input.sessionIndex ?? 0) % 7
      mode = pattern[idx]
    } else {
      mode = 'C'
    }
  } else {
    mode = 'P'
  }

  // 4. Intentar colocar
  if (mode === 'C') {
    if (ranking.length === 0) {
      if (unrankedList.length >= 2) {
        const a = unrankedList[0].itemId
        const b = unrankedList[1].itemId
        const key = pairKey(a, b)
        if (duels[key]) {
          // Duelo ya registrado: aplicar y continuar
          const winner = duels[key].w
          const loser = winner === a ? b : a
          return planNextDuel({
            ...input,
            ranking: [winner, loser],
            unranked: unrankedList.slice(2),
          })
        }
        return { kind: 'boot', a, b, subject: a, opponent: b }
      }
      return null
    }

    let tempRanking = [...ranking]
    for (let i = 0; i < unrankedList.length; i++) {
      const u = unrankedList[i]
      let p = startPlacement(tempRanking, starsOf, u.itemId, u.stars)
      p = advancePlacementWithDuels(p, duels)
      if (p.done) {
        tempRanking = finishPlacement(p)
        continue
      }
      const opp = placementOpponent(p)
      if (opp) {
        return {
          kind: 'place',
          placement: p,
          a: u.itemId,
          b: opp,
          subject: u.itemId,
          opponent: opp,
        }
      }
    }

    // Todas las sin ordenar se colocaron con el historial: pulir sobre el ranking actualizado
    return planRefineDuel(tempRanking, duels, cmp, input.refineState, rng)
  }

  // 5. Modo 'P' (pulir)
  const ref = planRefineDuel(ranking, duels, cmp, input.refineState, rng)
  if (ref) return ref

  // Si no se puede pulir más (estantería pequeña con todo jugado) y quedan sin ordenar, colocar
  if (hasUnranked) {
    return planNextDuel({
      ...input,
      sessionIndex: 0,
    })
  }

  return null
}
