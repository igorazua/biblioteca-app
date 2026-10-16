import type { Friend, Item, Profile, ShelfType, UserEntry } from '../../types'
import { PARAMS, type Bucket } from './params'
import { centroid, simWithCentroid } from './features'

export interface DeckSessionState {
  countsByDecade: Record<string, { seen: number; up: number; left: number; shown: number }>
  countsByMacro: Record<string, { seen: number; up: number; left: number; shown: number }>
}

export function newDeckSessionState(): DeckSessionState {
  return {
    countsByDecade: {},
    countsByMacro: {},
  }
}

export interface DeckCard {
  item: Item
  bucket: Bucket
  score: number
  reason?: { friendId?: string; comment?: string }
}

export interface DeckInput {
  shelf: ShelfType
  items: Item[]
  entries: Record<string, UserEntry>
  rankings: Record<ShelfType, string[]>
  profile: Profile
  friends: Friend[]
  affinity: (friendId: string) => number | null
  friendPct: (friend: Friend, itemId: string) => number | null
  session?: DeckSessionState
  now?: number
  seed?: number
}

const DAY_MS = 24 * 60 * 60 * 1000

function decadeOf(year: number): string {
  return `${Math.floor(year / 10) * 10}s`
}

function macroOf(item: Item): string {
  return item.genres?.[0] || 'General'
}

/**
 * Calcula el factor adaptativo basado en la sesión actual (§7.6).
 * Suavizado con prior de 3 neutras y clamp a [0.5, 1.3].
 */
function calcAdapt(item: Item, session?: DeckSessionState, isSeenLikely = false): number {
  if (!session) return 1.0

  const decade = decadeOf(item.year)
  const macro = macroOf(item)

  const dStat = session.countsByDecade[decade] || { seen: 0, up: 0, left: 0, shown: 0 }
  const mStat = session.countsByMacro[macro] || { seen: 0, up: 0, left: 0, shown: 0 }

  if (isSeenLikely) {
    // seenRate suavizada con prior 1.5/3 = 0.5
    const dSeenRate = (dStat.seen + 1.5) / (dStat.shown + 3)
    const mSeenRate = (mStat.seen + 1.5) / (mStat.shown + 3)
    const factor = Math.sqrt(dSeenRate * mSeenRate) * 2 // centrado en 1.0
    return Math.max(0.5, Math.min(1.3, factor))
  } else {
    // interestRate = (up + right) / shown
    const mInterest = (mStat.seen + mStat.up + 1.5) / (mStat.shown + 3)
    const factor = mInterest * 2
    return Math.max(0.5, Math.min(1.3, factor))
  }
}

/**
 * Comprueba si una obra descartada es elegible para volver (§7.7)
 */
function isDismissedEligible(
  item: Item,
  entry: UserEntry | undefined,
  friends: Friend[],
  affinity: (id: string) => number | null,
  friendPct: (f: Friend, id: string) => number | null,
  now: number
): boolean {
  if (!entry || entry.status !== 'dismissed') return true
  const dismissedTime = entry.dismissedAt || entry.updatedAt || 0

  // 1. Ha pasado más de 1 año (365 días)
  if (now - dismissedTime > PARAMS.DISMISS_RETURN_D * DAY_MS) return true

  // 2. Un amigo con afinidad >= 60 la vio después de que la descartaras y la tiene en top 20%
  for (const f of friends) {
    const aff = affinity(f.id)
    if (aff != null && aff >= 60) {
      const fe = f.entries.find((e) => e.itemId === item.id && e.status === 'seen')
      if (fe && (fe.at || 0) > dismissedTime) {
        const pct = friendPct(f, item.id)
        if (pct != null && pct >= 80) return true
      }
    }
  }

  return false
}

/**
 * Calcula las próximas N tarjetas del mazo de Descubrir (MOTOR.md §7)
 */
export function nextCards(input: DeckInput, already: string[] = [], n = 20): DeckCard[] {
  const {
    shelf,
    items,
    entries,
    rankings,
    profile,
    friends,
    affinity,
    friendPct,
    session,
    now = Date.now(),
  } = input

  const alreadySet = new Set(already)
  const country = profile.country || 'ES'
  const lang = profile.lang || 'es'

  // 1. Filtrar elegibles: sin entrada o descartadas que vuelven
  const eligible = items.filter((it) => {
    if (alreadySet.has(it.id)) return false
    const entry = entries[it.id]
    if (!entry) return true
    if (entry.status === 'dismissed') {
      return isDismissedEligible(it, entry, friends, affinity, friendPct, now)
    }
    return false
  })

  if (eligible.length === 0) return []

  // Máximo de votos para normalización
  let maxVotes = 100
  for (const it of eligible) {
    const v = it.voteCount || it.readers || 0
    if (v > maxVotes) maxVotes = v
  }
  const logMaxVotes = Math.log(1 + maxVotes)

  // 2. Puntuación dentro de cada cupo por obra
  const scoredByBucket: Record<Bucket, { item: Item; score: number; reason?: { friendId?: string; comment?: string } }[]> = {
    seen_likely: [],
    social: [],
    friend_gem: [],
    explore: [],
  }

  const userRanked = rankings?.[shelf] || []
  const topN = Math.max(1, Math.floor(userRanked.length * 0.2))
  const userTopIds = userRanked.slice(0, topN)
  const userCentroid = userTopIds.length > 0 ? centroid(shelf, userTopIds) : null

  for (const it of eligible) {
    const pop = (it.popularity || 50) / 100
    const votes = Math.log(1 + (it.voteCount || it.readers || 0)) / logMaxVotes

    // Señal regional
    let region = 0
    if (it.providers?.[country]?.length) region += 0.5
    if (it.releasedIn?.includes(country)) region += 0.3
    if (it.wikiLocal?.includes(lang)) region += 0.2
    if (it.originalLanguage === lang) region += 0.2
    if (shelf === 'boardgame') region = 0.5
    if (shelf === 'artist') region = Math.min(1, region * 2)
    region = Math.min(1, region)

    // Señal de época
    let era = 0.5
    if (profile.birthYear && it.year) {
      const minAge = profile.birthYear + 12
      const maxAge = profile.birthYear + 25
      if (it.year >= minAge && it.year <= maxAge) {
        era = 1.0
      } else if (it.year < minAge) {
        era = Math.max(0, 1 - (minAge - it.year) / 10)
      } else {
        era = Math.max(0, 1 - (it.year - maxAge) / 10)
      }
    }
    if (shelf === 'boardgame') era = 0.5

    // Plataforma del usuario
    const plat = it.platforms?.some((p) => profile.platforms.includes(p)) ? 1.0 : 0.0

    // Señales de amigos
    let socialProd = 1.0
    let bestGem = 0
    let gemFriendId: string | undefined
    let gemComment: string | undefined

    for (const f of friends) {
      const fe = f.entries.find((e) => e.itemId === it.id)
      if (!fe) continue

      const aff = affinity(f.id)
      const wf = 0.5 + (aff != null ? aff / 100 : 0.25)
      const rec = fe.at ? Math.pow(0.5, Math.max(0, now - fe.at) / (PARAMS.RECENCY_HALF_LIFE_D * DAY_MS)) : 0.3
      const pctVal = fe.status === 'seen' ? (friendPct(f, it.id) ?? 50) / 100 : 0.4
      const com = fe.comment ? 0.25 : 0

      const sf = wf * (0.5 * pctVal + 0.3 * rec + com) * (fe.status === 'pending' ? 0.6 : 1.0)
      socialProd *= 1 - Math.min(1, sf)

      if (fe.status === 'seen' && pctVal >= 0.7 && pop < 0.5) {
        const gemScore = wf * (pctVal + com)
        if (gemScore > bestGem) {
          bestGem = gemScore
          gemFriendId = f.id
          gemComment = fe.comment
        }
      }
    }

    const social = 1 - socialProd
    const adaptSeen = calcAdapt(it, session, true)
    const adaptOther = calcAdapt(it, session, false)
    const taste = userCentroid ? simWithCentroid(shelf, userCentroid, it.id) : 0.5
    const novelty = 1.0 - pop * 0.4

    // Cálculo por cupos
    // 1. seen_likely
    const popWeight = shelf === 'book' ? 0.3 : 0.4
    const seenLikelyScore = (popWeight * pop + 0.15 * votes + 0.2 * region + 0.2 * era + 0.05 * plat) * adaptSeen

    // 2. social (solo si social > 0)
    let socialScore = 0
    if (social > 0) {
      socialScore = (0.7 * social + 0.15 * taste + 0.1 * pop + 0.05 * plat) * adaptOther
    }

    // 3. friend_gem (solo si gem > 0)
    let gemScore = 0
    if (bestGem > 0) {
      gemScore = (0.75 * bestGem + 0.25 * taste) * adaptOther
    }

    // 4. explore (con calidad mínima)
    let exploreScore = 0
    const qualityOk = (it.voteAvg || 0) >= 6.5 || social > 0.3 || pop >= 0.4
    if (qualityOk) {
      exploreScore = (0.45 * novelty + 0.3 * votes * ((it.voteAvg || 7) / 10) + 0.25 * taste) * adaptOther
    }

    // Determinar mejor cupo para esta obra
    let bestBucket: Bucket = 'seen_likely'
    let bestScore = seenLikelyScore

    if (socialScore > bestScore) {
      bestBucket = 'social'
      bestScore = socialScore
    }
    if (gemScore > bestScore) {
      bestBucket = 'friend_gem'
      bestScore = gemScore
    }
    if (exploreScore > bestScore && pop < 0.4) {
      bestBucket = 'explore'
      bestScore = exploreScore
    }

    scoredByBucket[bestBucket].push({
      item: it,
      score: bestScore,
      reason: bestBucket === 'friend_gem' ? { friendId: gemFriendId, comment: gemComment } : undefined,
    })
  }

  // Ordenar cada cupo de mayor a menor puntuación
  for (const b of Object.keys(scoredByBucket) as Bucket[]) {
    scoredByBucket[b].sort((a, b) => b.score - a.score)
  }

  // 3. Proporciones según tamaño de la biblioteca (vistas)
  const seenCount = Object.values(entries).filter((e) => e.status === 'seen').length
  const bracket = seenCount < 30 ? '<30' : seenCount <= 150 ? '30-150' : '>150'
  const baseWeights = { ...PARAMS.BUCKET_BASE[bracket] }

  // Redistribuir peso de cupos vacíos
  const availableBuckets = (Object.keys(baseWeights) as Bucket[]).filter((b) => scoredByBucket[b].length > 0)
  if (availableBuckets.length === 0) return []

  const totalAvailWeight = availableBuckets.reduce((sum, b) => sum + baseWeights[b], 0)
  const proportions: Record<Bucket, number> = {
    seen_likely: 0,
    social: 0,
    friend_gem: 0,
    explore: 0,
  }
  for (const b of availableBuckets) {
    proportions[b] = baseWeights[b] / totalAvailWeight
  }

  // 4. Intercalado por créditos con reglas de diversidad
  const result: DeckCard[] = []
  const credits: Record<Bucket, number> = {
    seen_likely: 0,
    social: 0,
    friend_gem: 0,
    explore: 0,
  }

  // Las 5 primeras tarjetas siempre de seen_likely o social si hay (§7.5), respetando diversidad
  const first5Picks = Math.min(5, n)
  for (let i = 0; i < first5Picks; i++) {
    const pool = scoredByBucket.seen_likely.length > 0 ? scoredByBucket.seen_likely : scoredByBucket.social
    if (pool.length > 0) {
      let pickIdx = pool.findIndex((cand) => checkDiversity(cand.item, result))
      if (pickIdx === -1) pickIdx = 0
      const [top] = pool.splice(pickIdx, 1)
      result.push({ item: top.item, bucket: 'seen_likely', score: top.score, reason: top.reason })
    }
  }

  // Completar el resto con intercalado ponderado
  while (result.length < n) {
    for (const b of availableBuckets) {
      credits[b] += proportions[b]
    }

    // Elegir cupo con mayor crédito que tenga obras
    const candidateBuckets = availableBuckets
      .filter((b) => scoredByBucket[b].length > 0)
      .sort((a, b) => credits[b] - credits[a])

    if (candidateBuckets.length === 0) break

    let picked = false
    for (const chosenBucket of candidateBuckets) {
      // Buscar la primera obra de ese cupo que cumpla diversidad
      const list = scoredByBucket[chosenBucket]
      let pickIdx = -1

      for (let idx = 0; idx < list.length; idx++) {
        const candidate = list[idx].item
        if (checkDiversity(candidate, result)) {
          pickIdx = idx
          break
        }
      }

      if (pickIdx >= 0) {
        const [chosen] = list.splice(pickIdx, 1)
        credits[chosenBucket] -= 1
        result.push({
          item: chosen.item,
          bucket: chosenBucket,
          score: chosen.score,
          reason: chosen.reason,
        })
        picked = true
        break
      }
    }

    // Si ninguna cumple diversidad estricta, coger la primera del cupo de mayor crédito
    if (!picked) {
      const fallbackBucket = candidateBuckets[0]
      const chosen = scoredByBucket[fallbackBucket].shift()!
      credits[fallbackBucket] -= 1
      result.push({
        item: chosen.item,
        bucket: fallbackBucket,
        score: chosen.score,
        reason: chosen.reason,
      })
    }
  }

  return result
}

/**
 * Reglas de diversidad (§7.4):
 * - Nunca 2 de la misma saga/colección en menos de 6 tarjetas
 * - Como mucho 3 seguidas del mismo macro
 * - Como mucho 2 seguidas del mismo creador
 */
function checkDiversity(item: Item, existing: DeckCard[]): boolean {
  const len = existing.length
  if (len === 0) return true

  // 1. Colección (últimas 6 tarjetas)
  if (item.collection) {
    const recent6 = existing.slice(-6)
    if (recent6.some((c) => c.item.collection === item.collection)) {
      return false
    }
  }

  // 2. Mismo macro (máximo 3 seguidas)
  if (len >= 3) {
    const itemMacro = macroOf(item)
    const last3 = existing.slice(-3)
    if (last3.every((c) => macroOf(c.item) === itemMacro)) {
      return false
    }
  }

  // 3. Mismo creador (máximo 2 seguidas)
  if (len >= 2 && item.creator) {
    const last2 = existing.slice(-2)
    if (last2.every((c) => c.item.creator === item.creator)) {
      return false
    }
  }

  return true
}
