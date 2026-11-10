import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ACTIVE_SHELVES,
  SHELF_LABEL,
  affinity,
  evaluateNudges,
  friendRanks,
  friends as seedFriends,
  getItem,
  itemsOfType,
  newDeckSessionState,
  nextCards,
  type DeckCard,
  type DeckSessionState,
  type Friend,
  type Item,
  type Nudge,
  type ShelfType,
} from '@biblioteca/core'
import { AppText } from '../../components/AppText'
import { Icon } from '../../components/Icon'
import { Press } from '../../components/Press'
import { SwipeDeck, type DeckHandle, type Rect, type SwipeDir } from '../../components/SwipeDeck'
import { ActionBtn } from '../../components/discover/ActionBtn'
import { DiscoverHub, remainingOf } from '../../components/discover/DiscoverHub'
import { RatingFlow } from '../../components/flows/RatingFlow'
import { Button, Chip, NudgeCard, Toast } from '../../components/ui'
import { loadShelves } from '../../data/loadData'
import { useFlight } from '../../lib/flight'
import { posterOf } from '../../lib/item'
import { kv } from '../../lib/storage'
import { BUILT } from '../../lib/phase'
import { track, useAuth, useCatalog, useEvents, useFriends, useRanks, useStore } from '../../store'
import { colors, tx } from '../../theme'

const LEGEND_UNTIL = 10 // D3: la leyenda se ve hasta que la persona ha hecho 10 gestos
const GESTURES_KEY = 'biblioteca-deck-gestures' // el contador es de la persona, no de la sesión

// El equivalente de `sessionStorage['discover-shelf']`: dura lo que la sesión de la app.
let sessionShelf: ShelfType | null = null
const isActive = (v: unknown): v is ShelfType => typeof v === 'string' && (ACTIVE_SHELVES as string[]).includes(v)

/**
 * Descubrir (Discover.tsx, variante `hub`, D1): categorías → mazo. Misma lógica que la PWA: lotes de 20 con reposición
 * a ≤ 8 cartas, adaptación de la sesión, avisos cada 15 gestos, valoración al deslizar a la derecha y deshacer.
 */
export default function Descubrir() {
  const insets = useSafeAreaInsets()
  const flight = useFlight()
  const params = useLocalSearchParams<{ shelf?: string }>()
  const paramShelf = isActive(params.shelf) ? params.shelf : null

  const [shelf, setShelfState] = useState<ShelfType>(() => paramShelf ?? sessionShelf ?? ACTIVE_SHELVES[0] ?? 'movie')
  const [showHub, setShowHub] = useState(() => !paramShelf)

  useEffect(() => {
    void loadShelves(shelf) // el detalle de la estantería (la PWA hace ensureShelfCatalog / ensureShelfEngine)
  }, [shelf])

  useEffect(() => {
    // Llega `?shelf=` (aviso, enlace de Biblioteca): se abre el mazo de esa estantería aunque ya fuera la actual. A
    // diferencia de la PWA, aquí la pestaña sigue montada con el hub visible, y por eso no se compara con `shelf`.
    if (paramShelf) {
      setShelfState(paramShelf)
      setShowHub(false)
      sessionShelf = paramShelf
    }
  }, [paramShelf])

  const setShelf = (s: ShelfType) => {
    setShelfState(s)
    sessionShelf = s
    router.setParams({ shelf: s })
  }

  const entries = useStore((s) => s.entries)
  const profile = useStore((s) => s.profile)
  const rankings = useStore((s) => s.rankings)
  const shelfUserVec = useStore((s) => s.userVectors?.[shelf]) // solo la de esta estantería: si llegan otras, el mazo no se rebaraja
  const catalogVersion = useCatalog((s) => s.version)
  const ranks = useRanks()
  const swipe = useStore((s) => s.swipe)
  const settings = useStore((s) => s.settings)
  const undoSwipe = useStore((s) => s.undoSwipe)
  const hasHistory = useStore((s) => s.history.length > 0)
  const dismissHistory = useStore((s) => s.nudgeDismiss)
  const dismissNudge = useStore((s) => s.dismissNudge)

  const [rating, setRating] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [deckNudge, setDeckNudge] = useState<Nudge | null>(null)
  const deckRef = useRef<DeckHandle>(null)

  const realFriends = useFriends((s) => s.realFriends)
  const activeFriends: Friend[] = realFriends.length > 0 ? realFriends : seedFriends

  const newSession = useEvents((s) => s.newSession)
  const sessionSid = useRef('')
  const cardShownAt = useRef(Date.now())
  const swipeCount = useRef(0)
  const shownIds = useRef(new Set<string>())
  const sessionStateRef = useRef<DeckSessionState>(newDeckSessionState())

  const getFriendPct = useCallback((friend: Friend, itemId: string) => friendRanks(friend, getItem)[itemId]?.pct ?? null, [])
  const getAffinity = useCallback(
    (friendId: string) => {
      const f = activeFriends.find((x) => x.id === friendId)
      if (!f) return null
      const mine = Object.fromEntries(Object.entries(ranks).map(([id, r]) => [id, r.pct]))
      const theirs = Object.fromEntries(Object.entries(friendRanks(f, getItem)).map(([id, r]) => [id, r.pct]))
      return affinity(mine, theirs)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeFriends, ranks],
  )

  const [deckCards, setDeckCards] = useState<DeckCard[]>([])

  const fetchBatch = useCallback(
    (existingIds: Set<string>, count = 20) => {
      const pool = itemsOfType(shelf).filter((i) => !existingIds.has(i.id))
      return nextCards(
        { shelf, items: pool, entries, rankings, profile, friends: activeFriends, affinity: getAffinity, friendPct: getFriendPct, session: sessionStateRef.current, userVec: shelfUserVec },
        Array.from(existingIds),
        count,
      )
    },
    // catalogVersion: al llegar el detalle de la estantería cambia el catálogo y la función se renueva
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shelf, entries, rankings, profile, activeFriends, getAffinity, getFriendPct, shelfUserVec, catalogVersion],
  )
  const fetchBatchRef = useRef(fetchBatch)
  fetchBatchRef.current = fetchBatch

  // Inicializar o recargar el mazo al cambiar de estantería
  useEffect(() => {
    sessionSid.current = newSession('deck')
    cardShownAt.current = Date.now()
    swipeCount.current = 0
    shownIds.current.clear()
    sessionStateRef.current = newDeckSessionState()
    const firstBatch = fetchBatchRef.current(shownIds.current)
    firstBatch.forEach((c) => shownIds.current.add(c.item.id))
    setDeckCards(firstBatch)
  }, [shelf, newSession])

  // Reabastecer cuando quedan ≤ 8 cartas
  const checkRestock = useCallback((remainingLength: number) => {
    if (remainingLength <= 8) {
      const more = fetchBatchRef.current(shownIds.current, 20)
      if (more.length > 0) {
        more.forEach((c) => shownIds.current.add(c.item.id))
        setDeckCards((prev) => [...prev, ...more])
      }
    }
  }, [])

  const topCard = deckCards[0]
  useEffect(() => {
    if (topCard?.item) {
      track('deck_shown', { shelf, itemId: topCard.item.id, sid: sessionSid.current, data: { pos: shownIds.current.size, bucket: topCard.bucket, score: topCard.score } })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topCard?.item.id, topCard?.bucket, topCard?.score, shelf])

  // D3: contador de gestos de la persona (leyenda bajo el mazo). Oculta hasta leer el valor guardado, para que no parpadee.
  const [gestures, setGestures] = useState(LEGEND_UNTIL)
  const gesturesRef = useRef(LEGEND_UNTIL)
  useEffect(() => {
    kv.getItem(GESTURES_KEY)
      .then((v) => {
        gesturesRef.current = Number(v) || 0
        setGestures(gesturesRef.current)
      })
      .catch(() => {
        gesturesRef.current = 0
        setGestures(0)
      })
  }, [])

  const onSwipe = (item: Item, dir: SwipeDir) => {
    const ms = Math.max(100, Date.now() - cardShownAt.current)
    cardShownAt.current = Date.now()
    swipeCount.current += 1
    if (gesturesRef.current < LEGEND_UNTIL) {
      gesturesRef.current += 1
      setGestures(gesturesRef.current)
      void kv.setItem(GESTURES_KEY, String(gesturesRef.current))
    }

    track('deck_swipe', { shelf, itemId: item.id, sid: sessionSid.current, data: { pos: swipeCount.current, bucket: topCard?.bucket ?? 'seen_likely', dir, ms } })

    // Adaptación de la sesión (§7.6)
    const decade = `${Math.floor(item.year / 10) * 10}s`
    const macro = item.genres?.[0] || 'General'
    const dStat = (sessionStateRef.current.countsByDecade[decade] ??= { seen: 0, up: 0, left: 0, shown: 0 })
    const mStat = (sessionStateRef.current.countsByMacro[macro] ??= { seen: 0, up: 0, left: 0, shown: 0 })
    dStat.shown++
    mStat.shown++
    if (dir === 'right') {
      dStat.seen++
      mStat.seen++
    } else if (dir === 'up') {
      dStat.up++
      mStat.up++
    } else {
      dStat.left++
      mStat.left++
    }

    const remaining = deckCards.filter((c) => c.item.id !== item.id)
    setDeckCards(remaining)
    checkRestock(remaining.length)
    swipe(item.id, dir)

    // Aviso dentro del mazo cada ~15 tarjetas (§5.2). Los que llevan a pantallas por construir (phase.ts) quedan como
    // «descartados 3 veces» para que el motor pase al siguiente. Instalar no aplica (no es una PWA).
    if (swipeCount.current % 15 === 0 && !deckNudge) {
      const off = { count: 3, lastDismissedAt: Date.now() }
      const candidate = evaluateNudges({
        hasAccount: Boolean(useAuth.getState().user),
        entries: useStore.getState().entries,
        rankings,
        hasImported: false,
        friendsCount: realFriends.length,
        hasUsedDecide: false,
        isStandalonePwa: true,
        isMobile: true,
        daysOfUsage: 2,
        dismissHistory: { ...dismissHistory, install: off, ...(BUILT.perfil ? null : { login: off, invite: off }), ...(BUILT.importar ? null : { import: off }) },
      })
      if (candidate) {
        setDeckNudge(candidate)
        track('nudge_shown', { itemId: candidate.id, data: { location: 'deck' } })
      }
    }

    if (dir === 'right') {
      if (settings.rateOnSwipe === false) setToast('Guardada ✓')
      else setRating(item.id)
    } else if (dir === 'up') setToast('Guardada en pendientes ✓')
  }

  const undo = () => {
    const id = undoSwipe()
    if (!id) return
    const it = getItem(id)
    if (it) {
      setDeckCards((prev) => [{ item: it, bucket: 'seen_likely', score: it.popularity }, ...prev.filter((c) => c.item.id !== id)])
      setRating(null)
    }
  }

  const onOpen = useCallback(
    (item: Item, rect: Rect) => {
      track('deck_open', { shelf, itemId: item.id, sid: sessionSid.current })
      flight.start(item, rect, 28)
      router.push({ pathname: '/i/[id]', params: { id: item.id } })
    },
    [flight, shelf],
  )

  const remainingCount = useMemo(
    () => remainingOf(shelf, entries),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shelf, entries, catalogVersion],
  )
  const deck = useMemo(() => deckCards.map((c) => c.item), [deckCards])

  // D24: las siguientes cartas del mazo, ya descargadas en la caché de disco.
  const upcoming = useMemo(() => deck.slice(3, 5).map(posterOf).filter((u): u is string => !!u), [deck])
  useEffect(() => {
    if (upcoming.length) void Image.prefetch(upcoming, { cachePolicy: 'memory-disk' })
  }, [upcoming])

  const label = SHELF_LABEL[shelf]
  const blocked = !!rating || !!deckNudge
  const legend = `→ ${label.actionPast.toLowerCase()} · ↑ pendiente · ← no me interesa`

  if (showHub) {
    return (
      <DiscoverHub
        entries={entries}
        catalogVersion={catalogVersion}
        onPick={(s) => {
          setShelf(s)
          setShowHub(false)
        }}
      />
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Cabecera de la variante hub (Discover.tsx:478) */}
      <View style={{ paddingTop: Math.max(insets.top, 12), paddingHorizontal: 20, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Press onPress={() => {
            setShowHub(true)
            router.setParams({ shelf: undefined }) // para que un nuevo `?shelf=` igual al anterior vuelva a abrir el mazo
          }} accessibilityRole="button" accessibilityLabel="Categorías" style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: -4, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 8 }}>
          <Icon name="back" size={15} strokeWidth={2.4} color={colors.accent} />
          <AppText style={{ fontFamily: 'Inter-500', fontSize: 13, lineHeight: 18, color: colors.accent }}>Categorías</AppText>
        </Press>
        <AppText style={{ fontFamily: 'Inter-500', fontSize: 12, lineHeight: 16, color: colors.mute, fontVariant: ['tabular-nums'] }}>
          {`${label.plural} · ${remainingCount > 0 ? `${remainingCount} por ver` : 'Al día'}`}
        </AppText>
      </View>

      {/* Zona central */}
      <View style={{ flex: 1, minHeight: 0, paddingHorizontal: 20 }}>
        {deckNudge ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: '100%' }}>
              <NudgeCard
                variant="card"
                nudge={deckNudge}
                onAction={() => {
                  track('nudge_tap', { itemId: deckNudge.id, data: { location: 'deck' } })
                  if (deckNudge.actionType === 'login' || deckNudge.actionType === 'invite') router.navigate('/perfil') // Discover.tsx:508-510
                  else if (deckNudge.targetRoute) router.navigate(deckNudge.targetRoute as never)
                  setDeckNudge(null)
                }}
                onDismiss={() => {
                  track('nudge_dismiss', { itemId: deckNudge.id, data: { location: 'deck' } })
                  dismissNudge(deckNudge.id)
                  setDeckNudge(null)
                }}
              />
            </View>
          </View>
        ) : deck.length > 0 ? (
          <SwipeDeck ref={deckRef} deck={deck} shelf={shelf} onSwipe={onSwipe} onOpen={onOpen} />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
            <AppText style={[tx('title'), { color: colors.ink, textAlign: 'center' }]}>{`¡Has repasado todo ${label.plural.toLowerCase()}!`}</AppText>
            <AppText style={[tx('body'), { color: colors.mute, textAlign: 'center', marginTop: 12 }]}>Ya no quedan más en esta estantería de la demo.</AppText>
            <Button variant="primary" onPress={() => router.navigate('/comparar')} style={{ marginTop: 20 }}>
              Ordenar con ¡Duelos!
            </Button>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 24 }}>
              {ACTIVE_SHELVES.filter((s) => s !== shelf).map((s) => (
                <Chip key={s} onPress={() => setShelf(s)}>
                  {SHELF_LABEL[s].plural}
                </Chip>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Parte inferior */}
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 }}>
        {gestures < LEGEND_UNTIL && (
          <AppText style={[tx('meta'), { textAlign: 'center', marginBottom: 8 }]} numberOfLines={1}>
            {legend}
          </AppText>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <ActionBtn size={48} color={colors.accentInk} icon="rotateCcw" iconSize={20} stroke={2.4} filled disabled={!hasHistory || blocked} onPress={undo} label="Deshacer" />
          <ActionBtn size={68} color="#ef4b4b" icon="x" iconSize={30} stroke={2.6} disabled={!deck.length || blocked} onPress={() => deckRef.current?.fling('left')} label="No me interesa" />
          <ActionBtn size={56} color="#5b9cf5" icon="bookmark" iconSize={24} stroke={2.4} disabled={!deck.length || blocked} onPress={() => deckRef.current?.fling('up')} label={`Pendiente: no ${label.pronoun} he ${label.seenPastPart}, me interesa`} />
          <ActionBtn size={68} color="#3ec878" icon="check" iconSize={32} stroke={2.8} disabled={!deck.length || blocked} onPress={() => deckRef.current?.fling('right')} label={`${label.stamp.replace(/[¡!]/g, '')}: ${label.pronoun} he ${label.seenPastPart}`} />
          <View style={{ width: 48 }} />
        </View>
      </View>

      {rating && (
        <RatingFlow
          key={rating}
          itemId={rating}
          withStars
          onDone={(m) => {
            setRating(null)
            if (m) setToast(m)
          }}
        />
      )}
      {toast && <Toast key={toast} message={toast} ms={1500} onDone={() => setToast(null)} />}
    </View>
  )
}
