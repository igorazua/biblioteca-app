import { forwardRef } from 'react'
import { Pressable, type PressableProps, type StyleProp, type View, type ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

const APressable = Animated.createAnimatedComponent(Pressable)

/**
 * Pulsable con el estado pulsado de D21: opacidad 0,7 en 100 ms y, si se pide (`scaleTo`, tarjetas grandes), escala 0,98.
 * Las animaciones corren en el hilo de UI.
 */
export const Press = forwardRef<View, Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scaleTo?: number }>(function Press(
  { style, scaleTo, onPressIn, onPressOut, ...rest },
  ref,
) {
  const down = useSharedValue(0)
  const anim = useAnimatedStyle(() => ({
    opacity: 1 - 0.3 * down.value,
    transform: scaleTo ? [{ scale: 1 - (1 - scaleTo) * down.value }] : [],
  }))
  return (
    <APressable
      ref={ref as never}
      {...rest}
      onPressIn={(e) => {
        down.value = withTiming(1, { duration: 100 })
        onPressIn?.(e)
      }}
      onPressOut={(e) => {
        down.value = withTiming(0, { duration: 100 })
        onPressOut?.(e)
      }}
      style={[style, anim]}
    />
  )
})
