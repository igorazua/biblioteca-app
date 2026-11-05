import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SHELF_LABEL, itemsOfType, nextCards, type Item, type ShelfType } from '@biblioteca/core'
import { AppText } from '../../components/AppText'
import { Icon, type IconName } from '../../components/Icon'
import { Press } from '../../components/Press'
import { SwipeDeck, type DeckHandle, type Rect, type SwipeDir } from '../../components/SwipeDeck'
import { haptic } from '../../lib/haptics'
import { useFlight } from '../../lib/flight'
import { posterOf } from '../../lib/item'
import { colors, tx } from '../../theme'

const SHELVES: ShelfType[] = ['movie', 'series', 'book', 'boardgame', 'artist']
const LEGEND_UNTIL = 10 // D3: la leyenda se ve hasta que la persona ha hecho 10 gestos
const GESTURES_KEY = 'biblioteca-deck-gestures' // el contador es de la persona, no de la sesión

/**
 * Lista del mazo con `nextCards` de core (motor de Descubrir). Sin entradas, amigos ni perfil: es la prueba de gestos, con
 * un perfil vacío. Si el motor fallara, se cae a la popularidad del catálogo.
 */
function buildDeck(shelf: ShelfType): Item[] {
  const items = itemsOfType(shelf)
  try {
    const cards = nextCards(
      {
        shelf,
        items,
        entries: {},
        rankings: { movie: [], series: [], book: [], artist: [], boardgame: [], song: [] },
        profile: { name: '', avatarColor: '#F5B544', platforms: [] },
        friends: [],
        affinity: () => null,
        friendPct: () => null,
      },
      [],
      40,
    )
    if (cards.length > 0) return cards.map((c) => c.item)
  } catch (e) {
    console.warn('nextCards falló, se usa la popularidad', e)
  }
  return [...items].sort((a, b) => b.popularity - a.popularity).slice(0, 40)
}

function ActionBtn({ size, color, icon, iconSize, stroke, onPress, disabled, filled, label }: { size: number; color: string; icon: IconName; iconSize: number; stroke: number; onPress: () => void; disabled?: boolean; filled?: boolean; label: string }) {
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: filled && !disabled ? colors.accent : colors.surface,
        borderWidth: filled && !disabled ? 0 : 1,
        borderColor: colors.line,
      }}
      dim={disabled ? (filled ? 0.4 : 0.25) : 1}
    >
      <Icon name={icon} size={iconSize} strokeWidth={stroke} color={filled && !disabled ? colors.accentInk : disabled && filled ? colors.mute : color} />
    </Press>
  )
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      style={{ minHeight: 40, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? colors.accent : 'rgba(255,255,255,0.05)', borderColor: active ? colors.accent : 'rgba(255,255,255,0.1)' }}
    >
      <AppText style={{ fontFamily: 'Inter-500', fontSize: 14, lineHeight: 20, color: active ? colors.accentInk : 'rgba(244,239,230,0.8)' }}>{label}</AppText>
    </Press>
  )
}

export default function Descubrir() {
  const insets = useSafeAreaInsets()
  const flight = useFlight()
  const [shelf, setShelf] = useState<ShelfType>('movie')
  const [deck, setDeck] = useState<Item[]>(() => buildDeck('movie'))
  const [history, setHistory] = useState<{ item: Item; dir: SwipeDir }[]>([])
  const [gestures, setGestures] = useState(LEGEND_UNTIL) // oculta hasta leer el valor guardado, para que no parpadee
  useEffect(() => {
    AsyncStorage.getItem(GESTURES_KEY)
      .then((v) => setGestures(Number(v) || 0))
      .catch(() => setGestures(0))
  }, [])
  const handle = useRef<DeckHandle>(null)

  const pick = (s: ShelfType) => {
    setShelf(s)
    setDeck(buildDeck(s))
    setHistory([])
  }

  const onSwipe = useCallback((item: Item, dir: SwipeDir) => {
    setDeck((d) => (d[0]?.id === item.id ? d.slice(1) : d))
    setHistory((h) => [...h, { item, dir }])
    setGestures((n) => {
      if (n < LEGEND_UNTIL) void AsyncStorage.setItem(GESTURES_KEY, String(n + 1))
      return n + 1
    })
  }, [])
  const undo = () => {
    const last = history[history.length - 1]
    if (!last) return
    haptic('tap')
    setHistory((h) => h.slice(0, -1))
    setDeck((d) => [last.item, ...d])
  }
  const onOpen = useCallback(
    (item: Item, rect: Rect) => {
      flight.start(item, rect, 28)
      router.push({ pathname: '/i/[id]', params: { id: item.id } })
    },
    [flight],
  )

  // D24: las siguientes cartas del mazo, ya descargadas en la caché de disco.
  const upcoming = useMemo(() => deck.slice(3, 5).map(posterOf).filter((u): u is string => !!u), [deck])
  useEffect(() => {
    if (upcoming.length) void Image.prefetch(upcoming, { cachePolicy: 'memory-disk' })
  }, [upcoming])

  const terms = SHELF_LABEL[shelf]
  const legend = `→ ${terms.actionPast.toLowerCase()} · ↑ pendiente · ← no me interesa`

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: Math.max(insets.top, 12) }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
        {SHELVES.map((s) => (
          <Chip key={s} label={SHELF_LABEL[s].plural} active={s === shelf} onPress={() => pick(s)} />
        ))}
      </ScrollView>

      <View style={{ flex: 1, minHeight: 0, paddingHorizontal: 20, marginTop: 8 }}>
        {deck.length > 0 ? (
          <SwipeDeck ref={handle} deck={deck} shelf={shelf} onSwipe={onSwipe} onOpen={onOpen} />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <AppText style={[tx('title'), { color: colors.ink }]}>¡Has repasado todo!</AppText>
          </View>
        )}
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 }}>
        {gestures < LEGEND_UNTIL && (
          <AppText style={[tx('meta'), { textAlign: 'center', marginBottom: 8 }]} numberOfLines={1}>
            {legend}
          </AppText>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <ActionBtn size={48} color={colors.accentInk} icon="rotateCcw" iconSize={20} stroke={2.4} filled disabled={history.length === 0} onPress={undo} label="Deshacer" />
          <ActionBtn size={68} color="#ef4b4b" icon="x" iconSize={30} stroke={2.6} onPress={() => handle.current?.fling('left')} disabled={deck.length === 0} label="No me interesa" />
          <ActionBtn size={56} color="#5b9cf5" icon="bookmark" iconSize={24} stroke={2.4} onPress={() => handle.current?.fling('up')} disabled={deck.length === 0} label="Pendiente" />
          <ActionBtn size={68} color="#3ec878" icon="check" iconSize={32} stroke={2.8} onPress={() => handle.current?.fling('right')} disabled={deck.length === 0} label={terms.actionPast} />
          <View style={{ width: 48 }} />
        </View>
      </View>
    </View>
  )
}
