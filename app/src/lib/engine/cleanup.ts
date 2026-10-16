import type { Item, UserEntry } from '../../types'
import { PARAMS } from './params'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Ordena las obras pendientes para la sesión de limpieza (MOTOR.md §9).
 *
 * Reglas de orden:
 * 1. Primero las más antiguas sin reviewedAt reciente (updatedAt asc).
 * 2. Entre ellas, las que algún amigo ha visto hace poco tienen preferencia (más fáciles de decidir).
 * 3. Las revisadas hace menos de 60 días van al final (ordenadas por reviewedAt asc).
 */
export function cleanupOrder(
  pendingItems: Item[],
  entries: Record<string, UserEntry>,
  getFriendsRecent?: (itemId: string) => boolean,
  now: number = Date.now(),
  recentDays: number = PARAMS.CLEANUP_RECENT_D || 60
): Item[] {
  const recentThreshold = now - recentDays * DAY_MS

  return [...pendingItems].sort((a, b) => {
    const ea = entries[a.id]
    const eb = entries[b.id]

    const aReviewedRecently = (ea?.reviewedAt || 0) > recentThreshold
    const bReviewedRecently = (eb?.reviewedAt || 0) > recentThreshold

    // 1. Las revisadas recientemente van al final
    if (aReviewedRecently && !bReviewedRecently) return 1
    if (!aReviewedRecently && bReviewedRecently) return -1
    if (aReviewedRecently && bReviewedRecently) {
      return (ea?.reviewedAt || 0) - (eb?.reviewedAt || 0)
    }

    // 2. Si no están revisadas recientemente:
    const aFriendRecent = getFriendsRecent ? getFriendsRecent(a.id) : false
    const bFriendRecent = getFriendsRecent ? getFriendsRecent(b.id) : false

    // Las que amigos han visto recientemente van antes (más fáciles de decidir)
    if (aFriendRecent && !bFriendRecent) return -1
    if (!aFriendRecent && bFriendRecent) return 1

    // 3. Por antigüedad de la entrada: las más antiguas primero
    const aTime = ea?.updatedAt || 0
    const bTime = eb?.updatedAt || 0
    return aTime - bTime
  })
}
