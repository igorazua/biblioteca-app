import { useEffect, useRef, useState, type ReactNode } from 'react'
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'
import { GestureDetector, useCompetingGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler'
import { runOnUI, scheduleOnRN } from 'react-native-worklets'
import type { ShelfType } from '@biblioteca/core'
import { duelCardSize, duelFitSize, type DuelFit } from '@biblioteca/core/src/lib/posterShape'
import { haptic } from '../lib/haptics'
import { easeInOut, easeOut, SPRING_FAN_BACK, SPRING_PICK } from '../lib/motion'
import { colors } from '../theme'
import { AppText } from './AppText'

/** Un lado del duelo (SwipePair.tsx `Side`). */
export interface Side {
  key: string
  title: string
  subtitle?: string
  /** fondo a sangre del lado (póster, collage…) */
  bg: ReactNode
  type?: ShelfType
  /** proporción ancho / alto de la portada si se conoce */
  ratio?: number
}

export const DUEL_LEFT = '#F5B544' // ámbar del acento (SwipePair.tsx:18)
export const DUEL_RIGHT = '#9A86FF' // violeta contrastado (SwipePair.tsx:19)

const FIT_MARGIN = 26 // pt libres alrededor de la carta elegida a tamaño completo (DuelVariants.tsx:139)
const IDLE_HINT_FIRST_MS = 4800 // pista solo para usuarios noveles (DuelVariants.tsx:140)
const FAN_COMMIT = 0.28 // fracción del ancho para elegir al soltar (DuelVariants.tsx:141)
const FAST_DELAY = 450 // Comparar (DuelVariants.tsx:65)
const DECIDE_DELAY = 650 // Decidir (DuelVariants.tsx:67)
const REDUCED_DELAY = 600 // pickDelay con movimiento reducido (DuelVariants.tsx:63)
const LEARNED_KEY = 'biblioteca-duel-learned'
const CARD_RADIUS = 18

const lerp = (a: number, b: number, k: number) => {
  'worklet'
  return a + (b - a) * k
}
const clamp01 = (v: number) => {
  'worklet'
  return Math.max(0, Math.min(1, v))
}

interface CardLayout {
  w: number
  h: number
  fitW: number
  fitH: number
}
interface FanLayout {
  w: number
  h: number
  cy: number
  titleTop: number
  cx: { a: number; b: number }
  cards: { a: CardLayout; b: CardLayout }
}

/** Reparto de la mesa del abanico según el tamaño disponible (DuelVariants.tsx:182-265). */
export function fanLayout(w: number, h: number, left?: Side, right?: Side, square = false, fit: DuelFit = 'area'): FanLayout {
  const padTop = 8
  const hintH = 64 // hueco de la pista inferior
  const titleH = 56
  const gap = 14
  const availH = Math.max(220, h - padTop - hintH)

  const isBoardgameDuel =
    left?.type === 'boardgame' && right?.type === 'boardgame' && typeof left.ratio === 'number' && left.ratio > 0 && typeof right.ratio === 'number' && right.ratio > 0

  if (isBoardgameDuel) {
    const lr = left.ratio as number
    const rr = right.ratio as number
    const bw = w * 0.48
    const bh = Math.max(100, availH - titleH - gap)
    const sizeA = duelCardSize(lr, rr, bw, bh, fit)
    const sizeB = duelCardSize(rr, lr, bw, bh, fit)
    const fitA = duelFitSize(lr, w, h, FIT_MARGIN)
    const fitB = duelFitSize(rr, w, h, FIT_MARGIN)
    const maxCardH = Math.max(sizeA.h, sizeB.h)
    const blockH = maxCardH + gap + titleH
    const top = padTop + Math.max(0, (availH - blockH) / 2)
    return {
      w,
      h,
      cy: top + maxCardH / 2,
      titleTop: top + maxCardH + gap,
      cx: { a: w * 0.3, b: w * 0.7 },
      cards: {
        a: { w: sizeA.w, h: sizeA.h, fitW: fitA.fitW, fitH: fitA.fitH },
        b: { w: sizeB.w, h: sizeB.h, fitW: fitB.fitW, fitH: fitB.fitH },
      },
    }
  }

  // Pelis, series, libros (verticales 1.5) y música (cuadradas 1)
  const ratio = square ? 1 : 1.5
  const cardW = Math.min(w * 0.48, (availH - titleH - gap) / ratio)
  const cardH = cardW * ratio
  const blockH = cardH + gap + titleH
  const top = padTop + Math.max(0, (availH - blockH) / 2)
  const fitW = Math.min(w - 2 * FIT_MARGIN, (h - 2 * FIT_MARGIN) / ratio)
  const std: CardLayout = { w: cardW, h: cardH, fitW, fitH: fitW * ratio }
  return { w, h, cy: top + cardH / 2, titleTop: top + cardH + gap, cx: { a: w * 0.3, b: w * 0.7 }, cards: { a: std, b: std } }
}

/**
 * Cartas en abanico, sin arrastre libre (DuelFan de la PWA). Se desliza en horizontal en cualquier parte: a la derecha elige
 * la carta de la izquierda, a la izquierda la de la derecha. La elegida sigue una trayectoria fija hacia el centro, se
 * endereza y crece; la otra se aparta y se apaga. Todo va ligado al progreso del gesto y corre en el hilo de UI.
 * El padre debe poner `key` con el par para que cada duelo arranque con la mesa limpia.
 */
export function DuelFan({
  left,
  right,
  onChoose,
  onPick,
  fast = false,
  square = false,
  fit = 'area',
}: {
  left: Side
  right: Side
  onChoose: (w: 'a' | 'b') => void
  onPick?: (w: 'a' | 'b') => void
  /** casi sin espera tras elegir (Comparar) */
  fast?: boolean
  square?: boolean
  fit?: DuelFit
}) {
  const reduce = useReducedMotion()
  const [size, setSize] = useState({ w: 0, h: 0 })
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setSize((o) => (o.w === width && o.h === height ? o : { w: width, h: height }))
  }
  const L = fanLayout(size.w, size.h, left, right, square, fit)
  const W = size.w

  const x = useSharedValue(0)
  const picked = useSharedValue(0) // 0 nada, 1 elegida la izquierda (a), 2 la derecha (b)
  const touched = useSharedValue(false)

  // Pista inicial: solo la primera vez, si la persona es nueva y tarda en tocar (DuelVariants.tsx:289-312).
  useEffect(() => {
    if (reduce) return
    let alive = true
    const timer = setTimeout(() => {
      void AsyncStorage.getItem(LEARNED_KEY).then((v) => {
        if (!alive || v === 'true' || size.w === 0) return
        void AsyncStorage.setItem(LEARNED_KEY, 'true')
        const d = Math.min(11, Math.max(7, size.w * FAN_COMMIT * 0.11))
        // [0, d, 0, -d, 0] en 1,6 s con tiempos [0, .22, .48, .72, 1] y easeInOut
        if (!touched.value) {
          x.value = withSequence(
            withTiming(d, { duration: 352, easing: easeInOut }),
            withTiming(0, { duration: 416, easing: easeInOut }),
            withTiming(-d, { duration: 384, easing: easeInOut }),
            withTiming(0, { duration: 448, easing: easeInOut }),
          )
        }
      })
    }, IDLE_HINT_FIRST_MS)
    return () => {
      alive = false
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, size.w])

  const picks = (w: 'a' | 'b') => {
    onPick?.(w)
    haptic('tick') // D22: de selección al elegir en un duelo
    void AsyncStorage.setItem(LEARNED_KEY, 'true')
    setTimeout(() => onChoose(w), fast ? FAST_DELAY : reduce ? REDUCED_DELAY : DECIDE_DELAY)
  }

  const choose = (w: 'a' | 'b') => {
    'worklet'
    if (picked.value) return
    touched.value = true
    picked.value = w === 'a' ? 1 : 2
    scheduleOnRN(picks, w)
    const to = w === 'a' ? W * FAN_COMMIT : -W * FAN_COMMIT
    x.value = reduce ? to : fast ? withTiming(to, { duration: 160, easing: easeOut }) : withSpring(to, SPRING_PICK)
  }

  const pan = usePanGesture({
    activeOffsetX: [-10, 10], // touchAction: pan-y
    onBegin: () => {
      'worklet'
      touched.value = true
      x.value = x.value // detiene la pista si está en marcha
    },
    onUpdate: (e) => {
      'worklet'
      if (!picked.value) x.value = e.translationX
    },
    onDeactivate: (e) => {
      'worklet'
      if (picked.value) return
      const ox = e.translationX
      if (Math.abs(ox) > W * FAN_COMMIT || Math.abs(e.velocityX) > 650) choose(ox > 0 ? 'a' : 'b')
      else x.value = withSpring(0, SPRING_FAN_BACK)
    },
  })
  // Un toque sobre una carta la elige (DuelVariants.tsx FanCard onClick): se comprueba en cuál cayó.
  const tap = useTapGesture({
    onDeactivate: (e) => {
      'worklet'
      if (e.canceled || picked.value) return
      for (const k of ['a', 'b'] as const) {
        const c = L.cards[k]
        if (Math.abs(e.x - L.cx[k]) <= c.w / 2 && Math.abs(e.y - L.cy) <= c.h / 2) {
          choose(k)
          return
        }
      }
    },
  })
  const gesture = useCompetingGestures(pan, tap)

  // q: -1 (elige la de la derecha) … 1 (elige la de la izquierda)
  const q = useDerivedValue(() => Math.max(-1, Math.min(1, x.value / (W * FAN_COMMIT || 1))))
  const gA = useDerivedValue(() => Math.max(0, q.value))
  const gB = useDerivedValue(() => Math.max(0, -q.value))
  const any = useDerivedValue(() => Math.abs(q.value))
  // El desenfoque de 9 pt de los títulos de la PWA no existe en RN: solo opacidad.
  const uiOp = useAnimatedStyle(() => ({ opacity: clamp01(1 - any.value * 1.7) }))

  return (
    <GestureDetector gesture={gesture}>
      <View
        onLayout={onLayout}
        collapsable={false}
        accessibilityRole="adjustable"
        accessibilityLabel="Desliza a la derecha para elegir la carta de la izquierda, o a la izquierda para la de la derecha"
        accessibilityActions={[{ name: 'a', label: `Elegir ${left.title}` }, { name: 'b', label: `Elegir ${right.title}` }]}
        onAccessibilityAction={(e) => {
          const n = e.nativeEvent.actionName
          if (n === 'a' || n === 'b') runOnUI(choose)(n)
        }}
        style={{ flex: 1, minHeight: 0, marginHorizontal: -16, overflow: 'hidden' }}
      >
        {size.w > 0 && (
          <>
            <Backdrop g={gA} />
            <Backdrop g={gB} />
            <FanCard side={left} which="a" color={DUEL_LEFT} g={gA} og={gB} L={L} picked={picked} />
            <FanCard side={right} which="b" color={DUEL_RIGHT} g={gB} og={gA} L={L} picked={picked} />
            {(['a', 'b'] as const).map((k) => {
              const s = k === 'a' ? left : right
              const tw = L.w * 0.4
              return (
                <Animated.View key={k} pointerEvents="none" style={[{ position: 'absolute', left: L.cx[k] - tw / 2, width: tw, top: L.titleTop, alignItems: 'center' }, uiOp]}>
                  <AppText numberOfLines={2} style={{ fontFamily: 'Fraunces72-600', fontSize: 16, lineHeight: 20, color: colors.ink, textAlign: 'center' }}>
                    {s.title}
                  </AppText>
                  {!!s.subtitle && (
                    <AppText numberOfLines={1} style={{ fontFamily: 'Inter-400', fontSize: 11.5, color: colors.mute, marginTop: 2, textAlign: 'center' }}>
                      {s.subtitle}
                    </AppText>
                  )}
                </Animated.View>
              )
            })}
          </>
        )}
      </View>
    </GestureDetector>
  )
}

/** Fondo liso que tapa la mesa mientras la elegida crece (sin desenfoques). */
function Backdrop({ g }: { g: SharedValue<number> }) {
  const anim = useAnimatedStyle(() => ({ opacity: clamp01(g.value) * 0.95 }))
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }, anim]} />
}

function FanCard({ side, which, color, g, og, L, picked }: { side: Side; which: 'a' | 'b'; color: string; g: SharedValue<number>; og: SharedValue<number>; L: FanLayout; picked: SharedValue<number> }) {
  const isLeft = which === 'a'
  const card = L.cards[which]
  const rot0 = isLeft ? -6 : 6
  const cx = L.cx[which]
  const grown = card.fitW / card.w

  const anim = useAnimatedStyle(() => {
    const gv = g.value
    const ov = og.value
    // Trayectoria fija al centro; la otra se aparta ancho × 0,22 y se reduce a 0,9.
    const tx = (L.w / 2 - cx) * gv + (isLeft ? -1 : 1) * L.w * 0.22 * ov
    const ty = (L.h / 2 - L.cy) * gv
    const scale = lerp(1, grown, gv) * (1 - 0.1 * ov)
    return {
      opacity: clamp01(1 - ov * 1.15),
      zIndex: gv > 0.01 ? 4 : 2,
      shadowOffset: { width: 0, height: lerp(18, 6, gv) },
      shadowRadius: lerp(36, 20, gv) / 2,
      shadowOpacity: lerp(0.65, 0.4, gv),
      transform: [{ translateX: tx }, { translateY: ty }, { rotate: `${rot0 * (1 - gv)}deg` }, { scale }],
    }
  })
  const lit = useAnimatedStyle(() => ({ opacity: withTiming(picked.value === (isLeft ? 1 : 2) ? 1 : 0, { duration: 120 }) }))

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: cx - card.w / 2,
          top: L.cy - card.h / 2,
          width: card.w,
          height: card.h,
          borderRadius: CARD_RADIUS,
          backgroundColor: colors.surface,
          shadowColor: '#000',
          elevation: 12,
        },
        anim,
      ]}
    >
      {/* póster a sangre, sin marco ni relleno difuminado alrededor */}
      <View style={{ ...(StyleSheet.absoluteFill as object), borderRadius: CARD_RADIUS, overflow: 'hidden' }}>{side.bg}</View>
      {/* borde iluminado de la elegida: la confirmación del duelo (el resplandor solo se ve en iOS) */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: CARD_RADIUS, borderWidth: 2, borderColor: color, shadowColor: color, shadowOpacity: 0.67, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } },
          lit,
        ]}
      />
    </Animated.View>
  )
}
