import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText } from '../AppText'
import { Icon } from '../Icon'
import { Press } from '../Press'
import { LoginSheet } from '../auth/LoginSheet'
import { useAuth } from '../../store/useAuth'
import { useFriends } from '../../store/useFriends'
import { supabase } from '../../lib/supabase'
import { isMissingFunction } from '../../lib/contacts'
import { Avatar, Button, Toast } from '../ui'
import { alpha, colors, tx } from '../../theme'

type InviteStatus = 'ok' | 'used' | 'expired' | 'missing'

const STATUS_TEXT: Record<Exclude<InviteStatus, 'ok'>, string> = {
  used: 'Esta invitación ya la ha usado otra persona. Pídele a quien te la mandó una nueva: cada enlace es para una sola persona.',
  expired: 'Esta invitación ha caducado. Pídele a quien te la mandó una nueva.',
  missing: 'No encontramos esta invitación. Revisa que el enlace esté completo.',
}

/**
 * Invitación a una biblioteca (JoinInvite de la PWA). Sin navegador: el correo se escribe dentro de la app (LoginSheet)
 * y el código de 6 dígitos llega al móvil; el botón de Google solo aparece cuando hay dev build (BUILT_AUTH.google).
 */
export function JoinInvite({ code }: { code: string }) {
  const insets = useSafeAreaInsets()
  const { user, isConfigured } = useAuth()
  const acceptInvite = useFriends((s) => s.acceptInvite)

  const [creatorName, setCreatorName] = useState<string>('Un amigo')
  const [creatorAvatar, setCreatorAvatar] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteStatus, setInviteStatus] = useState<InviteStatus>('ok')
  const [joining, setJoining] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  useEffect(() => {
    if (!code || !supabase) {
      setLoading(false)
      return
    }
    const db = supabase
    // Quién invita y si la invitación sigue valiendo (0006: la tabla ya no se lee directamente)
    ;(async () => {
      const rpc = await db.rpc('biblio_invite_preview', { p_code: code })
      if (!rpc.error) {
        const row = (rpc.data as { creator_name: string | null; creator_avatar: string | null; status: InviteStatus }[] | null)?.[0]
        if (row?.creator_name) setCreatorName(row.creator_name)
        if (row?.creator_avatar) setCreatorAvatar(row.creator_avatar)
        setInviteStatus(row ? row.status : 'missing')
      } else if (isMissingFunction(rpc.error)) {
        // migración 0006 aún sin aplicar: camino antiguo
        const { data: invite } = await db.from('biblio_invites').select('creator_id').eq('code', code.toUpperCase()).single()
        if (invite) {
          const { data: profile } = await db.from('biblio_profiles').select('display_name').eq('id', invite.creator_id).single()
          if (profile?.display_name) setCreatorName(profile.display_name)
        }
      }
      setLoading(false)
    })()
  }, [code])

  const handleAccept = async () => {
    setJoining(true)
    const res = await acceptInvite(code)
    setJoining(false)
    if (res.success) {
      setToast(`¡Ahora eres amigo de ${res.creatorName}!`)
      timer.current = setTimeout(() => router.replace('/'), 1200)
    } else {
      setToast(res.error || 'Error al aceptar invitación')
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Avatar name={creatorName} url={creatorAvatar} color="#F5B544" size={64} />
        </View>

        <View>
          <AppText style={[tx('title'), { color: colors.ink, textAlign: 'center' }]}>{creatorName} te invita a su biblioteca</AppText>
          <AppText style={[tx('body'), { color: colors.mute, marginTop: 8, textAlign: 'center' }]}>
            Descubre qué pelis, series, libros y juegos le han marcado y comparte tus gustos.
          </AppText>
        </View>

        {loading ? (
          <AppText style={[tx('meta'), { color: colors.mute, textAlign: 'center', paddingVertical: 16 }]}>Cargando invitación...</AppText>
        ) : inviteStatus !== 'ok' ? (
          <View style={{ gap: 12, paddingTop: 8 }}>
            <AppText style={[tx('body'), { color: alpha(colors.ink, 0.9), lineHeight: 23 }]}>{STATUS_TEXT[inviteStatus]}</AppText>
            <Button variant="secondary" onPress={() => router.replace('/')} style={styles.full}>
              Ir a la app
            </Button>
          </View>
        ) : user ? (
          <View style={{ gap: 12, paddingTop: 8 }}>
            <Button
              variant="primary"
              onPress={handleAccept}
              loading={joining}
              disabled={joining}
              icon={<Icon name="check" size={18} color={colors.accentInk} />}
              style={styles.full}
            >
              {joining ? 'Conectando...' : `Aceptar y conectar con ${creatorName}`}
            </Button>
            <Button variant="text" onPress={() => router.replace('/')} style={styles.full}>
              Ir a mi biblioteca
            </Button>
          </View>
        ) : (
          <View style={{ gap: 14, paddingTop: 8 }}>
            {isConfigured ? (
              <>
                <AppText style={[tx('meta'), { color: alpha(colors.mute, 0.9), textAlign: 'center' }]}>
                  Para ver sus recomendaciones reales, entra o crea tu cuenta en 1 clic:
                </AppText>
                <Button variant="primary" onPress={() => setLoginOpen(true)} style={styles.full}>
                  Entrar con mi email
                </Button>
              </>
            ) : null}
            <Press accessibilityRole="button" accessibilityLabel="Continuar como invitado sin cuenta" onPress={() => router.replace('/')} style={styles.guest}>
              <AppText style={[tx('meta'), { color: colors.mute, textDecorationLine: 'underline' }]}>Continuar como invitado sin cuenta</AppText>
            </Press>
          </View>
        )}
      </View>

      {loginOpen ? <LoginSheet onClose={() => setLoginOpen(false)} onDone={() => setLoginOpen(false)} /> : null}
      {toast ? <Toast key={toast} message={toast} onDone={() => setToast(null)} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: {
    width: '100%',
    maxWidth: 384,
    gap: 20,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  avatar: { alignItems: 'center' },
  full: { width: '100%' },
  guest: { alignSelf: 'center', paddingTop: 8 },
})
