import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { AppText } from '../AppText'
import { colors } from '../../theme'

/** Puesto en un ranking (D25): «nº 3». Pastilla acento, texto 10 px en negrita. */
export function RankBadge({ pos, style }: { pos: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.pill, style]}>
      <AppText style={styles.text}>{`nº ${pos}`}</AppText>
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
  text: { fontFamily: 'Inter-700', fontSize: 10, lineHeight: 14, color: colors.accentInk, fontVariant: ['tabular-nums'] },
})
