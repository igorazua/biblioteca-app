import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { AppText } from '../AppText'
import { colors } from '../../theme'

/**
 * Puesto en un ranking (D25): «nº 3». Pastilla acento con texto en negrita.
 * `sm` es la de las portadas y avatares (10 px, 6 × 1). `lg` es la de la ficha (ItemDetail: `!text-xs !px-2.5 !py-1`, 12 px, 10 × 4).
 */
export type RankBadgeSize = 'sm' | 'lg'

export function RankBadge({ pos, size = 'sm', style }: { pos: number; size?: RankBadgeSize; style?: StyleProp<ViewStyle> }) {
  const lg = size === 'lg'
  return (
    <View style={[styles.pill, lg ? styles.pillLg : null, style]}>
      <AppText style={[styles.text, lg ? styles.textLg : null]}>{`nº ${pos}`}</AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  pillLg: { paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontFamily: 'Archivo-SemiBold', fontSize: 10, lineHeight: 14, color: colors.accentInk, fontVariant: ['tabular-nums'] },
  textLg: { fontSize: 12, lineHeight: 16 },
})
