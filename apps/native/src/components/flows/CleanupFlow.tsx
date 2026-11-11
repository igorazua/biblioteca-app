import { useEffect, useRef, useState } from 'react'
import { Modal, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SHELF_LABEL, cleanupOrder, friendHits, getItem, type Item, type ShelfType, type UserEntry } from '@biblioteca/core'
import { AppText } from '../AppText'
import { Icon } from '../Icon'
import { Press } from '../Press'
import { SwipeDeck, type DeckHandle, type SwipeDir } from '../SwipeDeck'
import { Toast } from '../ui'
import { useFlight } from '../../lib/flight'
import { track, useEvents, useStore } from '../../store'
import { alpha, colors } from '../../theme'
import { RatingFlow } from './RatingFlow'

interface CleanupFlowProps {
  shelf: ShelfType
  onClose: () => void
}

interface CleanupHistory {
  item: Item
  dir: SwipeDir
  prevEntry: UserEntry
}

/**
 * Limpieza de pendientes: repasa con swipe lo que tienes guardado en una estantería. Pantalla completa (`fixed inset-0 z-50`
 * de la PWA) como Modal. Al abrir la ficha de una obra se cierra la limpieza, igual que en la PWA, donde navegar la desmonta.
 */
export function CleanupFlow({ shelf, onClose }: CleanupFlowProps) {
  const insets = useSafeAreaInsets()
  const flight = useFlight()
  const entries = useStore((s) => s.entries)
  const settings = useStore((s) => s.settings)
  const setStatus = useStore((s) => s.setStatus)
  const newSession = useEvents((s) => s.newSession)

  const sessionSid = useRef<string>(null as unknown as string)
  if (sessionSid.current == null) sessionSid.current = newSession('clean')
  const deckRef = useRef<DeckHandle>(null)

  const [ratingItemId, setRatingItemId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [history, setHistory] = useState<CleanupHistory[]>([])
  const [counts, setCounts] = useState({ seen: 0, kept: 0, dismissed: 0 })
  const [showSummary, setShowSummary] = useState(false)
  const countsRef = useRef(counts)
  countsRef.current = counts

  // Obras pendientes iniciales de esta estantería
  const [pendingItems, setPendingItems] = useState<Item[]>(() => {
    const list = Object.values(entries)
      .filter((e) => e.status === 'pending')
      .map((e) => getItem(e.itemId))
      .filter((it): it is Item => it !== undefined && it.type === shelf)

    const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000
    const now = Date.now()
    const getFriendsRecent = (id: string) => friendHits(id).some((h) => h.entry.status === 'seen' && now - (h.entry.at || 0) < SIXTY_DAYS_MS)
    return cleanupOrder(list, entries, getFriendsRecent, now)
  })

  // clean_start al iniciar y clean_end al desmontar
  useEffect(() => {
    const sid = sessionSid.current
    track('clean_start', { shelf, sid })
    return () => {
      track('clean_end', { shelf, sid, data: countsRef.current })
    }
  }, [shelf])

  const label = SHELF_LABEL[shelf]

  const onSwipe = (item: Item, dir: SwipeDir) => {
    const prevEntry: UserEntry = entries[item.id] || { itemId: item.id, status: 'pending', ranked: false, updatedAt: Date.now() }
    track('clean_swipe', { shelf, itemId: item.id, sid: sessionSid.current, data: { dir } })

    setHistory((h) => [...h, { item, dir, prevEntry }])
    setPendingItems((list) => list.slice(1))

    if (dir === 'right') {
      setStatus(item.id, 'seen')
      track('entry_status', { shelf, itemId: item.id, sid: sessionSid.current, data: { from: 'pending', to: 'seen', via: 'clean' } })
      setCounts((c) => ({ ...c, seen: c.seen + 1 }))
      if (settings.rateOnSwipe !== false) setRatingItemId(item.id)
      else setToast(`${label.actionPast} ✓`)
    } else if (dir === 'up') {
      // Sigue guardada: se anota el repaso
      const now = Date.now()
      useStore.setState((s) => ({ entries: { ...s.entries, [item.id]: { ...prevEntry, status: 'pending', reviewedAt: now, updatedAt: now } } }))
      setCounts((c) => ({ ...c, kept: c.kept + 1 }))
      setToast(label.fem ? 'Sigue guardada' : 'Sigue guardado')
    } else {
      const now = Date.now()
      useStore.setState((s) => ({ entries: { ...s.entries, [item.id]: { ...prevEntry, status: 'dismissed', dismissedAt: now, updatedAt: now } } }))
      track('entry_status', { shelf, itemId: item.id, sid: sessionSid.current, data: { from: 'pending', to: 'dismissed', via: 'clean' } })
      setCounts((c) => ({ ...c, dismissed: c.dismissed + 1 }))
      setToast('Descartada')
    }

    // Si era la última tarjeta, resumen
    if (pendingItems.length <= 1) setShowSummary(true)
  }

  const handleUndo = () => {
    if (history.length === 0) return
    const last = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    useStore.setState((s) => ({ entries: { ...s.entries, [last.item.id]: last.prevEntry } }))
    if (last.dir === 'right') setCounts((c) => ({ ...c, seen: Math.max(0, c.seen - 1) }))
    else if (last.dir === 'up') setCounts((c) => ({ ...c, kept: Math.max(0, c.kept - 1) }))
    else setCounts((c) => ({ ...c, dismissed: Math.max(0, c.dismissed - 1) }))
    setPendingItems((list) => [last.item, ...list])
    setRatingItemId(null)
  }

  const handleExit = () => {
    const totalSwipes = counts.seen + counts.kept + counts.dismissed
    if (totalSwipes > 0 && !showSummary) setShowSummary(true)
    else onClose()
  }

  const stat = (n: number, text: string, color: string) => (
    <View style={{ flex: 1, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 12, alignItems: 'center' }}>
      <AppText style={{ fontFamily: 'Fraunces72-700', fontSize: 24, lineHeight: 32, color, fontVariant: ['tabular-nums'] }}>{String(n)}</AppText>
      <AppText style={{ fontFamily: 'Inter-400', fontSize: 12, lineHeight: 16, color: colors.mute, marginTop: 4 }}>{text}</AppText>
    </View>
  )

  const roundBtn = (size: number, color: string, icon: 'x' | 'bookmark' | 'check', iconSize: number, stroke: number, labelTxt: string, dir: SwipeDir, border = true) => (
    <Press
      onPress={() => deckRef.current?.fling(dir)}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={labelTxt}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface, borderWidth: border ? 2 : 0, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name={icon} size={iconSize} strokeWidth={stroke} color={color} />
    </Press>
  )

  return (
    <Modal visible animationType="none" statusBarTranslucent navigationBarTranslucent supportedOrientations={['portrait']} onRequestClose={handleExit}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          {/* Cabecera */}
          <View style={{ paddingTop: Math.max(insets.top, 12) + 8, paddingBottom: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: alpha(colors.line, 0.4) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
              <Press onPress={handleExit} scaleTo={0.95} accessibilityRole="button" accessibilityLabel="Cerrar limpieza" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="x" size={20} color={colors.mute} />
              </Press>
              <View style={{ flexShrink: 1 }}>
                <AppText numberOfLines={1} style={{ fontFamily: 'Fraunces72-600', fontSize: 16, lineHeight: 24, color: colors.ink }}>Limpieza de pendientes</AppText>
                <AppText style={{ fontFamily: 'Inter-400', fontSize: 12, lineHeight: 16, color: colors.mute }}>{label.plural}</AppText>
              </View>
            </View>
            <AppText style={{ fontFamily: 'Inter-400', fontSize: 12, lineHeight: 16, color: colors.mute, fontVariant: ['tabular-nums'] }}>
              {pendingItems.length > 0 ? `${pendingItems.length} restantes` : 'Completado'}
            </AppText>
          </View>

          {showSummary ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 }}>
              <AppText style={{ fontSize: 48, lineHeight: 48 }}>✨</AppText>
              <AppText style={{ fontFamily: 'Fraunces72-600', fontSize: 30, lineHeight: 36, color: colors.ink, textAlign: 'center' }}>Limpieza completada</AppText>
              <AppText style={{ fontFamily: 'Inter-400', fontSize: 14, lineHeight: 20, color: colors.mute, textAlign: 'center' }}>{`Has repasado tus pendientes de ${label.plural.toLowerCase()}.`}</AppText>
              <View style={{ flexDirection: 'row', gap: 12, width: '100%', maxWidth: 384, marginTop: 8 }}>
                {stat(counts.seen, label.seen, colors.stampGreen)}
                {stat(counts.kept, 'Siguen', colors.stampBlue)}
                {stat(counts.dismissed, 'Fuera', colors.stampRed)}
              </View>
              <Press
                onPress={onClose}
                scaleTo={0.95}
                accessibilityRole="button"
                style={{ marginTop: 24, width: '100%', maxWidth: 384, minHeight: 52, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}
              >
                <AppText style={{ fontFamily: 'Inter-600', fontSize: 15, lineHeight: 22, color: colors.accentInk }}>Volver a Pendientes</AppText>
              </Press>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
                {pendingItems.length > 0 ? (
                  <SwipeDeck
                    ref={deckRef}
                    deck={pendingItems}
                    shelf={shelf}
                    onSwipe={onSwipe}
                    onOpen={(it, rect) => {
                      onClose()
                      flight.openFrom(it, rect, 28)
                    }}
                    stamps={{ right: label.stamp, left: 'FUERA', up: 'LA GUARDO' }}
                  />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 12 }}>
                    <AppText style={{ fontSize: 36, lineHeight: 40 }}>🎉</AppText>
                    <AppText style={{ fontFamily: 'Fraunces72-600', fontSize: 20, lineHeight: 28, color: colors.ink, textAlign: 'center' }}>¡No quedan más pendientes!</AppText>
                    <Press onPress={onClose} accessibilityRole="button" style={{ marginTop: 8, minHeight: 46, paddingHorizontal: 24, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                      <AppText style={{ fontFamily: 'Inter-600', fontSize: 15, lineHeight: 22, color: colors.accentInk }}>Volver a Pendientes</AppText>
                    </Press>
                  </View>
                )}
              </View>

              {pendingItems.length > 0 && (
                <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 + Math.max(insets.bottom, 0), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                  <Press
                    onPress={handleUndo}
                    disabled={history.length === 0}
                    dim={history.length === 0 ? 0.25 : 1}
                    scaleTo={0.9}
                    accessibilityRole="button"
                    accessibilityLabel="Deshacer"
                    style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Icon name="undo" size={20} color={colors.mute} />
                  </Press>
                  {roundBtn(56, colors.stampRed, 'x', 26, 2.6, 'No me interesa', 'left')}
                  {roundBtn(48, colors.stampBlue, 'bookmark', 22, 2.4, `${label.pronounCap} guardo (mantener en pendientes)`, 'up')}
                  {roundBtn(56, colors.stampGreen, 'check', 26, 2.8, `¡${label.stamp}! (marcar como ${label.seenPastPart})`, 'right')}
                  <View style={{ width: 44 }} />
                </View>
              )}
            </View>
          )}

          {ratingItemId && (
            <RatingFlow
              key={ratingItemId}
              itemId={ratingItemId}
              withStars
              onDone={(m) => {
                setRatingItemId(null)
                if (m) setToast(m)
              }}
            />
          )}

          {toast && <Toast key={toast} message={toast} ms={1400} onDone={() => setToast(null)} />}
        </View>
      </GestureHandlerRootView>
    </Modal>
  )
}
