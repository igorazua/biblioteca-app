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
 * principio; rotación de orientadores entre sesiones; «Pasar» no descarta; un orientador puede acabar siendo la propuesta.
 */

import type { Item, ShelfType } from '../../types'
import {
  initDecideSession as initPool,
  loadPassedItems,
  savePassedItems,
  saveDoubtfulItems,
  sameFamily,
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

export type { Answers, DecideInput, DecideProposal, DuelPair }

/** Ajustes del motor, medidos con el banco de pruebas (`decide2.sim.test.ts`). */
export const TUNE = {
  /** ruido de una respuesta: con 1, un rasgo de peso 1 gana su duelo el 76 % de las veces */
  noise: 1.0,
  /** peso de la puntuación previa (calidad, amigos, tendencia, pendientes) frente al gusto aprendido */
  baseW: 0.8,
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

/** Σ·d como mapa disperso: filas de los rasgos activos (correlacionados) y varianza previa para los demás. */
function sigmaTimes(st: Decide2State, d: Sparse): Sparse {
  const k = st.keys.length
  const g: Sparse = new Map()
  const act: [number, number][] = []
  for (const [key, v] of d) {
    const i = st.idx[key]
    if (i === undefined) g.set(key, varOf(st, key) * v)
    else act.push([i, v])
  }
  if (act.length) {
    for (let r = 0; r < k; r++) {
      let s = 0
      for (const [j, v] of act) s += st.cov[r * k + j] * v
      if (s) g.set(st.keys[r], (g.get(st.keys[r]) ?? 0) + s)
    }
  }
  return g
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

function ranked(st: Decide2State, items: Item[], byId: Map<string, Item>): { id: string; u: number }[] {
  const rejected = st.rejected.map((id) => byId.get(id)).filter(Boolean) as Item[]
  return st.pool
    .filter((id) => {
      if (st.rejected.includes(id)) return false
      const it = byId.get(id)
      // tras «Seguir buscando», ni su secuela ni su expansión
      return it ? !rejected.some((r) => familyKey(r) === familyKey(it)) : false
    })
    .map((id) => ({ id, u: utility(st, items, id) }))
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
  const old = initPool(input)
  const pool = old.pool
  const logs = pool.map((id) => Math.log(Math.max(1e-6, old.prior[id] ?? 1e-6)))
  const mean = logs.reduce((s, x) => s + x, 0) / (logs.length || 1)
  const base: Record<string, number> = {}
  pool.forEach((id, i) => { base[id] = logs[i] - mean })

  const { items, ...rest } = input
  const asked = askedTraits(input.shelf, input.answers)
  const varInit: Record<string, number> = {}
  for (const k of Object.keys(asked)) varInit[k] = 0.15

  const userEntries = input.entries
  const birthYear = input.profile?.birthYear ?? inferBirthYear(userEntries, items) ?? undefined
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
  if (strict(st.answers)) {
    cands = st.pool.map((id) => byId.get(id)!).filter((it) => it && !shown.has(it.id) && !st.rejected.includes(it.id))
  } else {
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
  const dec = [...decIds].map((id) => ({ f: featsOf(st, items, id), u: uOf.get(id) ?? 0 }))
  const bestU = Math.max(...dec.map((c) => c.u))

  const best: ScoredPair[] = []
  for (let i = 0; i < shortlist.length; i++) {
    for (let j = i + 1; j < shortlist.length; j++) {
      const a = shortlist[i]
      const b = shortlist[j]
      if (sameFamily(a, b)) continue
      const d = diff(featsOf(st, items, a.id), featsOf(st, items, b.id))
      if (!d.size) continue
      // Valor de la información para la decisión (gradiente de conocimiento): según cuál elija, cuánto sube la mejor
      // propuesta posible. Recoge a la vez que el resultado sea incierto, que toque rasgos que no sabemos, que esos
      // rasgos importen a las candidatas (aunque sean pocas, como los cooperativos) y las correlaciones (el tanteo).
      const g = sigmaTimes(st, d)
      let m = 0
      let s2 = 0
      for (const [k, v] of d) { m += meanOf(st, k) * v; s2 += (g.get(k) ?? 0) * v }
      const c = Math.sqrt(TUNE.noise + s2)
      const t = m / c
      const p = Phi(t)
      const stepA = phi(t) / Math.max(1e-12, p) / c // si elige a
      const stepB = phi(t) / Math.max(1e-12, 1 - p) / c // si elige b
      let maxA = -Infinity
      let maxB = -Infinity
      for (const cand of dec) {
        let sc = 0
        for (let q = 0; q < cand.f.keys.length; q++) sc += (g.get(cand.f.keys[q]) ?? 0) * cand.f.vals[q]
        maxA = Math.max(maxA, cand.u + sc * stepA)
        maxB = Math.max(maxB, cand.u - sc * stepB)
      }
      const kg = p * maxA + (1 - p) * maxB - bestU
      const known = Math.sqrt((st.recogMap[a.id] ?? 0.8) * (st.recogMap[b.id] ?? 0.8)) * rot(a) * rot(b)
      // al principio, parejas muy distintas (muchos rasgos en juego)
      const far = n < 3 ? 1 + Math.min(1, d.size / 25) : 1
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
  const passed = loadPassedItems()
  const doubtful = { ...st.doubtfulItems }
  let became = false
  for (const id of [a.id, b.id]) {
    passed[id] = (passed[id] ?? 0) + 1
    if (passed[id] >= PASSES_FOR_DOUBTFUL) { doubtful[id] = Date.now(); became = true }
  }
  savePassedItems(passed)
  if (became) saveDoubtfulItems(doubtful)
  const recogMap = { ...st.recogMap }
  for (const id of [a.id, b.id]) if (doubtful[id]) recogMap[id] = (recogMap[id] ?? 0.6) * 0.5
  return {
    ...st,
    recogMap,
    doubtfulItems: doubtful,
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

