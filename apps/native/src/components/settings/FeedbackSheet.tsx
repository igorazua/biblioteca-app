import { useState } from 'react'
import { StyleSheet, TextInput, View } from 'react-native'
import { ENGINE_VERSION } from '@biblioteca/core'
import { AppText } from '../AppText'
import { Button, Sheet } from '../ui'
import { supabase } from '../../lib/supabase'
import { colors, tx } from '../../theme'

// Hoja «Enviar sugerencia» de Ajustes (Settings.tsx:366-398). Guarda en `biblio_feedback` como la PWA.
// Sin Supabase configurado no hay a dónde enviar: se avisa y no se guarda nada (D7).
export interface FeedbackSheetProps {
  userId: string | null
  profileName: string
  onClose: () => void
  /** Mensaje para el toast tras enviar (o al fallar). */
  onResult: (message: string) => void
}

export function FeedbackSheet({ userId, profileName, onClose, onResult }: FeedbackSheetProps) {
  const [msg, setMsg] = useState('')
  const [contact, setContact] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async () => {
    const text = msg.trim()
    if (!text || sending) return
    if (!supabase) {
      onResult('Sin servidor configurado: la sugerencia no se ha enviado')
      return
    }
    setSending(true)
    try {
      const { error } = await supabase.from('biblio_feedback').insert({
        message: text,
        contact: contact.trim() || null,
        user_id: userId,
        metadata: { profileName, version: ENGINE_VERSION },
      })
      if (error) throw error
      onResult('¡Muchas gracias por tu feedback!')
      onClose()
    } catch {
      onResult('Error enviando feedback. Reintentar.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Sheet label="Enviar sugerencia" onClose={onClose} height="65%">
      <View style={{ gap: 16, paddingTop: 4 }}>
        <AppText style={styles.title}>Dinos qué piensas</AppText>
        <AppText style={[tx('meta'), { color: colors.mute }]}>
          ¿Hay algo confuso, alguna obra que no encuentras o alguna mejora que eches de menos?
        </AppText>
        <TextInput
          autoFocus
          multiline
          numberOfLines={4}
          value={msg}
          onChangeText={setMsg}
          placeholder="Escribe aquí tu mensaje…"
          placeholderTextColor={colors.mute}
          textAlignVertical="top"
          style={styles.area}
        />
        <TextInput
          value={contact}
          onChangeText={setContact}
          placeholder="Tu email o WhatsApp (opcional, por si quieres respuesta)"
          placeholderTextColor={colors.mute}
          style={styles.contact}
        />
        <Button variant="primary" onPress={submit} disabled={sending || !msg.trim()} loading={sending} style={styles.submit}>
          {sending ? 'Enviando…' : 'Enviar sugerencia'}
        </Button>
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  title: { fontFamily: 'Archivo-Condensed-ExtraBold', fontSize: 26, lineHeight: 28, textTransform: 'uppercase', color: colors.ink },
  area: {
    minHeight: 110,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
    padding: 12,
    fontFamily: 'Archivo-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  contact: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
    padding: 12,
    fontFamily: 'Archivo-Regular',
    fontSize: 12,
    color: colors.ink,
  },
  submit: { width: '100%' },
})
