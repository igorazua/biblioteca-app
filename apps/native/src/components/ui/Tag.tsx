import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { AppText } from '../AppText'
import { alpha, colors } from '../../theme'

// Tag de ui.tsx de la PWA: etiqueta informativa, no interactiva. MEDIDAS_NATIVA, «Tag».
export type TagVariant = 'default' | 'accent' | 'brand' | 'subtle'

const VARIANT: Record<TagVariant, { bg: string; text: string; border: string }> = {
  default: { bg: colors.surface, text: alpha(colors.ink, 0.75), border: colors.line },
  accent: { bg: alpha(colors.accent, 0.15), text: colors.accent, border: alpha(colors.accent, 0.3) },
  brand: { bg: colors.surface2, text: colors.ink, border: colors.line },
  subtle: { bg: alpha(colors.surface2, 0.6), text: colors.mute, border: alpha(colors.line, 0.6) },
}

export interface TagProps {
  children: string
  variant?: TagVariant
  style?: StyleProp<ViewStyle>
}

export function Tag({ children, variant = 'default', style }: TagProps) {
  const v = VARIANT[variant]
  return (
    <View style={[styles.box, { backgroundColor: v.bg, borderColor: v.border }, style]}>
      <AppText numberOfLines={1} style={[styles.text, { color: v.text }]}>
        {children}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  text: {
    fontFamily: 'Inter-500',
    fontSize: 11,
    lineHeight: 17.9,
    letterSpacing: 0.275,
  },
})
