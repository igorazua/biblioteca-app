import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { APP_NAME, ENGINE_VERSION } from '@biblioteca/core'
import { AppText } from '../components/AppText'
import { PhoneDiscovery } from '../components/friends/PhoneDiscovery'
import { AccountCard } from '../components/settings/AccountCard'
import { FeedbackSheet } from '../components/settings/FeedbackSheet'
import { LoginSheet } from '../components/auth/LoginSheet'
import { Group, Row, Toast, Toggle, Confirm, ScreenHeader } from '../components/ui'
import { pullCloudEntries, pushLocalEntriesToCloud } from '../lib/sync'
import { BUILT } from '../lib/phase'
import { useAuth } from '../store/useAuth'
import { useStore } from '../store'
import { colors, tx } from '../theme'

/**
 * Ajustes (Settings.tsx). Sin los selectores de duelos (D4), sin listas aparcadas (D5) y sin avisos push: la app
 * nativa no tiene push todavía (ni expo-notifications instalado), así que esa fila no se muestra.
 * Cada salida a una pantalla sin construir se oculta según BUILT (phase.ts), como manda el encargo.
 */
export default function Ajustes() {
  const insets = useSafeAreaInsets()
  const profile = useStore((s) => s.profile)
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const resetAll = useStore((s) => s.resetAll)
  const loadSample = useStore((s) => s.loadSample)

  const { user, profile: authProfile, isConfigured, signOut, deleteAccount } = useAuth()
  const [toast, setToast] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [testsOpen, setTestsOpen] = useState(false)

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'))

  const handleSyncNow = async () => {
    if (!user || syncing) return
    setSyncing(true)
    try {
      const pushed = await pushLocalEntriesToCloud(user.id)
      await pullCloudEntries(user.id)
      setToast(pushed > 0 ? `Sincronizadas ${pushed} obras con tu cuenta` : 'Tu biblioteca está al día con la nube')
    } catch {
      setToast('No se pudo conectar con el servidor. Reintentar.')
    } finally {
      setSyncing(false)
    }
  }

  const handleDelete = async () => {
    setConfirmDelete(false)
    const { error } = await deleteAccount()
    if (error) {
      setToast('No se pudo borrar la cuenta. Reintentar.')
      return
    }
    setToast('Cuenta eliminada correctamente')
    router.replace('/')
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Ajustes" onBack={back} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 + insets.bottom, gap: 24 }} showsVerticalScrollIndicator={false}>
        <AccountCard
          name={profile.name}
          color={profile.avatarColor}
          avatarUrl={profile.avatarUrl}
          displayName={authProfile?.displayName}
          handle={authProfile?.handle}
          user={user}
          canSignIn={isConfigured}
          onEdit={() => router.push('/perfil/editar')}
          onSignIn={() => setLoginOpen(true)}
        />

        {BUILT.conectar ? (
          <Group title="Tus listas">
            <Row icon="link" tint="#2f9e6e" title="Conectar otras apps" sub="Letterboxd, Goodreads, Netflix…" onPress={() => router.push('/conectar')} />
          </Group>
        ) : null}

        <Group title="Preferencias">
          <Row
            icon="star"
            tint="#d9932b"
            title="Valorar al marcar como vista"
            right={<Toggle on={settings.rateOnSwipe ?? true} onChange={(rateOnSwipe) => setSettings({ rateOnSwipe })} label="Valorar al marcar como vista" />}
          />
          <Row
            icon="message"
            tint="#7a64e0"
            title="Nota tras cada duelo"
            right={<Toggle on={settings.commentBoxInPairs} onChange={(commentBoxInPairs) => setSettings({ commentBoxInPairs })} label="Nota tras cada duelo" />}
          />
        </Group>

        {user ? (
          <Group title="Privacidad">
            <View style={{ padding: 16 }}>
              <PhoneDiscovery onToast={setToast} />
            </View>
          </Group>
        ) : null}

        <Group title="Ayuda">
          {BUILT.onboarding ? <Row icon="cards" tint="#3d7fd9" title="Ver el tutorial otra vez" onPress={() => router.push('/onboarding')} /> : null}
          <Row icon="mail" tint="#3d7fd9" title="Enviar una sugerencia o un error" onPress={() => setFeedbackOpen(true)} />
        </Group>

        {user ? (
          <Group title="Sesión">
            <Row icon="rotateCcw" title={syncing ? 'Sincronizando…' : 'Sincronizar ahora'} onPress={syncing ? undefined : handleSyncNow} />
            <Row icon="back" title="Cerrar sesión" onPress={() => void signOut()} />
            <Row icon="trash" title="Borrar mi cuenta" onPress={() => setConfirmDelete(true)} danger />
          </Group>
        ) : null}

        <View style={{ gap: 8 }}>
          <AppText style={[tx('meta'), { fontSize: 11, lineHeight: 18, paddingHorizontal: 4 }]}>
            {APP_NAME} · Motor {ENGINE_VERSION}. Catálogo de fuentes públicas: Wikidata (CC0), Wikipedia, TVmaze (CC BY-SA), Open Library y MusicBrainz.
          </AppText>
        </View>

        {/* Zona de pruebas (plegada), como en la PWA */}
        <View>
          <Row title={testsOpen ? 'Zona de pruebas ▲' : 'Zona de pruebas ▼'} onPress={() => setTestsOpen(!testsOpen)} />
          {testsOpen ? (
            <View style={{ marginTop: 4 }}>
              <Group>
                <Row
                  icon="sparkle"
                  title="Cargar obras de ejemplo"
                  onPress={() => {
                    loadSample()
                    setToast('Datos de ejemplo cargados')
                  }}
                />
                {BUILT.metricas ? <Row icon="scale" title="Métricas del motor" onPress={() => router.push('/metricas')} /> : null}
                <Row icon="trash" title="Reiniciar (borra todo en este móvil)" onPress={() => setConfirmReset(true)} danger />
              </Group>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {confirmReset ? (
        <Confirm
          title="¿Reiniciar toda la app?"
          text="Se borrarán todas tus obras y rankings guardados en este dispositivo. Esta acción no se puede deshacer."
          confirmLabel="Reiniciar"
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            resetAll()
            setConfirmReset(false)
            setToast('Demo reiniciada')
          }}
        />
      ) : null}

      {confirmDelete ? (
        <Confirm
          title="¿Borrar tu cuenta definitivamente?"
          text="Se eliminará tu perfil, todos tus guardados en la nube y tus listas. Es una acción irreversible."
          confirmLabel="Borrar cuenta"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void handleDelete()}
        />
      ) : null}

      {feedbackOpen ? (
        <FeedbackSheet
          userId={user?.id ?? null}
          profileName={profile.name}
          onClose={() => setFeedbackOpen(false)}
          onResult={(m) => setToast(m)}
        />
      ) : null}

      {loginOpen ? <LoginSheet onClose={() => setLoginOpen(false)} onDone={() => setLoginOpen(false)} /> : null}

      {toast ? <Toast key={toast} message={toast} onDone={() => setToast(null)} /> : null}
    </View>
  )
}
