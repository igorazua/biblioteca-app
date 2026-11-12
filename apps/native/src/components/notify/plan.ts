import { evaluateNudges, type NotificationTier, type NudgeDismissHistory, type NudgeId, type ShelfType, type UserEntry } from '@biblioteca/core'

/**
 * Plan de avisos locales. La PWA no programa avisos en el móvil: los manda el servidor (`biblio-push-send`) y su regla
 * (PLAN_MEJORAS §5.3) es «las mismas reglas de `nudges.ts`, máximo 2 por semana, nunca entre las 22:00 y las 9:00».
 * Aquí se reproduce en el móvil: los textos salen de `evaluateNudges` (los de los recordatorios de la app) y el relleno
 * es el texto por defecto de `biblio-push-send`. Función pura: no toca expo-notifications.
 */

/** Cada aviso se programa para dentro de estas semanas; la app los recalcula cada vez que se abre. */
export const WEEKS_AHEAD = 2

/** 0 = domingo. Horas en la hora local del móvil, dentro de 9:00-22:00. */
export interface Slot { weekday: number; hour: number; minute: number }
export const SLOTS: Record<Exclude<NotificationTier, 'none'>, Slot[]> = {
  // «Solo importantes»: un aviso a la semana
  important: [{ weekday: 0, hour: 12, minute: 0 }],
  // «Todas»: dos a la semana (el máximo de §5.3)
  all: [
    { weekday: 0, hour: 12, minute: 0 },
    { weekday: 4, hour: 19, minute: 0 },
  ],
}

/** Recordatorios que no tienen sentido como aviso fuera de la app (piden iniciar sesión, importar o instalar la PWA). */
const NEVER_PUSHED: NudgeId[] = ['login', 'import', 'install']
const FOREVER: NudgeDismissHistory = { count: 99, lastDismissedAt: 0 }

export const FALLBACK_BODY = 'Tienes nuevas recomendaciones esperándote.' // texto por defecto de biblio-push-send
export const TITLE = 'Biblioteca'

export interface ReminderInput {
  hasAccount: boolean
  entries: Record<string, UserEntry>
  rankings: Record<ShelfType, string[]>
  friendsCount: number
  hasUsedDecide: boolean
  dismissHistory?: Record<string, NudgeDismissHistory>
  now?: number
}

export interface PlannedReminder {
  /** Identificador estable: `<franja>-<semana>`; sirve para no duplicar al reprogramar. */
  key: string
  title: string
  body: string
  /** Ruta a la que lleva al tocarlo. */
  route: string
  /** Momento de entrega (ms). */
  at: number
}

/** Textos y rutas de la franja `i`: el aviso de mayor prioridad que aplica; la segunda franja, el siguiente. */
export function contentFor(input: ReminderInput, slotIndex: number): { body: string; route: string } | null {
  const history: Record<string, NudgeDismissHistory> = { ...input.dismissHistory }
  for (const id of NEVER_PUSHED) history[id] = FOREVER
  let found: { body: string; route: string } | null = null
  for (let i = 0; i <= slotIndex; i++) {
    const n = evaluateNudges({
      hasAccount: input.hasAccount,
      entries: input.entries,
      rankings: input.rankings,
      hasImported: true,
      friendsCount: input.friendsCount,
      hasUsedDecide: input.hasUsedDecide,
      isStandalonePwa: true,
      isMobile: false,
      daysOfUsage: 0,
      dismissHistory: history,
      now: input.now,
    })
    if (!n) {
      found = null
      break
    }
    history[n.id] = FOREVER
    found = { body: n.message, route: n.actionType === 'navigate' && n.targetRoute ? n.targetRoute : n.actionType === 'invite' ? '/perfil' : '/' }
  }
  return found
}

/** Próximas fechas de una franja (hora local), empezando por la primera que aún no ha pasado. */
export function nextDates(slot: Slot, now: number, weeks = WEEKS_AHEAD): Date[] {
  const out: Date[] = []
  const base = new Date(now)
  for (let d = 0; out.length < weeks && d < 7 * (weeks + 1); d++) {
    const t = new Date(base.getFullYear(), base.getMonth(), base.getDate() + d, slot.hour, slot.minute, 0, 0)
    if (t.getDay() === slot.weekday && t.getTime() > now + 60_000) out.push(t)
  }
  return out
}

export function planReminders(tier: NotificationTier, input: ReminderInput): PlannedReminder[] {
  if (tier === 'none') return []
  const now = input.now ?? Date.now()
  const out: PlannedReminder[] = []
  SLOTS[tier].forEach((slot, i) => {
    // «Solo importantes» no rellena: si no hay nada que decir, no avisa. «Todas» cae al texto por defecto.
    const c = contentFor(input, i) ?? (tier === 'all' ? { body: FALLBACK_BODY, route: '/' } : null)
    if (!c) return
    nextDates(slot, now).forEach((at, w) => out.push({ key: `${tier}-${i}-${w}`, title: TITLE, body: c.body, route: c.route, at: at.getTime() }))
  })
  return out.sort((a, b) => a.at - b.at)
}
