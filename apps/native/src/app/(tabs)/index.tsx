import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import { ScrollView, View } from 'react-native'
import { useScrollToTop, useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ACTIVE_SHELVES, evaluateNudges, getItem, items as catalogItems, type Nudge, type ShelfType } from '@biblioteca/core'
import { useAuth, useFriends, useStore, track } from '../../store'
import { AppText } from '../../components/AppText'
import { Icon } from '../../components/Icon'
import { Press } from '../../components/Press'
import { AddFlow } from '../../components/flows/AddFlow'
import { Avatar, NudgeCard, Toast } from '../../components/ui'
import { ShelfCard } from '../../components/library/ShelfCard'
import { ScreenTitle } from '../../components/ScreenTitle'
import { VoteSheet } from '../../components/library/VoteSheet'
import { useCatalogTick } from '../../components/library/shelfMeta'
import { colors, tx } from '../../theme'
import { BUILT, isBuiltRoute, nudgeActionLabel } from '../../lib/phase'
import { LoginSheet } from '../../components/auth/LoginSheet'
import { useMyShelves } from '../../lib/myShelves'


/**
 * Biblioteca (Library.tsx). Los recordatorios que llevan a una pantalla aún sin construir (phase.ts) no se muestran, y el de
 * instalar tampoco (la app ya está instalada). El botón «Cargar datos de ejemplo» aparece como en la PWA.
 */
export default function Biblioteca() {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null)
  useScrollToTop(ref)
  const router = useRouter()
  useCatalogTick()

  const profile = useStore((s) => s.profile)
  const user = useAuth((s) => s.user)
  const myShelves = useMyShelves()
  const entries = useStore((s) => s.entries)
  const rankings = useStore((s) => s.rankings)
  const votes = useStore((s) => s.categoryVotes)
  const toggleVote = useStore((s) => s.toggleVote)
  const loadSample = useStore((s) => s.loadSample)
  const nudgeDismiss = useStore((s) => s.nudgeDismiss)
  const dismissNudge = useStore((s) => s.dismissNudge)
  const realFriends = useFriends((s) => s.realFriends)

  const [voting, setVoting] = useState(false)
  const [adding, setAdding] = useState<{ shelf?: ShelfType } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [login, setLogin] = useState(false)
  const [sessionDismissed, setSessionDismissed] = useState(false)
  const [flags, setFlags] = useState({ imported: false, decided: false })

  useEffect(() => {
    Promise.all([AsyncStorage.getItem('biblio_has_imported'), AsyncStorage.getItem('biblio_used_decide')])
      .then(([a, b]) => setFlags({ imported: !!a, decided: !!b }))
      .catch(() => {})
  }, [])

  const all = Object.values(entries)
  const seen = all.filter((e) => e.status === 'seen').length
  const pending = all.filter((e) => e.status === 'pending').length
  const voted = Object.values(votes).filter(Boolean).length
  const firstName = profile.name.split(' ')[0]

  const nudge: Nudge | null = useMemo(() => {
    if (sessionDismissed) return null
    const n = evaluateNudges({
      hasAccount: Boolean(user),
      entries,
      rankings,
      hasImported: flags.imported,
      friendsCount: realFriends.length,
      hasUsedDecide: flags.decided,
      isStandalonePwa: true, // la app nativa ya está instalada: no hay recordatorio de instalar
      isMobile: true,
      daysOfUsage: 2,
      dismissHistory: nudgeDismiss,
      sessionNudgeShown: sessionDismissed,
    })
    if (!n) return null
    // login e invitar llevan al perfil, como en la PWA (Library.tsx:77-82); instalar no aplica en nativo
    const route = n.actionType === 'navigate' ? n.targetRoute : n.actionType === 'login' || n.actionType === 'invite' ? '/perfil' : null
    if (!route || !isBuiltRoute(route)) return null
    return n
  }, [entries, rankings, flags, realFriends.length, nudgeDismiss, sessionDismissed, user])

  useEffect(() => {
    if (nudge) track('nudge_shown', { itemId: nudge.id, data: { location: 'library' } })
  }, [nudge?.id])

  const onNudgeAction = () => {
    if (!nudge) return
    track('nudge_tap', { itemId: nudge.id, data: { location: 'library' } })
    if (nudge.actionType === 'login') return setLogin(true) // la PWA iba a /perfil para entrar con Google; aquí se entra sin salir
    const route = nudge.actionType === 'navigate' ? nudge.targetRoute : '/perfil'
    if (route) router.navigate(route as never)
  }
  const onNudgeDismiss = () => {
    if (!nudge) return
    track('nudge_dismiss', { itemId: nudge.id, data: { location: 'library' } })
    dismissNudge(nudge.id)
    setSessionDismissed(true)
  }

  return (
    <ScrollView ref={ref} style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 24 }}>
      <ScreenTitle actionPlacement="title"
        label="TU BIBLIOTECA"
        title={`Hola, ${firstName}.`}
        subtitle={`${seen} en tu biblioteca · ${pending} pendientes`}
        action={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {BUILT.perfil && (
            <Press onPress={() => router.navigate('/perfil')} accessibilityRole="link" accessibilityLabel="Tu perfil">
              <Avatar name={profile.name} color={profile.avatarColor} url={profile.avatarUrl} size={32} />
            </Press>
          )}
          <Press
            onPress={() => setAdding({})}
            accessibilityRole="button"
            accessibilityLabel="Añadir a mano"
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="plus" size={18} strokeWidth={2.5} color={colors.accentInk} />
          </Press>
          </View>
        }
      />

      {nudge && (
        <View style={{ marginBottom: 16 }}>
          <NudgeCard nudge={{ message: nudge.message, actionLabel: nudgeActionLabel(nudge) }} onAction={onNudgeAction} onDismiss={onNudgeDismiss} />
        </View>
      )}

      <View style={{ gap: 16 }}>
        {myShelves.map((t) => {
          const ranked = (rankings[t] ?? []).filter((id) => getItem(id))
          const unranked = all.filter((e) => e.status === 'seen' && !e.ranked && getItem(e.itemId)?.type === t).map((e) => e.itemId)
          const pendingCount = all.filter((e) => e.status === 'pending' && getItem(e.itemId)?.type === t).length
          return <ShelfCard key={t} shelf={t} ranked={ranked} unranked={unranked} pendingCount={pendingCount} />
        })}

        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <Press
            onPress={() => setVoting(true)}
            accessibilityRole="button"
            style={{ borderRadius: 24, backgroundColor: colors.surface, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(242,176,74,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="heart" size={22} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={{ fontFamily: 'Inter-600', fontSize: 15, color: colors.ink }}>Vota nuevas estanterías</AppText>
              <AppText style={[tx('meta'), { marginTop: 2 }]}>{voted ? `Has votado ${voted}` : 'Tú decides qué categoría llega después'}</AppText>
            </View>
            <Icon name="chevron" size={18} color={colors.mute} />
          </Press>

          {all.length < 5 && catalogItems.length > 0 && (
            <Press
              onPress={() => loadSample()}
              accessibilityRole="button"
              style={{ minHeight: 48, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(242,176,74,0.6)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Icon name="sparkle" size={17} color={colors.accent} />
              <AppText style={{ color: colors.accent, fontFamily: 'Inter-500', fontSize: 14 }}>Cargar datos de ejemplo</AppText>
            </Press>
          )}
        </View>
      </View>

      {adding && (
        <AddFlow
          shelf={adding.shelf}
          onClose={(m?: string) => {
            setAdding(null)
            if (m) setToast(m)
          }}
        />
      )}
      {toast && <Toast key={toast} message={toast} onDone={() => setToast(null)} />}
      {login && <LoginSheet onClose={() => setLogin(false)} onDone={() => setLogin(false)} />}
      {voting && <VoteSheet votes={votes} onToggle={toggleVote} onClose={() => setVoting(false)} />}
    </ScrollView>
  )
}
