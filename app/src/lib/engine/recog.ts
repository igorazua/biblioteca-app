/**
 * Motor R: Reconocibilidad unificada (MOTOR.md §2b.4)
 * Calcula cuán reconocible es una obra para un usuario basándose en datos:
 * - base: notoriedad en su país (notoriety[país]) o popPct
 * - era: edad del usuario al estreno (ventana formativa PARAMS.ERA_WINDOW)
 * - zona: tasa aprendida del mazo (deckLearn) por macro y década
 * - social: amigos que la conocen
 */

import type { Item, Status, UserEntry, DeckLearnShelf } from '../../types'
import { PARAMS } from './params'

export interface RecogFriend {
  id: string
  entries: { itemId: string; status: Status }[]
  affinity?: number
}

export interface RecogContext {
  user: {
    country?: string
    lang?: string
    birthYear?: number
  }
  entries?: Record<string, UserEntry>
  items?: Item[]
  deckLearn?: DeckLearnShelf
  friends?: RecogFriend[]
}

/**
 * Curva de época formativa según la edad del usuario al estreno (e = year - birthYear).
 * Usa PARAMS.ERA_WINDOW como única fuente de verdad del proyecto.
 */
export function eraFactor(
  year: number | undefined,
  birthYear: number | undefined,
  item?: Pick<Item, 'type' | 'isCanon' | 'schoolReading'>
): number {
  if (!year || !birthYear) return 0.75
  if (item?.type === 'boardgame') return 0.8 // Los juegos envejecen diferente

  const e = year - birthYear
  const isCanon = Boolean(item?.isCanon || item?.schoolReading)

  if (e < 0) {
    if (isCanon) return 0.9
    if (e <= -2) return 0.35
    // Transición suave entre -2 y 0 de 0.35 a 0.7
    return 0.35 + ((e + 2) / 2) * (0.7 - 0.35)
  }

  if (e < 12) {
    // Transición suave de infancia 0 a 11: 0.7 a 1.0
    return 0.7 + (e / 12) * (1.0 - 0.7)
  }

  const [wMin, wMax] = PARAMS.ERA_WINDOW
  if (e >= wMin && e <= wMax) {
    // Ventana formativa (12-25)
    return 1.0
  }

  if (e <= 35) {
    // Transición suave 26 a 35: 1.0 a 0.85
    return 1.0 - ((e - wMax) / (35 - wMax)) * (1.0 - 0.85)
  }

  if (e <= 37) {
    // Transición suave 35 a 37: 0.85 a 0.7
    return 0.85 - ((e - 35) / 2) * (0.85 - 0.7)
  }

  return 0.7
}

/**
 * Infiere el año de nacimiento a partir de la tasa «la vi» por década del mazo (MOTOR §2b.3).
 * No usa los años de lo visto directamente para evitar retroalimentación.
 */
export function inferBirthYear(
  entries?: Record<string, UserEntry>,
  items?: Item[],
  deckLearn?: DeckLearnShelf
): number | undefined {
  if (deckLearn?.byDecade) {
    const currentYear = new Date().getFullYear()
    const validDecades = Object.entries(deckLearn.byDecade).filter(([decade, stats]) => {
      const dNum = parseInt(decade, 10)
      return !isNaN(dNum) && dNum <= currentYear - 2 && stats.shown >= 5
    })

    const totalShown = validDecades.reduce((acc, [, s]) => acc + s.shown, 0)
    if (totalShown >= 60 && validDecades.length >= 3) {
      let bestRate = -1
      let bestDecade = 1990
      for (const [decade, stats] of validDecades) {
        const rate = stats.seen / stats.shown
        if (rate > bestRate) {
          bestRate = rate
          bestDecade = parseInt(decade, 10)
        }
      }
      const inferred = bestDecade + 5 - PARAMS.ERA_MEDIAN_AGE
      return Math.max(1940, Math.min(2012, Math.round(inferred)))
    }
  }

  // Fallback si no hay suficientes tarjetas de mazo pero sí entradas manuales
  if (entries && items && items.length > 0) {
    const itemMap = new Map<string, Item>(items.map((it) => [it.id, it]))
    const decadeCounts: Record<string, { seen: number; total: number }> = {}

    for (const [id, entry] of Object.entries(entries)) {
      if (entry.status !== 'seen') continue
      const it = itemMap.get(id)
      if (!it?.year) continue
      const dec = String(Math.floor(it.year / 10) * 10)
      if (!decadeCounts[dec]) decadeCounts[dec] = { seen: 0, total: 0 }
      decadeCounts[dec].seen++
    }

    const decades = Object.entries(decadeCounts).filter(([, c]) => c.seen >= 3)
    const totalSeen = decades.reduce((acc, [, c]) => acc + c.seen, 0)
    if (totalSeen >= 15 && decades.length >= 3) {
      let maxCount = -1
      let bestDec = 1990
      for (const [dec, c] of decades) {
        if (c.seen > maxCount) {
          maxCount = c.seen
          bestDec = parseInt(dec, 10)
        }
      }
      const inferred = bestDec + 5 - PARAMS.ERA_MEDIAN_AGE
      return Math.max(1940, Math.min(2012, Math.round(inferred)))
    }
  }

  return undefined
}

/**
 * Calcula la reconocibilidad R de una obra para un usuario (MOTOR §2b.4).
 */
export function recog(item: Item, ctx: RecogContext): number {
  // 1. Estados directos del usuario
  if (ctx.entries) {
    const userEntry = ctx.entries[item.id]
    if (userEntry?.status === 'seen') return 1.0
    if (userEntry?.status === 'pending') return 0.9
    // descartada no cuenta: «no me interesa» no significa «la conozco»
  }

  // 2. Base: notoriedad por país o popPct
  const country = ctx.user?.country || 'ES'
  const notMap = item.notoriety as Record<string, number> | undefined
  let base: number
  if (notMap?.[country] != null) {
    base = notMap[country]
  } else if (item.popPct != null) {
    base = (item.popPct / 100) * 0.8
  } else {
    base = ((item.popularity || 50) / 100) * 0.8
  }

  // 3. Época: año de nacimiento declarado manda, si no inferido
  const birthYear = ctx.user?.birthYear ?? inferBirthYear(ctx.entries, ctx.items, ctx.deckLearn)
  const era = eraFactor(item.year, birthYear, item)

  // 4. Zona: tasa de «la vi» de deckLearn (§7.6) en el macro y década
  let zona = 0.5
  if (ctx.deckLearn) {
    const macro = item.genres?.[0] || 'General'
    const decade = item.year ? String(Math.floor(item.year / 10) * 10) : 'unknown'

    const macroStats = ctx.deckLearn.byMacro?.[macro]
    const decadeStats = ctx.deckLearn.byDecade?.[decade]

    let sum = 0
    let count = 0
    if (macroStats && macroStats.shown > 0) {
      sum += (macroStats.seen + 1) / (macroStats.shown + 2) // Suavizado bayesiano
      count++
    }
    if (decadeStats && decadeStats.shown > 0) {
      sum += (decadeStats.seen + 1) / (decadeStats.shown + 2)
      count++
    }

    if (count > 0) zona = sum / count
  }

  // 5. Social: amigos que la tienen vista o pendiente
  let social = 0
  if (ctx.friends && ctx.friends.length > 0) {
    let socialProd = 1.0
    for (const f of ctx.friends) {
      const fe = f.entries.find((e) => e.itemId === item.id)
      if (fe && (fe.status === 'seen' || fe.status === 'pending')) {
        const aff = f.affinity ?? 50
        const wf = 0.5 + (aff / 100) * 0.5
        socialProd *= 1 - PARAMS.R_W.socialFriendRate * wf
      }
    }
    social = 1 - socialProd
  }

  // 6. Fórmula R (MOTOR §2b.4):
  // R = 1 - (1 - base · era · (0.6 + 0.4·zona)) · (1 - social)
  const zCoeff = PARAMS.R_W.zona
  const familiarTerm = base * era * (zCoeff[0] + zCoeff[1] * zona)
  const r = 1 - (1 - familiarTerm) * (1 - social)

  return Math.max(0, Math.min(1, r))
}
