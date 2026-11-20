/**
 * decide2.ts — Motor de propuesta de Decidir, versión 2 (Igor, 27/10/2026). Misma interfaz que `decide.ts`.
 *
 * Por qué: el motor anterior no aprendía de verdad. Movía la probabilidad de cada candidata con una similitud de
 * géneros y año muy afilada (un duelo podía hundir a media bolsa), sus «dimensiones» se basaban en ejes que ninguna
 * obra tiene, y el vector de gusto salía de un relleno pseudoaleatorio porque los vectores no se cargaban nunca.
 *
 * Cómo funciona:
 * 1. Cada obra es un vector de rasgos legibles + su vector de contenido (`traits.ts`).
 * 2. El gusto de la sesión es un peso por rasgo con su incertidumbre (media μ y covarianza Σ). Al principio sale de las
 *    respuestas (casi firmes) y, suave, de tu ranking.
 * 3. Cada duelo es una observación «A gusta más que B» (modelo probit) y se actualiza μ y Σ de forma bayesiana. Un duelo
 *    inclina; varios en la misma dirección confirman; uno en contra no tira lo anterior.
 * 4. La covarianza hace el tanteo: si gana un juego cooperativo, narrativo y egipcio, el motor no sabe cuál de los tres
 *    rasgos importó (quedan correlacionados), y el siguiente duelo más informativo es el que los separa
 *    (cooperativo sin Egipto contra Egipto sin cooperativo).
 * 5. La pareja se elige por información: que el resultado sea incierto, que toque rasgos que aún no sabemos y que esos
 *    rasgos partan la bolsa de candidatas (el «¿Quién es quién?», pero sin descartar a nadie de golpe).
 * 6. Se propone cuando la mejor candidata destaca de verdad sobre el resto o cuando ya no queda nada útil que preguntar:
 *    con una bolsa pequeña o respuestas muy claras, a los 1-2 duelos; si no, hasta 6.
 *
 * Reglas de Igor que se mantienen: en los 3 primeros duelos solo obras propias o muy famosas; parejas muy distintas al
 * principio; rotación de orientadores entre sesiones; «Pasar» no descarta.
 * Orientar no es proponer (PLAN_DECIDIR M1, cambia D19): si pide «algo nuevo», la propuesta descuenta la probabilidad
 * de que ya la haya visto. Un orientador aún puede ser la propuesta si destaca mucho, pero no solo por ganar su duelo.
 */

import type { Item, ShelfType } from '../../types'
import {
  initDecideSession as initPool,
  familyKey,
  PASSES_FOR_DOUBTFUL,
  type Answers,
  type DecideInput,
  type DecideProposal,
  type DuelPair,
} from './decide'
import { recog, inferBirthYear, type RecogContext } from './recog'
import { traitSpace, traitLabel, priorVar, isEmbKey, type Features } from './traits'
import { MOOD_GENRES } from '../../data/questions'
import { PARAMS } from './params'

export type { Answers, DecideInput, DecideProposal, DuelPair }

/** Ajustes del motor, medidos con el banco de pruebas (`decide2.sim.test.ts`). */
export const TUNE = {
  /** ruido de una respuesta: con 1, un rasgo de peso 1 gana su duelo el 76 % de las veces */
  noise: 1.0,
  /** peso de la puntuación previa (calidad, amigos, tendencia, pendientes) frente al gusto aprendido */
  baseW: 1.0,
  /** para parar: lo que tendría que poder mejorar la propuesta un duelo más para que valga la pena */
  stopKG: 0.1,
  /** para parar: duelos seguidos con la misma primera */
  stable: 2,
}

export interface Decide2State {
  version: 2
  shelf: ShelfType
  answers: Answers
  pool: string[]
  base: Record<string, number>
  /** rasgos con media o covarianza propias, en el orden de `mu` y `cov` */
  keys: string[]
  idx: Record<string, number>
  mu: Float64Array
  cov: Float64Array // k × k, fila a fila
  /** media previa de rasgos aún sin activar (de las respuestas y del ranking) */
  muInit: Record<string, number>
  /** varianza previa forzada (las respuestas explícitas son casi firmes) */
  varInit: Record<string, number>
  /** rasgos pedidos explícitamente en las preguntas, para el motivo */
  asked: string[]
  recogMap: Record<string, number>
  /** la primera candidata tras cada duelo (para saber si ya no se mueve) */
  leaders: string[]
  duels: { a: string; b: string; winner: string | null; ms?: number; unknown?: boolean }[]
  shown: string[]
  rejected: string[]
  round: number
  duelsInRound: number
  preferFameOrOwn: boolean
  doubtfulItems: Record<string, number>
  /** veces que se ha pasado cada obra; la app lo guarda con `doubtfulItems` tras cada «Pasar» */
  passedItems: Record<string, number>
  input: Omit<DecideInput, 'items'>
  /** el catálogo (referencia, no copia): rasgos, orientadores y la parada lo necesitan */
  catalog: Item[]
  byId: Map<string, Item>
}

/* ----------------------------------------------------------------------------- álgebra */

const phi = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
/** Φ(x) por la aproximación de Abramowitz-Stegun (error < 1e-7). */
function Phi(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const d = 0.3989423 * Math.exp((-x * x) / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return x > 0 ? 1 - p : p
}

type Sparse = Map<string, number>

const NO_FEATS: Features = { keys: [], vals: [] }
const featsOf = (st: Decide2State, _items: Item[], id: string): Features =>
  traitSpace(st.shelf, st.catalog).feats.get(id) ?? NO_FEATS

function diff(fa: Features, fb: Features): Sparse {
  const d: Sparse = new Map()
  fa.keys.forEach((k, i) => d.set(k, (d.get(k) ?? 0) + fa.vals[i]))
  fb.keys.forEach((k, i) => d.set(k, (d.get(k) ?? 0) - fb.vals[i]))
  for (const [k, v] of d) if (Math.abs(v) < 1e-9) d.delete(k)
  return d
}
const toSparse = (f: Features): Sparse => new Map(f.keys.map((k, i) => [k, f.vals[i]]))

const meanOf = (st: Decide2State, k: string) => (k in st.idx ? st.mu[st.idx[k]] : st.muInit[k] ?? 0)
const varOf = (st: Decide2State, k: string) => st.varInit[k] ?? priorVar(k)

/** μ·x */
function dot(st: Decide2State, x: Sparse): number {
  let s = 0
  for (const [k, v] of x) s += meanOf(st, k) * v
  return s
}

/** xᵀΣx: con covarianza entre rasgos activos y varianza previa (independiente) para los demás. */
function quad(st: Decide2State, x: Sparse): number {
  const k = st.keys.length
  let s = 0
  const act: [number, number][] = []
  for (const [key, v] of x) {
    const i = st.idx[key]
    if (i === undefined) s += varOf(st, key) * v * v
    else act.push([i, v])
  }
  for (const [i, vi] of act) for (const [j, vj] of act) s += st.cov[i * k + j] * vi * vj
  return s
}

/** Activa rasgos nuevos (con su media y varianza previas) para poder correlacionarlos. */
function activate(st: Decide2State, keys: Iterable<string>): Decide2State {
  const add = [...new Set(keys)].filter((key) => !(key in st.idx))
  if (!add.length) return st
  const k0 = st.keys.length
  const k = k0 + add.length
  const mu = new Float64Array(k)
  mu.set(st.mu)
  const cov = new Float64Array(k * k)
  for (let i = 0; i < k0; i++) cov.set(st.cov.subarray(i * k0, (i + 1) * k0), i * k)
  const keysOut = [...st.keys, ...add]
  const idx = { ...st.idx }
  add.forEach((key, j) => {
    const i = k0 + j
    idx[key] = i
    mu[i] = st.muInit[key] ?? 0
    cov[i * k + i] = varOf(st, key)
  })
  return { ...st, keys: keysOut, idx, mu, cov }
}

/** Observación «x gana a y» con ruido `noise` (probit, filtro de densidad supuesta). */
function observe(st0: Decide2State, d: Sparse, noise = TUNE.noise): Decide2State {
  if (!d.size) return st0
  const st = activate(st0, d.keys())
  const k = st.keys.length
  const sd = new Float64Array(k) // Σ·d
  const nz: [number, number][] = [...d].map(([key, v]) => [st.idx[key], v])
  for (let r = 0; r < k; r++) {
    let s = 0
    for (const [j, v] of nz) s += st.cov[r * k + j] * v
    sd[r] = s
  }
  let m = 0
  let s2 = 0
  for (const [j, v] of nz) { m += st.mu[j] * v; s2 += sd[j] * v }
  const c = Math.sqrt(noise + s2)
  const t = m / c
  const v = phi(t) / Math.max(1e-12, Phi(t))
  const w = v * (v + t)
  const mu = new Float64Array(st.mu)
  const cov = new Float64Array(st.cov)
  for (let r = 0; r < k; r++) mu[r] += sd[r] * (v / c)
  const f = w / (c * c)
  for (let r = 0; r < k; r++) {
    if (!sd[r]) continue
    for (let q = 0; q < k; q++) cov[r * k + q] -= sd[r] * sd[q] * f
  }
  return { ...st, mu, cov }
}

/* ----------------------------------------------------------------------------- utilidad de cada candidata */

function utility(st: Decide2State, items: Item[], id: string): number {
  const f = featsOf(st, items, id)
  let s = TUNE.baseW * (st.base[id] ?? 0)
  for (let i = 0; i < f.keys.length; i++) s += meanOf(st, f.keys[i]) * f.vals[i]
  return s
}

/* ----------------------------------------------------------------------------- orientar ≠ proponer (PLAN_DECIDIR M1) */

// Quien pide «algo nuevo» no quiere que le propongan lo que ya ha visto y no ha apuntado. La obra que gana un duelo es
// la que más se parece a sí misma (tiene todos sus rasgos), y los orientadores son, por diseño, obras que casi todo el
// mundo conoce: sin descuento, la propuesta era el orientador elegido el 73-98 % de las veces (DECIDIR_MEDIDAS.md).
// El gusto aprendido (`observe`, μ, Σ) no cambia: solo con qué se ordena la propuesta y, por tanto, qué duelos aclaran.

/** Probabilidad de que ya la haya visto, según haya respondido un duelo con ella (`answered`) y si la eligió (`won`). */
function pSeen(st: Decide2State, id: string, answered: boolean, won: boolean): number {
  const e = st.input.entries[id]
  if (e?.status === 'pending') return 0 // la guardó para verla
  const sgk = PARAMS.SEEN_GIVEN_KNOWN[st.shelf] ?? PARAMS.SEEN_GIVEN_KNOWN_DEFAULT
  let p = (st.recogMap[id] ?? 0.5) * sgk
  // si respondió un duelo con ella, la conoce (R = 1); si la eligió, casi seguro la ha visto
  if (answered) p = Math.max(p, sgk)
  if (won) p = Math.max(p, PARAMS.SEEN_WINNER_FLOOR)
  return p
}
const noveltyOf = (p: number) => PARAMS.NOVELTY_W * Math.log(1 - 0.95 * p)

interface Novelty { off: Map<string, number>; answered: Set<string>; won: Set<string> }
const noveltyMemo = new WeakMap<Decide2State, Novelty | null>()
/** El descuento de cada candidata de la bolsa (`null` con la bolsa estricta: ahí todas son vistas o guardadas). */
function novelty(st: Decide2State): Novelty | null {
  if (noveltyMemo.has(st)) return noveltyMemo.get(st)!
  let out: Novelty | null = null
  if (!strict(st.answers)) {
    const answered = new Set<string>()
    const won = new Set<string>()
    for (const d of st.duels) if (d.winner) { answered.add(d.a); answered.add(d.b); won.add(d.winner) }
    const off = new Map<string, number>()
    for (const id of st.pool) { const a = answered.has(id); off.set(id, noveltyOf(pSeen(st, id, a, won.has(id)))) }
    out = { off, answered, won }
  }
  noveltyMemo.set(st, out)
  return out
}
/** Cuánto cambia el descuento de una candidata si sale en el duelo que se está valorando (la gane o la pierda). */
function noveltyDelta(st: Decide2State, nov: Novelty, id: string, wins: boolean): number {
  const cur = nov.off.get(id)
  if (cur === undefined) return 0
  return noveltyOf(pSeen(st, id, true, wins || nov.won.has(id))) - cur
}

function ranked(st: Decide2State, items: Item[], byId: Map<string, Item>): { id: string; u: number }[] {
  const rejected = st.rejected.map((id) => byId.get(id)).filter(Boolean) as Item[]
  const nov = novelty(st)
  return st.pool
    .filter((id) => {
      if (st.rejected.includes(id)) return false
      const it = byId.get(id)
      // tras «Seguir buscando», ni su secuela ni su expansión
      return it ? !rejected.some((r) => familyKey(r) === familyKey(it)) : false
    })
    .map((id) => ({ id, u: nov ? utility(st, items, id) + (nov.off.get(id) ?? 0) : utility(st, items, id) }))
    .sort((a, b) => b.u - a.u)
}

/* ----------------------------------------------------------------------------- arranque */

/** Respuestas que equivalen a un rasgo concreto: solo esas se citan en el motivo («Cooperativo, como pediste»). */
const DIRECT_ASKED = new Set(['coop:si', 'g:cartas', 'w:duro', 'x:corto'])

/** Respuestas → rasgos casi firmes (μ alta, Σ baja). Los filtros duros ya los aplica la bolsa. */
function askedTraits(shelf: ShelfType, a: Answers): Record<string, number> {
  const out: Record<string, number> = {}
  const mood = typeof a.mood === 'string' ? a.mood : undefined
  if (mood && mood !== 'igual') {
    for (const g of MOOD_GENRES[shelf]?.[mood] ?? []) out[`g:${g.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}`] = 1.2
    if (shelf === 'boardgame') {
      if (mood === 'coop') out['coop:si'] = 2.5
      if (mood === 'estrategia') { out['w:duro'] = 1.2; out['w:ligero'] = -1.2; out['m:estrategia'] = 1 }
      if (mood === 'risas') { out['g:party'] = 1.5; out['w:ligero'] = 1; out['x:j5'] = 0.8 }
      if (mood === 'cartas') { out['g:cartas'] = 1.5; out['m:gestion de mano'] = 0.8 }
    }
  }
  if (a.company === 'pareja') out['g:romance'] = 0.5
  if (a.company === 'amigos') { out['g:comedia'] = 0.6; out['g:accion'] = 0.4 }
  if (a.length === 'corta' && shelf === 'book') out['x:corto'] = 1
  return out
}

/** Lo que dice tu ranking de esta estantería: rasgos de tus favoritas frente a las de abajo (suave). */
function historyTraits(st: Decide2State, items: Item[]): Record<string, number> {
  const { entries, rankings } = st.input
  const rk = (rankings?.[st.shelf] ?? []).filter((id) => entries[id]?.status === 'seen')
  const out: Record<string, number> = {}
  if (rk.length < 6) return out
  const third = Math.max(2, Math.floor(rk.length / 3))
  const add = (ids: string[], w: number) => {
    for (const id of ids) {
      const f = featsOf(st, items, id)
      f.keys.forEach((k, i) => { out[k] = (out[k] ?? 0) + (w * f.vals[i]) / ids.length })
    }
  }
  add(rk.slice(0, third), 1.2)
  add(rk.slice(-third), -1.2)
  const dismissed = Object.values(entries).filter((e) => e.status === 'dismissed' && st.byId.get(e.itemId)?.type === st.shelf).map((e) => e.itemId)
  if (dismissed.length >= 3) add(dismissed.slice(-30), -0.6)
  for (const k of Object.keys(out)) out[k] = Math.max(-0.8, Math.min(0.8, out[k]))
  return out
}

export function initDecideSession(input: DecideInput): Decide2State {
  const old = initPool({ ...input, priorMode: 'v2' })
  const pool = old.pool
  // la previa tipificada dentro de la bolsa (media 0, desviación 1) por PARAMS.PRIOR_W; sin dispersión, todo 0 (M2)
  const logs = pool.map((id) => Math.log(Math.max(1e-6, old.prior[id] ?? 1e-6)))
  const mean = logs.reduce((s, x) => s + x, 0) / (logs.length || 1)
  const sd = Math.sqrt(logs.reduce((s, x) => s + (x - mean) ** 2, 0) / (logs.length || 1))
  const base: Record<string, number> = {}
  pool.forEach((id, i) => { base[id] = sd > 1e-9 ? (PARAMS.PRIOR_W * (logs[i] - mean)) / sd : 0 })

  const { items, ...rest } = input
  const asked = askedTraits(input.shelf, input.answers)
  const varInit: Record<string, number> = {}
  for (const k of Object.keys(asked)) varInit[k] = 0.15

  const userEntries = input.entries
  // una sola vez, y con lo aprendido del mazo; `null` = no se sabe (recog no lo reintenta por cada obra)
  const birthYear = input.profile?.birthYear ?? inferBirthYear(userEntries, items, input.deckLearn)
  const ctx: RecogContext = {
    user: input.profile ?? { country: 'ES', lang: 'es' },
    entries: userEntries,
    items,
    deckLearn: input.deckLearn,
    friends: input.friends,
    doubtfulItems: input.doubtfulItems,
    birthYear,
  }
  const recogMap: Record<string, number> = {}
  for (const it of items) if (it.type === input.shelf && !it.hidden) recogMap[it.id] = isOwnEntry(userEntries[it.id], input, it.id) ? 1 : recog(it, ctx)

  let st: Decide2State = {
    version: 2,
    shelf: input.shelf,
    answers: input.answers,
    pool,
    base,
    keys: [],
    idx: {},
    mu: new Float64Array(0),
    cov: new Float64Array(0),
    muInit: { ...asked },
    varInit,
    asked: Object.keys(asked).filter((k) => asked[k] > 0 && DIRECT_ASKED.has(k)),
    recogMap,
    leaders: [],
    duels: [],
    shown: [],
    rejected: [],
    round: 1,
    duelsInRound: 0,
    preferFameOrOwn: false,
    doubtfulItems: old.doubtfulItems ?? {},
    passedItems: old.passedItems ?? {},
    input: rest,
    catalog: items,
    byId: new Map(items.map((it) => [it.id, it])),
  }
  const hist = historyTraits(st, items)
  for (const [k, v] of Object.entries(hist)) if (!(k in asked)) st.muInit[k] = v
  // lo aprendido en tus sesiones anteriores (con olvido): suma, sin pasar de ±1,2
  for (const [k, v] of Object.entries(input.tasteMemory ?? {})) {
    if (k in asked) continue
    st.muInit[k] = Math.max(-1.2, Math.min(1.2, (st.muInit[k] ?? 0) + v))
  }
  // el espacio denso siempre activo: así el gusto por «cercanía» se correlaciona con los rasgos desde el principio
  const dense = (featsOf(st, items, pool[0] ?? '').keys ?? []).filter(isEmbKey)
  st = activate(st, dense)
  return st
}

function isOwnEntry(e: DecideInput['entries'][string] | undefined, input: Pick<DecideInput, 'rankings' | 'shelf'>, id: string): boolean {
  return Boolean(e?.status === 'seen' || e?.stars != null || (e?.cmp ?? 0) > 0 || e?.ranked === true || input.rankings?.[input.shelf]?.includes(id))
}

/* ----------------------------------------------------------------------------- duelos */

const tierOf = (it: Item): number => {
  if (typeof it.fameTier === 'number') return it.fameTier
  const notVal = typeof it.notoriety === 'number' ? it.notoriety : ((it.notoriety as Record<string, number> | undefined)?.ES ?? 0)
  if (notVal >= 0.8 || (it.popularity != null && it.popularity >= 65)) return 1
  if (notVal >= 0.5 || (it.popularity != null && it.popularity >= 40)) return 2
  return 3
}

/** Duelos de la primera ronda según el tamaño de la bolsa: con 300 candidatas, hasta 6; con 6, 2. */
export function duelBudget(st: Decide2State): { min: number; max: number } {
  const n = Math.max(1, st.pool.length - st.rejected.length)
  if (st.round > 1) return { min: 1, max: 3 }
  const max = Math.max(2, Math.min(6, Math.ceil(Math.log2(n)) - 2))
  return { min: n <= 6 ? 1 : 2, max }
}

/** Un rasgo raro en la bolsa (pocas candidatas lo tienen) cuenta al menos esto: si te encanta, decide la propuesta. */
const PROBE_FLOOR = 0.3
/** Varianza previa a partir de la cual un rasgo es «decisivo» y se tantea una vez por sesión (cooperativo 3, no ficción 1,2). */
const DECISIVE_VAR = 1.2

const strict = (a: Answers) => a.seen === 'vista' || a.source === 'pendientes'

/** Peso de cada rasgo según cuánto parte la bolsa: 1 si la mitad de las buenas lo tienen, 0 si ninguna o todas. */
function splitWeights(st: Decide2State, items: Item[], top: { id: string; u: number }[]): Map<string, number> {
  const m = new Map<string, number>()
  const head = top.slice(0, 60)
  const maxU = head[0]?.u ?? 0
  let total = 0
  for (const c of head) {
    const w = Math.exp(Math.min(0, c.u - maxU) / 1.5)
    total += w
    const f = featsOf(st, items, c.id)
    f.keys.forEach((k) => { if (!isEmbKey(k)) m.set(k, (m.get(k) ?? 0) + w) })
  }
  const out = new Map<string, number>()
  for (const [k, w] of m) { const p = w / (total || 1); out.set(k, 4 * p * (1 - p)) }
  return out
}

interface ScoredPair { a: Item; b: Item; score: number; kg: number; p: number; probe?: boolean }
const pairMemo = new WeakMap<Decide2State, ScoredPair[]>()

/** Todas las parejas candidatas puntuadas (memorizado por estado: la parada y el duelo usan el mismo cálculo). */
function scorePairs(st: Decide2State, shownIds: Set<string>, rng: () => number): ScoredPair[] {
  const extra = [...shownIds].some((id) => !st.shown.includes(id))
  const hit = !extra ? pairMemo.get(st) : undefined
  if (hit) return hit
  const list = scorePairsRaw(st, shownIds, rng)
  if (!extra) pairMemo.set(st, list)
  return list
}

export function nextDuel(st: Decide2State, _items: Item[], shownIds: Set<string> = new Set(), rng = Math.random): DuelPair | null {
  const isOwn = (it: Item) => isOwnEntry(st.input.entries[it.id], st.input, it.id)
  const n = st.duels.length
  const best = scorePairs(st, shownIds, rng).slice(0, 3)
  if (!best.length) return null
  // el tanteo de un rasgo decisivo va siempre; si no, una de las 3 mejores, para variar
  const chosen = best[0].probe ? best[0] : best[Math.floor(rng() * best.length)]
  const [first, second] = rng() < 0.5 ? [chosen.a, chosen.b] : [chosen.b, chosen.a]
  return {
    a: first,
    b: second,
    phase: n < 2 ? 'F1' : 'F2',
    infoGain: Math.round(chosen.kg * 100) / 100,
    rA: st.recogMap[first.id],
    rB: st.recogMap[second.id],
    tierA: tierOf(first),
    tierB: tierOf(second),
    isOwnA: isOwn(first),
    isOwnB: isOwn(second),
  }
}

const phasesOn = (shelf: string) => (PARAMS.PHASES_SHELVES as string[]).includes(shelf)

/** Fase de reconocibilidad de los orientadores (PLAN_DECIDIR M3): 1 = F1 (seguro que las conoce), 2 = F2, 3 = F3. */
export function orienterPhase(st: Pick<Decide2State, 'duels' | 'round' | 'preferFameOrOwn'>): 1 | 2 | 3 {
  if (st.preferFameOrOwn) return 1
  if (st.round > 1) return 3
  return st.duels.length < PARAMS.PHASE_F1_DUELS ? 1 : 2
}

/**
 * Orientadores posibles cuando la bolsa no es estricta. F1 = propias, o nivel 1 con R ≥ 0,8; F2 = F1 + nivel ≤ 2 con
 * R ≥ 0,65; F3 = F2 + nivel 3 con R ≥ 0,55; nunca nivel 4 salvo propias. Si el conjunto de la fase tiene menos de
 * PHASE_MIN_SET obras, se completa con las de mayor R del siguiente (y de ahí al siguiente).
 */
function phaseCandidates(st: Decide2State, items: Item[], shown: Set<string>, isExpansion: (it: Item) => boolean, isOwn: (it: Item) => boolean): Item[] {
  const phase = orienterPhase(st)
  // fase mínima en la que cada obra entra (1-3); las que no entran en ninguna, fuera
  const byLevel: Item[][] = [[], [], [], []]
  for (const it of items) {
    if (it.type !== st.shelf || it.hidden || shown.has(it.id) || st.rejected.includes(it.id)) continue
    if (isExpansion(it) && !isOwn(it)) continue
    let lv = 0
    if (isOwn(it)) lv = 1
    else {
      const r = st.recogMap[it.id] ?? 0
      const tier = tierOf(it)
      if (tier === 1 && r >= PARAMS.PHASE_F1_R) lv = 1
      else if (tier <= PARAMS.PHASE_F2_MAX_TIER && r >= PARAMS.PHASE_F2_R) lv = 2
      else if (tier <= PARAMS.PHASE_F3_MAX_TIER && r >= PARAMS.PHASE_F3_R) lv = 3
    }
    if (lv) byLevel[lv].push(it)
  }
  const out: Item[] = []
  for (let lv = 1; lv <= phase; lv++) out.push(...byLevel[lv])
  for (let lv = phase + 1; lv <= 3 && out.length < PARAMS.PHASE_MIN_SET; lv++) {
    const extra = [...byLevel[lv]].sort((a, b) => (st.recogMap[b.id] ?? 0) - (st.recogMap[a.id] ?? 0))
    out.push(...extra.slice(0, PARAMS.PHASE_MIN_SET - out.length))
  }
  return out
}

function scorePairsRaw(st: Decide2State, shownIds: Set<string>, rng: () => number): ScoredPair[] {
  const items = st.catalog
  const byId = st.byId
  const shown = new Set([...st.shown, ...shownIds])
  const { entries } = st.input
  const isOwn = (it: Item) => isOwnEntry(entries[it.id], st.input, it.id)
  const recentIds = new Set((st.input.recentOrienters ?? []).flat())

  const order = ranked(st, items, byId)
  const split = splitWeights(st, items, order)
  const n = st.duels.length

  // Quién puede salir: de sus vistas o guardadas, la propia bolsa (las conoce); si busca nuevas, obras propias o
  // muy conocidas. En los 3 primeros duelos, solo propias o de nivel 1.
  const baseTitles = new Set(items.filter((it) => it.type === st.shelf && !it.title.includes(':')).map(familyKey))
  const isExpansion = (it: Item) => st.shelf === 'boardgame' && it.title.includes(':') && baseTitles.has(familyKey(it))
  let cands: Item[]
  let followUp: { item: Item; keys: string[] } | null = null
  if (strict(st.answers)) {
    cands = st.pool.map((id) => byId.get(id)!).filter((it) => it && !shown.has(it.id) && !st.rejected.includes(it.id))
  } else {
    if (!phasesOn(st.shelf)) {
      // series y juegos: filtro de antes de M3 (Igor, 20/11/2026)
      cands = items.filter((it) => {
        if (it.type !== st.shelf || it.hidden || shown.has(it.id) || st.rejected.includes(it.id)) return false
        if (isExpansion(it) && !isOwn(it)) return false
        if (isOwn(it)) return true
        const r = st.recogMap[it.id] ?? 0
        const tier = tierOf(it)
        if (tier >= 4 || r < 0.55) return false
        if ((n < 3 || st.preferFameOrOwn) && tier !== 1) return false
        return true
      })
    } else cands = phaseCandidates(st, items, shown, isExpansion, isOwn)
    // Seguimiento del tanteo (Igor, 20/11/2026): si en el último duelo eligió la obra que tenía un rasgo decisivo (cooperativo…)
    // y la otra no, el duelo siguiente puede usar otra obra con ese rasgo aunque quede fuera del conjunto de la fase:
    // la de mayor R, nunca de nivel 4 y nunca una ya enseñada. Solo ese duelo; el conjunto de la fase no se abre más.
    const last = st.duels[st.duels.length - 1]
    if (phasesOn(st.shelf) && last && last.winner) {
      const kw = featsOf(st, items, last.winner).keys, kl = new Set(featsOf(st, items, last.a === last.winner ? last.b : last.a).keys)
      const ks = kw.filter((k) => !isEmbKey(k) && !k.startsWith("k:") && priorVar(k) >= DECISIVE_VAR && !kl.has(k))
      if (ks.length) {
        const inSet = new Set(cands.map((it) => it.id))
        let bestF: Item | null = null
        for (const it of items) {
          if (it.type !== st.shelf || it.hidden || shown.has(it.id) || st.rejected.includes(it.id) || inSet.has(it.id) || tierOf(it) >= 4) continue
          if (isExpansion(it) && !isOwn(it)) continue
          const ik = featsOf(st, items, it.id).keys
          if (!ks.some((k) => ik.includes(k))) continue
          if (!bestF || (st.recogMap[it.id] ?? 0) > (st.recogMap[bestF.id] ?? 0)) bestF = it
        }
        if (bestF) { cands.push(bestF); followUp = { item: bestF, keys: ks } }
      }
    }
  }
  if (cands.length < 2) return []

  // Atajo: los más reconocibles y los más cercanos a las candidatas que van ganando (para afinar entre ellas)
  const rot = (it: Item) => (recentIds.has(it.id) ? 0.5 : 1)
  const rScore = new Map(cands.map((it) => [it.id, (st.recogMap[it.id] ?? 0) * rot(it) * (0.85 + 0.3 * rng())]))
  const byRAll = [...cands].sort((a, b) => rScore.get(b.id)! - rScore.get(a.id)!)
  const byR = byRAll.slice(0, 26)
  const uScore = n === 0 ? null : new Map(cands.map((it) => [it.id, utility(st, items, it.id)]))
  const byU = uScore ? [...cands].sort((a, b) => uScore.get(b.id)! - uScore.get(a.id)!).slice(0, 14) : []
  // Tanteo de rasgos: para los rasgos que más podrían decidir y aún no sabemos (incertidumbre × presencia en la bolsa),
  // la obra más conocida que lo tenga. Sin esto, un rasgo raro (16 cooperativos de 300) no salía nunca en un duelo y no
  // se podía aprender aunque fuera lo único que le importa.
  // Rasgos de TODA la bolsa, no solo de las 60 mejores: si no, un rasgo raro que no llega a ese corte (los cooperativos
  // cuando entraron los clásicos españoles) no se tanteaba nunca.
  const poolTraits = new Set<string>(split.keys())
  for (const id of st.pool) for (const k of featsOf(st, items, id).keys) if (!isEmbKey(k) && !k.startsWith('k:')) poolTraits.add(k)
  const probeTraits = [...poolTraits]
    .map((k) => ({ k, w: quad(st, new Map([[k, 1]])) * Math.max(split.get(k) ?? 0, PROBE_FLOOR) }))
    .sort((a, b) => b.w - a.w)
    .slice(0, 8)
  const probes: Item[] = []
  for (const { k } of probeTraits) {
    const holder = byRAll.find((it) => featsOf(st, items, it.id).keys.includes(k) && !probes.includes(it))
    if (holder) probes.push(holder)
  }
  const shortlist = [...new Map([...byR, ...byU, ...probes].map((it) => [it.id, it])).values()]

  // Candidatas que la pareja podría mover: las 30 mejores y, de cada rasgo por tantear, las dos mejores que lo tienen
  const decIds = new Set(order.slice(0, 30).map((c) => c.id))
  for (const { k } of probeTraits) {
    let added = 0
    for (const c of order) {
      if (added >= 2) break
      if (featsOf(st, items, c.id).keys.includes(k)) { decIds.add(c.id); added++ }
    }
  }
  const uOf = new Map(order.map((c) => [c.id, c.u]))
  const decList = [...decIds]
  const decU = decList.map((id) => uOf.get(id) ?? 0)
  const bestU = Math.max(...decU)
  // Lo que cambia el descuento de «ya la has visto» de una candidata que sale en el duelo (M1): si gana, casi seguro la
  // ha visto. Sin esto, el motor valoraba duelos que suben a una candidata por sus propios rasgos y luego la descarta.
  const nov = novelty(st)
  const decIdx = new Map(decList.map((id, c) => [id, c]))
  const dOfShort = shortlist.map((it) => decIdx.get(it.id) ?? -1)
  const winD = shortlist.map((it, i) => (nov && dOfShort[i] >= 0 ? noveltyDelta(st, nov, it.id, true) : 0))
  const loseD = shortlist.map((it, i) => (nov && dOfShort[i] >= 0 ? noveltyDelta(st, nov, it.id, false) : 0))

  // Todo lo que sigue es lineal en los rasgos (Σ·(a − b) = Σ·a − Σ·b), así que se calcula una vez por obra y no por
  // pareja: antes cada una de las ~1.100 parejas recorría la covarianza entera y hacía miles de búsquedas en mapas
  // (REVISION_MOTORES A3). Los números son los mismos salvo redondeo.
  const kAct = st.keys.length
  const colOfKey = new Map<string, number>()
  st.keys.forEach((key, i) => colOfKey.set(key, i))
  const meanCol: number[] = Array.from(st.mu)
  const varCol: number[] = new Array(kAct).fill(0) // la de los rasgos activos está en `cov`
  const pack = (id: string): { cols: Int32Array; vals: Float64Array } => {
    const f = featsOf(st, items, id)
    const acc = new Map<number, number>() // un rasgo repetido en la ficha suma, como en `diff`
    for (let q = 0; q < f.keys.length; q++) {
      const key = f.keys[q]
      let c = colOfKey.get(key)
      if (c === undefined) {
        c = colOfKey.size
        colOfKey.set(key, c)
        meanCol.push(st.muInit[key] ?? 0)
        varCol.push(varOf(st, key))
      }
      acc.set(c, (acc.get(c) ?? 0) + f.vals[q])
    }
    return { cols: Int32Array.from(acc.keys()), vals: Float64Array.from(acc.values()) }
  }
  const sp = shortlist.map((it) => pack(it.id))
  const dp = decList.map(pack)
  const nCols = colOfKey.size
  const nS = shortlist.length
  // S[i] = Σ·rasgos(i), M[i] = μ·rasgos(i)
  const S: Float64Array[] = []
  const M = new Float64Array(nS)
  for (let i = 0; i < nS; i++) {
    const { cols, vals } = sp[i]
    const s = new Float64Array(nCols)
    const actJ: number[] = []
    const actV: number[] = []
    let mi = 0
    for (let q = 0; q < cols.length; q++) {
      const c = cols[q]
      mi += meanCol[c] * vals[q]
      if (c < kAct) { actJ.push(c); actV.push(vals[q]) } else s[c] = varCol[c] * vals[q]
    }
    if (actJ.length) {
      for (let r = 0; r < kAct; r++) {
        let x = 0
        const row = r * kAct
        for (let q = 0; q < actJ.length; q++) x += st.cov[row + actJ[q]] * actV[q]
        s[r] = x
      }
    }
    S.push(s)
    M[i] = mi
  }
  const dotS = (f: { cols: Int32Array; vals: Float64Array }, s: Float64Array) => {
    let x = 0
    for (let q = 0; q < f.cols.length; q++) x += s[f.cols[q]] * f.vals[q]
    return x
  }
  // Q[i][j] = rasgos(i)·Σ·rasgos(j) (entre las de la lista corta) y C[c][j] = rasgos(candidata c)·Σ·rasgos(j)
  const Q = new Float64Array(nS * nS)
  for (let i = 0; i < nS; i++) for (let j = 0; j < nS; j++) Q[i * nS + j] = dotS(sp[i], S[j])
  const nD = dp.length
  const C = new Float64Array(nD * nS)
  for (let c = 0; c < nD; c++) for (let j = 0; j < nS; j++) C[c * nS + j] = dotS(dp[c], S[j])
  // familia (saga, expansión o mismo autor), una vez por obra
  const fam = shortlist.map((it) => familyKey(it))
  const creators = shortlist.map((it) => (it.creator ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean))
  const related = (i: number, j: number) => {
    const ka = fam[i]
    const kb = fam[j]
    if (ka && kb && (ka === kb || ka.startsWith(kb + ' ') || kb.startsWith(ka + ' '))) return true
    return creators[i].some((x) => creators[j].includes(x))
  }
  // para contar en cuántos rasgos difieren dos obras sin construir el mapa de la diferencia
  const valA = new Float64Array(nCols)
  const stampA = new Int32Array(nCols).fill(-1)

  const best: ScoredPair[] = []
  for (let i = 0; i < nS; i++) {
    const fa = sp[i]
    let sizeA = 0
    for (let q = 0; q < fa.cols.length; q++) {
      valA[fa.cols[q]] = fa.vals[q]
      stampA[fa.cols[q]] = i
      if (Math.abs(fa.vals[q]) >= 1e-9) sizeA++
    }
    for (let j = i + 1; j < nS; j++) {
      const a = shortlist[i]
      const b = shortlist[j]
      if (related(i, j)) continue
      const fb = sp[j]
      let dSize = sizeA
      for (let q = 0; q < fb.cols.length; q++) {
        const c = fb.cols[q]
        const vb = fb.vals[q]
        if (stampA[c] === i) dSize += (Math.abs(valA[c] - vb) >= 1e-9 ? 1 : 0) - (Math.abs(valA[c]) >= 1e-9 ? 1 : 0)
        else if (Math.abs(vb) >= 1e-9) dSize++
      }
      if (!dSize) continue
      // Valor de la información para la decisión (gradiente de conocimiento): según cuál elija, cuánto sube la mejor
      // propuesta posible. Recoge a la vez que el resultado sea incierto, que toque rasgos que no sabemos, que esos
      // rasgos importen a las candidatas (aunque sean pocas, como los cooperativos) y las correlaciones (el tanteo).
      const m = M[i] - M[j]
      const s2 = Q[i * nS + i] - Q[i * nS + j] - Q[j * nS + i] + Q[j * nS + j]
      const c = Math.sqrt(TUNE.noise + s2)
      const t = m / c
      const p = Phi(t)
      const stepA = phi(t) / Math.max(1e-12, p) / c // si elige a
      const stepB = phi(t) / Math.max(1e-12, 1 - p) / c // si elige b
      let maxA = -Infinity
      let maxB = -Infinity
      const di = dOfShort[i]
      const dj = dOfShort[j]
      for (let cand = 0; cand < nD; cand++) {
        const sc = C[cand * nS + i] - C[cand * nS + j]
        let ua = decU[cand] + sc * stepA
        let ub = decU[cand] - sc * stepB
        if (cand === di) { ua += winD[i]; ub += loseD[i] } else if (cand === dj) { ua += loseD[j]; ub += winD[j] }
        maxA = Math.max(maxA, ua)
        maxB = Math.max(maxB, ub)
      }
      const kg = p * maxA + (1 - p) * maxB - bestU
      const rr = (st.recogMap[a.id] ?? 0.8) * (st.recogMap[b.id] ?? 0.8)
      const known = (phasesOn(st.shelf) ? rr : Math.sqrt(rr)) * rot(a) * rot(b)
      // al principio, parejas muy distintas (muchos rasgos en juego)
      const far = n < 3 ? 1 + Math.min(1, dSize / 25) : 1
      best.push({ a, b, score: Math.max(0, kg) * known * far, kg: Math.max(0, kg), p })
    }
  }
  best.sort((x, y) => y.score - x.score)

  // Tanteo de rasgos decisivos (Igor, 27/10/2026): un rasgo que por sí solo cambia la experiencia (cooperativo, no
  // ficción) se pone a prueba una vez por sesión si lo tienen al menos 3 candidatas y aún no ha salido en ningún duelo.
  // El valor de la información solo mira un duelo y, con un rasgo raro y obras poco conocidas, nunca lo elegía: un
  // duelo no basta para que un cooperativo adelante a la favorita, aunque tres seguidos sí.
  const poolCount = (k: string) => st.pool.reduce((s, id) => s + (featsOf(st, items, id).keys.includes(k) ? 1 : 0), 0)
  const decisive = [...poolTraits].filter((k) => priorVar(k) >= DECISIVE_VAR && !(k in st.idx) && poolCount(k) >= 3)
  for (const k of decisive) {
    const probe = best.find((x) => {
      const fa = featsOf(st, items, x.a.id).keys.includes(k)
      const fb = featsOf(st, items, x.b.id).keys.includes(k)
      return fa !== fb
    })
    if (probe && best.length) {
      probe.score = best[0].score * 1.01 + 1e-6
      probe.probe = true
      best.sort((x, y) => y.score - x.score)
      break
    }
  }
  if (followUp && best.length) {
    const f = followUp
    const pr = best.find((x) => (x.a.id === f.item.id) !== (x.b.id === f.item.id) &&
      f.keys.some((k) => featsOf(st, items, x.a.id).keys.includes(k) !== featsOf(st, items, x.b.id).keys.includes(k)))
    if (pr && pr !== best[0]) {
      pr.score = best[0].score * 1.01 + 1e-6
      pr.probe = true
      best.sort((x, y) => y.score - x.score)
    }
  }
  return best
}

export function applyDuelChoice(st: Decide2State, winner: Item, loser: Item, _itemsById?: Map<string, Item>, ms?: number, _dimension?: string): Decide2State {
  const d = diff(featsOf(st, st.catalog, winner.id), featsOf(st, st.catalog, loser.id))
  const next = observe(st, d)
  const out: Decide2State = {
    ...next,
    duels: [...st.duels, { a: winner.id, b: loser.id, winner: winner.id, ...(ms != null ? { ms } : {}) }],
    shown: [...new Set([...st.shown, winner.id, loser.id])],
    duelsInRound: st.duelsInRound + 1,
  }
  out.leaders = [...st.leaders, ranked(out, st.catalog, st.byId)[0]?.id ?? '']
  return out
}

/** «Pasar»: no enseña nada del gusto; la obra pasada dos veces queda dudosa y los siguientes duelos van a lo seguro. */
export function skipDuelUnknown(st: Decide2State, a: Item, b: Item, ms?: number, _dimension?: string): Decide2State {
  const passed = { ...st.passedItems }
  const doubtful = { ...st.doubtfulItems }
  let became = false
  for (const id of [a.id, b.id]) {
    passed[id] = (passed[id] ?? 0) + 1
    if (passed[id] >= PASSES_FOR_DOUBTFUL) { doubtful[id] = Date.now(); became = true }
  }
  const recogMap = { ...st.recogMap }
  for (const id of [a.id, b.id]) if (doubtful[id]) recogMap[id] = (recogMap[id] ?? 0.6) * 0.5
  return {
    ...st,
    recogMap,
    doubtfulItems: doubtful,
    passedItems: passed,
    preferFameOrOwn: st.preferFameOrOwn || became,
    duels: [...st.duels, { a: a.id, b: b.id, winner: null, unknown: true, ...(ms != null ? { ms } : {}) }],
    shown: [...new Set([...st.shown, a.id, b.id])],
    duelsInRound: st.duelsInRound + 1,
  }
}

/* ----------------------------------------------------------------------------- cuándo proponer */

export function shouldPropose(st: Decide2State): boolean {
  const all = st.catalog
  const { min, max } = duelBudget(st)
  const answered = st.duelsInRound > 0 ? st.duels.slice(-st.duelsInRound).filter((d) => d.winner).length : 0
  const left = st.pool.length - st.rejected.length
  if (left <= 1) return true
  if (st.duelsInRound >= max + 1) return true // los «Pasar» cuentan poco, pero no se alarga sin fin
  if (answered >= max) return true
  if (answered < min) return false
  const order = ranked(st, all, st.byId)
  if (order.length < 2) return true
  // la misma primera en los últimos duelos: los siguientes ya no la mueven
  const recent = st.leaders.slice(-TUNE.stable)
  const steady = recent.length >= TUNE.stable && recent.every((id) => id === order[0].id)
  // y el mejor duelo posible apenas mejoraría la propuesta (valor de la información)
  return steady && bestKG(st) < TUNE.stopKG
}

/** Lo que más podría mejorar la propuesta el mejor duelo que queda (en las mismas unidades que la utilidad). */
export function bestKG(st: Decide2State): number {
  const pairs = scorePairs(st, new Set(), () => 0.5)
  return pairs.reduce((m, x) => Math.max(m, x.kg), 0)
}

/** Para el banco de pruebas: cuánto destaca hoy la primera (z frente a la sexta). */
export function leaderZ(st: Decide2State): number {
  const order = ranked(st, st.catalog, st.byId)
  if (order.length < 2) return 99
  const k = Math.min(order.length - 1, 5)
  const d = diff(featsOf(st, st.catalog, order[0].id), featsOf(st, st.catalog, order[k].id))
  return (order[0].u - order[k].u) / Math.sqrt(quad(st, d) + 0.25)
}

/* ----------------------------------------------------------------------------- propuesta */

export function getProposal(st: Decide2State, _itemsById: Map<string, Item> | null, friends: DecideInput['friends'], _profile?: unknown): DecideProposal | null {
  const items = st.catalog
  const itemsById = st.byId
  const order = ranked(st, items, itemsById)
  if (!order.length) return null
  const top = itemsById.get(order[0].id)!

  // Alternativas variadas: cada una, la mejor que no sea casi igual a las ya elegidas
  const chosen: Item[] = [top]
  const vecs = new Map<string, Sparse>()
  const sv = (id: string) => vecs.get(id) ?? (vecs.set(id, toSparse(featsOf(st, items, id))), vecs.get(id)!)
  const cos = (x: Sparse, y: Sparse) => {
    let s = 0, nx = 0, ny = 0
    for (const [k, v] of x) { nx += v * v; s += v * (y.get(k) ?? 0) }
    for (const v of y.values()) ny += v * v
    return s / (Math.sqrt(nx * ny) || 1)
  }
  const restIds = order.slice(1, 40)
  while (chosen.length < 11 && restIds.length) {
    let bestI = 0
    let bestS = -Infinity
    restIds.forEach((c, i) => {
      const it = itemsById.get(c.id)!
      const near = Math.max(...chosen.map((x) => cos(sv(x.id), sv(c.id))))
      const s = c.u - 1.2 * Math.max(0, near - 0.6) - (chosen.some((x) => familyKey(x) === familyKey(it)) ? 1 : 0)
      if (s > bestS) { bestS = s; bestI = i }
    })
    chosen.push(itemsById.get(restIds[bestI].id)!)
    restIds.splice(bestI, 1)
  }

  return {
    item: top,
    finalScore: Math.round(order[0].u * 100) / 100,
    reasons: reasonsFor(st, items, top, friends),
    fromFriends: false,
    alternatives: chosen.slice(1),
  }
}

/** De 1 a 2 motivos con lo que de verdad ha pesado: lo pedido en las preguntas y lo aprendido en los duelos. */
export function reasonsFor(st: Decide2State, items: Item[], it: Item, friends: DecideInput['friends']): string[] {
  const space = traitSpace(st.shelf, items)
  const f = featsOf(st, items, it.id)
  const asked: string[] = []
  const learned: { label: string; w: number }[] = []
  for (const k of f.keys) {
    if (isEmbKey(k)) continue
    const label = traitLabel(space, k)
    if (!label) continue
    if (st.asked.includes(k)) asked.push(label)
    else if (k in st.idx && meanOf(st, k) >= 0.5) learned.push({ label, w: meanOf(st, k) })
  }
  learned.sort((a, b) => b.w - a.w)
  const out: string[] = []
  if (asked.length) out.push(`${cap(asked[0])}, como pediste`)
  const l = learned.slice(0, asked.length ? 1 : 2).map((x) => x.label)
  if (l.length) out.push(`Porque elegiste ${l.join(' y ')}`)
  for (const fr of friends) {
    const pct = st.input.friendPct(fr, it.id)
    if (pct != null && pct >= 80) { out.push(`A ${fr.name} le encanta`); break }
  }
  if (!out.length) out.push(st.duels.length ? 'La que más se parece a lo que has elegido' : 'De las mejor valoradas que encajan')
  return out.slice(0, 2)
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** «Seguir buscando»: la rechazada pierde contra lo típico de las demás buenas (con más ruido que un duelo). */
export function rejectAndContinue(st: Decide2State, rejectedId: string): Decide2State {
  const all = st.catalog
  let next: Decide2State = { ...st, rejected: [...st.rejected, rejectedId], round: st.round + 1, duelsInRound: 0, leaders: [] }
  {
    const others = ranked(next, all, st.byId).slice(0, 10)
    if (others.length) {
      const avg: Sparse = new Map()
      for (const o of others) {
        const fo = featsOf(next, all, o.id)
        fo.keys.forEach((k, i) => avg.set(k, (avg.get(k) ?? 0) + fo.vals[i] / others.length))
      }
      const fr = toSparse(featsOf(next, all, rejectedId))
      const d: Sparse = new Map(avg)
      for (const [k, v] of fr) d.set(k, (d.get(k) ?? 0) - v)
      next = observe(next, d, 2.5)
    }
  }
  return next
}

/** Lo aprendido en los duelos de esta sesión (solo rasgos legibles que se han puesto a prueba), para recordarlo. */
export function sessionTaste(st: Decide2State): Record<string, number> {
  const out: Record<string, number> = {}
  const tested = new Set<string>()
  for (const d of st.duels) {
    if (!d.winner) continue
    for (const id of [d.a, d.b]) for (const k of featsOf(st, st.catalog, id).keys) if (!isEmbKey(k)) tested.add(k)
  }
  for (const k of tested) {
    if (st.asked.includes(k)) continue
    const learned = meanOf(st, k) - (st.muInit[k] ?? 0)
    if (Math.abs(learned) >= 0.1) out[k] = Math.round(learned * 100) / 100
  }
  return out
}

/** Para los tests y las métricas: peso aprendido de un rasgo. */
export function traitWeight(st: Decide2State, key: string): number {
  return meanOf(st, key)
}
