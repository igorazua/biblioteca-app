import { memo, useEffect, useMemo, useState, type ReactNode } from 'react'
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg'
import Animated, {
  useAnimatedProps,
  useAnimatedReaction,
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

const FIT_MARGIN = 26 // pt libres alrededor de la carta elegida a tamaño completo (DuelVariants.tsx:139)
const IDLE_HINT_FIRST_MS = 4800 // pista solo para usuarios noveles (DuelVariants.tsx:140)
const FAN_COMMIT = 0.28 // fracción del ancho para elegir al soltar (DuelVariants.tsx:141)
const FAST_DELAY = 450 // Comparar (DuelVariants.tsx:65)
const DECIDE_DELAY = 650 // Decidir (DuelVariants.tsx:67)
const REDUCED_DELAY = 600 // pickDelay con movimiento reducido (DuelVariants.tsx:63)
const LEARNED_KEY = 'biblioteca-duel-learned'
const CARD_RADIUS = 18
const RIM_W = 3 // grosor final del borde, en pt de pantalla
const CLOSE_MS = 140 // lo que tarda en completarse el borde al confirmar (D33)
const AnimatedPath = Animated.createAnimatedComponent(Path)

/** Mezcla del acento con blanco (k > 0) o negro (k < 0): los tonos del metal salen de `colors.accent`, sin hexadecimales sueltos. */
function tone(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16)
  const t = k >= 0 ? 255 : 0
  const m = Math.abs(k)
  const c = (v: number) => Math.round(v + (t - v) * m)
  return `rgb(${c((n >> 16) & 255)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`
}
const RIM_STOPS = [
  { at: 0, color: tone(colors.accent, 0.5) }, // claro
  { at: 0.3, color: colors.accent }, // acento
  { at: 0.56, color: tone(colors.accent, -0.45) }, // oscuro
  { at: 0.8, color: colors.accent },
  { at: 1, color: tone(colors.accent, 0.5) }, // claro
]
const FLASH_CORE = tone(colors.accent, 0.88) // casi blanco cálido
const FLASH_TAIL = tone(colors.accent, 0.6)

/** Espera tras elegir hasta pasar al siguiente duelo; el borde y el destello caben dentro. */
const pickDelay = (fast: boolean, reduce: boolean) => (fast ? FAST_DELAY : reduce ? REDUCED_DELAY : DECIDE_DELAY)

/** Ya vio la pista del abanico o ya eligió alguna vez (DuelVariants.tsx isDuelLearned / markDuelLearned). */
export async function isDuelLearned(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(LEARNED_KEY)) === 'true'
  } catch {
    return false
  }
}
export function markDuelLearned(): void {
  void AsyncStorage.setItem(LEARNED_KEY, 'true').catch(() => {})
}

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
    const top = Math.max(padTop, (h - blockH) / 2) // centrado en todo el alto: la pista inferior no esta dentro del abanico
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
  const top = Math.max(padTop, (h - blockH) / 2)
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
  // El reparto solo cambia con la medida y el par: no se recalcula en cada render (las cartas llevan memo)
  const L = useMemo(
    () => fanLayout(size.w, size.h, left, right, square, fit),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [size.w, size.h, left.key, right.key, left.ratio, right.ratio, left.type, right.type, square, fit],
  )
  const delay = pickDelay(fast, reduce)
  const flashMs = Math.max(180, delay - CLOSE_MS - 60)
  const W = size.w

  const x = useSharedValue(0)
  const picked = useSharedValue(0) // 0 nada, 1 elegida la izquierda (a), 2 la derecha (b)
  const touched = useSharedValue(false)
  const crossed = useSharedValue(false) // el arrastre ya pasó el umbral de elección

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
    haptic('success') // D33: al confirmar. El «tick» ya sonó al cruzar el umbral arrastrando
    void AsyncStorage.setItem(LEARNED_KEY, 'true')
    setTimeout(() => onChoose(w), delay)
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
      crossed.value = false
      scheduleOnRN(markDuelLearned)
      x.value = x.value // detiene la pista si está en marcha
    },
    onUpdate: (e) => {
      'worklet'
      if (picked.value) return
      x.value = e.translationX
      const over = Math.abs(e.translationX) > W * FAN_COMMIT
      if (over !== crossed.value) {
        crossed.value = over
        if (over) scheduleOnRN(haptic, 'tick') // D33: cruza el umbral de elección
      }
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
            <FanCard side={left} which="a" g={gA} og={gB} L={L} picked={picked} flashMs={flashMs} reduce={reduce} />
            <FanCard side={right} which="b" g={gB} og={gA} L={L} picked={picked} flashMs={flashMs} reduce={reduce} />
            {(['a', 'b'] as const).map((k) => {
              const s = k === 'a' ? left : right
              const tw = L.w * 0.4 - 12 // cada lado tiene su ancho y quedan 12 pt entre los dos
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
const Backdrop = memo(function Backdrop({ g }: { g: SharedValue<number> }) {
  const anim = useAnimatedStyle(() => ({ opacity: clamp01(g.value) * 0.95 }))
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }, anim]} />
})

interface FanCardProps {
  side: Side
  which: 'a' | 'b'
  g: SharedValue<number>
  og: SharedValue<number>
  L: FanLayout
  picked: SharedValue<number>
  flashMs: number
  reduce: boolean
}

const FanCard = memo(function FanCard({ side, which, g, og, L, picked, flashMs, reduce }: FanCardProps) {
  const isLeft = which === 'a'
  const mine = isLeft ? 1 : 2
  const card = L.cards[which]
  const rot0 = isLeft ? -6 : 6
  const cx = L.cx[which]
  const grown = card.fitW / card.w

  // Borde (D33). Se dibuja ya a tamaño final de carta (la carta a escala `grown`) y se encoge con el mismo transform que ella,
  // así el trazo es nítido y mide 3 pt con la carta grande. Sigue el contorno de la carta: mismo radio y trazo hacia dentro.
  const bw = card.w * grown
  const bh = card.h * grown
  const half = RIM_W / 2
  const r = Math.max(0, CARD_RADIUS * grown - half)
  const x0 = half
  const y0 = half
  const x1 = bw - half
  const y1 = bh - half
  const mx = bw / 2
  // Sale del centro de arriba y gira a la derecha
  const d =
    `M ${mx} ${y0} L ${x1 - r} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y0 + r} L ${x1} ${y1 - r} A ${r} ${r} 0 0 1 ${x1 - r} ${y1} ` +
    `L ${x0 + r} ${y1} A ${r} ${r} 0 0 1 ${x0} ${y1 - r} L ${x0} ${y0 + r} A ${r} ${r} 0 0 1 ${x0 + r} ${y0} L ${mx} ${y0}`
  const perimeter = 2 * (x1 - x0 - 2 * r) + 2 * (y1 - y0 - 2 * r) + 2 * Math.PI * r
  const tailLen = perimeter * 0.16
  const coreLen = perimeter * 0.06
  const gradId = `rim-${which}`

  const done = useSharedValue(0) // 0 … 1: el borde se completa al confirmar
  const flash = useSharedValue(0) // 0 … 1: recorrido del destello

  useAnimatedReaction(
    () => picked.value === mine,
    (now, prev) => {
      if (!now || prev) return
      if (reduce) {
        done.value = 1 // borde completo al confirmar, sin destello
        return
      }
      done.value = withTiming(1, { duration: CLOSE_MS, easing: easeOut }, (fin) => {
        if (fin) flash.value = withTiming(1, { duration: flashMs, easing: easeInOut })
      })
    },
    [reduce, flashMs, mine],
  )

  // El borde sigue al arrastre (g llega a 1 justo en el umbral de elección); al confirmar se completa aparte
  const prog = useDerivedValue(() => Math.max(g.value, done.value))
  const rimProps = useAnimatedProps(() => ({ strokeDashoffset: perimeter * (1 - prog.value) }))
  const tailProps = useAnimatedProps(() => {
    const f = flash.value
    return { strokeDashoffset: tailLen - f * (perimeter + tailLen), strokeOpacity: f > 0.001 && f < 0.999 ? 0.5 : 0 }
  })
  const coreProps = useAnimatedProps(() => {
    const f = flash.value
    return { strokeDashoffset: coreLen - f * (perimeter + coreLen), strokeOpacity: f > 0.001 && f < 0.999 ? 1 : 0 }
  })

  const pose = (gv: number, ov: number) => {
    'worklet'
    // Trayectoria fija al centro; la otra se aparta ancho × 0,22 y se reduce a 0,9.
    return {
      tx: (L.w / 2 - cx) * gv + (isLeft ? -1 : 1) * L.w * 0.22 * ov,
      ty: (L.h / 2 - L.cy) * gv,
      scale: lerp(1, grown, gv) * (1 - 0.1 * ov),
      rot: rot0 * (1 - gv),
      op: clamp01(1 - ov * 1.15),
    }
  }

  const anim = useAnimatedStyle(() => {
    const gv = g.value
    const p = pose(gv, og.value)
    return {
      opacity: p.op,
      zIndex: gv > 0.01 ? 4 : 2,
      shadowOffset: { width: 0, height: lerp(18, 6, gv) },
      shadowRadius: lerp(36, 20, gv) / 2,
      shadowOpacity: lerp(0.65, 0.4, gv),
      transform: [{ translateX: p.tx }, { translateY: p.ty }, { rotate: `${p.rot}deg` }, { scale: p.scale }],
    }
  })
  // Misma pose que la carta, pero partiendo de su tamaño final: la escala se divide entre `grown`
  const rimAnim = useAnimatedStyle(() => {
    const gv = g.value
    const p = pose(gv, og.value)
    return {
      opacity: prog.value > 0.002 ? p.op : 0,
      zIndex: gv > 0.01 ? 5 : 3,
      transform: [{ translateX: p.tx }, { translateY: p.ty }, { rotate: `${p.rot}deg` }, { scale: p.scale / grown }],
    }
  })

  return (
    <>
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
        {/* poster a sangre, sin marco ni relleno difuminado alrededor */}
        <View style={{ ...(StyleSheet.absoluteFill as object), borderRadius: CARD_RADIUS, overflow: 'hidden' }}>{side.bg}</View>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: cx - bw / 2, top: L.cy - bh / 2, width: bw, height: bh }, rimAnim]}>
        <Svg width={bw} height={bh} viewBox={`0 0 ${bw} ${bh}`} pointerEvents="none">
          <Defs>
            <LinearGradient id={gradId} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={bw} y2={bh}>
              {RIM_STOPS.map((st) => (
                <Stop key={st.at} offset={st.at} stopColor={st.color} />
              ))}
            </LinearGradient>
          </Defs>
          <AnimatedPath d={d} fill="none" stroke={`url(#${gradId})`} strokeWidth={RIM_W} strokeLinejoin="round" strokeDasharray={[perimeter + 2, perimeter + 2]} animatedProps={rimProps} />
          {!reduce && (
            <>
              {/* destello sobre el propio trazo: una cola más tenue y un núcleo casi blanco */}
              <AnimatedPath d={d} fill="none" stroke={FLASH_TAIL} strokeWidth={RIM_W} strokeLinecap="round" strokeDasharray={[tailLen, perimeter + tailLen]} animatedProps={tailProps} />
              <AnimatedPath d={d} fill="none" stroke={FLASH_CORE} strokeWidth={RIM_W} strokeLinecap="round" strokeDasharray={[coreLen, perimeter + coreLen]} animatedProps={coreProps} />
            </>
          )}
        </Svg>
      </Animated.View>
    </>
  )
})
