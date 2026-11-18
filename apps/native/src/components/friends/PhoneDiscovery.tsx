import { useEffect, useState } from 'react'
import { StyleSheet, TextInput, View } from 'react-native'
import { AppText } from '../AppText'
import { Press } from '../Press'
import { getPhoneDiscoverable, setPhoneDiscoverable } from '../../lib/contacts'
import { useStore } from '../../store/useStore'
import { colors, tx } from '../../theme'

/**
 * Ajustes › Amigos: activar que te encuentren por tu teléfono (opcional, apagado por defecto). En el servidor solo
 * queda una huella del número que no permite recuperarlo; se puede quitar cuando quieras (`biblio_set_phone(null)`).
 */
export function PhoneDiscovery({ onToast }: { onToast: (msg: string) => void }) {
  const country = useStore((s) => s.profile.country) ?? 'ES'
  const [on, setOn] = useState<boolean | null>(null)
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    void getPhoneDiscoverable().then((v) => alive && setOn(v))
    return () => {
      alive = false
    }
  }, [])

  const save = async (value: string | null) => {
    setSaving(true)
    const r = await setPhoneDiscoverable(value, country)
    setSaving(false)
    if (!r.ok) return onToast(r.error ?? 'No se pudo guardar')
    setOn(value !== null)
    setPhone('')
    onToast(value !== null ? 'Listo: tus amigos te encontrarán por tu teléfono' : 'Tu número ya no se usa para encontrarte')
  }

  return (
    <View style={styles.card}>
      <View>
        <AppText style={tx('body', { fontFamily: 'Archivo-SemiBold', color: colors.ink })}>Que tus amigos te encuentren por tu teléfono</AppText>
        <AppText style={[tx('meta'), { marginTop: 4, lineHeight: 19 }]}>
          Si alguien que te tiene en su agenda busca amigos, le aparecerás para conectar. Tu número no se muestra a nadie y en el servidor solo queda una huella de la
          que no se puede sacar.
        </AppText>
      </View>
      {on ? (
        <View style={styles.onRow}>
          <AppText style={tx('body', { fontFamily: 'Archivo-Regular', color: colors.accent })}>Activado</AppText>
          <Press
            accessibilityRole="button"
            accessibilityLabel="Desactivar"
            disabled={saving}
            dim={saving ? 0.5 : 1}
            onPress={() => save(null)}
            style={styles.offBtn}
          >
            <AppText style={tx('body', { fontFamily: 'Archivo-Regular', color: colors.ink })}>Desactivar</AppText>
          </Press>
        </View>
      ) : (
        <View style={styles.form}>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="Tu móvil (p. ej. 600 11 22 33)"
            placeholderTextColor={colors.mute}
            accessibilityLabel="Tu número de móvil"
            returnKeyType="done"
            onSubmitEditing={() => phone.trim() && save(phone)}
            style={styles.input}
          />
          <Press
            accessibilityRole="button"
            accessibilityLabel="Activar"
            disabled={saving || !phone.trim()}
            dim={saving || !phone.trim() ? 0.5 : 1}
            onPress={() => save(phone)}
            style={styles.onBtn}
          >
            <AppText style={tx('body', { fontFamily: 'Archivo-SemiBold', color: colors.accentInk })}>{saving ? '…' : 'Activar'}</AppText>
          </Press>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, padding: 16, gap: 12 },
  onRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  offBtn: { minHeight: 40, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.surface2, justifyContent: 'center' },
  form: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
    paddingHorizontal: 12,
    color: colors.ink,
    ...tx('body', { fontSize: 14 }),
  },
  onBtn: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.accent, justifyContent: 'center' },
})
