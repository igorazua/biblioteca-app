import { useEffect, useRef } from 'react'
import { StyleSheet } from 'react-native'
import Animated, { Easing, FadeOut, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { AppText } from '../AppText'
import { Press } from '../Press'
import { colors } from '../../theme'

// Toast de ui.tsx de la PWA (MEDIDAS_NATIVA, «Toast»). Se oculta solo a los `ms` (1800 por defecto).
// Animaciones: la PWA no fija transición, así que valen las de framer 14.2 por defecto: `y` con muelle
// (rigidez 500, amortiguación 25), opacidad con tween de 300 ms y curva [0.25, 0.1, 0.35, 1].
const EASE = Easing.bezier(0.25, 0.1, 0.35, 1)
const SPRING_Y = { stiffness: 500, damping: 25, mass: 1 }

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

  // Entrada: y 30 → 0 con muelle; opacidad 0 → 1 con tween. Dos valores separados, como en framer.
  const y = useSharedValue(30)
  const opacity = useSharedValue(0)
  useEffect(() => {
    y.value = withSpring(0, SPRING_Y)
    opacity.value = withTiming(1, { duration: 300, easing: EASE })
  }, [y, opacity])

  useEffect(() => {
    const t = setTimeout(() => doneRef.current(), ms)
    return () => clearTimeout(t)
  }, [message, ms])

  const enter = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: y.value }] }))

  return (
    // Salida: fundido de 300 ms al quitarlo el padre (la mayoría de llamadas de la PWA lo envuelven en AnimatePresence).
    <Animated.View accessibilityLiveRegion="polite" exiting={FadeOut.duration(300).easing(EASE)} style={[styles.wrap, enter]}>
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
  // Posición: el padre debe ponerlo sobre el contenido; el 96 es el de la PWA (bottom-24), sin contar la barra nativa.
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
    // shadow-xl de Tailwind: 0 20px 25px -5px rgb(0 0 0 / 0.1)
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 12.5,
  },
  message: { flex: 1, fontFamily: 'Inter-500', fontSize: 14, lineHeight: 20, color: colors.bg, textAlign: 'center' },
  action: { paddingHorizontal: 8, paddingVertical: 4 },
  actionText: { fontFamily: 'Inter-600', fontSize: 14, lineHeight: 20, color: colors.bg },
})
