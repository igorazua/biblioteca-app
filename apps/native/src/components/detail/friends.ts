import { friendHits, friendRanks, getItem, type Friend, type FriendHit } from '@biblioteca/core'
import type { BubbleFriend } from '../ui'

/** Puesto de una obra en el ranking de un amigo (§14.6, D25): «nº 2 de sus 48 pelis». El mismo cálculo que las burbujas. */
export const friendRank = (friend: Friend, itemId: string) => friendRanks(friend, getItem)[itemId] ?? null

/** Amigos con la obra, en la forma que pide `FriendBubbles`. */
export function bubbleHits(itemId: string, hits: FriendHit[] = friendHits(itemId)): BubbleFriend[] {
  return hits.map(({ friend, entry }) => ({
    id: friend.id,
    name: friend.name,
    avatarColor: friend.avatarColor,
    avatarUrl: friend.avatarUrl,
    status: entry.status,
    comment: entry.comment ?? null,
    rank: friendRank(friend, itemId),
  }))
}
