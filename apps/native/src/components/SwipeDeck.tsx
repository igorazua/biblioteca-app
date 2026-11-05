import { forwardRef, useCallback, type ComponentRef, useImperativeHandle, useRef, useState } from 'react'
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  Extrapolation,
  interpolate,
  runOnUI,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'
import { GestureDetector, useCompetingGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler'
import { scheduleOnRN } from 'react-native-worklets'
import { SHELF_LABEL, itemFacts, typeName, type Item, type ShelfType } from '@biblioteca/core'
import { boardgameDeckLayout, posterShape, titleOf } from '../lib/item'
import { haptic } from '../lib/haptics'
import { easeIn, SPRING_SETTLE } from '../lib/motion'
import { colors, tx } from '../theme'
import { AppText } from './AppText'
import { Poster } from './Poster'
import { Tag } from './Tag'

export type SwipeDir = 'left' | 'right' | 'up'
export interface DeckHandle {
  fling: (dir: SwipeDir) => void
}
/** Rectángulo en coordenadas de ventana: [x, y, ancho, alto]. */
export type Rect = [number, number, number, number]

// Umbrales del diseño (SwipeDeck.tsx:16-19): 30 % del ancho en horizontal, 20 % del alto en vertical, o velocidad suficiente.
const H_THRESHOLD = 0.3
const V_THRESHOLD = 0.2
const FLICK = 600
const RADIUS = 28
const STACK_GAP = 30 // bottom-[30px]: deja ver el montón

const inkSoft = 'rgba(244,239,230,0.8)'

/** Cara de la carta (CardFace): normal, o con imagen arriba y panel debajo (música y juegos de mesa apaisados). */
function CardFace({ item }: { item: Item }) {
  const isSquare = posterShape(item.type) === 'square'
  const bgLayout = item.type === 'boardgame' ? boardgameDeckLayout(item.posterRatio) : null
  const facts = itemFacts(item)
  const tags = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
      {!!facts && <Tag>{facts}</Tag>}
      {item.genres.slice(0, 2).map((g) => (
        <Tag key={g}>{g}</Tag>
      ))}
    </View>
  )
  const shadow = { shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 25, shadowOffset: { width: 0, height: 25 }, elevation: 24 }

  if (isSquare || bgLayout?.mode === 'top') {
    const aspect = bgLayout?.mode === 'top' ? bgLayout.aspect : 1
    return (
      <View style={[StyleSheet.absoluteFill, { borderRadius: RADIUS, backgroundColor: colors.surface }, shadow]}>
        <View style={{ flex: 1, borderRadius: RADIUS, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}>
          <View style={{ width: '100%', aspectRatio: aspect, overflow: 'hidden', backgroundColor: colors.surface2 }}>
            <Poster item={item} showTitle={false} style={StyleSheet.absoluteFill} />
          </View>
          <View style={{ flex: 1, padding: 20, paddingBottom: 16, justifyContent: 'space-between', backgroundColor: colors.surface }}>
            <View>
              <AppText style={[tx('label'), { color: inkSoft }]}>{typeName(item.type)} · {item.year}</AppText>
              <AppText numberOfLines={2} style={[tx('display'), { color: colors.ink, marginTop: 4 }]}>{titleOf(item)}</AppText>
              <AppText numberOfLines={1} style={[tx('meta'), { color: inkSoft, marginTop: 4 }]}>{item.creator}</AppText>
            </View>
            <View style={{ marginTop: 8 }}>{tags}</View>
          </View>
        </View>
      </View>
    )
  }
  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius: RADIUS, backgroundColor: colors.surface }, shadow]}>
      <View style={{ flex: 1, borderRadius: RADIUS, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}>
        <Poster item={item} showTitle={false} style={StyleSheet.absoluteFill} />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.95)']}
          locations={[0, 0.5, 1]}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' }}
        />
        <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 96 }} />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, paddingBottom: 16 }}>
          <AppText fixed style={[tx('label'), { color: inkSoft }]}>{typeName(item.type)} · {item.year}</AppText>
          <AppText fixed numberOfLines={3} style={[tx('display'), { color: colors.ink, marginTop: 4 }]}>{titleOf(item)}</AppText>
          <AppText fixed numberOfLines={1} style={[tx('meta'), { color: inkSoft, marginTop: 4 }]}>{item.creator}</AppText>
          <View style={{ marginTop: 10 }}>{tags}</View>
        </View>
      </View>
    </View>
  )
}

function Stamp({ label, color, opacity, style, size = 26 }: { label: string; color: string; opacity: SharedValue<number>; style: object; size?: number }) {
  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', zIndex: 10, borderWidth: 5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, borderColor: color }, style, anim]}>
      <AppText fixed numberOfLines={1} style={{ fontFamily: 'Inter-900', fontSize: size, letterSpacing: size * 0.05, color }}>
        {label}
      </AppText>
    </Animated.View>
  )
}

interface CardProps {
  item: Item
  depth: number
  shelf: ShelfType
  W: number
  H: number
  progress: SharedValue<number>
  stamps?: { right?: string; left?: string; up?: string }
  onDone: (item: Item, dir: SwipeDir) => void
  onOpen: (item: Item, rect: Rect) => void
}
interface CardHandle {
  fling: (dir: SwipeDir) => void
}

/**
 * Una carta del montón. Cada carta conserva su instancia (key = id) al pasar de segunda a primera, así no hay parpadeo
 * ni reinicio: sus valores x/y arrancan en 0 y son los de la carta de arriba los que escriben `progress` para las de atrás.
 * Todo el gesto y las animaciones corren en el hilo de UI.
 */
const DeckCard = forwardRef<CardHandle, CardProps>(function DeckCard({ item, depth, shelf, W, H, progress, stamps, onDone, onOpen }, ref) {
  const x = useSharedValue(0)
  const y = useSharedValue(0)
  const busy = useSharedValue(false)
  const armed = useSharedValue(false)
  const faceRef = useRef<ComponentRef<typeof View>>(null)
  const isTop = depth === 0

  const done = useCallback((dir: SwipeDir) => onDone(item, dir), [item, onDone])
  const open = useCallback(() => {
    faceRef.current?.measureInWindow((px, py, pw, ph) => onOpen(item, [px, py, pw, ph]))
  }, [item, onOpen])

  const commit = (dir: SwipeDir) => {
    'worklet'
    if (busy.value) return
    busy.value = true
    scheduleOnRN(haptic, 'tap')
    const opts = { duration: 260, easing: easeIn }
    if (dir === 'up') {
      y.value = withTiming(-H * 1.35, opts, (fin) => {
        if (fin) scheduleOnRN(done, dir)
      })
    } else {
      y.value = withTiming(y.value + 30, opts)
      x.value = withTiming((dir === 'left' ? -1 : 1) * W * 1.5, opts, (fin) => {
        if (fin) scheduleOnRN(done, dir)
      })
    }
  }
  useImperativeHandle(ref, () => ({ fling: (dir) => runOnUI(commit)(dir) }))

  const settle = () => {
    'worklet'
    x.value = withSpring(0, SPRING_SETTLE)
    y.value = withSpring(0, SPRING_SETTLE)
  }

  // La carta de arriba escribe el progreso (hypot / 160) que usan las de atrás.
  useAnimatedReaction(
    () => (isTop ? Math.min(1, Math.hypot(x.value, y.value) / 160) : -1),
    (p) => {
      if (p >= 0) progress.value = p
    },
  )

  const pan = usePanGesture({
    enabled: isTop,
    minDistance: 3, // framer arranca el arrastre a ~3 px
    onBegin: () => {
      'worklet'
      x.value = x.value // detiene un muelle en curso
    },
    onUpdate: (e) => {
      'worklet'
      if (busy.value) return
      x.value = e.translationX
      y.value = e.translationY
      const ox = x.value
      const oy = y.value
      const past = Math.abs(ox) >= Math.abs(oy) ? Math.abs(ox) > W * H_THRESHOLD : oy < 0 && -oy > H * V_THRESHOLD
      if (past && !armed.value) scheduleOnRN(haptic, 'tick')
      armed.value = past
    },
    onDeactivate: (e) => {
      'worklet'
      if (busy.value) return
      const ox = x.value
      const oy = y.value
      const horizontal = Math.abs(ox) >= Math.abs(oy)
      let dir: SwipeDir | null = null
      if (horizontal) {
        if (Math.abs(ox) > W * H_THRESHOLD || (Math.abs(e.velocityX) > FLICK && Math.abs(ox) > 40)) dir = ox > 0 ? 'right' : 'left'
      } else if (oy < 0 && (-oy > H * V_THRESHOLD || (e.velocityY < -FLICK && -oy > 40))) dir = 'up'
      if (dir) commit(dir)
      else settle()
    },
  })
  const tap = useTapGesture({
    enabled: isTop,
    onDeactivate: (e) => {
      'worklet'
      if (!e.canceled && !busy.value) scheduleOnRN(open)
    },
  })
  const gesture = useCompetingGestures(pan, tap)

  const rightO = useDerivedOpacity(x, y, W, H, 'right')
  const leftO = useDerivedOpacity(x, y, W, H, 'left')
  const upO = useDerivedOpacity(x, y, W, H, 'up')

  const style = useAnimatedStyle(() => {
    if (depth === 0) {
      return {
        transform: [
          { translateX: x.value },
          { translateY: y.value },
          { rotate: `${interpolate(x.value, [-260, 0, 260], [-15, 0, 15], Extrapolation.CLAMP)}deg` },
        ],
      }
    }
    const p = progress.value
    const s = depth === 1 ? interpolate(p, [0, 1], [0.95, 1], Extrapolation.CLAMP) : interpolate(p, [0, 1], [0.9, 0.95], Extrapolation.CLAMP)
    const ty = depth === 1 ? interpolate(p, [0, 1], [14, 0], Extrapolation.CLAMP) : interpolate(p, [0, 1], [28, 14], Extrapolation.CLAMP)
    return { transform: [{ translateY: ty }, { scale: s }] }
  })

  const tint = (c: string, o: SharedValue<number>) => <TintLayer color={c} opacity={o} />
  const body = (
    <Animated.View
      style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: STACK_GAP, zIndex: 10 - depth }, depth > 0 ? { transformOrigin: '50% 100%' } : null, style]}
      accessible={isTop}
      accessibilityRole="button"
      accessibilityLabel={`${titleOf(item)}. Desliza a la derecha si ${SHELF_LABEL[shelf].pronoun} has ${SHELF_LABEL[shelf].seenPastPart}, a la izquierda si no te interesa, arriba para pendientes. Toca para ver la ficha.`}
      accessibilityActions={isTop ? [{ name: 'right', label: 'Visto' }, { name: 'left', label: 'No me interesa' }, { name: 'up', label: 'Pendiente' }] : undefined}
      onAccessibilityAction={(e) => {
        const n = e.nativeEvent.actionName
        if (n === 'right' || n === 'left' || n === 'up') runOnUI(commit)(n)
      }}
    >
      <View ref={faceRef} collapsable={false} style={StyleSheet.absoluteFill}>
        <CardFace item={item} />
        {isTop && (
          <>
            {tint(colors.stampGreen, rightO)}
            {tint(colors.stampRed, leftO)}
            {tint(colors.stampBlue, upO)}
            <Stamp label={stamps?.right ?? SHELF_LABEL[shelf].stamp} color={colors.stampGreen} opacity={rightO} style={{ top: '22%', left: 20, transform: [{ rotate: '-12deg' }] }} />
            <Stamp label={stamps?.left ?? 'NO ME INTERESA'} color={colors.stampRed} opacity={leftO} size={22} style={{ top: '22%', right: 16, transform: [{ rotate: '12deg' }] }} />
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: '38%', alignItems: 'center' }}>
              <Stamp label={stamps?.up ?? 'PENDIENTE'} color={colors.stampBlue} opacity={upO} style={{ position: 'relative', transform: [{ rotate: '-6deg' }] }} />
            </View>
          </>
        )}
      </View>
    </Animated.View>
  )
  return isTop ? <GestureDetector gesture={gesture}>{body}</GestureDetector> : body
})

function TintLayer({ color, opacity }: { color: string; opacity: SharedValue<number> }) {
  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: RADIUS, backgroundColor: color + '40' }, anim]} />
}

/** Opacidad de la capa y del sello de cada dirección, según el progreso del gesto (0 a 1). */
function useDerivedOpacity(x: SharedValue<number>, y: SharedValue<number>, W: number, H: number, dir: SwipeDir) {
  return useDerivedValue(() => {
    const xv = x.value
    const yv = y.value
    if (dir === 'right') return xv > 0 && Math.abs(xv) >= Math.abs(yv) ? Math.min(1, xv / (W * H_THRESHOLD)) : 0
    if (dir === 'left') return xv < 0 && Math.abs(xv) >= Math.abs(yv) ? Math.min(1, -xv / (W * H_THRESHOLD)) : 0
    return yv < 0 && Math.abs(yv) > Math.abs(xv) ? Math.min(1, -yv / (H * V_THRESHOLD)) : 0
  })
}

interface Props {
  deck: Item[]
  shelf: ShelfType
  onSwipe: (item: Item, dir: SwipeDir) => void
  onOpen: (item: Item, rect: Rect) => void
  stamps?: { right?: string; left?: string; up?: string }
}

/**
 * Mazo de cartas. Ocupa todo el hueco del padre; la caja mide `alto × 2/3,15` como máximo (SwipeDeck.tsx:143): la tarjeta
 * nunca es más ancha que un póster 2:3 más el hueco de 30 pt del montón.
 */
export const SwipeDeck = forwardRef<DeckHandle, Props>(function SwipeDeck({ deck, shelf, onSwipe, onOpen, stamps }, ref) {
  const [area, setArea] = useState({ w: 0, h: 0 })
  const progress = useSharedValue(0)
  const topRef = useRef<CardHandle>(null)
  useImperativeHandle(ref, () => ({ fling: (dir) => topRef.current?.fling(dir) }))
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setArea((o) => (o.w === width && o.h === height ? o : { w: width, h: height }))
  }
  const boxW = Math.min(area.w, (area.h * 2) / 3.15)
  const boxH = area.h
  const shown = deck.slice(0, 3)
  return (
    <View style={{ flex: 1, alignItems: 'center' }} onLayout={onLayout}>
      {boxW > 0 && shown.length > 0 && (
        <View style={{ width: boxW, height: boxH }}>
          {[...shown].reverse().map((it) => {
            const depth = shown.indexOf(it)
            return (
              <DeckCard
                key={it.id}
                ref={depth === 0 ? topRef : undefined}
                item={it}
                depth={depth}
                shelf={shelf}
                W={boxW}
                H={boxH}
                progress={progress}
                stamps={stamps}
                onDone={onSwipe}
                onOpen={onOpen}
              />
            )
          })}
        </View>
      )}
    </View>
  )
})
