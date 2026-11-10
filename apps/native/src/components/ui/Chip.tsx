import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { AppText } from '../AppText'
import { Press } from '../Press'
import { alpha, colors } from '../../theme'

// Chip de ui.tsx de la PWA. El backdrop-blur no se porta: el fondo queda liso (MEDIDAS_NATIVA, «Chip»).
export interface ChipProps {
  active?: boolean
  onPress?: () => void
  children: string
  style?: StyleProp<ViewStyle>
}

export function Chip({ active = false, onPress, children, style }: ChipProps) {
  return (
    <Press
      accessibilityRole="button"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={[styles.base, active ? styles.on : styles.off, style]}
    >
      <AppText numberOfLines={1} style={[styles.text, { color: active ? colors.accentInk : alpha(colors.ink, 0.8) }]}>
        {children}
      </AppText>
    </Press>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  on: { backgroundColor: colors.accent, borderColor: colors.accent },
  off: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' },
  text: { fontFamily: 'Inter-500', fontSize: 14, lineHeight: 20 },
})
