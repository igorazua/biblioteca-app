import { forwardRef, useImperativeHandle, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated'
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler'
import { runOnUI, scheduleOnRN } from 'react-native-worklets'
import { SHELF_LABEL, type Item } from '@biblioteca/core'
import { titleOf } from '../../lib/item'
import { haptic } from '../../lib/haptics'
import { easeIn, SPRING_SETTLE } from '../../lib/motion'
import { alpha, colors } from '../../theme'
import { AppText } from '../AppText'
import { Poster } from '../Poster'

export type PracticeDir = 'left' | 'right' | 'up'
export interface PracticeHandle {
  fling: (dir: PracticeDir) => void
}

// Umbrales y física de la tarjeta de práctica (Onboarding.tsx:113-120, 275-286): descarte a 85 en horizontal o -70 hacia arriba,
// salida en 0,24 s con easeIn, vuelta con muelle 420/28.
const OUT_X = 380
const OUT_UP = -420
const OUT_DOWN = 30
const OUT_MS = 240
const H_LIMIT = 85
const UP_LIMIT = 70

function Stamp({ label, color, opacity, top, side, rotate }: { label: string; color: string; opacity: SharedValue<number>; top: `${number}%`; side: 'left' | 'right' | 'center'; rotate: number }) {
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))
  const pos = side === 'center' ? { left: 0, right: 0, alignItems: 'center' as const } : side === 'left' ? { left: 16 } : { right: 16 }
  return (
    <Animated.View pointerEvents="none" style={[styles.stampWrap, { top }, pos, style]}>
      <View style={[styles.stamp, { borderColor: color, transform: [{ rotate: `${rotate}deg` }] }]}>
        <AppText fixed style={[styles.stampText, { color }]}>
          {label}
        </AppText>
      </View>
    </Animated.View>
  )
}

function Glow({ color, opacity }: { color: string; opacity: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color }, style]} />
}

/**
 * Tarjeta del paso 1 del onboarding: la carta de práctica con sellos y resplandores reactivos. Se arrastra (o se dispara con `fling`)
 * y avisa con `onDir` al empezar a salir; luego pasa a la siguiente obra por sí sola.
 */
export const PracticeCard = forwardRef<PracticeHandle, { items: Item[]; onDir: (dir: PracticeDir) => void }>(function PracticeCard({ items, onDir }, ref) {
  const [index, setIndex] = useState(0)
  const item = items[index % items.length]
  const x = useSharedValue(0)
  const y = useSharedValue(0)
  const busy = useSharedValue(false)

  const next = () => {
    setIndex((i) => i + 1)
    x.value = 0
    y.value = 0
    busy.value = false
  }

  const fling = (dir: PracticeDir) => {
    'worklet'
    if (busy.value) return
    busy.value = true
    scheduleOnRN(haptic, 'tap')
    scheduleOnRN(onDir, dir)
    const exitX = dir === 'right' ? OUT_X : dir === 'left' ? -OUT_X : 0
    const exitY = dir === 'up' ? OUT_UP : OUT_DOWN
    x.value = withTiming(exitX, { duration: OUT_MS, easing: easeIn })
    y.value = withTiming(exitY, { duration: OUT_MS, easing: easeIn }, (fin) => {
      'worklet'
      if (fin) scheduleOnRN(next)
    })
  }

  // Los botones llaman desde JS: la misma salida, en el hilo de UI.
  useImperativeHandle(ref, () => ({ fling: (dir) => runOnUI(fling)(dir) }))

  const pan = usePanGesture({
    minDistance: 3,
    onBegin: () => {
      'worklet'
      x.value = x.value
      y.value = y.value
    },
    onUpdate: (e) => {
      'worklet'
      if (busy.value) return
      x.value = e.translationX
      y.value = e.translationY
    },
    onDeactivate: (e) => {
      'worklet'
      if (busy.value) return
      const ox = e.translationX
      const oy = e.translationY
      if (Math.abs(ox) > H_LIMIT) fling(ox > 0 ? 'right' : 'left')
      else if (oy < -UP_LIMIT) fling('up')
      else {
        x.value = withSpring(0, SPRING_SETTLE)
        y.value = withSpring(0, SPRING_SETTLE)
      }
    },
  })

  // los sellos siguen a x / y (useTransform de framer, con tope en los extremos)
  const rightO = useDerivedValue(() => interpolate(x.value, [20, 100], [0, 1], Extrapolation.CLAMP))
  const leftO = useDerivedValue(() => interpolate(x.value, [-20, -100], [0, 1], Extrapolation.CLAMP))
  const upO = useDerivedValue(() => interpolate(y.value, [-20, -90], [0, 1], Extrapolation.CLAMP))
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { rotate: `${interpolate(x.value, [-200, 0, 200], [-14, 0, 14], Extrapolation.CLAMP)}deg` }],
  }))

  return (
    <View style={styles.box}>
      {/* tarjeta del fondo: sensación de mazo */}
      <View style={styles.back} pointerEvents="none" />
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.card, cardStyle]}>
          <View style={styles.clip}>
            <Poster item={item} showTitle={false} style={StyleSheet.absoluteFill} />
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.95)']}
              style={styles.bottomShade}
            />
            <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0)']} style={styles.topShade} />

            <Stamp label="LA HE VISTO" color={colors.stampGreen} opacity={rightO} top="24%" side="left" rotate={-12} />
            <Stamp label="NO ME INTERESA" color={colors.stampRed} opacity={leftO} top="24%" side="right" rotate={12} />
            <Stamp label="PENDIENTE" color={colors.stampBlue} opacity={upO} top="32%" side="center" rotate={-6} />

            <Glow color="rgba(16,185,129,0.2)" opacity={rightO} />
            <Glow color="rgba(244,63,94,0.2)" opacity={leftO} />
            <Glow color="rgba(14,165,233,0.2)" opacity={upO} />

            <View style={styles.meta} pointerEvents="none">
              <AppText numberOfLines={1} style={styles.kind}>
                {`${SHELF_LABEL[item.type]?.singular || 'Obra'} · ${item.year}`}
              </AppText>
              <AppText numberOfLines={2} style={styles.title}>
                {titleOf(item)}
              </AppText>
              <AppText numberOfLines={1} style={styles.creator}>
                {item.creator}
              </AppText>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  )
})

const styles = StyleSheet.create({
  box: { height: 290, width: '100%', maxWidth: 270, alignSelf: 'center' },
  back: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    opacity: 0.6,
    transform: [{ translateY: 12 }, { scale: 0.95 }],
  },
  card: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
    backgroundColor: colors.surface,
    // shadow-2xl shadow-black/70
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.7,
    shadowRadius: 25,
    elevation: 24,
  },
  clip: { flex: 1, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  bottomShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '66.6667%' },
  topShade: { position: 'absolute', left: 0, right: 0, top: 0, height: 64 },
  stampWrap: { position: 'absolute', zIndex: 20 },
  stamp: {
    borderWidth: 3,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: alpha('#000000', 0.6),
  },
  stampText: { fontFamily: 'Archivo-Condensed-ExtraBold', fontSize: 24, lineHeight: 30, letterSpacing: 0.5, textTransform: 'uppercase' },
  meta: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16 },
  kind: { fontFamily: 'Archivo-SemiBold', fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', color: colors.accent },
  title: { fontFamily: 'Archivo-SemiBold', fontSize: 18, lineHeight: 23, color: '#ffffff', marginTop: 2 },
  creator: { fontFamily: 'Archivo-Regular', fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
})
