import { useEffect, useRef, useState } from 'react'
import { StyleSheet, TextInput, View } from 'react-native'
import { AppText } from '../AppText'
import { Press } from '../Press'
import { Button, Sheet } from '../ui'
import { useAuth } from '../../store/useAuth'
import { colors, tx } from '../../theme'

// Acceso por correo con código de 6 dígitos (docs/APP_NATIVA.md): en nativo no hay enlace de vuelta, el código se escribe aquí.
// Google y Apple no están en esta hoja: los botones los pintan las pantallas que la abren cuando `BUILT_AUTH` lo permite.
const RESEND_SECONDS = 60
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface LoginSheetProps {
  onClose: () => void
  /** Se llama cuando el código es correcto y ya hay sesión (antes de cerrar). */
  onDone: () => void
}

export function LoginSheet({ onClose, onDone }: LoginSheetProps) {
  const isConfigured = useAuth((s) => s.isConfigured)
  const signInWithOtp = useAuth((s) => s.signInWithOtp)
  const verifyOtp = useAuth((s) => s.verifyOtp)

  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wait, setWait] = useState(0)
  const alive = useRef(true)
  useEffect(() => () => void (alive.current = false), [])

  // cuenta atrás para poder pedir otro código (Supabase limita los envíos)
  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const validEmail = EMAIL_RE.test(email.trim())

  const sendCode = async () => {
    if (!validEmail || busy) return
    setBusy(true)
    setError(null)
    const { error: err } = await signInWithOtp(email)
    if (!alive.current) return
    setBusy(false)
    if (err) return setError(err.message)
    setCode('')
    setWait(RESEND_SECONDS)
    setStep('code')
  }

  const submitCode = async (value = code) => {
    if (value.length !== 6 || busy) return
    setBusy(true)
    setError(null)
    const { error: err } = await verifyOtp(email, value)
    if (!alive.current) return
    setBusy(false)
    if (err) return setError(err.message)
    onDone()
    onClose()
  }

  const onCodeChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
    if (digits.length === 6) void submitCode(digits)
  }

  return (
    <Sheet label="Entrar" onClose={onClose} height="58%">
      <AppText style={tx('title', { color: colors.ink })}>Entrar</AppText>

      {!isConfigured ? (
        <AppText style={[tx('body'), styles.gap, { color: colors.mute }]}>
          La cuenta no está disponible en esta versión. Tu biblioteca se guarda en este móvil.
        </AppText>
      ) : step === 'email' ? (
        <View style={styles.gap}>
          <AppText style={tx('body', { color: colors.mute })}>
            Guarda tu biblioteca en la nube, úsala en otro móvil y mira lo que ven tus amigos. Te enviamos un código de 6 dígitos por correo.
          </AppText>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Tu correo"
            placeholderTextColor={colors.mute}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={sendCode}
            accessibilityLabel="Tu correo"
            style={styles.input}
          />
          {error ? <AppText style={styles.error}>{error}</AppText> : null}
          <Button onPress={sendCode} loading={busy} disabled={!validEmail}>
            Enviar código
          </Button>
        </View>
      ) : (
        <View style={styles.gap}>
          <AppText style={tx('body', { color: colors.mute })}>
            Hemos enviado un código de 6 dígitos a <AppText style={{ color: colors.ink }}>{email.trim()}</AppText>. Escríbelo aquí.
          </AppText>
          <TextInput
            value={code}
            onChangeText={onCodeChange}
            placeholder="000000"
            placeholderTextColor={colors.mute}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            autoFocus
            accessibilityLabel="Código de 6 dígitos"
            style={[styles.input, styles.code]}
          />
          {error ? <AppText style={styles.error}>{error}</AppText> : null}
          <Button onPress={() => submitCode()} loading={busy} disabled={code.length !== 6}>
            Entrar
          </Button>
          <View style={styles.links}>
            <Press
              accessibilityRole="button"
              onPress={() => {
                setStep('email')
                setError(null)
              }}
              hitSlop={8}
            >
              <AppText style={styles.link}>Cambiar de correo</AppText>
            </Press>
            <Press accessibilityRole="button" disabled={wait > 0 || busy} dim={wait > 0 ? 0.4 : 1} onPress={sendCode} hitSlop={8}>
              <AppText style={styles.link}>{wait > 0 ? `Reenviar código (${wait} s)` : 'Reenviar código'}</AppText>
            </Press>
          </View>
        </View>
      )}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  gap: { marginTop: 12, gap: 12 },
  input: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
    paddingHorizontal: 14,
    color: colors.ink,
    ...tx('body'),
  },
  code: { textAlign: 'center', letterSpacing: 8, fontSize: 22 },
  error: { ...tx('meta'), color: colors.stampRed },
  links: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { ...tx('meta'), color: colors.accent, fontFamily: 'Archivo-Regular' },
})
