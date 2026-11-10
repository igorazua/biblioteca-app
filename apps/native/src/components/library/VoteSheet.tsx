import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { colors, tx } from '../../theme'
import { AppText } from '../AppText'
import { Icon } from '../Icon'
import { Press } from '../Press'
import { Sheet } from '../ui'
import { FUTURE_SHELVES } from './shelfMeta'

/** Hoja «Votar estanterías» (Library.tsx:227-244). Los votos son de ejemplo, como en la PWA. */
export function VoteSheet({ votes, onToggle, onClose }: { votes: Record<string, boolean>; onToggle: (name: string) => void; onClose: () => void }) {
  return (
    <Sheet label="Votar estanterías" onClose={onClose} height="70%">
      <AppText style={[tx('title'), { color: colors.ink }]}>¿Qué estantería quieres después?</AppText>
      <AppText style={[tx('meta'), { marginTop: 4, marginBottom: 12 }]}>Los votos de la comunidad son de ejemplo en esta demo.</AppText>
      <ScrollView style={{ maxHeight: 360 }}>
        <View style={{ gap: 8 }}>
          {FUTURE_SHELVES.map(([name, base]) => {
            const on = !!votes[name]
            return (
              <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface2, borderRadius: 16, paddingHorizontal: 16, minHeight: 52 }}>
                <AppText style={{ flex: 1, fontFamily: 'Inter-500', fontSize: 15, color: colors.ink }}>{name}</AppText>
                <AppText style={[tx('meta'), { fontVariant: ['tabular-nums'] }]}>{base + (on ? 1 : 0)}</AppText>
                <Press onPress={() => onToggle(name)} accessibilityRole="button" accessibilityLabel={`Votar ${name}`} accessibilityState={{ checked: on }} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="heart" size={24} color={on ? '#ef4b6b' : '#7b7b84'} fill={on ? '#ef4b6b' : 'none'} />
                </Press>
              </View>
            )
          })}
        </View>
      </ScrollView>
    </Sheet>
  )
}
