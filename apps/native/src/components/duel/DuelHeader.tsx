import { useEffect, type ReactNode } from 'react'
import { View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, tx } from '../../theme'
import { AppText } from '../AppText'
import { Icon } from '../Icon'
import { Press } from '../Press'

/**
 * ScreenTitle.tsx de la PWA completo (volver, contador de pasos con barra de progreso, acción). El `ScreenTitle` nativo es la
 * versión reducida de la fase 1 y no es mío, así que las pantallas de duelos usan esta.
 */
export function DuelHeader({
  label,
  step,
  title,
  subtitle,
  action,
  onBack,
  topExtra = 0,
}: {
  label?: string
  step?: { current: number; total: number }
  title?: string
  subtitle?: string
  action?: ReactNode
  onBack?: () => void
  /** pt extra por encima del bloque: lo baja hacia el contenido (D34) */
  topExtra?: number
}) {
  const insets = useSafeAreaInsets()
  const frac = step ? Math.min(1, Math.max(0, step.current / step.total)) : 0
  const w = useSharedValue(frac)
  useEffect(() => {
    w.value = withTiming(frac, { duration: 300, easing: Easing.bezier(0.4, 0, 0.2, 1) })
  }, [frac, w])
  const bar = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }))
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: Math.max(insets.top, 22) + topExtra, paddingBottom: 24 }}>
      <View style={{ minHeight: 24, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 }}>
          {onBack && (
            <Press accessibilityRole="button" accessibilityLabel="Volver" onPress={onBack} hitSlop={8} style={{ padding: 4, marginLeft: -4 }}>
              <Icon name="back" size={20} color={colors.ink} />
            </Press>
          )}
          {!!label && (
            <AppText numberOfLines={1} style={[tx('label'), { flexShrink: 1 }]}>
              {label}
            </AppText>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 12 }}>
          {step && (
            <AppText style={[tx('meta'), { fontVariant: ['tabular-nums'] }]}>
              {step.current} de {step.total}
            </AppText>
          )}
          {action}
        </View>
      </View>
      {step && (
        <View style={{ width: '100%', height: 2, backgroundColor: colors.line, marginBottom: 16, borderRadius: 1, overflow: 'hidden' }}>
          <Animated.View style={[{ height: '100%', backgroundColor: colors.accent }, bar]} />
        </View>
      )}
      {!!title && <AppText style={[tx('display'), { color: colors.ink }]}>{title}</AppText>}
      {!!subtitle && <AppText style={[tx('meta'), { marginTop: 6 }]}>{subtitle}</AppText>}
    </View>
  )
}
