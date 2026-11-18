import { useState } from 'react'
import { Linking, Share, StyleSheet, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { useRouter } from 'expo-router'
import { APP_NAME } from '@biblioteca/core'
import { waNumber } from '@biblioteca/core/src/lib/phone'
import { AppText } from '../AppText'
import { Icon } from '../Icon'
import { Press } from '../Press'
import { Avatar, Button, Sheet } from '../ui'
import { haptic } from '../../lib/haptics'
import { BUILT } from '../../lib/phase'
import {
  expandLimitedAccess,
  getContactsAccess,
  matchContacts,
  readContacts,
  requestContactsAccess,
  type ContactOnApp,
  type ContactsAccess,
  type MatchResult,
  type PickedContact,
} from '../../lib/contacts'
import { useAuth } from '../../store/useAuth'
import { useFriends } from '../../store/useFriends'
import { useStore } from '../../store/useStore'
import { colors, tx } from '../../theme'

// FindFriends.tsx de la PWA. En nativo la agenda se lee entera con expo-contacts (docs/APP_NATIVA.md): antes del permiso del
// sistema sale la pantalla previa con su texto literal; «Ahora no» deja usar la app (invitar por enlace) y no se vuelve a abrir sola.
type Step = 'intro' | 'consent' | 'denied' | 'loading' | 'results'

const inviteText = (name: string | null, link: string) =>
  `${name ? `¡Hola, ${name.split(' ')[0]}! ` : ''}Te invito a ${APP_NAME}: guardo ahí las pelis, series y libros que me han marcado y podemos ver en qué coincidimos. ${link}`

export function FindFriends({ onClose, onToast }: { onClose: () => void; onToast: (msg: string) => void }) {
  const router = useRouter()
  const createInvite = useFriends((s) => s.createInvite)
  const country = useStore((s) => s.profile.country) ?? 'ES'
  const [step, setStep] = useState<Step>('intro')
  const [access, setAccess] = useState<ContactsAccess>('undetermined')
  const [onApp, setOnApp] = useState<ContactOnApp[]>([])
  const [others, setOthers] = useState<PickedContact[]>([])
  const [sent, setSent] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)

  const shareInvite = async () => {
    setBusy('share')
    const link = await createInvite()
    setBusy(null)
    if (!link) return onToast('No se pudo crear la invitación')
    try {
      const r = await Share.share({ message: inviteText(null, link), url: link, title: `Únete a ${APP_NAME}` })
      if (r.action === Share.sharedAction) onToast('Invitación enviada')
    } catch {
      onToast('No he podido abrir el menú de compartir')
    }
  }

  const whatsappInvite = async (c: PickedContact) => {
    setBusy(c.phone)
    const link = await createInvite()
    setBusy(null)
    if (!link) return onToast('No se pudo crear la invitación')
    const url = `https://wa.me/${waNumber(c.phone)}?text=${encodeURIComponent(inviteText(c.name, link))}`
    try {
      await Linking.openURL(url)
      haptic('success')
      setSent((s) => new Set(s).add(c.phone))
    } catch {
      onToast('No he podido abrir WhatsApp')
    }
  }

  const scan = async () => {
    const user = useAuth.getState().user
    if (!user) {
      setStep('intro')
      return onToast('Entra en tu cuenta para buscar a tus amigos')
    }
    setStep('loading')
    try {
      const contacts = await readContacts(country)
      if (contacts.length === 0) {
        setStep('intro')
        return onToast('No hay contactos con número en este móvil')
      }
      const friendIds = new Set(useFriends.getState().realFriends.map((f) => f.id))
      const res = await matchContacts(contacts, user.id, friendIds)
      showResults(res)
    } catch (e) {
      const partial = (e as { partial?: MatchResult }).partial
      onToast((e as Error).message || 'No se pudieron leer los contactos')
      if (partial) showResults(partial)
      else setStep('intro')
    }
  }

  const showResults = (res: MatchResult) => {
    setOnApp(res.onApp)
    setOthers(res.others)
    setStep('results')
  }

  /** «Buscar en tus contactos»: sin permiso, primero la pantalla previa; con permiso (o acceso limitado de iOS), directo. */
  const start = async () => {
    try {
      const info = await getContactsAccess()
      setAccess(info.access)
      if (info.access === 'all' || info.access === 'limited') return void scan()
      if (info.access === 'denied' && !info.canAskAgain) return setStep('denied')
      setStep('consent')
    } catch {
      onToast('No se pudieron leer los contactos')
    }
  }

  const accept = async () => {
    try {
      const info = await requestContactsAccess()
      setAccess(info.access)
      if (info.access === 'all' || info.access === 'limited') return void scan()
      setStep('denied')
    } catch {
      setStep('intro')
      onToast('No se pudieron leer los contactos')
    }
  }

  const widen = async () => {
    await expandLimitedAccess()
    void scan()
  }

  const row = (c: PickedContact, extra?: ContactOnApp) => {
    const done = sent.has(c.phone)
    return (
      <View key={c.phone} style={styles.row}>
        <Avatar name={extra?.displayName ?? c.name} url={extra?.avatarUrl ?? undefined} color="#5B9CF5" size={40} />
        <View style={styles.rowText}>
          <AppText numberOfLines={1} style={tx('body', { fontFamily: 'Archivo-Regular', color: colors.ink })}>
            {c.name}
          </AppText>
          {extra ? (
            <AppText numberOfLines={1} style={tx('meta', { color: colors.accent })}>
              En {APP_NAME} como {extra.displayName}
            </AppText>
          ) : null}
        </View>
        <Press
          accessibilityRole="button"
          accessibilityLabel={`${extra ? 'Conectar' : 'Invitar'} a ${c.name}`}
          disabled={busy !== null}
          dim={busy !== null ? 0.6 : 1}
          onPress={() => whatsappInvite(c)}
          style={[styles.rowBtn, { backgroundColor: done ? colors.surface2 : extra ? colors.accent : colors.surface2 }]}
        >
          {done ? (
            <>
              <Icon name="check" size={15} color={colors.mute} />
              <AppText style={styles.rowBtnText}>Enviada</AppText>
            </>
          ) : busy === c.phone ? (
            <AppText style={styles.rowBtnText}>Abriendo…</AppText>
          ) : (
            <>
              <Icon name="whatsapp" size={15} color={extra ? colors.accentInk : colors.ink} />
              <AppText style={[styles.rowBtnText, { color: extra ? colors.accentInk : colors.ink }]}>{extra ? 'Conectar' : 'Invitar'}</AppText>
            </>
          )}
        </Press>
      </View>
    )
  }

  return (
    <Sheet label="Añadir amigos" onClose={onClose} height={step === 'results' ? '82%' : '58%'}>
      <AppText style={tx('title', { color: colors.ink })}>Añadir amigos</AppText>

      {step === 'intro' && (
        <View style={styles.block}>
          <AppText style={tx('body', { color: colors.mute })}>
            Cada invitación es para una persona: le llega un enlace personal y, al abrirlo, quedáis conectados y veis vuestra afinidad.
          </AppText>

          <View style={styles.card}>
            <AppText style={tx('body', { fontFamily: 'Archivo-SemiBold', color: colors.ink })}>Buscar en tus contactos</AppText>
            <AppText style={[tx('meta'), { marginTop: 4, lineHeight: 19 }]}>
              Sus números se comparan con los de quien ha decidido que le encuentren por teléfono y{' '}
              <AppText style={{ color: colors.ink, fontFamily: 'Archivo-Regular' }}>no se guardan</AppText>.
            </AppText>
            <Button onPress={start} icon={<Icon name="user" size={18} color={colors.accentInk} />} style={styles.cardBtn}>
              Buscar en tus contactos
            </Button>
          </View>

          <Button variant="secondary" onPress={shareInvite} loading={busy === 'share'} icon={<Icon name="share" size={18} color={colors.ink} />}>
            Invitar a alguien
          </Button>
          <AppText style={[tx('meta'), { opacity: 0.8 }]}>Se abre el menú de compartir: elige a la persona en WhatsApp o donde prefieras.</AppText>
          {BUILT.ajustes ? (
            <Press
              accessibilityRole="link"
              hitSlop={8}
              onPress={() => {
                onClose()
                router.push('/ajustes')
              }}
            >
              <AppText style={styles.link}>Que tus amigos te encuentren por tu teléfono →</AppText>
            </Press>
          ) : null}
        </View>
      )}

      {step === 'consent' && (
        <View style={styles.block}>
          <AppText style={tx('item', { color: colors.ink })}>Encuentra a tus amigos</AppText>
          <AppText style={tx('body', { color: colors.mute })}>
            Para decirte quién de tus contactos ya está en {APP_NAME}, enviaremos sus números de teléfono a nuestro servidor. Se comparan al momento y{' '}
            <AppText style={{ color: colors.ink, fontFamily: 'Archivo-SemiBold' }}>no se guardan</AppText>. Los nombres no salen de tu móvil. Solo te aparecerán quienes
            hayan activado que se les encuentre por teléfono.
          </AppText>
          <Button onPress={accept}>Continuar</Button>
          <Button variant="text" onPress={() => setStep('intro')}>
            Ahora no
          </Button>
        </View>
      )}

      {step === 'denied' && (
        <View style={styles.block}>
          <AppText style={tx('body', { color: colors.mute })}>
            Sin permiso para ver tus contactos. Puedes activarlo en los ajustes del teléfono.
          </AppText>
          <Button onPress={() => void Linking.openSettings()}>Abrir ajustes del teléfono</Button>
          <Button variant="secondary" onPress={() => setStep('intro')}>
            Invitar con un enlace
          </Button>
        </View>
      )}

      {step === 'loading' && (
        <View style={styles.block} accessibilityLabel="Buscando amigos" accessibilityRole="progressbar">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.row}>
              <View style={[styles.skel, { width: 40, height: 40, borderRadius: 20 }]} />
              <View style={[styles.skel, { flex: 1, height: 16, borderRadius: 4 }]} />
            </View>
          ))}
        </View>
      )}

      {step === 'results' && (
        <ScrollView style={styles.results} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {onApp.length > 0 && (
            <View>
              <AppText style={[tx('labelCaps', { color: colors.mute }), styles.heading]}>
                Ya usan {APP_NAME} · {onApp.length}
              </AppText>
              {onApp.map((c) => row(c, c))}
            </View>
          )}
          <AppText style={[tx('labelCaps', { color: colors.mute }), styles.heading]}>Invitar · {others.length}</AppText>
          {others.length ? (
            others.map((c) => row(c))
          ) : (
            <AppText style={[tx('body', { color: colors.mute }), { marginTop: 8 }]}>Todos tus contactos ya están en {APP_NAME}.</AppText>
          )}
          {access === 'limited' ? (
            <Press accessibilityRole="button" onPress={widen} hitSlop={8} style={styles.moreLink}>
              <AppText style={styles.link}>Elegir más contactos</AppText>
            </Press>
          ) : null}
          <Press accessibilityRole="button" onPress={() => setStep('intro')} hitSlop={8} style={styles.moreLink}>
            <AppText style={styles.link}>Volver</AppText>
          </Press>
        </ScrollView>
      )}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  block: { marginTop: 12, gap: 12 },
  card: { borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface2, padding: 16 },
  cardBtn: { marginTop: 12 },
  link: { ...tx('meta'), color: colors.accent, fontFamily: 'Archivo-Regular' },
  results: { flex: 1, marginTop: 8 },
  heading: { marginTop: 16, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowText: { flex: 1, minWidth: 0 },
  rowBtn: { minHeight: 40, paddingHorizontal: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowBtnText: { ...tx('meta'), fontFamily: 'Archivo-SemiBold', color: colors.mute },
  skel: { backgroundColor: colors.surface2 },
  moreLink: { marginTop: 16, marginBottom: 8, alignSelf: 'flex-start' },
})
