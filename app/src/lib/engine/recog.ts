/**
 * recog.ts — Motor R: Reconocibilidad de obras para un usuario (MOTOR.md §2b.4, §2b.3).
 *
 * Fuente única de reconocibilidad en la app. La usan:
 * 1. Selección de orientadores en Decidir (duelos).
 * 2. Cupo seen_likely en el mazo de Descubrir.
 */

import type { Friend, Item, Profile, UserEntry, DeckLearnShelf } from '../../types'
import { PARAMS } from './params'

export interface RecogFriend {
  id: string
  entries: { itemId: string; status: 'pending' | 'seen' | string }[]
  affinity?: number
}

export interface RecogContext {
  country?: string
  birthYear?: number
  user?: Partial<Profile>
  entries?: Record<string, UserEntry>
  friends?: (Friend | RecogFriend)[]
  affinity?: (friendId: string) => number | null
  deckLearn?: Record<string, { shown: number; seen: number }> | DeckLearnShelf
  items?: Item[]
  doubtfulItems?: Record<string, number>
}

/**
 * Calcula el factor de época según la edad del usuario al estreno de la obra (MOTOR §2b.4).
 */
export function eraFactor(
  year: number,
  birthYear?: number,
  item?: Partial<Item>,
  country = 'ES'
): number {
  if (!birthYear) return 0.75

  // Para artistas con peakDecades, evaluar si alguna década de éxito coincide con la ventana formativa (MOTOR §2b.4, T13)
  if (item?.type === 'artist' && Array.isArray(item?.peakDecades) && item.peakDecades.length > 0) {
    const [wMin, wMax] = PARAMS.ERA_WINDOW
    for (const dec of item.peakDecades) {
      const match = dec.match(/^(\d{4})/)
      if (match) {
        const midDecadeYear = parseInt(match[1], 10) + 5
        const ageAtPeak = midDecadeYear - birthYear
        if (ageAtPeak >= wMin && ageAtPeak <= wMax) {
          return 1.0
        }
        if (ageAtPeak >= wMin - 2 && ageAtPeak <= wMax + 10) {
          return 0.90
        }
      }
    }
  }

  const e = year - birthYear
  const isCanonOrSchool = Boolean(
    item?.isCanon ||
    (item as Record<string, unknown>)?.schoolReading === true ||
    ((item as Record<string, unknown>)?.schoolReading as Record<string, boolean>)?.[country]
  )

  if (e < 0) {
    return isCanonOrSchool ? 0.90 : 0.35
  }

  // Curva generacional con transiciones lineales suaves de 2 años (MOTOR §2b.4, PARAMS.ERA_WINDOW [12, 25])
  const [wMin, wMax] = PARAMS.ERA_WINDOW

  if (e < wMin) {
    // 0..11 años: base 0.70 transicionando a 1.0 entre (wMin-2) y wMin
    if (e >= wMin - 2) {
      const t = (e - (wMin - 2)) / 2
      return 0.70 + t * 0.30
    }
    return 0.70
  }

  if (e <= wMax) {
    // Ventana formativa principal: 1.0
    return 1.0
  }

  if (e <= 35) {
    // 26..35 años: 0.85 con transición desde 1.0 entre wMax y (wMax+2)
    if (e <= wMax + 2) {
      const t = (e - wMax) / 2
      return 1.0 - t * 0.15
    }
    return 0.85
  }

  // > 35 años: 0.70 con transición desde 0.85
  if (e <= 37) {
    const t = (e - 35) / 2
    return 0.85 - t * 0.15
  }

  return 0.70
}

/**
 * Infiere el año de nacimiento del usuario a partir de deckLearn o de sus obras vistas (MOTOR §2b.3).
 * Acotado a [1940, 2012].
 */
export function inferBirthYear(
  entries: Record<string, UserEntry>,
  items: Item[],
  deckLearn?: Record<string, { shown: number; seen: number }>
): number | null {
  const medianAge = PARAMS.ERA_MEDIAN_AGE || 25

  // 1. Si tenemos datos de deckLearn por década (§2b.3)
  if (deckLearn) {
    const decadeRates: { decade: number; rate: number; count: number }[] = []
    for (const [key, stats] of Object.entries(deckLearn)) {
      const match = key.match(/^(\d{4})s?$/)
      if (match && stats.shown >= 10) {
        const decade = parseInt(match[1], 10)
        decadeRates.push({
          decade,
          rate: stats.seen / stats.shown,
          count: stats.shown,
        })
      }
    }

    if (decadeRates.length >= 3) {
      decadeRates.sort((a, b) => b.rate - a.rate)
      const top = decadeRates[0]
      const inferred = top.decade + 5 - medianAge
      return Math.min(2012, Math.max(1940, Math.round(inferred)))
    }
  }

  // 2. Fallback: calcular a partir de las obras vistas (seen)
  const itemsById = new Map(items.map((i) => [i.id, i]))
  const seenYears: number[] = []

  for (const [id, entry] of Object.entries(entries)) {
    if (entry.status === 'seen') {
      const item = itemsById.get(id)
      if (item?.year && !item.isCanon) {
        seenYears.push(item.year)
      }
    }
  }

  if (seenYears.length < 5) return null

  seenYears.sort((a, b) => a - b)
  const midYear = seenYears[Math.floor(seenYears.length / 2)]
  const inferred = midYear - medianAge

  return Math.min(2012, Math.max(1940, Math.round(inferred)))
}

/**
 * Reconocibilidad R de una obra para un usuario (MOTOR §2b.4, T17 §A.4).
 * Devuelve una probabilidad calibrada en [0.01, 1.0].
 */
export function recog(item: Item, ctx: RecogContext): number {
  const entries = ctx.entries || {}
  const entry = entries[item.id]
  const status = entry?.status

  // 1. Lo del usuario manda: vista, valorada, comparada o en su ranking -> R = 1.0; pendiente -> 0.9
  if (
    status === 'seen' ||
    entry?.stars != null ||
    (entry?.cmp ?? 0) > 0 ||
    entry?.ranked === true
  ) {
    return 1.0
  }
  if (status === 'pending') return 0.9
  // Descartada no cuenta: «no me interesa» no significa «la conozco»

  const country = ctx.country ?? ctx.user?.country ?? 'ES'
  const birthYear =
    ctx.birthYear ??
    ctx.user?.birthYear ??
    (ctx.items && ctx.entries ? inferBirthYear(ctx.entries, ctx.items) ?? undefined : undefined)

  // Nivel de fama calibrado (fameTier: 1..4)
  const tierVal = typeof item.fameTier === 'object' && item.fameTier !== null
    ? (item.fameTier as Record<string, number>)[country] ?? 4
    : (item.fameTier ?? 4)
  const fameTier = typeof tierVal === 'number' ? tierVal : 4

  // Notoriedad base
  let base = 0.5
  if (typeof item.notoriety === 'number') {
    base = item.notoriety
  } else if (item.notoriety && typeof item.notoriety === 'object') {
    const byCountry = (item.notoriety as Record<string, number>)[country]
    if (byCountry != null) base = byCountry
  } else if (item.popPct != null) {
    base = (item.popPct / 100) * 0.8
  } else if (item.popularity != null) {
    base = (item.popularity / 100) * 0.8
  }

  // 2. Factor época (§A.4)
  // Sin año de nacimiento: 1.0 para niveles 1 y 2, 0.9 para el resto
  // Con año: curva actual, pero a las de nivel 1 nunca se les baja de 0.95
  let era = 1.0
  if (!birthYear) {
    era = fameTier === 1 || fameTier === 2 ? 1.0 : 0.9
  } else {
    const rawEra = eraFactor(item.year || 2000, birthYear, item, country)
    era = fameTier === 1 ? Math.max(0.95, rawEra) : rawEra
  }

  // 3. Factor zona neutra si no hay datos (§A.4)
  // Si la década de la obra tiene menos de 10 tarjetas vistas en el mazo -> zonaMult = 1
  // Si no -> tasa = (seen + 2) / (shown + 4), zonaMult = clamp(0.75, 1.1, 0.8 + 0.4 * tasa)
  let zonaMult = 1.0
  if (ctx.deckLearn) {
    const decadeStr = `${Math.floor((item.year || 2000) / 10) * 10}s`
    const stats = (ctx.deckLearn as Record<string, { shown: number; seen: number } | undefined>)[decadeStr]
    if (stats && stats.shown >= 10) {
      const tasa = (stats.seen + 2) / (stats.shown + 4)
      zonaMult = Math.min(1.1, Math.max(0.75, 0.8 + 0.4 * tasa))
    }
  }

  // 4. Factor social (amigos que la tienen vista o pendiente)
  let socialProduct = 1.0
  const friends = ctx.friends || []
  const socialRate = PARAMS.R_W?.socialFriendRate || 0.35

  for (const f of friends) {
    const hasWork = f.entries?.some(
      (e) => e.itemId === item.id && (e.status === 'seen' || e.status === 'pending')
    )
    if (hasWork) {
      const aff = ctx.affinity ? ctx.affinity(f.id) : null
      const wf = 0.5 + (aff ?? 50) / 100
      socialProduct *= Math.max(0, 1 - socialRate * (wf / 1.5))
    }
  }
  const social = 1.0 - socialProduct

  // 5. Fórmula (§A.4): R = 1 - (1 - base · época · zonaMult) · (1 - social)
  const personalKnown = base * era * zonaMult
  const r = 1.0 - (1.0 - personalKnown) * (1.0 - social)

  // 6. Red de seguridad: si la obra fue marcada como dudosa (duelo > 6s en los últimos 90 días), R x 0.5 (T19 §1.3)
  const doubtfulTs = ctx.doubtfulItems?.[item.id]
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000
  const isDoubtful = doubtfulTs != null && Date.now() - doubtfulTs < NINETY_DAYS_MS
  const finalR = isDoubtful ? r * 0.5 : r

  return Math.min(1.0, Math.max(0.01, finalR))
}
