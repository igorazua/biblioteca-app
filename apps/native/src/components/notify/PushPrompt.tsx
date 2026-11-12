import { useEffect, useState } from 'react'
import { Modal, StyleSheet, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import type { NotificationTier } from '@biblioteca/core'
import { useStore } from '../../store'
import { AppText } from '../AppText'
import { Icon } from '../Icon'
import { Press } from '../Press'
import { alpha, colors } from '../../theme'
import { getNotifyPermission, isNotifySupported, isPromptDismissed, markPromptDismissed, requestNotifyPermission } from '../../lib/notify'

// PushPrompt.tsx de la PWA: pantalla previa al permiso de avisos. Mismos textos, mismo disparo (10 vistas + 1,5 s) y misma
// memoria de «ya se preguntó». Se monta una vez, en `_layout`. Medidas: MEDIDAS_NATIVA_2 «PushPrompt».
const SPRING = { stiffness: 320, damping: 28, mass: 1 }

export function PushPrompt() {
  const seenCount = useStore((s) => Object.values(s.entries).filter((e) => e.status === 'seen').length)
  const setSettings = useStore((s) => s.setSettings)
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState<NotificationTier | null>(null)

  useEffect(() => {
    if (!isNotifySupported() || show || seenCount < 10) return
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    ;(async () => {
      // `Notification.permission !== 'default'` o ya descartado: no se pregunta
      if ((await getNotifyPermission()) !== 'undetermined') return
      if (await isPromptDismissed()) return
      if (!alive) return
      timer = setTimeout(() => alive && setShow(true), 1500)
    })()
    return () => {
      alive = false
      if (timer) clearTimeout(timer)
    }
  }, [seenCount, show])

  const choose = async (tier: NotificationTier) => {
    setBusy(tier)
    try {
      let chosen = tier
      // Si se niega el permiso del sistema, la preferencia queda en «ninguna». La PWA guardaba la elegida aunque
      // `subscribeToPush()` fallase; aquí sin permiso no hay avisos que elegir y Ajustes lo muestra como «Desactivadas».
      if (tier !== 'none' && !(await requestNotifyPermission())) chosen = 'none'
      setSettings({ notificationTier: chosen })
    } finally {
      await markPromptDismissed()
      setBusy(null)
      setShow(false)
    }
  }

  if (!show) return null
  return (
    <Modal transparent animationType="none" visible statusBarTranslucent onRequestClose={() => void choose('none')}>
      <Card busy={busy} onChoose={(t) => void choose(t)} />
    </Modal>
  )
}

function Card({ busy, onChoose }: { busy: NotificationTier | null; onChoose: (t: NotificationTier) => void }) {
  const reduce = useReducedMotion()
  const y = useSharedValue(reduce ? 0 : 80)
  const opacity = useSharedValue(reduce ? 1 : 0)
  useEffect(() => {
    if (reduce) return
    y.value = withSpring(0, SPRING)
    opacity.value = withTiming(1, { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.35, 1) })
  }, [reduce, y, opacity])
  const anim = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: y.value }] }))

  return (
    <View style={styles.overlay}>
      <Animated.View accessibilityViewIsModal accessibilityLabel="¿Qué notificaciones quieres recibir?" style={[styles.card, anim]}>
        <View style={styles.topRow}>
          <View style={styles.bell}>
            <Icon name="bell" size={26} color={colors.accent} />
          </View>
          <View style={styles.pill}>
            <AppText style={styles.pillText}>ALERTAS</AppText>
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <AppText accessibilityRole="header" style={styles.title}>
            ¿Qué notificaciones quieres recibir?
          </AppText>
          <AppText style={styles.desc}>Elige con qué frecuencia quieres enterarte de novedades, estrenos y la actividad de tus amigos.</AppText>
        </View>

        <View style={{ gap: 8, paddingTop: 4 }}>
          <Press
            accessibilityRole="button"
            disabled={busy !== null}
            scaleTo={0.98}
            onPress={() => onChoose('important')}
            style={[styles.opt, { backgroundColor: colors.accent }]}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.optTitleRow}>
                <AppText style={[styles.optTitle, { color: colors.accentInk }]}>Solo importantes</AppText>
                <View style={styles.reco}>
                  <AppText style={styles.recoText}>RECOMENDADO</AppText>
                </View>
              </View>
              <AppText style={[styles.optSub, { color: alpha(colors.accentInk, 0.85) }]}>Estrenos pendientes y duelos de amigos</AppText>
            </View>
            {busy === 'important' ? (
              <AppText style={[styles.busy, { color: colors.accentInk }]}>Activando…</AppText>
            ) : (
              <Icon name="chevron" size={16} color={alpha(colors.accentInk, 0.7)} />
            )}
          </Press>

          <Press
            accessibilityRole="button"
            disabled={busy !== null}
            scaleTo={0.98}
            onPress={() => onChoose('all')}
            style={[styles.opt, { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }]}
          >
            <View style={{ flex: 1 }}>
              <AppText style={[styles.optTitle, { color: colors.ink }]}>Todas las notificaciones</AppText>
              <AppText style={[styles.optSub, { color: colors.mute }]}>Recomendaciones semanales y toda la actividad</AppText>
            </View>
            {busy === 'all' ? <AppText style={[styles.busy, { color: colors.mute }]}>Activando…</AppText> : <Icon name="chevron" size={16} color={colors.mute} />}
          </Press>

          <Press accessibilityRole="button" disabled={busy !== null} onPress={() => onChoose('none')} style={styles.none}>
            <AppText style={styles.noneText}>No activar ninguna</AppText>
          </Press>
        </View>

        <AppText style={styles.foot}>Podrás cambiar tus preferencias en cualquier momento en tu Perfil → Ajustes.</AppText>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end', alignItems: 'center', padding: 16 },
  card: {
    width: '100%',
    maxWidth: 384,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 20,
    gap: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 24,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bell: { width: 48, height: 48, borderRadius: 16, backgroundColor: alpha(colors.accent, 0.15), alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line },
  pillText: { fontFamily: 'Inter-600', fontSize: 11, lineHeight: 16.5, letterSpacing: 0.55, color: colors.mute },
  title: { fontFamily: 'Inter-700', fontSize: 18, lineHeight: 28, color: colors.ink },
  desc: { fontFamily: 'Inter-400', fontSize: 12, lineHeight: 19.5, color: colors.mute },
  opt: { padding: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  optTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  optTitle: { fontFamily: 'Inter-600', fontSize: 13, lineHeight: 20 },
  optSub: { fontFamily: 'Inter-400', fontSize: 11, lineHeight: 16.5 },
  reco: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(0, 0, 0, 0.15)' },
  recoText: { fontFamily: 'Inter-700', fontSize: 10, lineHeight: 15, letterSpacing: 0.5, color: colors.accentInk },
  busy: { fontFamily: 'Inter-600', fontSize: 12, lineHeight: 16 },
  none: { minHeight: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  noneText: { fontFamily: 'Inter-500', fontSize: 12, lineHeight: 16, color: colors.mute },
  foot: { fontFamily: 'Inter-400', fontSize: 11, lineHeight: 16.5, textAlign: 'center', color: alpha(colors.mute, 0.8), paddingTop: 2 },
})
