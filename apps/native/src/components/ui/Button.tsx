import { useEffect, type ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { AppText } from '../AppText'
import { Press } from '../Press'
import { colors, tx } from '../../theme'

// ui.tsx / Button.tsx de la PWA. Medidas en MEDIDAS_NATIVA.md («Button»).
export type ButtonVariant = 'primary' | 'secondary' | 'text'

export interface ButtonProps {
  variant?: ButtonVariant
  /** Texto del botón. En nativo solo cadenas: el texto va siempre dentro de AppText. */
  children: string
  icon?: ReactNode
  iconRight?: ReactNode
  /** Como en la PWA: muestra el espinner, desactiva el botón y lo deja a opacidad 0,4. */
  loading?: boolean
  disabled?: boolean
  onPress?: () => void
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
}

const VARIANT: Record<ButtonVariant, { box: ViewStyle; color: string }> = {
  primary: {
    box: { height: 48, paddingHorizontal: 24, borderRadius: 16, backgroundColor: colors.accent },
    color: colors.accentInk,
  },
  secondary: {
    box: { height: 48, paddingHorizontal: 20, borderRadius: 16, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line },
    color: colors.ink,
  },
  text: {
    box: { paddingHorizontal: 4, paddingVertical: 4 },
    color: colors.ink,
  },
}

/** Espinner de `animate-spin`: 16 × 16, borde de 2, una vuelta por segundo, lineal. */
function Spinner({ color }: { color: string }) {
  const turn = useSharedValue(0)
  useEffect(() => {
    turn.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.linear }), -1, false)
    return () => cancelAnimation(turn)
  }, [turn])
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }))
  return <Animated.View style={[styles.spinner, { borderColor: color, borderTopColor: 'transparent' }, spin]} />
}

export function Button({
  variant = 'primary',
  children,
  icon,
  iconRight,
  loading = false,
  disabled = false,
  onPress,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const v = VARIANT[variant]
  const off = disabled || loading
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? children}
      accessibilityState={{ disabled: off, busy: loading }}
      disabled={off}
      dim={off ? 0.4 : 1}
      onPress={onPress}
      style={[styles.base, v.box, style]}
    >
      {loading ? (
        <Spinner color={v.color} />
      ) : (
        <>
          {icon ? <View style={styles.iconLeft}>{icon}</View> : null}
          <AppText style={tx('body', { fontFamily: 'Archivo-Regular', color: v.color })}>{children}</AppText>
          {iconRight ? <View style={styles.iconRight}>{iconRight}</View> : null}
        </>
      )}
    </Press>
  )
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  iconLeft: { marginRight: 8 },
  iconRight: { marginLeft: 8 },
  spinner: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
})
