import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { Keyboard, Modal, Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'
import { easeIn } from '../../lib/motion'
import { colors } from '../../theme'

// Sheet de ui.tsx de la PWA (app/src/components/ui.tsx:304-333), portado a un Modal nativo.
// - Capa: cubre toda la pantalla (barra inferior incluida), como el `absolute inset-0 z-40` de la PWA sobre el marco.
// - Entrada: muelle 380/36 desde y 600; el fondo (negro al 60 %) se funde en 0,3 s con la curva por defecto de framer-motion.
// - Se arrastra hacia abajo con elasticidad 0,6 (hacia arriba no se mueve). Cierra con desplazamiento > 90 o velocidad > 500;
//   si no, vuelve con muelle 400/30. Cerrar = bajar a y 520 en 200 ms (easeIn) y llamar a `onClose`.
// - Atrás de Android (D17): `onRequestClose` del Modal cierra la hoja antes que la pantalla.
// - Teclado (D20): la hoja sube con él y se encoge si no cabe.
// - Reducir movimiento: sin muelle (entra y vuelve de golpe).
// Los hijos que se desplacen deben usar el `ScrollView` / `FlatList` de react-native-gesture-handler para convivir con el arrastre.

const SPRING_IN = { stiffness: 380, damping: 36, mass: 1 } as const // ui.tsx:320
const SPRING_BACK = { stiffness: 400, damping: 30, mass: 1 } as const // ui.tsx:324
const FADE = { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.35, 1) } // transición por defecto de opacity en framer-motion
const OUT_Y = 520
const OUT_MS = 200
const OFFSET_TO_CLOSE = 90
const VELOCITY_TO_CLOSE = 500
const ELASTIC_DOWN = 0.6
const MAX_FRAC = 0.88

export interface SheetProps {
  children: ReactNode
  onClose: () => void
  /** Altura mínima, como `minHeight` de la PWA: porcentaje del alto de pantalla (`'48%'` por defecto) o puntos. */
  height?: `${number}%` | number
  /** Nombre accesible del diálogo (el `aria-label` de la PWA). */
  label: string
}

export function Sheet({ children, onClose, height = '48%', label }: SheetProps) {
  const reduce = useReducedMotion()
  const insets = useSafeAreaInsets()
  const y = useSharedValue(reduce ? 0 : 600)
  const startY = useSharedValue(0)
  const fade = useSharedValue(0)
  const kb = useSharedValue(0)
  const frameH = useSharedValue(0)
  const closingSV = useSharedValue(false)
  const closingRef = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const finish = useCallback(() => onCloseRef.current(), [])
  const markClosing = useCallback(() => {
    closingRef.current = true
  }, [])

  const minFrac = typeof height === 'string' ? parseFloat(height) / 100 : 0
  const minPts = typeof height === 'number' ? height : 0

  useEffect(() => {
    fade.value = withTiming(1, FADE)
    if (!reduce) y.value = withSpring(0, SPRING_IN)
  }, [fade, y, reduce])

  // Cerrar desde JS (fondo, atrás, accesibilidad) o desde el hilo de UI (soltar el arrastre): la misma animación.
  const slideOut = () => {
    'worklet'
    if (closingSV.value) return
    closingSV.value = true
    y.value = withTiming(OUT_Y, { duration: OUT_MS, easing: easeIn }, () => {
      'worklet'
      scheduleOnRN(finish)
    })
  }
  const close = () => {
    if (closingRef.current) return
    closingRef.current = true
    slideOut()
  }

  // D20: el teclado empuja la hoja hacia arriba.
  useEffect(() => {
    const ios = Platform.OS === 'ios'
    const move = (h: number, ms?: number) => {
      kb.value = reduce ? h : withTiming(h, { duration: ms ?? 150 })
    }
    const subs = [
      Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => move(e.endCoordinates.height, e.duration)),
      Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', (e) => move(0, e.duration)),
    ]
    return () => subs.forEach((s) => s.remove())
  }, [kb, reduce])

  const pan = usePanGesture({
    activeOffsetY: [-3, 3], // framer empieza a arrastrar a ~3 px
    failOffsetX: [-12, 12], // un gesto horizontal es de las filas que se desplazan, no de la hoja
    onBegin: () => {
      'worklet'
      startY.value = y.value
      y.value = y.value // detiene el muelle de entrada si sigue en curso
    },
    onUpdate: (e) => {
      'worklet'
      if (closingSV.value) return
      const p = startY.value + e.translationY
      y.value = p > 0 ? p * ELASTIC_DOWN : 0
    },
    onDeactivate: (e) => {
      'worklet'
      if (closingSV.value) return
      if (!e.canceled && (e.translationY > OFFSET_TO_CLOSE || e.velocityY > VELOCITY_TO_CLOSE)) {
        scheduleOnRN(markClosing)
        slideOut()
      } else y.value = reduce ? 0 : withSpring(0, SPRING_BACK)
    },
  })

  const backdropStyle = useAnimatedStyle(() => ({ opacity: fade.value }))
  const sheetStyle = useAnimatedStyle(() => {
    const H = frameH.value
    const room = H - kb.value
    const open = kb.value > 0
    return {
      bottom: kb.value,
      transform: [{ translateY: y.value }],
      maxHeight: open ? Math.max(0, Math.min(H * MAX_FRAC, room)) : `${MAX_FRAC * 100}%`,
      minHeight: open ? Math.max(0, Math.min(minFrac ? H * minFrac : minPts, room)) : minFrac ? `${minFrac * 100}%` : minPts,
    }
  })
  const bodyStyle = useAnimatedStyle(() => ({ paddingBottom: 20 + Math.max(0, insets.bottom - kb.value) }))

  const onLayout = (e: LayoutChangeEvent) => {
    frameH.value = e.nativeEvent.layout.height
  }

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      supportedOrientations={['portrait']}
      onRequestClose={close}
    >
      <GestureHandlerRootView style={styles.root} onLayout={onLayout}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Cerrar" />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View
            role="dialog"
            aria-modal
            aria-label={label}
            accessibilityViewIsModal
            onAccessibilityEscape={close}
            style={[styles.sheet, sheetStyle]}
          >
            <View style={styles.handle} />
            <Animated.View style={[styles.body, bodyStyle]}>{children}</Animated.View>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'column',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    // shadow-2xl con el color de index.css (rgb(20 12 2 / 0.7)); sin extensión negativa, que RN no tiene.
    shadowColor: 'rgb(20, 12, 2)',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.7,
    shadowRadius: 25,
    elevation: 24,
  },
  handle: {
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
    height: 6,
    width: 44,
    borderRadius: 999,
    backgroundColor: colors.line,
    flexShrink: 0,
  },
  body: { flex: 1, flexDirection: 'column', paddingHorizontal: 20, paddingTop: 8 },
})
