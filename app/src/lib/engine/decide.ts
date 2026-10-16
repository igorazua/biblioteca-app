import type { Friend, Item, Profile, ShelfType, UserEntry } from '../../types'
import { PARAMS } from './params'
import { MOOD_GENRES, NONFICTION_GENRES } from '../../data/questions'
import { friendRanks } from '../rank'

export type Answers = Record<string, string | string[] | undefined>

export interface DecideState {
  shelf: ShelfType
  answers: Answers
  pool: string[]                 // candidatas que pasan los filtros (§8.2)
  prior: Record<string, number>  // puntuación previa de cada candidata (§8.3)
  post: Record<string, number>   // probabilidad actual (suma 1)
  pref: Float32Array | null      // vector de gusto de la sesión
  prefAxes: Record<string, number> // dirección en ejes (−1..1 por eje)
  duels: { a: string; b: string; winner: string; phase: 'coarse' | 'fine'; infoGain?: number }[]
  shown: string[]                // orientadores ya usados (no se repiten)
  rejected: string[]             // propuestas rechazadas con «Seguir buscando»
  round: number
  duelsInRound: number
}

export interface DuelPair {
  a: Item
  b: Item
  phase: 'coarse' | 'fine'
  infoGain: number
}

export interface DecideProposal {
  item: Item
  finalScore: number
  reasons: string[]
  fromFriends: boolean
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
    // Filtro duro de jugadores (§8.10)
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

  // Filtro de plataformas si se especificaron
  if ((it.type === 'movie' || it.type === 'series') && platforms.length && it.platforms?.length) {
    if (!it.platforms.some((p) => platforms.includes(p))) return false
  }

  return true
}

/** Similitud continua en [0, 1] entre dos obras */
export function calcSimilarity(a: Item, b: Item): number {
  if (a.id === b.id) return 1.0

  // 1. Similitud de géneros (Jaccard)
  const gA = new Set(a.genres)
  const gB = new Set(b.genres)
  let intersection = 0
  for (const g of gA) if (gB.has(g)) intersection++
  const union = new Set([...a.genres, ...b.genres]).size
  const genreSim = union > 0 ? intersection / union : 0

  // 2. Mismo creador
  const creatorSim = a.creator && b.creator && a.creator === b.creator ? 1.0 : 0

  // 3. Proximidad de año (década)
  const yearDiff = Math.abs(a.year - b.year)
  const yearSim = Math.max(0, 1 - yearDiff / 30)

  // 4. Misma saga/colección
  const collectionSim = a.collection && b.collection && a.collection === b.collection ? 1.0 : 0

  return (
    genreSim * 0.50 +
    creatorSim * 0.25 +
    yearSim * 0.15 +
    collectionSim * 0.10
  )
}

/**
 * Inicializa la sesión de Decidir (§8.1, §8.2, §8.3)
 */
export function initDecideSession(input: DecideInput): DecideState {
  const { shelf, items, entries, answers, profile, friends, affinity, friendPct } = input
  const plats = Array.isArray(answers.platforms) ? answers.platforms : profile.platforms ?? []
  const source = asStr(answers.source)
  const isRepeat = asStr(answers.seen) === 'vista'

  // 1. Filtrar bolsa de candidatas con fallback por niveles (§8.2)
  const poolFilter = (it: Item, checkPlats: boolean) => {
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
    rawCandidates = items.filter((it) => it.type === shelf)
  }

  // 2. Puntuación previa (§8.3)
  const prior: Record<string, number> = {}
  const mVotes = PARAMS.Q_PRIOR_VOTES
  const mood = asStr(answers.mood)
  const moodGenres = (mood && MOOD_GENRES[shelf]?.[mood]) || []

  for (const it of rawCandidates) {
    // Calidad global bayesiana
    const votes = it.voteCount || it.readers || 0
    const rating = (it.voteAvg ? it.voteAvg / 10 : (it.popularity || 50) / 100)
    const qGlobal = (votes * rating + mVotes * 0.65) / (votes + mVotes)

    // Calidad social (amigos)
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

    // Encaje con ánimo (mood)
    let moodScore = 0.5
    if (moodGenres.length > 0) {
      const matchCount = it.genres.filter((g) => moodGenres.includes(g)).length
      moodScore = Math.min(1.0, matchCount / Math.min(2, moodGenres.length))
    }

    // Gusto general (taste)
    const taste = 0.5

    // Boost por pendiente propio o de amigo
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

    const priorVal = (0.35 * moodScore + 0.25 * taste + 0.40 * quality) * (1 + boost)
    prior[it.id] = Math.max(0.0001, priorVal)
  }

  // Ordenar y tomar hasta 300 candidatas por prior (§8.2)
  const sortedIds = Object.keys(prior).sort((a, b) => prior[b] - prior[a]).slice(0, 300)
  const pool = sortedIds

  // Normalizar post (probabilidad suma 1)
  const totalPrior = pool.reduce((sum, id) => sum + prior[id], 0)
  const post: Record<string, number> = {}
  for (const id of pool) {
    post[id] = prior[id] / (totalPrior || 1)
  }

  return {
    shelf,
    answers,
    pool,
    prior,
    post,
    pref: null,
    prefAxes: {},
    duels: [],
    shown: [],
    rejected: [],
    round: 1,
    duelsInRound: 0,
  }
}

/**
 * Elige la siguiente pareja de orientadores (§8.4, §8.5)
 */
export function nextDuel(
  state: DecideState,
  items: Item[],
  shownIds: Set<string>,
  rng = Math.random
): DuelPair | null {
  const { shelf, pool, post, duels } = state
  const poolSet = new Set(pool)
  const shown = new Set([...state.shown, ...shownIds])

  // Bolsa O de orientadores (§8.4)
  const orienters = items.filter((it) => it.type === shelf && !poolSet.has(it.id) && !shown.has(it.id))
  if (orienters.length < 2) return null

  // Reconocibilidad recog de cada orientador
  const recogMap = new Map<string, number>()
  for (const it of orienters) {
    const pop = (it.popularity || 50) / 100
    recogMap.set(it.id, 0.6 + 0.4 * pop)
  }

  const phase: 'coarse' | 'fine' = duels.length < 2 ? 'coarse' : 'fine'

  // Muestrear parejas candidatas (hasta 250) (§8.5)
  const poolItems = pool.map((id) => items.find((i) => i.id === id)).filter(Boolean) as Item[]
  const candidatePairs: { a: Item; b: Item; score: number; info: number }[] = []
  const maxTries = Math.min(250, orienters.length * 3)

  for (let t = 0; t < maxTries; t++) {
    const a = orienters[Math.floor(rng() * orienters.length)]
    const b = orienters[Math.floor(rng() * orienters.length)]
    if (a.id === b.id) continue

    const macroA = a.genres?.[0] || 'General'
    const macroB = b.genres?.[0] || 'General'

    if (phase === 'coarse') {
      if (macroA === macroB) continue
    } else {
      const sim = calcSimilarity(a, b)
      if (sim < 0.40 || sim > 0.88) continue
    }

    // Ganancia de información (info) con tau = 0.05
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
    const score = info * Math.sqrt(rA * rB) * creatorPenalty

    candidatePairs.push({ a, b, score, info })
  }

  if (candidatePairs.length === 0) {
    // Fallback: tomar 2 orientadores con mayor popularidad
    const sortedO = [...orienters].sort((x, y) => y.popularity - x.popularity)
    const a = sortedO[0]
    const b = sortedO[1]
    return { a, b, phase, infoGain: 0.5 }
  }

  candidatePairs.sort((x, y) => y.score - x.score)
  // Elegir entre las 3 mejores al azar para variedad (§8.5)
  const topSlice = candidatePairs.slice(0, Math.min(3, candidatePairs.length))
  const chosen = topSlice[Math.floor(rng() * topSlice.length)]

  // Orden en pantalla al azar
  const [first, second] = rng() < 0.5 ? [chosen.a, chosen.b] : [chosen.b, chosen.a]
  return { a: first, b: second, phase, infoGain: chosen.info }
}

/**
 * Aplica el resultado de un duelo y actualiza post (§8.6)
 */
export function applyDuelChoice(
  state: DecideState,
  winner: Item,
  loser: Item,
  itemsById: Map<string, Item>
): DecideState {
  const phase: 'coarse' | 'fine' = state.duels.length < 2 ? 'coarse' : 'fine'
  const newShown = Array.from(new Set([...state.shown, winner.id, loser.id]))
  const newDuels = [
    ...state.duels,
    { a: winner.id, b: loser.id, winner: winner.id, phase },
  ]

  // Actualización bayesiana de post(c) con beta = 1.5
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
    const updated = (state.post[cId] || 0) * Math.pow(pW, beta)
    newPost[cId] = updated
    totalNewPost += updated
  }

  // Renormalizar
  for (const cId of state.pool) {
    newPost[cId] = (newPost[cId] || 0) / (totalNewPost || 1)
  }

  return {
    ...state,
    post: newPost,
    duels: newDuels,
    shown: newShown,
    duelsInRound: state.duelsInRound + 1,
  }
}

/**
 * Determina si ya es momento de presentar la propuesta (§8.7)
 */
export function shouldPropose(state: DecideState): boolean {
  const mode = PARAMS.DECIDE_MODE
  const isFirstRound = state.round === 1

  if (mode === 'fixed') {
    // 5 duelos en la primera ronda, 3 en rondas siguientes (MOTOR.md §8.7)
    return isFirstRound ? state.duelsInRound >= 5 : state.duelsInRound >= 3
  }

  // Modo adaptive: mínimo 3 y máximo 8 en ronda 1; mín 2 y máx 5 en posteriores
  const minDuels = isFirstRound ? 3 : 2
  const maxDuels = isFirstRound ? 8 : 5

  if (state.duelsInRound < minDuels) return false
  if (state.duelsInRound >= maxDuels) return true

  // Comprobar concentración de masa de probabilidad
  const sortedPosts = Object.values(state.post).sort((a, b) => b - a)
  const top1 = sortedPosts[0] || 0
  const top2 = sortedPosts[1] || 0.0001
  return top1 >= 0.30 && top1 >= 2 * top2
}

/**
 * Obtiene la mejor propuesta para la sesión (§8.8, §8.9)
 */
export function getProposal(
  state: DecideState,
  itemsById: Map<string, Item>,
  friends: Friend[],
  profile: Profile
): DecideProposal | null {
  const rejectedSet = new Set(state.rejected)
  const rejectedItems = state.rejected.map((id) => itemsById.get(id)).filter(Boolean) as Item[]

  // Máximo post dentro del top 30 para normalizar fit
  const top30Post = Object.entries(state.post)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)

  if (top30Post.length === 0) return null
  const maxPost = top30Post[0][1] || 1

  const candidatesWithScore: { item: Item; finalScore: number; quality: number }[] = []

  for (const [id, postVal] of top30Post) {
    if (rejectedSet.has(id)) continue
    const it = itemsById.get(id)
    if (!it) continue

    // Descartar casi gemelas a alguna rechazada (sim > 0.90)
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
    const fallbackItem = itemsById.get(top30Post[0][0])
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
  }
}

/**
 * Formatea de 1 a 3 motivos con datos reales (§8.9)
 */
export function formatReasons(
  proposal: Item,
  state: DecideState,
  itemsById: Map<string, Item>,
  friends: Friend[],
  profile?: Profile
): string[] {
  const reasons: string[] = []

  // 1. Duelos: «Porque elegiste X e Y» (los 2 ganadores más cercanos)
  const winners = state.duels.map((d) => itemsById.get(d.winner)).filter(Boolean) as Item[]
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

  // 2. Amigo: «Ana la tiene de nº 2» (§8.9)
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

  // 3. Práctico: plataforma o duración
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
 * Acción «Seguir buscando» (§8.8)
 */
export function rejectAndContinue(state: DecideState, rejectedId: string): DecideState {
  return {
    ...state,
    rejected: [...state.rejected, rejectedId],
    round: state.round + 1,
    duelsInRound: 0,
  }
}
