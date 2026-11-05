import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import type { Item } from '@biblioteca/core'
import { Poster } from '../components/Poster'
import { SPRING_FLIGHT } from './motion'
import { posterAspect } from './item'

/** Rectángulo en coordenadas de ventana: [x, y, ancho, alto]. */
export type Rect = [number, number, number, number]

const DETAIL_RADIUS = 10

/** Tamaño del póster en la ficha mínima: ancho acotado, alto según la forma de la portada. */
export function detailPosterSize(item: Pick<Item, 'type' | 'posterRatio'>, screenW: number): { w: number; h: number } {
  const a = posterAspect(item)
  const w = Math.min(screenW - 40, a > 1 ? 320 : 260)
  return { w, h: w / a }
}

interface FlightCtx {
  /** id de la obra cuyo póster está viajando (la ficha oculta el suyo hasta que aterriza) */
  activeId: string | null
  /** Con reducir movimiento no hay vuelo: la ficha hace un fundido. */
  reduceMotion: boolean
  start: (item: Item, from: Rect, radius: number) => void
  land: (id: string, to: Rect) => void
}

const Ctx = createContext<FlightCtx>({ activeId: null, reduceMotion: false, start: () => {}, land: () => {} })
export const useFlight = () => useContext(Ctx)

/**
 * Póster que vuela a la ficha (D12), hecho a mano con Reanimated: la carta mide su origen, la ficha mide su destino y una
 * capa por encima del navegador lleva el póster de uno a otro con el muelle de la PWA (420/40/0.9). Todo el movimiento
 * corre en el hilo de UI. Con reducir movimiento no se crea la capa (la ficha entra con un fundido).
 */
export function FlightProvider({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion()
  const [flight, setFlight] = useState<{ item: Item; radius: number } | null>(null)
  const flightRef = useRef(flight)
  const prog = useSharedValue(0)
  const from = useSharedValue<Rect>([0, 0, 0, 0])
  const to = useSharedValue<Rect>([0, 0, 0, 0])
  const guard = useRef<ReturnType<typeof setTimeout> | null>(null)

  const end = useCallback(() => {
    if (guard.current) clearTimeout(guard.current)
    flightRef.current = null
    setFlight(null)
  }, [])

  const start = useCallback(
    (item: Item, rect: Rect, radius: number) => {
      if (reduceMotion) return
      prog.value = 0
      from.value = rect
      to.value = rect
      flightRef.current = { item, radius }
      setFlight({ item, radius })
      // Si la ficha nunca llega a medirse, la capa no se queda tapando la pantalla.
      if (guard.current) clearTimeout(guard.current)
      guard.current = setTimeout(end, 2000)
    },
    [reduceMotion, prog, from, to, end],
  )

  const land = useCallback(
    (id: string, rect: Rect) => {
      if (flightRef.current?.item.id !== id) return
      to.value = rect
      prog.value = withSpring(1, SPRING_FLIGHT, (fin) => {
        if (fin) scheduleOnRN(end)
      })
    },
    [prog, to, end],
  )

  const value = useMemo<FlightCtx>(() => ({ activeId: flight?.item.id ?? null, reduceMotion, start, land }), [flight, reduceMotion, start, land])
  return (
    <Ctx.Provider value={value}>
      {children}
      {flight && <FlightLayer item={flight.item} radius={flight.radius} prog={prog} from={from} to={to} />}
    </Ctx.Provider>
  )
}

function FlightLayer({ item, radius, prog, from, to }: { item: Item; radius: number; prog: SharedValue<number>; from: SharedValue<Rect>; to: SharedValue<Rect> }) {
  const { width } = useWindowDimensions()
  const { w: tw, h: th } = detailPosterSize(item, width)

  // Caja que recorta: de la carta (esquinas 28) al hueco de la ficha (esquinas 10).
  const outer = useAnimatedStyle(() => {
    const p = prog.value
    const f = from.value
    const t = to.value
    return {
      left: f[0] + (t[0] - f[0]) * p,
      top: f[1] + (t[1] - f[1]) * p,
      width: f[2] + (t[2] - f[2]) * p,
      height: f[3] + (t[3] - f[3]) * p,
      borderRadius: radius + (DETAIL_RADIUS - radius) * p,
    }
  })
  // El póster se pinta una vez al tamaño final y se escala (GPU), cubriendo la caja como `cover`.
  const inner = useAnimatedStyle(() => {
    const p = prog.value
    const f = from.value
    const t = to.value
    const w = f[2] + (t[2] - f[2]) * p
    const h = f[3] + (t[3] - f[3]) * p
    const s = Math.max(w / tw, h / th)
    return { transform: [{ translateX: (w - tw * s) / 2 }, { translateY: (h - th * s) / 2 }, { scale: s }] }
  })

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[{ position: 'absolute', overflow: 'hidden' }, outer]}>
        <Animated.View style={[{ width: tw, height: th, transformOrigin: 'top left' }, inner]}>
          <Poster item={item} noBlur style={{ width: tw, height: th }} />
        </Animated.View>
      </Animated.View>
    </View>
  )
}
