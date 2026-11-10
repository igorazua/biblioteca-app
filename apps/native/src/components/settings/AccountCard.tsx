import { StyleSheet, View } from 'react-native'
import type { User } from '@supabase/supabase-js'
import { AppText } from '../AppText'
import { Icon } from '../Icon'
import { Press } from '../Press'
import { Avatar, Button } from '../ui'
import { BUILT } from '../../lib/phase'
import { colors, tx } from '../../theme'

// Tarjeta de cabecera de Ajustes (Settings.tsx:124-187). Tocarla abre «Editar foto, nombre y plataformas»,
// pero solo mientras esa pantalla exista (BUILT.editarPerfil). Sin sesión y con Supabase configurado, el acceso va en la misma tarjeta.
export interface AccountCardProps {
  name: string
  color: string
  avatarUrl?: string | null
  /** Nombre visible de la cuenta (BiblioProfile.displayName), si la hay. */
  displayName?: string | null
  /** @usuario de la cuenta, si la hay. */
  handle?: string | null
  user: User | null
  /** Hay Supabase configurado: solo entonces se ofrece entrar. */
  canSignIn: boolean
  onEdit: () => void
  onSignIn: () => void
}

export function AccountCard({ name, color, avatarUrl, displayName, handle, user, canSignIn, onEdit, onSignIn }: AccountCardProps) {
  const editable = BUILT.editarPerfil
  const title = displayName || (name === 'Tú' ? 'Tu perfil' : name)

  const body = (
    <>
      <Avatar name={name} color={color} url={avatarUrl} size={56} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText style={[tx('title'), { color: colors.ink }]} numberOfLines={1}>
          {title}
        </AppText>
        {user ? (
          <View style={styles.accountLine}>
            <View style={styles.dot} />
            <AppText style={[tx('meta'), { flexShrink: 1 }]} numberOfLines={1}>
              {handle ? `@${handle}` : user.email}
            </AppText>
          </View>
        ) : (
          <AppText style={[tx('meta'), { marginTop: 2 }]}>Sin cuenta · todo está solo en este móvil</AppText>
        )}
        {editable ? <AppText style={styles.editLine}>Editar foto, nombre y plataformas</AppText> : null}
      </View>
      {editable ? <Icon name="chevron" size={16} color={colors.mute} /> : null}
    </>
  )

  return (
    <View style={styles.card}>
      {editable ? (
        <Press accessibilityRole="button" accessibilityLabel="Editar perfil" onPress={onEdit} style={styles.head}>
          {body}
        </Press>
      ) : (
        <View style={styles.head}>{body}</View>
      )}
      {!user && canSignIn ? (
        <View style={styles.signIn}>
          <AppText style={tx('meta')}>Entra para guardarla en la nube, usarla en otro móvil y ver a tus amigos.</AppText>
          <Button variant="secondary" onPress={onSignIn} style={styles.full}>
            Entrar
          </Button>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  accountLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.stampGreen },
  editLine: { fontFamily: 'Inter-500', fontSize: 12, lineHeight: 16, color: colors.accent, marginTop: 4 },
  signIn: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 10, borderTopWidth: 1, borderTopColor: colors.line },
  full: { width: '100%' },
})
