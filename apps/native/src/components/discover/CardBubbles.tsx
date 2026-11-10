import { useMemo } from 'react'
import { SHELF_LABEL, friendHits, friendRanks, getItem, type ShelfType } from '@biblioteca/core'
import { FriendBubbles, type BubbleFriend } from '../ui'

/**
 * Caras de amigos sobre la carta (FriendBubbles de la PWA con `friendHits`). Sin cuenta (D7) siempre es de ejemplo.
 * Se pinta fuera del detector de gestos de la carta: tocar o mantener pulsada una cara no mueve ni abre la carta
 * (en la PWA lo corta `stopPropagation`).
 */
export function CardBubbles({ itemId, shelf }: { itemId: string; shelf: ShelfType }) {
  const hits = useMemo<BubbleFriend[]>(
    () =>
      friendHits(itemId).map((h) => {
        const r = friendRanks(h.friend, getItem)[itemId]
        return {
          id: h.friend.id,
          name: h.friend.name,
          avatarColor: h.friend.avatarColor,
          avatarUrl: h.friend.avatarUrl,
          status: h.entry.status === 'seen' ? 'seen' : 'pending',
          comment: h.entry.comment,
          rank: h.entry.status === 'seen' && r ? { pos: r.pos, total: r.total } : null,
        }
      }),
    [itemId],
  )
  if (!hits.length) return null
  return <FriendBubbles hits={hits} terms={SHELF_LABEL[shelf]} example />
}
