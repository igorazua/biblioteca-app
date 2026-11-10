import { useEffect, type ReactNode } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated'
import { easeInOut } from '../../lib/motion'

/** Entrada con opacidad 0 → 1 y, si se pide, subida de `y` → 0 (framer: `initial` / `animate` con duración y retraso en segundos). */
export function Enter({ delay = 0, duration, y = 0, style, children }: { delay?: number; duration: number; y?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const reduce = useReducedMotion()
  const p = useSharedValue(reduce ? 1 : 0)
  useEffect(() => {
    if (!reduce) p.value = withDelay(delay * 1000, withTiming(1, { duration: duration * 1000, easing: easeInOut }))
  }, [p, delay, duration, reduce])
  const anim = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * y }] }))
  return <Animated.View style={[style, anim]}>{children}</Animated.View>
}
