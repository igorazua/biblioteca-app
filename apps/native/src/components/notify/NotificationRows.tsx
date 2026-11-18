import { useCallback, useEffect, useState } from 'react'
import { Alert, Linking, StyleSheet, View } from 'react-native'
import { useStore } from '../../store'
import { AppText } from '../AppText'
import { Press } from '../Press'
import { Row, Toggle } from '../ui'
import { alpha, colors } from '../../theme'
import { getNotifyPermission, isNotifySupported, requestNotifyPermission, type NotifyPermission } from '../../lib/notify'

/**
 * Fila «Notificaciones» de Ajustes y, si están activas, el selector «Frecuencia de avisos» (Settings.tsx:206-247).
 * Va como un único hijo de `Group`. `onToast` recibe los avisos («Preferencia: Solo importantes», «Preferencia: Todas»).
 */
export function NotificationRows({ onToast }: { onToast: (message: string) => void }) {
  const tier = useStore((s) => s.settings.notificationTier)
  const setSettings = useStore((s) => s.setSettings)
  const [permission, setPermission] = useState<NotifyPermission>('undetermined')

  const refresh = useCallback(() => void getNotifyPermission().then(setPermission), [])
  useEffect(refresh, [refresh, tier])

  // `pushEnabled` de la PWA: permiso concedido y frecuencia distinta de «ninguna»
  const enabled = permission === 'granted' && tier !== 'none'
  const current = tier ?? 'important'

  const toggle = async () => {
    if (enabled) {
      setSettings({ notificationTier: 'none' })
      return
    }
    if (!isNotifySupported()) {
      Alert.alert('Avisos', 'Tu dispositivo no soporta notificaciones directamente.')
      return
    }
    if (await requestNotifyPermission()) {
      setSettings({ notificationTier: 'important' })
      setPermission('granted')
      return
    }
    // El sistema ya no vuelve a preguntar: hay que activarlo en los ajustes del móvil (la PWA no hacía nada aquí)
    Alert.alert('Avisos desactivados en el móvil', 'Para recibir avisos, actívalos para Biblioteca en los ajustes del sistema.', [
      { text: 'Ahora no', style: 'cancel' },
      { text: 'Abrir ajustes', onPress: () => void Linking.openSettings() },
    ])
    refresh()
  }

  return (
    <View>
      <Row
        icon="bell"
        tint="#e0584b"
        title="Notificaciones"
        sub={enabled ? (current === 'important' ? 'Solo importantes' : 'Todas las notificaciones') : 'Desactivadas'}
        right={<Toggle on={enabled} onChange={() => void toggle()} label="Notificaciones" />}
      />
      {enabled && (
        <View style={styles.bar}>
          <AppText style={styles.label}>Frecuencia de avisos</AppText>
          <View style={styles.seg}>
            <Option
              active={current === 'important'}
              label="Solo importantes"
              onPress={() => {
                setSettings({ notificationTier: 'important' })
                onToast('Preferencia: Solo importantes')
              }}
            />
            <Option
              active={tier === 'all'}
              label="Todas"
              onPress={() => {
                setSettings({ notificationTier: 'all' })
                onToast('Preferencia: Todas')
              }}
            />
          </View>
        </View>
      )}
    </View>
  )
}

function Option({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Press accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.opt, active ? styles.optOn : null]}>
      <AppText style={[styles.optText, { color: active ? colors.accentInk : colors.mute }, active ? { fontFamily: 'Archivo-SemiBold' } : null]}>{label}</AppText>
    </Press>
  )
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: alpha(colors.surface2, 0.6),
    borderTopWidth: 1,
    borderTopColor: alpha(colors.line, 0.6),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: { fontFamily: 'Archivo-Regular', fontSize: 12, lineHeight: 16, color: colors.mute },
  seg: { flexDirection: 'row', padding: 2, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  opt: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  optOn: { backgroundColor: colors.accent },
  optText: { fontFamily: 'Archivo-Regular', fontSize: 12, lineHeight: 16 },
})
