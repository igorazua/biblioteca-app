import { useState } from 'react'
import { Linking, StyleSheet, TextInput, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { ConnectorUnavailable, ConnectorUserError, startSpotifyAuth, type ImportRow, type Service } from '@biblioteca/core'
import { AppText } from '../AppText'
import { Press } from '../Press'
import { Sheet } from '../ui'
import { BrandLogo } from './BrandLogo'
import { rowsFromContent } from '../../lib/import/readFile'
import { pickAndReadFile } from '../../lib/import/pickFile'
import { alpha, colors } from '../../theme'

// Las tres hojas de Connect.tsx de la PWA (UsernameSheet, FileSheet, OAuthSheet). Medidas en MEDIDAS_NATIVA_2 («Connect»).

function SheetHead({ service, children }: { service: Service; children: string }) {
  return (
    <View style={styles.head}>
      <BrandLogo id={service.id} size={44} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText style={styles.headTitle}>{service.name}</AppText>
        <AppText style={styles.headSub}>{children}</AppText>
      </View>
    </View>
  )
}

function PrimaryButton({ children, onPress, disabled, label }: { children: string; onPress: () => void; disabled?: boolean; label?: string }) {
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={label ?? children}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      dim={disabled ? 0.5 : 1}
      onPress={onPress}
      scaleTo={0.98}
      style={styles.primary}
    >
      <AppText style={styles.primaryText}>{children}</AppText>
    </Press>
  )
}

export function UsernameSheet({
  service,
  onClose,
  onRows,
  onFile,
}: {
  service: Service
  onClose: () => void
  onRows: (r: ImportRow[]) => void
  onFile: () => void
}) {
  const [handle, setHandle] = useState('')
  const [busy, setBusy] = useState(false)
  const [focused, setFocused] = useState(false)
  const [msg, setMsg] = useState<{ text: string; soon?: boolean } | null>(null)
  const u = service.username!

  const submit = async () => {
    if (busy || !handle.trim()) return
    setBusy(true)
    setMsg(null)
    try {
      const rows = await service.connector!.fetchRows({ service: service.id, handle })
      if (rows.length === 0) setMsg({ text: 'No hemos encontrado obras en esa cuenta. Comprueba que el perfil sea público.' })
      else onRows(rows)
    } catch (e) {
      if (e instanceof ConnectorUnavailable) setMsg({ text: 'Disponible muy pronto', soon: true })
      else if (e instanceof ConnectorUserError) setMsg({ text: e.message })
      else setMsg({ text: 'No hemos podido conectar ahora mismo. Inténtalo de nuevo en unos minutos.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet onClose={onClose} label={`Conectar ${service.name}`} height="65%">
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <SheetHead service={service}>Con tu usuario</SheetHead>
        <AppText style={styles.blurb}>{service.blurb}</AppText>
        <View style={{ marginTop: 20 }}>
          <AppText style={styles.fieldLabel}>{u.label}</AppText>
          <TextInput
            value={handle}
            onChangeText={setHandle}
            onSubmitEditing={() => void submit()}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={u.placeholder}
            placeholderTextColor={alpha(colors.mute, 0.6)}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="go"
            style={[styles.input, { borderColor: focused ? colors.accent : colors.line }]}
          />
        </View>
        <AppText style={styles.hint}>{u.hint}</AppText>
        {msg ? (
          <AppText accessibilityLiveRegion="polite" style={[styles.msg, { color: msg.soon ? colors.ink : colors.stampRed }]}>
            {msg.text}
            {msg.soon && service.file ? <AppText style={{ color: colors.mute }}> Mientras tanto, puedes subir tu archivo.</AppText> : null}
          </AppText>
        ) : null}
        <View style={{ marginTop: 20 }}>
          <PrimaryButton onPress={() => void submit()} disabled={busy || !handle.trim()} label="Conectar">
            {busy ? 'Buscando…' : 'Conectar'}
          </PrimaryButton>
        </View>

        {service.file ? (
          <Press accessibilityRole="button" onPress={onFile} style={styles.altFile}>
            <AppText style={styles.altFileText}>¿Prefieres subir el archivo completo? Toca aquí</AppText>
          </Press>
        ) : null}
      </ScrollView>
    </Sheet>
  )
}

export function FileSheet({ service, onClose, onRows }: { service: Service; onClose: () => void; onRows: (r: ImportRow[]) => void }) {
  const f = service.file!
  const [reading, setReading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const pick = async () => {
    if (reading) return
    setReading(true)
    setErr(null)
    try {
      const picked = await pickAndReadFile()
      if (!picked) return // cancelado: no es un error
      const rows = rowsFromContent(f.kind, picked.name, picked.content)
      if (rows.length === 0) setErr('No hemos encontrado ninguna obra en ese archivo.')
      else onRows(rows)
    } catch {
      setErr('No hemos podido leer ese archivo. Comprueba que sea la exportación correcta.')
    } finally {
      setReading(false)
    }
  }

  return (
    <Sheet onClose={onClose} label={`Subir archivo de ${service.name}`} height="70%">
      <ScrollView showsVerticalScrollIndicator={false}>
        <SheetHead service={service}>Con tu archivo de exportación</SheetHead>
        <AppText style={styles.blurb}>{service.blurb}</AppText>

        <View style={styles.steps}>
          <AppText style={styles.fieldLabel}>Cómo descargarlo</AppText>
          <View style={{ gap: 6 }}>
            {f.steps.map((st, i) => (
              <View key={i} style={styles.step}>
                <AppText style={styles.stepNum}>{i + 1}.</AppText>
                <AppText style={styles.stepText}>{st}</AppText>
              </View>
            ))}
          </View>
          {f.url ? (
            <Press accessibilityRole="link" onPress={() => void Linking.openURL(f.url!)} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
              <AppText style={styles.link}>{f.urlLabel || 'Abrir la página de exportación'} ↗</AppText>
            </Press>
          ) : null}
        </View>

        <View style={{ marginTop: 20 }}>
          <PrimaryButton onPress={() => void pick()} disabled={reading} label="Elegir archivo descargado">
            {reading ? 'Leyendo archivo…' : 'Elegir archivo descargado'}
          </PrimaryButton>
        </View>

        {err ? <AppText style={styles.fileErr}>{err}</AppText> : null}
      </ScrollView>
    </Sheet>
  )
}

export function OAuthSheet({ service, onClose, onFailed }: { service: Service; onClose: () => void; onFailed: () => void }) {
  const [starting, setStarting] = useState(false)

  const launch = async () => {
    setStarting(true)
    try {
      if (service.id === 'spotify') await startSpotifyAuth()
    } catch {
      setStarting(false)
      onFailed()
    }
  }

  return (
    <Sheet onClose={onClose} label={`Conectar ${service.name}`} height="55%">
      <ScrollView showsVerticalScrollIndicator={false}>
        <SheetHead service={service}>Conexión directa</SheetHead>
        <AppText style={styles.blurb}>{service.blurb}</AppText>
        <View style={styles.privacy}>
          <AppText style={styles.privacyText}>Solo leemos lo que nos autorices: tus artistas y música guardada.</AppText>
          <AppText style={styles.privacyText}>Puedes revocar el acceso en cualquier momento desde tu cuenta o desde aquí.</AppText>
        </View>
        <View style={{ marginTop: 24 }}>
          <PrimaryButton onPress={() => void launch()} disabled={starting} label={`Continuar a ${service.name}`}>
            {starting ? 'Abriendo…' : `Continuar a ${service.name}`}
          </PrimaryButton>
        </View>
      </ScrollView>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  // flex items-center gap-3.5 mb-4
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  // serif text-xl font-semibold leading-tight
  headTitle: { fontFamily: 'Fraunces72-600', fontSize: 20, lineHeight: 25, color: colors.ink },
  headSub: { fontFamily: 'Inter-400', fontSize: 12, lineHeight: 16, color: colors.mute, marginTop: 2 },
  // text-sm text-ink/80 leading-relaxed
  blurb: { fontFamily: 'Inter-400', fontSize: 14, lineHeight: 22.75, color: alpha(colors.ink, 0.8) },
  // text-[11px] font-semibold uppercase tracking-wider text-mute
  fieldLabel: { fontFamily: 'Inter-600', fontSize: 11, lineHeight: 16.5, letterSpacing: 0.88, textTransform: 'uppercase', color: colors.mute },
  // mt-2 w-full min-h-[50px] rounded-2xl bg-surface2 border border-line px-4 text-sm text-ink
  input: {
    marginTop: 8,
    width: '100%',
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: colors.surface2,
    paddingHorizontal: 16,
    fontFamily: 'Inter-400',
    fontSize: 14,
    color: colors.ink,
  },
  // text-xs text-mute mt-2 leading-snug
  hint: { fontFamily: 'Inter-400', fontSize: 12, lineHeight: 16.5, color: colors.mute, marginTop: 8 },
  msg: { fontFamily: 'Inter-400', fontSize: 14, lineHeight: 20, marginTop: 12 },
  // mt-5 w-full min-h-[52px] rounded-2xl bg-accent shadow-md
  primary: {
    width: '100%',
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  primaryText: { fontFamily: 'Inter-600', fontSize: 16, lineHeight: 24, color: colors.accentInk },
  // mt-3 w-full py-2 text-xs font-medium text-mute text-center
  altFile: { marginTop: 12, width: '100%', paddingVertical: 8 },
  altFileText: { fontFamily: 'Inter-500', fontSize: 12, lineHeight: 16, color: colors.mute, textAlign: 'center' },
  // mt-4 rounded-2xl bg-surface2 border border-line p-4 space-y-2.5
  steps: { marginTop: 16, borderRadius: 16, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 10 },
  step: { flexDirection: 'row', gap: 6 },
  stepNum: { fontFamily: 'Inter-400', fontSize: 12, lineHeight: 19.5, color: alpha(colors.ink, 0.8) },
  stepText: { flex: 1, fontFamily: 'Inter-400', fontSize: 12, lineHeight: 19.5, color: alpha(colors.ink, 0.8) },
  link: { fontFamily: 'Inter-600', fontSize: 12, lineHeight: 16, color: colors.accent, textDecorationLine: 'underline' },
  // text-xs text-stamp-red mt-3 text-center
  fileErr: { fontFamily: 'Inter-400', fontSize: 12, lineHeight: 16, color: colors.stampRed, marginTop: 12, textAlign: 'center' },
  // mt-4 p-4 rounded-2xl bg-surface2 border border-line text-xs text-mute space-y-1
  privacy: { marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, gap: 4 },
  privacyText: { fontFamily: 'Inter-400', fontSize: 12, lineHeight: 16, color: colors.mute },
})

