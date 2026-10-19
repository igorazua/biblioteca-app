// app/src/lib/nudges.ts
// Motor puro de recordatorios (F-NUDGES)
import { SHELVES, SHELF_LABEL, type ShelfType, type UserEntry } from '../types'

export type NudgeId = 'login' | 'import' | 'explore' | 'rank' | 'invite' | 'decide' | 'install'

export interface Nudge {
  id: NudgeId
  message: string
  actionLabel: string
  actionType: 'login' | 'navigate' | 'invite' | 'install'
  targetRoute?: string
  shelf?: ShelfType
}

export interface NudgeDismissHistory {
  count: number
  lastDismissedAt: number
}

export interface NudgeInput {
  hasAccount: boolean
  entries: Record<string, UserEntry>
  rankings: Record<ShelfType, string[]>
  hasImported: boolean
  friendsCount: number
  hasUsedDecide: boolean
  isStandalonePwa: boolean
  isMobile: boolean
  daysOfUsage: number
  dismissHistory?: Record<string, NudgeDismissHistory>
  sessionNudgeShown?: boolean
  now?: number
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

export function canShowNudge(
  id: NudgeId,
  dismissHistory: Record<string, NudgeDismissHistory> = {},
  now = Date.now()
): boolean {
  const history = dismissHistory[id]
  if (!history) return true
  if (history.count >= 3) return false
  if (now - history.lastDismissedAt < THREE_DAYS_MS) return false
  return true
}

export function evaluateNudges(input: NudgeInput): Nudge | null {
  if (input.sessionNudgeShown) return null

  const now = input.now ?? Date.now()
  const history = input.dismissHistory ?? {}

  const allEntries = Object.values(input.entries)
  const totalSaved = allEntries.filter((e) => e.status === 'seen' || e.status === 'pending').length
  const totalSeen = allEntries.filter((e) => e.status === 'seen').length
  const totalPending = allEntries.filter((e) => e.status === 'pending').length

  const unrankedSeen = allEntries.filter(
    (e) => e.status === 'seen' && (!e.ranked || e.provisional)
  ).length

  // Helper de comprobación
  const check = (id: NudgeId) => canShowNudge(id, history, now)

  // 1. login: Sin cuenta y >= 5 obras guardadas
  if (!input.hasAccount && totalSaved >= 5 && check('login')) {
    return {
      id: 'login',
      message: `Tus ${totalSaved} obras solo viven en este móvil. Entra para no perderlas.`,
      actionLabel: 'Entrar con Google',
      actionType: 'login',
    }
  }

  // 2. import: Nunca importó y < 30 obras en una estantería de pelis/series/libros
  const movieCount = allEntries.filter((e) => (e.shelf ?? 'movie') === 'movie').length
  const seriesCount = allEntries.filter((e) => e.shelf === 'series').length
  const bookCount = allEntries.filter((e) => e.shelf === 'book').length
  const eligibleForImport = movieCount < 30 || seriesCount < 30 || bookCount < 30

  if (!input.hasImported && eligibleForImport && check('import')) {
    return {
      id: 'import',
      message: '¿Tienes tus pelis en Letterboxd o IMDb? Tráelas en 1 minuto.',
      actionLabel: 'Importar',
      actionType: 'navigate',
      targetRoute: '/importar',
    }
  }

  // 3. explore: Una estantería sin tocar con >= 10 en otra
  const shelfCounts: Record<ShelfType, number> = {
    movie: movieCount,
    series: seriesCount,
    book: bookCount,
    artist: allEntries.filter((e) => e.shelf === 'artist').length,
    boardgame: allEntries.filter((e) => e.shelf === 'boardgame').length,
  }

  const hasBusyShelf = SHELVES.some((s) => shelfCounts[s] >= 10)
  const emptyShelf = SHELVES.find((s) => shelfCounts[s] === 0)

  if (hasBusyShelf && emptyShelf && check('explore')) {
    const label = SHELF_LABEL[emptyShelf].plural
    return {
      id: 'explore',
      shelf: emptyShelf,
      message: `Aún no has mirado ${label}. ¿Probamos 10 tarjetas?`,
      actionLabel: `Explorar ${label}`,
      actionType: 'navigate',
      targetRoute: `/descubrir?shelf=${emptyShelf}`,
    }
  }

  // 4. rank: >= 5 vistas sin colocar
  if (unrankedSeen >= 5 && check('rank')) {
    return {
      id: 'rank',
      message: `Tienes ${unrankedSeen} sin colocar en tu ranking. 1 minuto de duelos.`,
      actionLabel: 'Ir a Comparar',
      actionType: 'navigate',
      targetRoute: '/comparar',
    }
  }

  // 5. invite: Con cuenta, 0 amigos y >= 15 obras
  if (input.hasAccount && input.friendsCount === 0 && totalSaved >= 15 && check('invite')) {
    return {
      id: 'invite',
      message: 'Invita a alguien y mirad vuestra afinidad.',
      actionLabel: 'Compartir invitación',
      actionType: 'invite',
    }
  }

  // 6. decide: >= 10 pendientes y nunca usó Decidir
  if (totalPending >= 10 && !input.hasUsedDecide && check('decide')) {
    return {
      id: 'decide',
      message: `Tienes ${totalPending} pendientes. ¿Te ayudo a elegir una?`,
      actionLabel: 'Decidir',
      actionType: 'navigate',
      targetRoute: '/decidir',
    }
  }

  // 7. install: Móvil, PWA sin instalar, 2.º día de uso
  if (input.isMobile && !input.isStandalonePwa && input.daysOfUsage >= 2 && check('install')) {
    return {
      id: 'install',
      message: 'Añádela a tu pantalla de inicio para abrirla como una app.',
      actionLabel: 'Instalar',
      actionType: 'install',
    }
  }

  return null
}
