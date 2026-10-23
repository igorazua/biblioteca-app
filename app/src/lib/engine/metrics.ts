import type { EngineEvent } from '../../store/useEvents'
import type { ShelfType } from '../../types'
import type { Bucket } from './params'

export interface DeckMetrics {
  totalSwipes: number
  totalSessions: number
  first20Accuracy: number // % right en primeras 20 tarjetas de cada sesión (0-100)
  discoveryRate: number // % up sobre total swipes (0-100)
  dismissRate: number // % left sobre total swipes (0-100)
  seenRate: number // % right sobre total swipes (0-100)
  avgCardsPerSession: number
  avgMsPerCard: number
  aucR: number // AUC de R frente a vistos (0.0 - 1.0)
  byBucket: Record<
    Bucket,
    {
      shown: number
      right: number
      up: number
      left: number
      successRate: number // (right + up) / shown
    }
  >
}

export interface DecideMetrics {
  totalSessions: number
  acceptedSessions: number
  firstRoundAcceptRate: number // % con dec_accept en ronda 1 (0-100)
  abandonRate: number // % con dec_abandon (0-100)
  avgRejects: number // media de dec_reject por sesión
  avgDuels: number // media de duelos por sesión aceptada
  avgInfoGain: number // infoGain medio en dec_duel
  medianDuelMs: number // mediana de dec_duel.ms en milisegundos
  slowDuelPct: number // % de duelos lentos (> 6s) (T19 §1.3)
  slowDuelsByPhase: Record<string, { total: number; slow: number; pct: number }>
  slowDuelsByShelf: Record<ShelfType, { total: number; slow: number; pct: number }>
  acceptedItemsCount: number
  realSuccessRate14d: number // % de aceptadas que pasaron a seen en 14 días
  realAvgPercentile: number // percentil medio con el que acaban en ranking
}

export interface CleanupMetrics {
  totalSwipes: number
  rightRate: number // % marcadas vistas (0-100)
  upRate: number // % siguen guardadas (0-100)
  leftRate: number // % descartadas (0-100)
}

export interface SummaryKPIs {
  deck: DeckMetrics
  decide: DecideMetrics
  cleanup: CleanupMetrics
}

const defaultBucketCounts = (): DeckMetrics['byBucket'] => ({
  seen_likely: { shown: 0, right: 0, up: 0, left: 0, successRate: 0 },
  social: { shown: 0, right: 0, up: 0, left: 0, successRate: 0 },
  friend_gem: { shown: 0, right: 0, up: 0, left: 0, successRate: 0 },
  explore: { shown: 0, right: 0, up: 0, left: 0, successRate: 0 },
})

/**
 * Calcula las métricas del mazo de Descubrir
 */
export function calcDeckMetrics(events: EngineEvent[]): DeckMetrics {
  const swipes = events.filter((e) => e.type === 'deck_swipe')
  const shown = events.filter((e) => e.type === 'deck_shown')
  const byBucket = defaultBucketCounts()

  // Agrupar swipes por sesión para calcular acierto en las primeras 20
  const sessionSwipes = new Map<string, EngineEvent[]>()
  for (const s of swipes) {
    const list = sessionSwipes.get(s.sid) || []
    list.push(s)
    sessionSwipes.set(s.sid, list)
  }

  let first20Total = 0
  let first20Right = 0
  let totalMs = 0
  let msCount = 0

  for (const list of sessionSwipes.values()) {
    // Ordenar por tiempo
    list.sort((a, b) => a.t - b.t)
    const first20 = list.slice(0, 20)
    for (const s of first20) {
      first20Total++
      if (s.data?.dir === 'right') first20Right++
    }
  }

  let rightCount = 0
  let upCount = 0
  let leftCount = 0

  for (const s of swipes) {
    const dir = s.data?.dir as 'right' | 'up' | 'left' | undefined
    const bucket = s.data?.bucket as Bucket | undefined
    const ms = typeof s.data?.ms === 'number' ? s.data.ms : undefined

    if (ms !== undefined && ms > 0) {
      totalMs += ms
      msCount++
    }

    if (dir === 'right') rightCount++
    if (dir === 'up') upCount++
    if (dir === 'left') leftCount++

    if (bucket && byBucket[bucket]) {
      if (dir === 'right') byBucket[bucket].right++
      if (dir === 'up') byBucket[bucket].up++
      if (dir === 'left') byBucket[bucket].left++
    }
  }

  for (const sh of shown) {
    const bucket = sh.data?.bucket as Bucket | undefined
    if (bucket && byBucket[bucket]) {
      byBucket[bucket].shown++
    }
  }

  for (const b of Object.values(byBucket)) {
    const actTotal = b.right + b.up + b.left
    const base = b.shown > 0 ? b.shown : actTotal
    b.successRate = base > 0 ? Math.round(((b.right + b.up) / base) * 100) : 0
  }

  const totalSwipes = swipes.length
  const totalSessions = sessionSwipes.size

  // Calcular AUC de R vs right (MOTOR §2c.4, T11.4)
  const shownMap = new Map<string, number>()
  for (const e of events) {
    if (e.type === 'deck_shown' && typeof e.data?.r === 'number' && e.itemId) {
      shownMap.set(`${e.sid}|${e.itemId}`, e.data.r)
    }
  }

  const rPairs: { r: number; y: number }[] = []
  for (const s of swipes) {
    if (s.itemId) {
      const rVal = shownMap.get(`${s.sid}|${s.itemId}`) ?? (typeof s.data?.r === 'number' ? s.data.r : undefined)
      if (rVal != null) {
        rPairs.push({ r: rVal, y: s.data?.dir === 'right' ? 1 : 0 })
      }
    }
  }

  let aucR = 0.5
  const pos = rPairs.filter((p) => p.y === 1)
  const neg = rPairs.filter((p) => p.y === 0)
  if (pos.length > 0 && neg.length > 0) {
    let concordant = 0
    for (const p of pos) {
      for (const n of neg) {
        if (p.r > n.r) concordant += 1
        else if (p.r === n.r) concordant += 0.5
      }
    }
    aucR = Math.round((concordant / (pos.length * neg.length)) * 1000) / 1000
  }

  return {
    totalSwipes,
    totalSessions,
    first20Accuracy: first20Total > 0 ? Math.round((first20Right / first20Total) * 100) : 0,
    discoveryRate: totalSwipes > 0 ? Math.round((upCount / totalSwipes) * 100) : 0,
    dismissRate: totalSwipes > 0 ? Math.round((leftCount / totalSwipes) * 100) : 0,
    seenRate: totalSwipes > 0 ? Math.round((rightCount / totalSwipes) * 100) : 0,
    avgCardsPerSession: totalSessions > 0 ? Math.round((totalSwipes / totalSessions) * 10) / 10 : 0,
    avgMsPerCard: msCount > 0 ? Math.round(totalMs / msCount) : 0,
    aucR,
    byBucket,
  }
}

/**
 * Calcula las métricas del motor de Decidir
 */
export function calcDecideMetrics(events: EngineEvent[]): DecideMetrics {
  const sessions = new Map<string, EngineEvent[]>()
  for (const e of events) {
    if (e.type.startsWith('dec_')) {
      const list = sessions.get(e.sid) || []
      list.push(e)
      sessions.set(e.sid, list)
    }
  }

  let firstRoundAcceptCount = 0
  let acceptedCount = 0
  let abandonCount = 0
  let totalRejects = 0
  let totalDuels = 0
  let totalInfoGain = 0
  let duelCount = 0
  let slowDuelsCount = 0
  const duelMsList: number[] = []

  const slowDuelsByPhase: Record<string, { total: number; slow: number; pct: number }> = {
    F1: { total: 0, slow: 0, pct: 0 },
    F2: { total: 0, slow: 0, pct: 0 },
    F3: { total: 0, slow: 0, pct: 0 },
  }

  const slowDuelsByShelf: Record<ShelfType, { total: number; slow: number; pct: number }> = {
    movie: { total: 0, slow: 0, pct: 0 },
    series: { total: 0, slow: 0, pct: 0 },
    book: { total: 0, slow: 0, pct: 0 },
    boardgame: { total: 0, slow: 0, pct: 0 },
    artist: { total: 0, slow: 0, pct: 0 },
  }

  const acceptedItems = new Map<string, { itemId: string; acceptedAt: number }>()

  for (const [, list] of sessions) {
    let sessionAccepted = false
    let sessionRejects = 0
    let sessionDuels = 0

    for (const e of list) {
      if (e.type === 'dec_duel') {
        sessionDuels++
        const ig = typeof e.data?.infoGain === 'number' ? e.data.infoGain : 0
        totalInfoGain += ig
        duelCount++
        const ms = typeof e.data?.ms === 'number' ? e.data.ms : undefined
        if (ms != null && ms > 0) {
          duelMsList.push(ms)
          const isSlow = ms > 6000
          if (isSlow) slowDuelsCount++

          // Agrupación por fase (T19 §1.3)
          const rawPhase = (e.data?.phase as string) || 'F1'
          const ph = rawPhase === 'coarse' ? 'F1' : rawPhase === 'fine' ? 'F2' : rawPhase
          if (!slowDuelsByPhase[ph]) slowDuelsByPhase[ph] = { total: 0, slow: 0, pct: 0 }
          slowDuelsByPhase[ph].total++
          if (isSlow) slowDuelsByPhase[ph].slow++

          // Agrupación por estantería (T19 §1.3)
          if (e.shelf && slowDuelsByShelf[e.shelf]) {
            slowDuelsByShelf[e.shelf].total++
            if (isSlow) slowDuelsByShelf[e.shelf].slow++
          }
        }
      } else if (e.type === 'dec_reject') {
        sessionRejects++
      } else if (e.type === 'dec_accept') {
        sessionAccepted = true
        acceptedCount++
        const round = typeof e.data?.round === 'number' ? e.data.round : 1
        if (round === 1) firstRoundAcceptCount++
        if (e.itemId) {
          acceptedItems.set(e.itemId, { itemId: e.itemId, acceptedAt: e.t })
        }
      } else if (e.type === 'dec_abandon') {
        abandonCount++
      }
    }

    totalRejects += sessionRejects
    if (sessionAccepted) {
      totalDuels += sessionDuels
    }
  }

  // Medir acierto real a 14 días y percentil medio en ranking
  // Analizamos los eventos posteriores a la aceptación
  const statusEvents = events.filter((e) => e.type === 'entry_status' && e.data?.to === 'seen')
  const rankedEvents = events.filter((e) => e.type === 'entry_ranked')

  let convertedToSeen14d = 0
  let totalPctSum = 0
  let rankedCount = 0
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

  for (const [itemId, info] of acceptedItems) {
    const seenEv = statusEvents.find(
      (ev) => ev.itemId === itemId && ev.t >= info.acceptedAt && ev.t - info.acceptedAt <= FOURTEEN_DAYS_MS
    )
    if (seenEv) convertedToSeen14d++

    const rankEv = rankedEvents.find((ev) => ev.itemId === itemId && ev.t >= info.acceptedAt)
    if (rankEv && typeof rankEv.data?.pct === 'number') {
      totalPctSum += rankEv.data.pct
      rankedCount++
    }
  }

  duelMsList.sort((a, b) => a - b)
  const medianDuelMs = duelMsList.length > 0 ? duelMsList[Math.floor(duelMsList.length / 2)] : 0

  const totalSessions = sessions.size

  for (const ph of Object.values(slowDuelsByPhase)) {
    ph.pct = ph.total > 0 ? Math.round((ph.slow / ph.total) * 100) : 0
  }
  for (const sh of Object.values(slowDuelsByShelf)) {
    sh.pct = sh.total > 0 ? Math.round((sh.slow / sh.total) * 100) : 0
  }
  const slowDuelPct = duelMsList.length > 0 ? Math.round((slowDuelsCount / duelMsList.length) * 100) : 0

  return {
    totalSessions,
    acceptedSessions: acceptedCount,
    firstRoundAcceptRate: acceptedCount > 0 ? Math.round((firstRoundAcceptCount / acceptedCount) * 100) : 0,
    abandonRate: totalSessions > 0 ? Math.round((abandonCount / totalSessions) * 100) : 0,
    avgRejects: totalSessions > 0 ? Math.round((totalRejects / totalSessions) * 10) / 10 : 0,
    avgDuels: acceptedCount > 0 ? Math.round((totalDuels / acceptedCount) * 10) / 10 : 0,
    avgInfoGain: duelCount > 0 ? Math.round((totalInfoGain / duelCount) * 100) / 100 : 0,
    medianDuelMs,
    slowDuelPct,
    slowDuelsByPhase,
    slowDuelsByShelf,
    acceptedItemsCount: acceptedItems.size,
    realSuccessRate14d: acceptedItems.size > 0 ? Math.round((convertedToSeen14d / acceptedItems.size) * 100) : 0,
    realAvgPercentile: rankedCount > 0 ? Math.round((totalPctSum / rankedCount) * 100) / 100 : 0,
  }
}

/**
 * Calcula las métricas de Limpieza de pendientes
 */
export function calcCleanupMetrics(events: EngineEvent[]): CleanupMetrics {
  const swipes = events.filter((e) => e.type === 'clean_swipe')
  let right = 0
  let up = 0
  let left = 0

  for (const s of swipes) {
    const dir = s.data?.dir
    if (dir === 'right') right++
    else if (dir === 'up') up++
    else if (dir === 'left') left++
  }

  const total = swipes.length
  return {
    totalSwipes: total,
    rightRate: total > 0 ? Math.round((right / total) * 100) : 0,
    upRate: total > 0 ? Math.round((up / total) * 100) : 0,
    leftRate: total > 0 ? Math.round((left / total) * 100) : 0,
  }
}

/**
 * Agrupa y calcula todas las métricas filtradas opcionalmente por estantería o versión
 */
export function calcAllMetrics(
  events: EngineEvent[],
  filter?: { version?: string; shelf?: ShelfType }
): SummaryKPIs {
  let filtered = events
  if (filter?.version) filtered = filtered.filter((e) => e.v === filter.version)
  if (filter?.shelf) filtered = filtered.filter((e) => e.shelf === filter.shelf)

  return {
    deck: calcDeckMetrics(filtered),
    decide: calcDecideMetrics(filtered),
    cleanup: calcCleanupMetrics(filtered),
  }
}
