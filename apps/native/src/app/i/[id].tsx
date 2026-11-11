import { useEffect, useRef, useState, type ComponentRef } from 'react'
import { ScrollView, View, useWindowDimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Linking } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SHELF_LABEL, canonicalId, friendHits, getItem, itemFacts, typeName, type Item } from '@biblioteca/core'
import { AppText } from '../../components/AppText'
import { Icon } from '../../components/Icon'
import { Poster } from '../../components/Poster'
import { Press } from '../../components/Press'
import { Enter } from '../../components/detail/Enter'
import { FriendsSection } from '../../components/detail/FriendsSection'
import { DetailSkeleton } from '../../components/detail/Skeleton'
import { StatusSection } from '../../components/detail/StatusSection'
import { bubbleHits } from '../../components/detail/friends'
import { FriendBubbles, Tag, Toast } from '../../components/ui'
import { DETAIL_SCRIM, DETAIL_SCRIM_AT, detailHeroSize, useFlight } from '../../lib/flight'
import { titleOf } from '../../lib/item'
import { loadShelves } from '../../data/loadData'
import { useCatalog } from '../../store'
import { alpha, colors, tx } from '../../theme'

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'))

/**
 * Ficha de una obra (ItemDetail.tsx). La portada llega a sangre y recibe volando el póster de la carta, la fila o la rejilla
 * (D12): al medirse, el hueco avisa a la capa de vuelo del destino. Mientras el póster viaja, el de la ficha está oculto.
 * Con reducir movimiento no hay vuelo: fundido. «Añadir a una lista» no se porta (D5).
 */
export default function Ficha() {
  const { id = '' } = useLocalSearchParams<{ id: string }>()
  const catalogVersion = useCatalog((s) => s.version)
  const canon = id ? canonicalId(id) : id
  const item = id ? getItem(canon) : undefined
  const [loading, setLoading] = useState(!item)

  // Link antiguo a una gemela fusionada: la ficha y la entrada viven en el id que se conservó
  useEffect(() => {
    if (id && canon !== id) router.replace({ pathname: '/i/[id]', params: { id: canon } })
  }, [id, canon])

  useEffect(() => {
    if (canon && !getItem(canon)) {
      setLoading(true)
      useCatalog.getState().ensureItems([canon]).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [canon, catalogVersion])

  // El detalle de la estantería (sinopsis, datos) llega después de arrancar: se pide la de esta obra primero
  useEffect(() => {
    if (item?.type) void loadShelves(item.type)
  }, [item?.type])

  if (id && canon !== id) return null
  if (!item) {
    if (loading) return <DetailSkeleton onBack={goBack} />
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: colors.bg }}>
        <AppText style={[tx('body'), { color: colors.ink }]}>No encontramos esta obra.</AppText>
        <Press onPress={() => router.replace('/')} accessibilityRole="link">
          <AppText style={[tx('body'), { color: colors.accent, textDecorationLine: 'underline' }]}>Volver a la biblioteca</AppText>
        </Press>
      </View>
    )
  }
  return <Detail item={item} />
}

function Detail({ item }: { item: Item }) {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const flight = useFlight()
  const slot = useRef<ComponentRef<typeof View>>(null)
  const [toast, setToast] = useState<string | null>(null)
  const hits = friendHits(item.id)
  const topInset = Math.max(insets.top, 16)
  const { w: heroW, h: heroH } = detailHeroSize(item, width)
  const flying = flight.activeId === item.id
  // Si la ficha se abrió con vuelo: la portada se pinta sin fundido (queda bajo la capa) y el texto entra al aterrizar, sin retraso.
  const [fromFlight] = useState(flying)
  const textDelay = fromFlight ? 0 : 0.16
  const facts = itemFacts(item)

  const poster = <Poster item={item} showTitle={false} instant={fromFlight} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderRadius: 0 }} />

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Press
        onPress={goBack}
        scaleTo={0.95}
        accessibilityRole="button"
        accessibilityLabel="Volver"
        style={{ position: 'absolute', left: 16, top: topInset, zIndex: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: alpha(colors.bg, 0.85), borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="back" size={20} color={colors.ink} />
      </Press>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View
          ref={slot}
          collapsable={false}
          onLayout={() => slot.current?.measureInWindow((x, y, pw, ph) => flight.land(item.id, [x, y, pw, ph]))}
          style={{ width: heroW, height: heroH, backgroundColor: colors.surface2 }}
        >
          <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, }}>
            {flight.reduceMotion ? <Animated.View entering={FadeIn.duration(200)} style={{ flex: 1 }}>{poster}</Animated.View> : poster}
          </View>
          {/* el degradado va siempre puesto (la capa del vuelo lo trae a su vez): el póster aterriza debajo de él, como la portada real */}
          <LinearGradient pointerEvents="none" colors={DETAIL_SCRIM} locations={DETAIL_SCRIM_AT} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
          {/* las caras de los amigos con su puesto, como en las tarjetas (Igor, 27/10) */}
          {!flying && hits.length > 0 && (
            <Enter delay={textDelay} duration={0.25} style={{ position: 'absolute', right: 16, top: topInset, zIndex: 10 }}>
              <FriendBubbles hits={bubbleHits(item.id, hits)} terms={SHELF_LABEL[item.type]} example />
            </Enter>
          )}
          {/* el título espera a que el póster haya aterrizado: así no se pinta por debajo de la capa del vuelo */}
          {!flying && (
          <Enter delay={textDelay} duration={0.3} y={12} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20 }}>
            <AppText style={[tx('label'), { color: alpha(colors.ink, 0.8) }]}>{`${typeName(item.type)} · ${item.year}`}</AppText>
            <AppText style={[tx('display'), { color: colors.ink, marginTop: 4 }]}>{titleOf(item)}</AppText>
            <AppText style={[tx('meta'), { color: alpha(colors.ink, 0.8), marginTop: 4 }]}>
              {item.artistId ? (
                <AppText
                  onPress={() => router.push({ pathname: '/i/[id]', params: { id: item.artistId! } })}
                  accessibilityRole="link"
                  style={{ textDecorationLine: 'underline', color: alpha(colors.ink, 0.8) }}
                >
                  {item.creator}
                </AppText>
              ) : (
                item.creator
              )}
              {facts ? ` · ${facts}` : ''}
            </AppText>
          </Enter>
          )}
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 16, gap: 20 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            {item.genres.map((g) => <Tag key={g}>{g}</Tag>)}
            {item.platforms?.map((p) => <Tag key={p} variant="accent">{p}</Tag>)}
            {item.type === 'song' && (
              <Press
                onPress={() => void Linking.openURL(`https://open.spotify.com/search/${encodeURIComponent(`${item.title} ${item.creator}`)}`)}
                accessibilityRole="link"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}
              >
                <Icon name="disc" size={14} color={colors.accent} />
                <AppText style={[tx('meta'), { fontFamily: 'Inter-500', color: colors.accent }]}>Spotify</AppText>
              </Press>
            )}
          </View>

          {!!item.synopsis && <AppText style={[tx('body'), { lineHeight: 24.375, color: alpha(colors.ink, 0.9) }]}>{item.synopsis}</AppText>}

          <StatusSection item={item} onNotify={setToast} />
          <FriendsSection item={item} hits={hits} onNotify={setToast} />
        </View>
      </ScrollView>

      {toast && <Toast key={toast} message={toast} onDone={() => setToast(null)} />}
    </View>
  )
}
