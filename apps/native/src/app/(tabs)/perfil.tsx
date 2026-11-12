import { useMemo, useRef, useState, type ComponentRef } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useRouter, useScrollToTop } from 'expo-router'
import {
  ACTIVE_SHELVES,
  SHELF_LABEL,
  affinity,
  friendRanks,
  friends as seedFriends,
  getItem,
  type Friend,
  type ShelfType,
} from '@biblioteca/core'
import { countryName } from '@biblioteca/core/src/lib/countries'
import { useFriends, useRanks, useStore } from '../../store'
import { useAuth } from '../../store/useAuth'
import { AppText } from '../../components/AppText'
import { Icon } from '../../components/Icon'
import { Press } from '../../components/Press'
import { ScreenTitle } from '../../components/ScreenTitle'
import { FindFriends } from '../../components/friends/FindFriends'
import { useCatalogTick } from '../../components/library/shelfMeta'
import { AffinityRow, Counter, NoticeLink, Section, StatCard, TopTile } from '../../components/profile/parts'
import { shareProfileLink } from '../../components/profile/shareProfile'
import { Avatar, Button, Sheet, Toast } from '../../components/ui'
import { BUILT } from '../../lib/phase'
import { haptic } from '../../lib/haptics'
import { colors, tx } from '../../theme'

/**
 * Perfil (Profile.tsx): lo que ven los demás de ti. Aquí no se edita nada: «Editar perfil» abre tus datos y «Ajustes», los ajustes.
 * Sin cuenta se comporta como la PWA sin sesión: amigos de ejemplo y sin «Añadir».
 */
export default function Perfil() {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null)
  useScrollToTop(ref)
  const router = useRouter()
  useCatalogTick()

  const profile = useStore((s) => s.profile)
  const entries = useStore((s) => s.entries)
  const rankings = useStore((s) => s.rankings)
  const ranks = useRanks()
  const user = useAuth((s) => s.user)
  const authProfile = useAuth((s) => s.profile)
  const realFriends = useFriends((s) => s.realFriends)

  const [toast, setToast] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [findFriends, setFindFriends] = useState(false)

  const stats = useMemo(() => {
    const list = Object.values(entries)
    const perShelf: Record<string, number> = {}
    for (const t of ACTIVE_SHELVES) {
      perShelf[t] = list.filter((e) => e.status === 'seen' && (e.shelf ?? getItem(e.itemId)?.type) === t).length
    }
    const seen = list.filter((e) => e.status === 'seen').length
    const pending = list.filter((e) => e.status === 'pending').length
    const genreCounts: Record<string, number> = {}
    for (const e of list) {
      if (e.status !== 'seen') continue
      for (const g of getItem(e.itemId)?.genres ?? []) genreCounts[g] = (genreCounts[g] ?? 0) + 1
    }
    const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
    return { perShelf, seen, pending, topGenre }
  }, [entries])

  // Afinidad con amigos: los reales; sin cuenta, los de ejemplo
  const activeFriends: Friend[] = realFriends.length > 0 ? realFriends : user ? [] : seedFriends
  const aff = useMemo(() => {
    const mine = Object.fromEntries(Object.entries(ranks).map(([id, r]) => [id, r.pct]))
    return activeFriends
      .map((f) => {
        const theirs = Object.fromEntries(Object.entries(friendRanks(f, getItem)).map(([id, r]) => [id, r.pct]))
        return { f, a: affinity(mine, theirs) }
      })
      .sort((x, y) => (y.a ?? -1) - (x.a ?? -1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranks, realFriends, user])

  const hasTop = ACTIVE_SHELVES.some((t) => (rankings[t] ?? []).length > 0)
  const place = countryName(profile.country)
  const unnamed = !profile.name || profile.name === 'Tú'

  const sendLink = async () => {
    setShareOpen(false)
    const msg = await shareProfileLink(profile, rankings)
    if (msg) setToast(msg)
  }

  const subtitle = [authProfile?.handle ? `@${authProfile.handle}` : null, place ?? null].filter(Boolean).join(' · ')

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={ref} contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingBottom: 32 }}>
        <ScreenTitle
          label="PERFIL"
          title={unnamed ? 'Tu perfil' : profile.name}
          subtitle={subtitle || undefined}
          action={
            BUILT.ajustes ? (
              <Press accessibilityRole="link" accessibilityLabel="Ajustes" scaleTo={0.95} onPress={() => router.push('/ajustes' as never)} style={styles.settingsBtn}>
                <Icon name="gear" size={17} color={colors.ink} />
                <AppText style={styles.settingsText}>Ajustes</AppText>
              </Press>
            ) : undefined
          }
        />

        <View style={{ paddingHorizontal: 20, gap: 28 }}>
          {/* Cabecera: foto y contadores */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Avatar name={profile.name} color={profile.avatarColor} url={profile.avatarUrl} size={72} />
              <View style={{ flex: 1, flexDirection: 'row' }}>
                <View style={{ flex: 1 }}>
                  <Counter value={stats.seen} label="vistas" />
                </View>
                <View style={{ flex: 1 }}>
                  <Counter value={stats.pending} label="pendientes" />
                </View>
                <View style={{ flex: 1 }}>
                  <Counter value={realFriends.length} label="amigos" />
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Button variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/perfil/editar' as never)}>
                Editar perfil
              </Button>
              <Button variant="secondary" style={{ flex: 1 }} icon={<Icon name="share" size={16} color={colors.ink} />} onPress={() => setShareOpen(true)}>
                Compartir
              </Button>
            </View>
            {(unnamed || (user && !authProfile?.handle)) && (
              <NoticeLink
                icon="edit"
                text={unnamed ? 'Pon tu nombre para que tus amigos te reconozcan' : 'Elige tu @usuario para que te encuentren'}
                onPress={() => router.push('/perfil/editar' as never)}
              />
            )}
          </View>

          {/* «Lo que más me marcó» (top 3 por estantería) */}
          <Section title="Lo que más me marcó">
            {hasTop ? (
              <View style={{ gap: 16 }}>
                {ACTIVE_SHELVES.filter((t) => (rankings[t] ?? []).length > 0).map((t: ShelfType) => (
                  <View key={t}>
                    <View style={styles.shelfHead}>
                      <AppText style={[tx('labelCaps'), { color: colors.mute }]}>{SHELF_LABEL[t].plural}</AppText>
                      <Press accessibilityRole="link" accessibilityLabel={`Ranking completo de ${SHELF_LABEL[t].plural}`} onPress={() => router.push({ pathname: '/estanteria/[type]', params: { type: t } })} style={styles.fullRanking}>
                        <AppText style={styles.fullRankingText}>Ranking completo</AppText>
                        <Icon name="chevron" size={14} color={colors.accent} />
                      </Press>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      {(rankings[t] ?? []).slice(0, 3).map((id, i) => {
                        const it = getItem(id)
                        return it ? <TopTile key={id} item={it} pos={i + 1} /> : <View key={id} style={{ flex: 1 }} />
                      })}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Press accessibilityRole="link" onPress={() => router.push('/comparar')} style={styles.emptyTop}>
                <AppText style={[tx('body'), { color: colors.mute }]}>
                  {'Cuando ordenes tus obras en '}
                  <AppText style={{ color: colors.accent, fontFamily: 'Inter-500' }}>¡Duelos!</AppText>
                  {', aquí saldrá tu top 3 de cada estantería.'}
                </AppText>
              </Press>
            )}
          </Section>

          {/* Mis números */}
          <Section title="Mis números">
            <View style={styles.stats}>
              {ACTIVE_SHELVES.map((t) => (
                <StatCard
                  key={t}
                  big={String(stats.perShelf[t] ?? 0)}
                  label={`${SHELF_LABEL[t].plural} ${SHELF_LABEL[t].seen}`}
                  onPress={() => router.push({ pathname: '/estanteria/[type]', params: { type: t } })}
                />
              ))}
              <StatCard big={stats.topGenre ?? '—'} small label="Tu género más frecuente" />
            </View>
          </Section>

          {/* Amigos y afinidad */}
          <Section
            title="Amigos"
            right={
              user ? (
                <Press
                  accessibilityRole="button"
                  accessibilityLabel="Añadir amigos"
                  scaleTo={0.95}
                  onPress={() => {
                    haptic('tap')
                    setFindFriends(true)
                  }}
                  style={styles.addBtn}
                >
                  <Icon name="plus" size={14} color={colors.accentInk} />
                  <AppText style={styles.addText}>Añadir</AppText>
                </Press>
              ) : undefined
            }
          >
            {aff.length > 0 ? (
              <View style={{ gap: 10 }}>
                {aff.map(({ f, a }) => (
                  <AffinityRow key={f.id} friend={f} a={a} example={!user} />
                ))}
              </View>
            ) : (
              <View style={styles.noFriends}>
                <View style={styles.noFriendsIcon}>
                  <Icon name="user" size={20} color={colors.accent} />
                </View>
                <AppText style={styles.noFriendsTitle}>Sin amigos conectados</AppText>
                <AppText style={styles.noFriendsText}>
                  {user
                    ? 'Invita a tus amigos uno a uno o búscalos en tus contactos. Veréis vuestra afinidad y qué os recomendáis.'
                    : 'Entra con tu cuenta desde Ajustes para conectar con tus amigos.'}
                </AppText>
              </View>
            )}
          </Section>
        </View>
      </ScrollView>

      {shareOpen && (
        <Sheet label="Compartir perfil" onClose={() => setShareOpen(false)} height={0}>
          <AppText style={styles.sheetTitle}>Compartir tu perfil</AppText>
          <View style={{ gap: 10, paddingBottom: 8 }}>
            <Press accessibilityRole="button" accessibilityLabel="Enviar enlace" scaleTo={0.98} onPress={sendLink} style={styles.sheetBtn}>
              <Icon name="link" size={18} color={colors.ink} />
              <AppText style={styles.sheetBtnText}>Enviar enlace</AppText>
            </Press>
            {/* «Tarjeta para Story» no se porta todavía: necesita pintar la tarjeta a imagen (react-native-view-shot + expo-sharing) */}
          </View>
        </Sheet>
      )}

      {findFriends && <FindFriends onClose={() => setFindFriends(false)} onToast={setToast} />}
      {toast ? <Toast key={toast} message={toast} onDone={() => setToast(null)} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  settingsBtn: { minHeight: 36, paddingLeft: 10, paddingRight: 14, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingsText: { fontFamily: 'Inter-500', fontSize: 13, lineHeight: 18, color: colors.ink },
  shelfHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  fullRanking: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fullRankingText: { fontFamily: 'Inter-600', fontSize: 12, lineHeight: 16, color: colors.accent },
  emptyTop: { borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line, padding: 16 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  addBtn: { minHeight: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', gap: 6 },
  addText: { fontFamily: 'Inter-600', fontSize: 12, lineHeight: 16, color: colors.accentInk },
  noFriends: { backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.line, padding: 20, alignItems: 'center', gap: 10 },
  noFriendsIcon: { width: 40, height: 40, borderRadius: 16, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  noFriendsTitle: { fontFamily: 'Inter-600', fontSize: 14, lineHeight: 20, color: colors.ink },
  noFriendsText: { fontFamily: 'Inter-400', fontSize: 12, lineHeight: 19.5, color: colors.mute, textAlign: 'center', maxWidth: 320 },
  sheetTitle: { fontFamily: 'Fraunces72-700', fontSize: 18, lineHeight: 28, color: colors.ink, marginBottom: 12 },
  sheetBtn: { width: '100%', minHeight: 52, borderRadius: 16, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetBtnText: { fontFamily: 'Inter-600', fontSize: 14, lineHeight: 20, color: colors.ink },
})
