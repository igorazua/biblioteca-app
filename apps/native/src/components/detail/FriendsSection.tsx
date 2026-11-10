import { View } from 'react-native'
import { SHELF_LABEL, type FriendHit, type Item } from '@biblioteca/core'
import { AppText } from '../AppText'
import { AskFriend } from '../AskFriend'
import { Icon } from '../Icon'
import { Avatar, RankBadge } from '../ui'
import { titleOf } from '../../lib/item'
import { alpha, colors, tx } from '../../theme'
import { friendRank } from './friends'

/** «¿Quién la vio antes que yo?»: tarjetas de los amigos que la han visto y los que la tienen pendiente (ItemDetail.tsx:243-268). */
export function FriendsSection({ item, hits, onNotify }: { item: Item; hits: FriendHit[]; onNotify: (m: string) => void }) {
  const label = SHELF_LABEL[item.type]
  const seenBy = hits.filter((h) => h.entry.status === 'seen')
  const pendingBy = hits.filter((h) => h.entry.status === 'pending')
  const askText = (name: string, pos: number) =>
    `Oye ${name}, he visto que tienes ${titleOf(item)} en el puesto ${pos} de tus ${label.plural.toLowerCase()}, ¿me ${label.pronoun} recomiendas?`

  return (
    <View accessibilityLabel="Tus amigos">
      <AppText style={[tx('label'), { marginBottom: 8 }]}>{`¿Quién ${label.pronoun} ${label.verbPast} antes que yo?`}</AppText>
      {seenBy.length === 0 && <AppText style={tx('meta')}>{`Ninguno de tus amigos ${label.verbPerfSingular} todavía.`}</AppText>}
      <View style={{ gap: 12 }}>
        {seenBy.map(({ friend, entry: e }) => {
          const r = friendRank(friend, item.id)
          return (
            <View key={friend.id} style={{ borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar name={friend.name} color={friend.avatarColor} url={friend.avatarUrl} size={36} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText style={[tx('body'), { fontFamily: 'Inter-600', color: colors.ink }]}>{friend.name}</AppText>
                  {r ? <AppText style={tx('meta')}>{`nº ${r.pos} de sus ${r.total} ${label.plural.toLowerCase()}`}</AppText> : null}
                </View>
                {r ? <RankBadge pos={r.pos} size="lg" /> : null}
              </View>
              {e.comment ? <AppText style={[tx('body'), { marginTop: 8, fontFamily: 'Fraunces72-400', fontStyle: 'italic', color: alpha(colors.ink, 0.9) }]}>{`«${e.comment}»`}</AppText> : null}
              {r ? <AskFriend friend={friend} message={askText(friend.name, r.pos)} onNotify={onNotify} /> : null}
            </View>
          )
        })}
      </View>
      {pendingBy.length > 0 && (
        <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
          <View style={{ marginTop: 1.5 }}>
            <Icon name="bookmark" size={15} color={colors.mute} />
          </View>
          <AppText style={[tx('meta'), { flex: 1 }]}>{`${label.pendingPlural}: ${pendingBy.map((h) => h.friend.name).join(', ')}`}</AppText>
        </View>
      )}
    </View>
  )
}
