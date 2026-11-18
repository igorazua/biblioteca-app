import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { AppText } from '../AppText'
import { Icon } from '../Icon'
import { Press } from '../Press'
import { alpha, colors, tx } from '../../theme'

// NudgeCard de la PWA. Dos variantes: `banner` (franja sobre la lista) y `card` (tarjeta grande).
// Animaciones de entrada, de framer en la PWA:
//  - banner: opacidad y `y` con transición de 220 ms, easeOut (0,0,0.58,1).
//  - card: opacidad con tween 300 ms por defecto de framer; `scale` con muelle criticamente amortiguado (550, 30).
// Sin salida: en la PWA no van envueltas en AnimatePresence, así que desaparecen de golpe.
const EASE_OUT = Easing.bezier(0, 0, 0.58, 1)
const EASE_DEFAULT = Easing.bezier(0.25, 0.1, 0.35, 1)
const SPRING_SCALE = { stiffness: 550, damping: 30, mass: 1 }

export interface NudgeData {
  message: string
  actionLabel: string
}

export interface NudgeCardProps {
  nudge: NudgeData
  onAction: () => void
  onDismiss: () => void
  variant?: 'banner' | 'card'
}

export function NudgeCard({ nudge, onAction, onDismiss, variant = 'banner' }: NudgeCardProps) {
  const opacity = useSharedValue(0)
  // Progreso del desplazamiento (banner: y −12 → 0) o de la escala (card: 0,96 → 1).
  const shift = useSharedValue(0)
  useEffect(() => {
    if (variant === 'card') {
      opacity.value = withTiming(1, { duration: 300, easing: EASE_DEFAULT })
      shift.value = withSpring(1, SPRING_SCALE)
    } else {
      opacity.value = withTiming(1, { duration: 220, easing: EASE_OUT })
      shift.value = withTiming(1, { duration: 220, easing: EASE_OUT })
    }
  }, [opacity, shift, variant])

  const bannerAnim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: -12 * (1 - shift.value) }],
  }))
  const cardAnim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: 0.96 + 0.04 * shift.value }],
  }))

  if (variant === 'card') {
    return (
      <Animated.View style={[styles.cardShadow, cardAnim]}>
        <LinearGradient colors={[colors.surface, colors.surface2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.cardIcon}>
              <Icon name="sparkle" size={20} color={colors.accent} />
            </View>
            <Press accessibilityRole="button" accessibilityLabel="Cerrar aviso" onPress={onDismiss} style={styles.cardClose}>
              <Icon name="x" size={16} color={colors.mute} />
            </Press>
          </View>

          <View style={styles.cardBody}>
            <AppText style={styles.cardTitle}>Un recordatorio</AppText>
            <AppText style={styles.cardMessage}>{nudge.message}</AppText>
          </View>

          <Press accessibilityRole="button" onPress={onAction} style={styles.cardAction}>
            <AppText style={styles.cardActionText}>{nudge.actionLabel}</AppText>
          </Press>
        </LinearGradient>
      </Animated.View>
    )
  }

  return (
    <Animated.View style={[styles.banner, bannerAnim]}>
      <View style={styles.bannerIcon}>
        <Icon name="sparkle" size={18} color={colors.accent} />
      </View>

      {/* El mensaje entero; la acción debajo, como en la PWA. */}
      <View style={styles.bannerText}>
        <AppText style={styles.bannerMessage}>{nudge.message}</AppText>
        <Press accessibilityRole="button" onPress={onAction} style={styles.bannerAction}>
          <AppText style={styles.bannerActionText}>{nudge.actionLabel}</AppText>
        </Press>
      </View>

      <Press accessibilityRole="button" accessibilityLabel="Cerrar recordatorio" onPress={onDismiss} style={styles.bannerClose}>
        <Icon name="x" size={15} color={colors.mute} />
      </Press>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  // La sombra va fuera del recorte del degradado: el contenedor exterior la lleva.
  cardShadow: {
    borderRadius: 28,
    // shadow-2xl: su color lo fija index.css (rgb(20 12 2 / 0.7)); desenfoque 50 → radio 25 aprox.
    shadowColor: 'rgb(20, 12, 2)',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.7,
    shadowRadius: 25,
    elevation: 12,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: alpha(colors.accent, 0.4),
    padding: 24,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: alpha(colors.accent, 0.2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { marginVertical: 24 },
  cardTitle: { fontFamily: 'Archivo-Condensed-ExtraBold', fontSize: 30, lineHeight: 33, textTransform: 'uppercase', color: colors.ink, marginBottom: 8 },
  cardMessage: { ...tx('body', { fontSize: 16, lineHeight: 26, color: colors.mute }) },
  cardAction: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cardActionText: { fontFamily: 'Archivo-SemiBold', fontSize: 14, lineHeight: 20, color: colors.accentInk },

  banner: {
    marginHorizontal: 20,
    marginBottom: 12,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: alpha(colors.accent, 0.35),
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    // shadow-lg de Tailwind: 0 10px 15px -3px rgb(0 0 0 / 0.1)
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 7.5,
    elevation: 4,
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: alpha(colors.accent, 0.15),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bannerText: { flex: 1, minWidth: 0, paddingTop: 2 },
  bannerMessage: { fontFamily: 'Archivo-Regular', fontSize: 13, lineHeight: 17.875, color: alpha(colors.ink, 0.9) },
  bannerAction: {
    marginTop: 10,
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerActionText: { fontFamily: 'Archivo-SemiBold', fontSize: 13, lineHeight: 18, color: colors.accentInk },
  bannerClose: {
    width: 36,
    height: 36,
    marginTop: -4,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
})
