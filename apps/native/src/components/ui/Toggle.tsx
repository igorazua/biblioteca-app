import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import Animated, { Easing, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { Press } from '../Press'
import { colors } from '../../theme'

// Toggle de Group.tsx de la PWA: pastilla 56 × 32 con botón de 24. Transiciones de la PWA (Tailwind):
// el botón se desliza y el fondo cambia de color en 150 ms, con la curva [0.4, 0, 0.2, 1].
const EASE = Easing.bezier(0.4, 0, 0.2, 1)

export interface ToggleProps {
  on: boolean
  onChange: (on: boolean) => void
  /** Nombre accesible del interruptor. */
  label: string
}

export function Toggle({ on, onChange, label }: ToggleProps) {
  const progress = useSharedValue(on ? 1 : 0)
  // Si el padre cambia `on`, el botón y el fondo siguen el valor nuevo.
  useEffect(() => {
    progress.value = withTiming(on ? 1 : 0, { duration: 150, easing: EASE })
  }, [on, progress])

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.line, colors.accent]),
  }))
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: 24 * progress.value }] }))

  return (
    <Press
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      onPress={() => onChange(!on)}
      style={styles.track}
    >
      {/* El fondo cambia de color animado; va en una capa a todo el tamaño porque Press no admite estilo animado. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.fill, trackStyle]} />
      <Animated.View style={[styles.knob, knobStyle]} />
    </Press>
  )
}

const styles = StyleSheet.create({
  track: { width: 56, height: 32, borderRadius: 999, padding: 4, justifyContent: 'center', flexShrink: 0 },
  fill: { borderRadius: 999 },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#ffffff' },
})
