import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { Press } from '../Press'
import { colors } from '../../theme'

// Toggle de Group.tsx de la PWA: pastilla 56 × 32 con botón de 24. Transición de la PWA: 150 ms, curva de Tailwind.
const EASE = Easing.bezier(0.4, 0, 0.2, 1)

export interface ToggleProps {
  on: boolean
  onChange: (on: boolean) => void
  /** Nombre accesible del interruptor. */
  label: string
}

export function Toggle({ on, onChange, label }: ToggleProps) {
  const knob = useSharedValue(on ? 1 : 0)
  // Si el padre cambia `on`, el botón se desliza al nuevo valor.
  useEffect(() => {
    knob.value = withTiming(on ? 1 : 0, { duration: 150, easing: EASE })
  }, [on, knob])
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: 24 * knob.value }] }))

  return (
    <Press
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      onPress={() => onChange(!on)}
      style={[styles.track, { backgroundColor: on ? colors.accent : colors.line }]}
    >
      <Animated.View style={[styles.knob, knobStyle]} />
    </Press>
  )
}

const styles = StyleSheet.create({
  track: { width: 56, height: 32, borderRadius: 999, padding: 4, justifyContent: 'center', flexShrink: 0 },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#ffffff' },
})
