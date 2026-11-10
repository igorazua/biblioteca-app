import { useEffect, useRef } from 'react'
import { StyleSheet } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { AppText } from '../AppText'
import { Press } from '../Press'
import { colors } from '../../theme'
import { SPRING_SETTLE, easeOut } from '../../lib/motion'

// Toast de ui.tsx de la PWA (MEDIDAS_NATIVA, «Toast»). Se oculta solo a los `ms` (1800 por defecto).
export interface ToastAction {
  label: string
  onPress: () => void
}

export interface ToastProps {
  message: string
  /** Lo llama el toast al ocultarse (tiempo cumplido o acción pulsada). El padre lo quita del árbol. */
  onDone: () => void
  ms?: number
  /** Acción opcional, p. ej. «Deshacer». Al pulsarla se ejecuta y el toast se oculta. */
  action?: ToastAction
}

export function Toast({ message, onDone, ms = 1800, action }: ToastProps) {
  // Guardamos la última función: que el padre pase una nueva en cada render no reinicia el temporizador.
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  }, [onDone])

  // Entrada: desde y 30 y opacidad 0. La PWA no fija duración ni muelle: se usan los de lib/motion (anotado en el informe).
  const y = useSharedValue(30)
  const opacity = useSharedValue(0)
  useEffect(() => {
    y.value = withSpring(0, SPRING_SETTLE)
    opacity.value = withTiming(1, { duration: 200, easing: easeOut })
  }, [y, opacity])

  useEffect(() => {
    const t = setTimeout(() => doneRef.current(), ms)
    return () => clearTimeout(t)
  }, [message, ms])

  const enter = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: y.value }] }))

  return (
    <Animated.View accessibilityLiveRegion="polite" style={[styles.wrap, enter]}>
      <AppText style={styles.message}>{message}</AppText>
      {action ? (
        <Press
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={() => {
            action.onPress()
            doneRef.current()
          }}
          hitSlop={8}
          style={styles.action}
        >
          <AppText style={styles.actionText}>{action.label}</AppText>
        </Press>
      ) : null}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 96,
    zIndex: 50,
    elevation: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.ink,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
  },
  message: { flex: 1, fontFamily: 'Inter-500', fontSize: 14, lineHeight: 20, color: colors.bg, textAlign: 'center' },
  action: { paddingHorizontal: 8, paddingVertical: 4 },
  actionText: { fontFamily: 'Inter-600', fontSize: 14, lineHeight: 20, color: colors.bg },
})
