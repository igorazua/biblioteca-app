import type { Friend, Item, Profile, ShelfType, UserEntry, DeckLearnShelf } from '../../types'
import { PLATFORMS } from '../../config'
import { PARAMS } from './params'
import { MOOD_GENRES, NONFICTION_GENRES } from '../../data/questions'
import { friendRanks } from '../rank'
import { sim as engineSim, vecOf } from './features'
import { recog, type RecogContext } from './recog'
import { computeUserVector, cosineWithUser } from './userVec'
import { getDimensionsForShelf, mapAnswersToPrefs, type Dimension } from './dimensions'

export type Answers = Record<string, string | string[] | undefined>

const DOUBTFUL_STORAGE_KEY = 'biblio_doubtful_items'

export function loadDoubtfulItems(): Record<string, number> {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(DOUBTFUL_STORAGE_KEY) : null
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveDoubtfulItems(items: Record<string, number>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DOUBTFUL_STORAGE_KEY, JSON.stringify(items))
    }
  } catch {
    // ok
  }
}

// «Pasar» (antes «No conozco ninguna»): pasar no descarta. Una obra solo pasa a dudosa (R × 0,5) cuando se ha pasado
// PASSES_FOR_DOUBTFUL veces, contando todas las sesiones (Igor, 23/10).
const PASSES_STORAGE_KEY = 'biblio_passed_items'
export const PASSES_FOR_DOUBTFUL = 2

let passedMem: Record<string, number> = {} // sin almacenamiento (tests, modo privado)

export function loadPassedItems(): Record<string, number> {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(PASSES_STORAGE_KEY) : null
    return raw ? JSON.parse(raw) : { ...passedMem }
  } catch {
    return { ...passedMem }
  }
}

function savePassedItems(items: Record<string, number>): void {
  passedMem = items
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(PASSES_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ok
  }
}

const normTitle = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^(the|el|la|los|las|le) /, '').trim()
/** Clave de familia: el título antes de «:», « - » o «(», sin artículo (Carcassonne, Carcassonne: The Castle → «carcassonne»). */
export function familyKey(it: Item): string {
  return normTitle(it.title.split(/:| - | – |\(/)[0])
}
const creatorsOf = (it: Item) => (it.creator ?? '').split(',').map((c) => c.trim().toLowerCase()).filter(Boolean)
/** Dos obras de la misma familia (misma saga, expansión o mismo autor) no deciden nada enfrentadas. */
export function sameFamily(a: Item, b: Item): boolean {
  const ka = familyKey(a)
  const kb = familyKey(b)
  if (ka && kb && (ka === kb || ka.startsWith(kb + ' ') || kb.startsWith(ka + ' '))) return true
  const cb = new Set(creatorsOf(b))
  return creatorsOf(a).some((c) => cb.has(c))
}

export interface DecideState {
  shelf: ShelfType
  answers: Answers
  pool: string[]                 // candidatas que pasan los filtros (§8.2)
  prior: Record<string, number>  // puntuación previa de cada candidata (§8.3)
  post: Record<string, number>   // probabilidad actual (suma 1)
  pref: Float32Array | null      // vector de gusto de la sesión
  prefAxes: Record<string, number> // dirección en ejes (−1..1 por eje)
  prefs: Record<string, number>  // preferencias explícitas por dimensión (−2..+2, T17 §C.4)
  neutralDims: string[]          // dimensiones donde el usuario se contradijo (no se preguntan más)
  closedDims: string[]           // dimensiones cerradas (|prefs| >= 2)
  phase: 'F1' | 'F2' | 'F3'      // fase de la sesión (T19 §1.2)
  duelsInF1: number              // número de duelos respondidos en F1
  f1OwnDuelCount: number         // contador de duelos con obras propias en F1
  preferFameOrOwn?: boolean      // red de seguridad tras duelo lento (> 6s, T19 §1.3)
  doubtfulItems?: Record<string, number> // obras con latencia > 6s marcadas como dudosas
  duels: {
    a: string
    b: string
    winner: string | null
    phase: 'F1' | 'F2' | 'F3' | 'coarse' | 'fine'
    dimension?: string
    unknown?: boolean
    infoGain?: number
    ms?: number
    rA?: number
    rB?: number
    tierA?: number
    tierB?: number
    isOwnA?: boolean
    isOwnB?: boolean
  }[]
  shown: string[]                // orientadores ya usados (no se repiten)
  rejected: string[]             // propuestas rechazadas con «Seguir buscando»
  round: number
  duelsInRound: number
  profile?: Profile
  entries?: Record<string, UserEntry>
  rankings?: Record<ShelfType, string[]>
  friends?: Friend[]
  deckLearn?: DeckLearnShelf
  recentOrienters?: string[][]
  userVec?: Float32Array | number[] | null
}

export interface DuelPair {
  a: Item
  b: Item
  phase: 'F1' | 'F2' | 'F3' | 'coarse' | 'fine'
  dimension?: string
  infoGain: number
  rA?: number
  rB?: number
  tierA?: number
  tierB?: number
  isOwnA?: boolean
  isOwnB?: boolean
}

export interface DecideProposal {
  item: Item
  finalScore: number
  reasons: string[]
  fromFriends: boolean
  /** las siguientes mejores candidatas, en orden («Ver otras candidatas») */
  alternatives?: Item[]
}

export interface DecideInput {
  shelf: ShelfType
  items: Item[]
  entries: Record<string, UserEntry>
  rankings: Record<ShelfType, string[]>
  profile: Profile
  friends: Friend[]
  answers: Answers
  affinity: (friendId: string) => number | null
  friendPct: (friend: Friend, itemId: string) => number | null
  deckLearn?: DeckLearnShelf
  recentOrienters?: string[][]
  userVec?: Float32Array | number[] | null
  doubtfulItems?: Record<string, number>
}

const asStr = (v: Answers[string]): string | undefined => (typeof v === 'string' ? v : undefined)

/** Comprueba si una obra pasa los filtros duros según respuestas y categoría */
export function passesFilters(it: Item, a: Answers, platforms: string[]): boolean {
  const time = asStr(a.time)
  const era = asStr(a.era)
  const format = asStr(a.format)
  const ep = asStr(a.episode)
  const len = asStr(a.length)
  const kind = asStr(a.kind)
  const players = asStr(a.players)

  if (it.type === 'movie') {
    if (time && time !== 'larga' && (it.durationMin ?? 0) > (time === 'corta' ? 100 : 135)) return false
    if (era === 'reciente' && it.year < 2010) return false
    if (era === 'clasico' && it.year >= 2000) return false
  }
  if (it.type === 'series') {
    const airing = asStr(a.airing)
    if (airing === 'emision' && !it.ongoing) return false
    if (airing === 'terminada' && it.ongoing) return false
    if (format === 'mini' && (it.seasons ?? 99) > 2) return false
    if (format === 'larga' && (it.seasons ?? 99) <= 2) return false
    if (ep === 'corto' && (it.durationMin ?? 0) > 30) return false
    if (ep === 'medio' && (it.durationMin ?? 0) > 50) return false
    if (ep === 'largo' && (it.durationMin ?? 0) <= 50) return false
  }
  if (it.type === 'book') {
    const diff = asStr(a.difficulty)
    if (diff && diff !== 'igual' && it.depth && it.depth !== diff) return false
    if (len && len !== 'larga' && (it.pages ?? 0) > (len === 'corta' ? 250 : 450)) return false
    const nf = it.genres.some((g) => NONFICTION_GENRES.includes(g))
    if (kind === 'ficcion' && nf) return false
    if (kind === 'noficcion' && !nf) return false
  }
  if (it.type === 'boardgame') {
    if (players && players !== 'igual') {
      if (players === '2' && it.players && !it.players.includes('2')) return false
      if (players === 'fiesta' && it.players) {
        const match = it.players.match(/(\d+)/g)
        const maxPlayers = match ? Math.max(...match.map(Number)) : 0
        if (maxPlayers < 5) return false
      }
    }
    if (time && time !== 'igual' && it.durationMin) {
      if (time === 'corta' && it.durationMin > 35) return false
      if (time === 'media' && (it.durationMin < 30 || it.durationMin > 75)) return false
      if (time === 'larga' && it.durationMin < 70) return false
    }
  }
  if (it.type === 'artist') {
    if (era === 'clasico' && it.year > 2005) return false
    if (era === 'actual' && it.year <= 2005) return false
  }

  const allPlatforms = PLATFORMS.length > 0 && PLATFORMS.every((p) => platforms.includes(p))
  if (platforms.length > 0 && !allPlatforms && it.platforms) {
    if (!it.platforms.some((p) => platforms.includes(p))) return false
  }

  return true
}

/** Calcula la similitud híbrida entre dos obras */
export function calcSimilarity(a: Item, b: Item): number {
  if (a.id === b.id) return 1.0

  const creatorMatch = a.creator && b.creator && a.creator === b.creator ? 0.35 : 0
  const commonGenres = a.genres.filter((g) => b.genres.includes(g)).length
  const totalGenres = new Set([...a.genres, ...b.genres]).size
  const jaccardGenres = totalGenres > 0 ? (commonGenres / totalGenres) * 0.40 : 0
  const yearDiff = Math.abs((a.year || 2000) - (b.year || 2000))
  const yearSim = Math.max(0, 1 - yearDiff / 30) * 0.15
  const popDiff = Math.abs(a.popularity - b.popularity) / 100
  const popSim = (1 - popDiff) * 0.10

  return Math.min(1.0, creatorMatch + jaccardGenres + yearSim + popSim)
}

/**
 * Inicializa la sesión de Decidir (§8.2, §8.3, T17 §C.4, T19 §1.2)
 */
export function initDecideSession(input: DecideInput): DecideState {
  const { shelf, items, entries, rankings, profile, friends, answers, affinity, friendPct } = input
  const plats = (answers.platforms as string[]) || profile.platforms || []
  const isRepeat = asStr(answers.seen) === 'vista'
  const source = asStr(answers.source)

  // 1. Filtrar bolsa de candidatas con fallback por niveles (§8.2) — obras ocultas nunca entran
  const poolFilter = (it: Item, checkPlats: boolean) => {
    if (it.hidden) return false
    if (it.type !== shelf) return false
    if (!passesFilters(it, answers, checkPlats ? plats : [])) return false
    const entry = entries[it.id]
    if (isRepeat) {
      return entry?.status === 'seen'
    }
    if (source === 'pendientes') return entry?.status === 'pending'
    if (source === 'nuevas') return !entry
    return !entry || entry.status === 'pending'
  }

  let rawCandidates = items.filter((it) => poolFilter(it, true))
  if (rawCandidates.length < 3 && plats.length > 0) {
    rawCandidates = items.filter((it) => poolFilter(it, false))
  }
  if (rawCandidates.length < 3) {
    rawCandidates = items.filter((it) => it.type === shelf && !it.hidden)
  }

  // 2. Vector de preferencia inicial
  const initialPref = input.userVec
    ? (input.userVec instanceof Float32Array ? new Float32Array(input.userVec) : Float32Array.from(input.userVec))
    : computeUserVector({
        shelf,
        entries,
        ranking: rankings[shelf] || [],
      })

  // 3. Preferencias de dimensiones fijadas desde las respuestas iniciales (T17 §B.2, §C.4)
  const initialPrefs = mapAnswersToPrefs(shelf, answers)
  const initialClosedDims = Object.entries(initialPrefs)
    .filter(([_, v]) => Math.abs(v) >= 2)
    .map(([k]) => k)

  // 4. Puntuación previa (§8.3)
  const prior: Record<string, number> = {}
  const mVotes = PARAMS.Q_PRIOR_VOTES
  const mood = asStr(answers.mood)
  const moodGenres = (mood && MOOD_GENRES[shelf]?.[mood]) || []
  const shelfDimensions = getDimensionsForShelf(shelf)

  for (const it of rawCandidates) {
    const votes = it.voteCount || it.readers || 0
    const rating = (it.voteAvg ? it.voteAvg / 10 : (it.popularity || 50) / 100)
    const qGlobal = (votes * rating + mVotes * 0.65) / (votes + mVotes)

    let qFriendsWeight = 0
    let qFriendsSum = 0
    for (const f of friends) {
      const pct = friendPct(f, it.id)
      if (pct != null) {
        const aff = affinity(f.id) ?? 50
        const wf = (aff / 100)
        qFriendsSum += wf * (pct / 100)
        qFriendsWeight += wf
      }
    }
    const qFriends = qFriendsWeight > 0 ? (qFriendsSum + 2 * qGlobal) / (qFriendsWeight + 2) : qGlobal
    const quality = qFriendsWeight > 0 ? 0.4 * qGlobal + 0.6 * qFriends : qGlobal

    let moodScore = 0.5
    if (moodGenres.length > 0) {
      const matchCount = it.genres.filter((g) => moodGenres.includes(g)).length
      moodScore = Math.min(1.0, matchCount / Math.min(2, moodGenres.length))
    }

    const taste = initialPref ? cosineWithUser(initialPref, shelf, it.id) : 0.5

    const isPending = entries[it.id]?.status === 'pending'
    let boost = isPending ? 0.15 : 0
    if (!boost) {
      for (const f of friends) {
        if ((affinity(f.id) ?? 0) >= 50 && f.entries.some((e) => e.itemId === it.id && e.status === 'pending')) {
          boost = 0.05
          break
        }
      }
    }
    const country = profile.country || 'ES'
    const trendVal = (it.trend as Record<string, number> | undefined)?.[country] ?? 0
    boost += PARAMS.TREND_BOOST * trendVal

    // Ajuste por dimensiones fijadas inicialmente (T17 §C.4)
    let dimMult = 1.0
    for (const dId of initialClosedDims) {
      const p = initialPrefs[dId]
      const d = shelfDimensions.find((x) => x.id === dId)
      if (d) {
        const side = d.side(it)
        const chosenSide = p > 0 ? 'A' : 'B'
        if (side === chosenSide) dimMult *= 1.5
        else if (side !== null) dimMult *= 0.6
      }
    }

    const priorVal = (0.35 * moodScore + 0.25 * taste + 0.40 * quality) * (1 + boost) * dimMult
    prior[it.id] = Math.max(0.0001, priorVal)
  }

  const sortedIds = Object.keys(prior).sort((a, b) => prior[b] - prior[a]).slice(0, 300)
  const pool = sortedIds

  const totalPrior = pool.reduce((sum, id) => sum + prior[id], 0)
  const post: Record<string, number> = {}
  for (const id of pool) {
    post[id] = prior[id] / (totalPrior || 1)
  }

  const doubtful = input.doubtfulItems || loadDoubtfulItems()

  return {
    shelf,
    answers,
    pool,
    prior,
    post,
    pref: initialPref ? new Float32Array(initialPref) : null,
    prefAxes: {},
    prefs: initialPrefs,
    neutralDims: [],
    closedDims: initialClosedDims,
    phase: 'F1',
    duelsInF1: 0,
    f1OwnDuelCount: 0,
    preferFameOrOwn: false,
    doubtfulItems: doubtful,
    duels: [],
    shown: [],
    rejected: [],
    round: 1,
    duelsInRound: 0,
    profile,
    entries,
    rankings,
    friends,
    deckLearn: input.deckLearn,
    recentOrienters: input.recentOrienters,
  }
}

/**
 * Elige la siguiente pareja de orientadores (T17 Partes B y C / T19 §1)
 */
export function nextDuel(
  state: DecideState,
  items: Item[],
  shownIds: Set<string>,
  rng = Math.random
): DuelPair | null {
  const { shelf, pool, post, duels, profile, entries, friends, deckLearn, recentOrienters } = state
  const shown = new Set([...state.shown, ...shownIds])

  const shelfRankings = state.rankings?.[shelf] || []
  const userEntries = entries || {}

  // Determinar si una obra es propia del usuario (vista, valorada, comparada o en su ranking)
  const isOwn = (it: Item): boolean => {
    const e = userEntries[it.id]
    return Boolean(
      e?.status === 'seen' ||
      e?.stars != null ||
      (e?.cmp ?? 0) > 0 ||
      e?.ranked === true ||
      shelfRankings.includes(it.id)
    )
  }

  // Orientadores de la estantería aún no mostrados en la sesión (las obras ocultas no salen en duelos)
  // Las expansiones de un juego del catálogo («Carcassonne: The Castle» si existe «Carcassonne») no orientan: solo si son propias
  const baseTitles = new Set(items.filter((it) => it.type === shelf && !it.title.includes(':')).map((it) => normTitle(it.title)))
  const isExpansion = (it: Item) => shelf === 'boardgame' && it.title.includes(':') && baseTitles.has(familyKey(it))
  const orienters = items.filter((it) => it.type === shelf && !it.hidden && !shown.has(it.id) && (!isExpansion(it) || isOwn(it)))
  if (orienters.length < 2) return null

  // Calcular R para cada orientador
  const recogCtx: RecogContext = {
    user: profile ?? { country: 'ES', lang: 'es' },
    entries,
    items,
    deckLearn,
    friends,
    doubtfulItems: state.doubtfulItems,
  }

  const recogMap = new Map<string, number>()
  for (const it of orienters) {
    recogMap.set(it.id, isOwn(it) ? 1.0 : recog(it, recogCtx))
  }

  // Determinar fase actual (T19 §1.2)
  let currentPhase: 'F1' | 'F2' | 'F3' = 'F1'
  if (state.rejected.length > 0) {
    currentPhase = 'F3'
  } else if (state.duelsInF1 >= 5 && state.closedDims.length >= 2) {
    currentPhase = 'F2'
  } else {
    currentPhase = 'F1'
  }

  const itemTier = (it: Item): number => {
    if (typeof it.fameTier === 'number') return it.fameTier
    if (it.fameTier && typeof it.fameTier === 'object') {
      const byCountry = (it.fameTier as Record<string, number>)['ES']
      if (byCountry != null) return byCountry
    }
    const notVal = typeof it.notoriety === 'number' ? it.notoriety : ((it.notoriety as any)?.ES ?? 0)
    if (notVal >= 0.8 || (it.popularity != null && it.popularity >= 65)) return 1
    if (notVal >= 0.5 || (it.popularity != null && it.popularity >= 40)) return 2
    return 1
  }

  // Nivel 4: NUNCA en ninguna fase (T19 §1.2)
  // R < 0.55: NUNCA en ninguna fase (T17 §C.1)
  let safeOrienters = orienters.filter((it) => {
    const tier = itemTier(it)
    if (tier === 4 && !isOwn(it)) return false
    const r = recogMap.get(it.id) ?? 0
    if (r < 0.55 && !isOwn(it)) return false
    return true
  })
  if (safeOrienters.length < 2) safeOrienters = orienters

  // Conjuntos de obras por fase (T19 §1.2 / T17 §C.1)
  const ownItems = safeOrienters.filter(isOwn)
  const tier1Items = safeOrienters.filter((it) => !isOwn(it) && itemTier(it) === 1)
  const tier2Items = safeOrienters.filter((it) => !isOwn(it) && itemTier(it) === 2)
  const tier3Items = safeOrienters.filter((it) => !isOwn(it) && itemTier(it) === 3 && (recogMap.get(it.id) ?? 0) >= 0.60)

  let fPool: Item[] = []

  if (state.preferFameOrOwn) {
    // Red de seguridad (T19 §1.3): sale solo de sus obras propias o de las 20 más famosas de nivel 1
    const getNotoriety = (it: Item) => typeof it.notoriety === 'number' ? it.notoriety : ((it.notoriety as any)?.ES ?? 0)
    const sortedTier1 = [...tier1Items].sort((a, b) => getNotoriety(b) - getNotoriety(a)).slice(0, 20)
    fPool = [...ownItems, ...sortedTier1]
    if (fPool.length < 2) fPool = safeOrienters
  } else {
    let f1 = [...ownItems, ...tier1Items]
    // Si F1 tiene menos de 12 obras útiles, se completa con las mejores de F2, NUNCA F3 (T17 §C.1)
    if (f1.length < 12 && tier2Items.length > 0) {
      const sortedTier2 = [...tier2Items].sort((a, b) => (recogMap.get(b.id) ?? 0) - (recogMap.get(a.id) ?? 0))
      const needed = 12 - f1.length
      f1 = [...f1, ...sortedTier2.slice(0, needed)]
    }

    if (currentPhase === 'F1') {
      fPool = f1
    } else if (currentPhase === 'F2') {
      fPool = [...f1, ...tier2Items]
    } else {
      fPool = [...f1, ...tier2Items, ...tier3Items]
    }
  }

  if (fPool.length < 2) fPool = safeOrienters
  if (fPool.length < 2) return null

  // Rotación de orientadores de las últimas 3 sesiones (decay = 0.5)
  const recentIds = new Set<string>()
  if (recentOrienters?.length) {
    for (const sessionIds of recentOrienters) {
      for (const id of sessionIds) recentIds.add(id)
    }
  }

  const allDims = getDimensionsForShelf(shelf)
  const closedSet = new Set(state.closedDims)
  const neutralSet = new Set(state.neutralDims)
  const poolItems = pool.map((id) => items.find((i) => i.id === id)).filter(Boolean) as Item[]

  // Regla de obras propias en F1 (T19 §1.2):
  // "Dentro de F1, siempre que haya pareja posible con obras propias, al menos 1 de las 2 es del usuario.
  // Si tiene 8 o más obras en la estantería, las 2 lo son en 2 de cada 3 duelos."
  const ownInPool = fPool.filter(isOwn)
  const has8Own = ownInPool.length >= 8
  const wantBothOwn = currentPhase === 'F1' && has8Own && (state.f1OwnDuelCount % 3 !== 2)

  // FASES 1 Y 2: Contraste y Afinar (§C.2, §C.3, T19 §1.2)
  if (currentPhase === 'F1' || currentPhase === 'F2') {
    // Dimensiones que siguen abiertas y no neutrales
    const openDims = allDims.filter((d) => !closedSet.has(d.id) && !neutralSet.has(d.id))

    // Evaluar masa de candidatas en lado A (la más cercana al 50 % parte mejor)
    const evaluatedDims: { dim: Dimension; massA: number; diffToHalf: number }[] = []
    for (const d of openDims) {
      let massA = 0
      let massB = 0
      for (const c of poolItems) {
        const s = d.side(c)
        const p = post[c.id] || 0
        if (s === 'A') massA += p
        else if (s === 'B') massB += p
      }
      // Las que tienen menos del 15 % en uno de los lados no se preguntan (§C.3)
      if (massA >= 0.15 && massB >= 0.15) {
        evaluatedDims.push({ dim: d, massA, diffToHalf: Math.abs(massA - 0.5) })
      }
    }

    evaluatedDims.sort((x, y) => x.diffToHalf - y.diffToHalf)
    const dimsToTry = evaluatedDims.length > 0 ? evaluatedDims.map((e) => e.dim) : openDims

    const findPairInDims = (reqBothOwn: boolean, reqAtLeastOneOwn: boolean): DuelPair | null => {
      for (const d of dimsToTry) {
        let sideA = fPool.filter((it) => d.side(it) === 'A')
        let sideB = fPool.filter((it) => d.side(it) === 'B')

        // En Afinar (F2), las dos obras tienen que cumplir todas las dimensiones ya cerradas (T17 §C.3)
        if (currentPhase === 'F2' && state.closedDims.length > 0) {
          const passesClosed = (it: Item) => {
            for (const cdId of state.closedDims) {
              const p = state.prefs[cdId]
              if (p === undefined || Math.abs(p) < 2) continue
              const cd = allDims.find((x) => x.id === cdId)
              if (!cd) continue
              const chosenSide = p > 0 ? 'A' : 'B'
              const s = cd.side(it)
              if (s !== null && s !== chosenSide) return false
            }
            return true
          }
          sideA = sideA.filter(passesClosed)
          sideB = sideB.filter(passesClosed)
        }

        if (sideA.length === 0 || sideB.length === 0) continue

        const listA = reqBothOwn ? sideA.filter(isOwn) : sideA
        const listB = reqBothOwn ? sideB.filter(isOwn) : sideB
        if (listA.length === 0 || listB.length === 0) continue

        const candidatePairs: { a: Item; b: Item; score: number }[] = []
        for (const a of listA) {
          for (const b of listB) {
            if (a.id === b.id) continue
            if (sameFamily(a, b)) continue

            const hasOwn = isOwn(a) || isOwn(b)
            if (reqAtLeastOneOwn && !hasOwn) continue

            const rA = recogMap.get(a.id) ?? 0.8
            const rB = recogMap.get(b.id) ?? 0.8
            const pureA = d.purity(a, 'A')
            const pureB = d.purity(b, 'B')
            const rotA = recentIds.has(a.id) ? 0.5 : 1.0
            const rotB = recentIds.has(b.id) ? 0.5 : 1.0

            let score = rA * rB * pureA * pureB * rotA * rotB
            if (isOwn(a) && shelfRankings.length > 0) {
              const pos = shelfRankings.indexOf(a.id)
              if (pos === 0 || pos === shelfRankings.length - 1) score *= 1.2
            }
            if (isOwn(b) && shelfRankings.length > 0) {
              const pos = shelfRankings.indexOf(b.id)
              if (pos === 0 || pos === shelfRankings.length - 1) score *= 1.2
            }

            candidatePairs.push({ a, b, score })
          }
        }

        if (candidatePairs.length > 0) {
          candidatePairs.sort((x, y) => y.score - x.score)
          const topSlice = candidatePairs.slice(0, Math.min(3, candidatePairs.length))
          const chosen = topSlice[Math.floor(rng() * topSlice.length)]

          const [first, second] = rng() < 0.5 ? [chosen.a, chosen.b] : [chosen.b, chosen.a]
          return {
            a: first,
            b: second,
            phase: currentPhase,
            dimension: d.id,
            infoGain: Math.round(chosen.score * 100) / 100,
            rA: recogMap.get(first.id) ?? 0.8,
            rB: recogMap.get(second.id) ?? 0.8,
            tierA: typeof first.fameTier === 'number' ? first.fameTier : itemTier(first),
            tierB: typeof second.fameTier === 'number' ? second.fameTier : itemTier(second),
            isOwnA: isOwn(first),
            isOwnB: isOwn(second),
          }
        }
      }
      return null
    }

    if (wantBothOwn) {
      const pair = findPairInDims(true, true)
      if (pair) return pair
    }
    if (currentPhase === 'F1' && ownInPool.length > 0) {
      const pair = findPairInDims(false, true)
      if (pair) return pair
    }
    const dimPair = findPairInDims(false, false)
    if (dimPair) return dimPair
  }

  // FASE 3: Parecidas o Fallback (§C.2)
  const candidatePairs: { a: Item; b: Item; score: number; info: number }[] = []
  const maxTries = Math.min(200, fPool.length * 3)

  for (let t = 0; t < maxTries; t++) {
    const a = fPool[Math.floor(rng() * fPool.length)]
    const b = fPool[Math.floor(rng() * fPool.length)]
    if (a.id === b.id || sameFamily(a, b)) continue

    if (currentPhase === 'F1' && ownInPool.length > 0) {
      if (wantBothOwn && ownInPool.length >= 2) {
        if (!isOwn(a) || !isOwn(b)) continue
      } else {
        if (!isOwn(a) && !isOwn(b)) continue
      }
    }

    const sim = calcSimilarity(a, b)
    if (sim < 0.40 || sim > 0.88) continue

    const tau = PARAMS.TAU
    let pASum = 0
    for (const c of poolItems) {
      const simCA = calcSimilarity(c, a)
      const simCB = calcSimilarity(c, b)
      const pA = 1 / (1 + Math.exp(-(simCA - simCB) / tau))
      pASum += (post[c.id] || 0) * pA
    }
    const info = 1 - Math.abs(2 * pASum - 1)

    const rA = recogMap.get(a.id) ?? 0.8
    const rB = recogMap.get(b.id) ?? 0.8
    const creatorPenalty = a.creator && b.creator && a.creator === b.creator ? 0.7 : 1.0
    const rot = (recentIds.has(a.id) ? 0.5 : 1.0) * (recentIds.has(b.id) ? 0.5 : 1.0)
    const score = info * Math.sqrt(rA * rB) * creatorPenalty * rot

    candidatePairs.push({ a, b, score, info })
    if (candidatePairs.length >= 25) break
  }

  if (candidatePairs.length === 0) {
    const sorted = [...fPool].sort((x, y) => (recogMap.get(y.id) ?? 0) - (recogMap.get(x.id) ?? 0))
    let a = sorted[0]
    let b = sorted.find((x) => x.id !== a.id && !sameFamily(a, x)) ?? sorted[1] ?? sorted[0]
    if (currentPhase === 'F1' && ownInPool.length > 0) {
      if (wantBothOwn && ownInPool.length >= 2) {
        a = ownInPool[0]
        b = ownInPool[1]
      } else {
        a = ownInPool[0]
        b = sorted.find((x) => x.id !== a.id && !sameFamily(a, x)) ?? sorted.find((x) => x.id !== a.id) ?? sorted[1] ?? a
      }
    }
    return {
      a,
      b,
      phase: currentPhase,
      infoGain: 0.5,
      rA: recogMap.get(a.id) ?? 0.8,
      rB: recogMap.get(b.id) ?? 0.8,
      tierA: typeof a.fameTier === 'number' ? a.fameTier : itemTier(a),
      tierB: typeof b.fameTier === 'number' ? b.fameTier : itemTier(b),
      isOwnA: isOwn(a),
      isOwnB: isOwn(b),
    }
  }

  candidatePairs.sort((x, y) => y.score - x.score)
  const topSlice = candidatePairs.slice(0, Math.min(3, candidatePairs.length))
  const chosen = topSlice[Math.floor(rng() * topSlice.length)]

  const [first, second] = rng() < 0.5 ? [chosen.a, chosen.b] : [chosen.b, chosen.a]
  return {
    a: first,
    b: second,
    phase: currentPhase,
    infoGain: Math.round(chosen.info * 100) / 100,
    rA: recogMap.get(first.id) ?? 0.8,
    rB: recogMap.get(second.id) ?? 0.8,
    tierA: typeof first.fameTier === 'number' ? first.fameTier : itemTier(first),
    tierB: typeof second.fameTier === 'number' ? second.fameTier : itemTier(second),
    isOwnA: isOwn(first),
    isOwnB: isOwn(second),
  }
}

/**
 * Re-muestreo del pool en todo el catálogo según cercanía a pref (MOTOR §2c.5, T9.3)
 */
export function resamplePool(
  state: DecideState,
  items: Item[],
  targetSize = 300
): DecideState {
  if (!state.pref) return state

  const rejectedSet = new Set(state.rejected)
  const poolFilter = (it: Item) =>
    it.type === state.shelf &&
    !rejectedSet.has(it.id) &&
    passesFilters(it, state.answers, state.profile?.platforms ?? [])

  const candidates = items.filter(poolFilter)
  if (candidates.length <= targetSize) return state

  const oldPostMap = new Map(Object.entries(state.post))
  const scored: { id: string; score: number }[] = []

  for (const it of candidates) {
    const v = vecOf(state.shelf, it.id)
    let cosSim = 0.5
    if (v && state.pref) {
      let dot = 0
      let normV = 0
      for (let i = 0; i < v.length; i++) {
        const val = v[i] / 127
        dot += val * state.pref[i]
        normV += val * val
      }
      cosSim = dot / (Math.sqrt(normV) || 1)
    }
    const priorScore = state.prior[it.id] ?? 0.01
    const combinedScore = 0.7 * Math.max(0, (cosSim + 1) / 2) + 0.3 * priorScore
    scored.push({ id: it.id, score: combinedScore })
  }

  scored.sort((a, b) => b.score - a.score)
  const newPool = scored.slice(0, targetSize).map((s) => s.id)

  const newPost: Record<string, number> = {}
  let totalPost = 0
  for (const id of newPool) {
    const p = oldPostMap.get(id) ?? (state.prior[id] || 0.001)
    newPost[id] = p
    totalPost += p
  }
  for (const id of newPool) {
    newPost[id] = (newPost[id] || 0) / (totalPost || 1)
  }

  return {
    ...state,
    pool: newPool,
    post: newPost,
  }
}

/**
 * Aplica el resultado de un duelo, actualiza post, preferencias explícitas y red de seguridad (T17 §C.4, T19 §1.3)
 */
export function applyDuelChoice(
  state: DecideState,
  winner: Item,
  loser: Item,
  itemsById: Map<string, Item>,
  ms?: number,
  dimensionId?: string
): DecideState {
  const currentPhase = state.phase || 'F1'
  const newShown = Array.from(new Set([...state.shown, winner.id, loser.id]))

  // Red de seguridad: reseteada en duelos normales (solo se activa con «No conozco ninguna»)
  const preferFameOrOwn = false
  const updatedDoubtful = state.doubtfulItems || {}

  // Actualizar preferencias explícitas de dimensión (T17 §C.4)
  const nextPrefs = { ...state.prefs }
  const nextNeutralDims = [...state.neutralDims]
  const allDims = getDimensionsForShelf(state.shelf)
  const dim = dimensionId ? allDims.find((d) => d.id === dimensionId) : null

  if (dim) {
    const winSide = dim.side(winner)
    const prevPref = nextPrefs[dim.id] || 0

    if (winSide === 'A') {
      if (prevPref < 0) {
        // Contradicción (+1 y luego −1): la dimensión vuelve a 0 y no se pregunta más (§C.4)
        nextPrefs[dim.id] = 0
        if (!nextNeutralDims.includes(dim.id)) nextNeutralDims.push(dim.id)
      } else {
        nextPrefs[dim.id] = Math.min(2, prevPref + 1)
      }
    } else if (winSide === 'B') {
      if (prevPref > 0) {
        // Contradicción
        nextPrefs[dim.id] = 0
        if (!nextNeutralDims.includes(dim.id)) nextNeutralDims.push(dim.id)
      } else {
        nextPrefs[dim.id] = Math.max(-2, prevPref - 1)
      }
    }
  }

  const nextClosedDims = Object.entries(nextPrefs)
    .filter(([_, v]) => Math.abs(v) >= 2)
    .map(([k]) => k)

  // Actualización bayesiana de post(c) con beta = 1.5 (§8.6, §C.4)
  const tau = PARAMS.TAU
  const beta = PARAMS.BETA
  const newPost: Record<string, number> = {}
  let totalNewPost = 0

  for (const cId of state.pool) {
    const c = itemsById.get(cId)
    if (!c) continue
    const simCW = calcSimilarity(c, winner)
    const simCL = calcSimilarity(c, loser)
    const pW = 1 / (1 + Math.exp(-(simCW - simCL) / tau))

    // Empujón si la dimensión tiene |prefs| = 1 (§C.4)
    let boost = 1.0
    if (dim && Math.abs(nextPrefs[dim.id] || 0) === 1) {
      const cSide = dim.side(c)
      const targetSide = nextPrefs[dim.id] > 0 ? 'A' : 'B'
      if (cSide === targetSide) boost = 1.5
      else if (cSide !== null) boost = 0.6
    }

    const updated = (state.post[cId] || 0) * Math.pow(pW, beta) * boost
    newPost[cId] = updated
    totalNewPost += updated
  }

  for (const cId of state.pool) {
    newPost[cId] = (newPost[cId] || 0) / (totalNewPost || 1)
  }

  // Vector de gusto
  let winnerVec = vecOf(state.shelf, winner.id)
  let loserVec = vecOf(state.shelf, loser.id)

  if (!winnerVec) {
    const fallback = new Int8Array(48)
    for (let i = 0; i < 48; i++) {
      fallback[i] = Math.round(Math.sin((winner.id.charCodeAt(i % winner.id.length) + i) * 17) * 60)
    }
    winnerVec = fallback
  }

  let newPref: Float32Array | null = state.pref ? new Float32Array(state.pref) : null
  if (winnerVec) {
    if (!newPref) {
      newPref = new Float32Array(winnerVec.length)
      for (let i = 0; i < winnerVec.length; i++) {
        newPref[i] = winnerVec[i] / 127
      }
    } else {
      for (let i = 0; i < newPref.length; i++) {
        newPref[i] += 0.3 * (winnerVec[i] / 127) - (loserVec ? 0.15 * (loserVec[i] / 127) : 0)
      }
    }
    let normSq = 0
    for (let i = 0; i < newPref.length; i++) normSq += newPref[i] * newPref[i]
    const norm = Math.sqrt(normSq) || 1
    for (let i = 0; i < newPref.length; i++) newPref[i] /= norm
  }

  const isOwnUser = (it: Item) => {
    const e = state.entries?.[it.id]
    return Boolean(
      e?.status === 'seen' ||
      e?.stars != null ||
      (e?.cmp ?? 0) > 0 ||
      e?.ranked === true ||
      state.rankings?.[state.shelf]?.includes(it.id)
    )
  }

  const nextDuelsInF1 = currentPhase === 'F1' ? state.duelsInF1 + 1 : state.duelsInF1
  const nextF1OwnDuelCount = (currentPhase === 'F1' && isOwnUser(winner) && isOwnUser(loser))
    ? state.f1OwnDuelCount + 1
    : state.f1OwnDuelCount

  // Transición de fase (T19 §1.2):
  // F1 -> F2: ha respondido al menos 5 duelos en F1 Y tiene al menos 2 dimensiones cerradas
  let nextPhase = currentPhase
  if (nextPhase === 'F1' && nextDuelsInF1 >= 5 && nextClosedDims.length >= 2) {
    nextPhase = 'F2'
  }
  if (nextPhase === 'F2' && state.rejected.length > 0) {
    nextPhase = 'F3'
  }

  const newDuels = [
    ...state.duels,
    {
      a: winner.id,
      b: loser.id,
      winner: winner.id,
      phase: currentPhase,
      dimension: dimensionId,
      ...(ms != null ? { ms } : {}),
    },
  ]

  let updatedState: DecideState = {
    ...state,
    post: newPost,
    duels: newDuels,
    shown: newShown,
    duelsInRound: state.duelsInRound + 1,
    duelsInF1: nextDuelsInF1,
    f1OwnDuelCount: nextF1OwnDuelCount,
    pref: newPref,
    prefs: nextPrefs,
    neutralDims: nextNeutralDims,
    closedDims: nextClosedDims,
    phase: nextPhase,
    preferFameOrOwn,
    doubtfulItems: updatedDoubtful,
  }

  if (updatedState.duels.length === 3) {
    updatedState = resamplePool(updatedState, Array.from(itemsById.values()), 300)
  }

  return updatedState
}

/**
 * Registra que el usuario no conoce ninguna de las dos obras («No conozco ninguna»).
 * Ambas obras se marcan como dudosas para este usuario (R × 0.5 durante 90 días)
 * y el siguiente duelo sale de sus obras propias o de las 20 más famosas de nivel 1.
 */
export function skipDuelUnknown(
  state: DecideState,
  itemA: Item,
  itemB: Item,
  ms?: number,
  dimensionId?: string
): DecideState {
  const currentPhase = state.phase || 'F1'
  const newShown = Array.from(new Set([...state.shown, itemA.id, itemB.id]))

  // Pasar no descarta: solo la obra que se ha pasado PASSES_FOR_DOUBTFUL veces queda dudosa (R × 0.5 durante 90 días)
  const now = Date.now()
  const passed = loadPassedItems()
  const updatedDoubtful = { ...(state.doubtfulItems || {}) }
  let becameDoubtful = false
  for (const id of [itemA.id, itemB.id]) {
    passed[id] = (passed[id] ?? 0) + 1
    if (passed[id] >= PASSES_FOR_DOUBTFUL) {
      updatedDoubtful[id] = now
      becameDoubtful = true
    }
  }
  savePassedItems(passed)
  if (becameDoubtful) saveDoubtfulItems(updatedDoubtful)

  const nextDuelsInF1 = currentPhase === 'F1' ? state.duelsInF1 + 1 : state.duelsInF1

  // Transición de fase (T19 §1.2)
  let nextPhase = currentPhase
  if (nextPhase === 'F1' && nextDuelsInF1 >= 5 && state.closedDims.length >= 2) {
    nextPhase = 'F2'
  }
  if (nextPhase === 'F2' && state.rejected.length > 0) {
    nextPhase = 'F3'
  }

  const newDuels = [
    ...state.duels,
    {
      a: itemA.id,
      b: itemB.id,
      winner: null,
      phase: currentPhase,
      dimension: dimensionId,
      unknown: true,
      ...(ms != null ? { ms } : {}),
    },
  ]

  return {
    ...state,
    duels: newDuels,
    shown: newShown,
    duelsInRound: state.duelsInRound + 1,
    duelsInF1: nextDuelsInF1,
    phase: nextPhase,
    // la red de seguridad (obras propias o muy famosas) solo si ya hay obras que no conoce
    preferFameOrOwn: state.preferFameOrOwn || becameDoubtful,
    doubtfulItems: updatedDoubtful,
  }
}

/**
 * Determina si ya es momento de presentar la propuesta (§8.7, T19 §1.2)
 */
export function shouldPropose(state: DecideState): boolean {
  const isFirstRound = state.round === 1

  // En primera ronda: mínimo 5 duelos (o 3 si masa altamente concentrada)
  if (isFirstRound) {
    if (state.duelsInRound >= 5) return true
    if (state.duelsInRound < 3) return false
  } else {
    // En rondas posteriores («Seguir buscando»): 3 duelos
    if (state.duelsInRound >= 3) return true
    if (state.duelsInRound < 2) return false
  }

  // Comprobar concentración de masa de probabilidad
  const sortedPosts = Object.values(state.post).sort((a, b) => b - a)
  const top1 = sortedPosts[0] || 0
  const top2 = sortedPosts[1] || 0.0001
  return top1 >= 0.30 && top1 >= 2 * top2
}

/**
 * Obtiene la mejor propuesta para la sesión (§8.8, §8.9, T17 §C.4, §C.5)
 */
export function getProposal(
  state: DecideState,
  itemsById: Map<string, Item>,
  friends: Friend[],
  profile: Profile
): DecideProposal | null {
  const rejectedSet = new Set(state.rejected)
  const rejectedItems = state.rejected.map((id) => itemsById.get(id)).filter(Boolean) as Item[]

  const allDims = getDimensionsForShelf(state.shelf)

  // Filtro duro de dimensiones cerradas: solo obras de ese lado o «ninguno» (§C.4)
  const passesClosedDimensions = (it: Item): boolean => {
    for (const cdId of state.closedDims) {
      const p = state.prefs[cdId]
      if (p === undefined || Math.abs(p) < 2) continue
      const d = allDims.find((x) => x.id === cdId)
      if (!d) continue
      const targetSide = p > 0 ? 'A' : 'B'
      const side = d.side(it)
      if (side !== null && side !== targetSide) return false
    }
    return true
  }

  let candidateIds = state.pool.filter((id) => !rejectedSet.has(id))
  let filteredById = candidateIds.filter((id) => {
    const it = itemsById.get(id)
    return it ? passesClosedDimensions(it) : false
  })

  // Si quedan menos de 5 candidatas, se relaja el filtro (§C.4)
  if (filteredById.length < 5) {
    filteredById = candidateIds
  }

  const scoredEntries = filteredById.map((id) => [id, state.post[id] || 0.0001] as [string, number])
  scoredEntries.sort((a, b) => b[1] - a[1])
  const topCandidates = scoredEntries.slice(0, 30)

  if (topCandidates.length === 0) return null
  const maxPost = topCandidates[0][1] || 1

  const candidatesWithScore: { item: Item; finalScore: number; quality: number }[] = []

  for (const [id, postVal] of topCandidates) {
    const it = itemsById.get(id)
    if (!it) continue

    let maxSimRejected = 0
    for (const rej of rejectedItems) {
      const s = calcSimilarity(it, rej)
      if (s > maxSimRejected) maxSimRejected = s
    }
    if (maxSimRejected > 0.90) continue

    const fit = postVal / maxPost
    const quality = (it.voteAvg ? it.voteAvg / 10 : (it.popularity || 50) / 100)
    const isPending = it.platforms?.some((p) => profile.platforms?.includes(p)) ? 0.05 : 0

    // final = fit^0.6 · quality^0.4 · (1 + boost) · (1 − 0.6·maxSim(c, rejected)) (§8.8)
    const finalScore =
      Math.pow(fit, 0.6) *
      Math.pow(quality, 0.4) *
      (1 + isPending) *
      (1 - 0.6 * maxSimRejected)

    candidatesWithScore.push({ item: it, finalScore, quality })
  }

  if (candidatesWithScore.length === 0) {
    const fallbackItem = itemsById.get(topCandidates[0][0])
    if (!fallbackItem) return null
    return {
      item: fallbackItem,
      finalScore: 0.5,
      reasons: ['Propuesta sugerida según tus preferencias'],
      fromFriends: false,
    }
  }

  candidatesWithScore.sort((a, b) => b.finalScore - a.finalScore)
  const winner = candidatesWithScore[0]
  const reasons = formatReasons(winner.item, state, itemsById, friends, profile)

  return {
    item: winner.item,
    finalScore: winner.finalScore,
    reasons,
    fromFriends: false,
    alternatives: candidatesWithScore.slice(1, 11).map((c) => c.item),
  }
}

/**
 * Formatea de 1 a 3 motivos con datos reales (T17 §C.5)
 * Las preferencias cerradas se dicen primero («Porque elegiste animación dos veces»).
 */
export function formatReasons(
  proposal: Item,
  state: DecideState,
  itemsById: Map<string, Item>,
  friends: Friend[],
  profile?: Profile
): string[] {
  const reasons: string[] = []
  const allDims = getDimensionsForShelf(state.shelf)

  // 1. Preferencias cerradas primero (§C.5):
  for (const cdId of state.closedDims) {
    const p = state.prefs[cdId]
    if (p === undefined || Math.abs(p) < 2) continue
    const d = allDims.find((x) => x.id === cdId)
    if (!d) continue
    const targetSide = p > 0 ? 'A' : 'B'
    const side = d.side(proposal)
    if (side === targetSide) {
      const reasonText = targetSide === 'A' ? d.sideA.reason : d.sideB.reason
      reasons.push(reasonText)
      if (reasons.length >= 2) break
    }
  }

  // 2. Duelos ganados si faltan motivos
  if (reasons.length < 2) {
    const winners = state.duels.map((d) => (d.winner ? itemsById.get(d.winner) : undefined)).filter(Boolean) as Item[]
    if (winners.length > 0) {
      const sortedBySim = [...winners].sort(
        (a, b) => calcSimilarity(proposal, b) - calcSimilarity(proposal, a)
      )
      const bestWinners = sortedBySim.slice(0, 2)
      if (bestWinners.length >= 2) {
        reasons.push(`Porque elegiste ${bestWinners[0].title} y ${bestWinners[1].title}`)
      } else if (bestWinners.length === 1) {
        reasons.push(`Porque elegiste ${bestWinners[0].title}`)
      }
    }
  }

  // 3. Amigo: «Ana la tiene de nº 2» (§8.9)
  const friendMatches: { name: string; pos: number; comment?: string }[] = []
  for (const f of friends) {
    const fe = f.entries.find((e) => e.itemId === proposal.id && e.status === 'seen')
    if (fe) {
      const ranks = friendRanks(f, (id) => itemsById.get(id))
      const rank = ranks[proposal.id]
      if (rank) {
        friendMatches.push({ name: f.name, pos: rank.pos, comment: fe.comment })
      }
    }
  }
  if (friendMatches.length > 0) {
    friendMatches.sort((a, b) => a.pos - b.pos)
    const topF = friendMatches[0]
    reasons.push(`${topF.name} la tiene de nº ${topF.pos}`)
  }

  // 4. Práctico: plataforma, duración o páginas
  const plat = proposal.platforms?.find((p) => profile?.platforms?.includes(p)) ?? proposal.platforms?.[0]
  if (plat) {
    reasons.push(`Está en ${plat}`)
  } else if (proposal.durationMin) {
    reasons.push(`${proposal.durationMin} min`)
  } else if (proposal.pages) {
    reasons.push(`${proposal.pages} págs`)
  }

  return reasons.slice(0, 3)
}

/**
 * Acción «Seguir buscando» (§8.8, MOTOR §2c.5, T19 §1.2)
 * Se pasa a fase F3 tras pulsar seguir buscando.
 */
export function rejectAndContinue(
  state: DecideState,
  rejectedId: string,
  allItems?: Item[]
): DecideState {
  const nextState: DecideState = {
    ...state,
    rejected: [...state.rejected, rejectedId],
    round: state.round + 1,
    duelsInRound: 0,
    phase: 'F3',
  }

  if (allItems?.length) {
    return resamplePool(nextState, allItems, 300)
  }
  return nextState
}
