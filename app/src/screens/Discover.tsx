import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { friends as seedFriends, getItem, items } from '../data/catalog'
import { nextCards, newDeckSessionState, type DeckCard, type DeckSessionState } from '../lib/engine/deck'
import { useStore } from '../store/useStore'
import { useAuth } from '../store/useAuth'
import { useFriends } from '../store/useFriends'
import { track, useEvents } from '../store/useEvents'
import { evaluateNudges, type Nudge } from '../lib/nudges'
import { affinity } from '../lib/affinity'
import { friendRanks } from '../lib/rank'
import { useRanks } from '../store/useScores'
import { SHELVES, SHELF_LABEL, type Friend, type Item, type ShelfType } from '../types'
import { SwipeDeck, type DeckHandle, type SwipeDir } from '../components/SwipeDeck'
import { RatingFlow } from '../components/RatingFlow'
import { NudgeCard } from '../components/NudgeCard'
import { Chip, Toast } from '../components/ui'
import { Icon } from '../components/Icon'
import { ScreenTitle } from '../components/ScreenTitle'
import { Button } from '../components/Button'

const readShelf = (): ShelfType => {
  try { const v = sessionStorage.getItem('discover-shelf') as ShelfType; if (v && (SHELVES as readonly string[]).includes(v)) return v } catch { /* sin almacenamiento */ }
  return 'movie'
}

export function Discover() {
  const nav = useNavigate()
  const [shelf, setShelfState] = useState<ShelfType>(readShelf)
  const setShelf = (s: ShelfType) => { setShelfState(s); try { sessionStorage.setItem('discover-shelf', s) } catch { /* ok */ } }
  const entries = useStore((s) => s.entries)
  const profile = useStore((s) => s.profile)
  const rankings = useStore((s) => s.rankings)
  const userVectors = useStore((s) => s.userVectors)
  const ranks = useRanks()
  const swipe = useStore((s) => s.swipe)
  const settings = useStore((s) => s.settings)
  const undoSwipe = useStore((s) => s.undoSwipe)
  const hasHistory = useStore((s) => s.history.length > 0)
  const dismissHistory = useStore((s) => s.nudgeDismiss)
  const dismissNudge = useStore((s) => s.dismissNudge)
  const user = useAuth((s) => s.user)

  const [rating, setRating] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [deckNudge, setDeckNudge] = useState<Nudge | null>(null)
  const deckRef = useRef<DeckHandle>(null)

  const realFriends = useFriends((s) => s.realFriends)
  const activeFriends = realFriends.length > 0 ? realFriends : seedFriends

  const newSession = useEvents((s) => s.newSession)
  const sessionSid = useRef(newSession('deck'))
  const cardShownAt = useRef(Date.now())
  const swipeCount = useRef(0)
  const shownIds = useRef(new Set<string>())
  const sessionStateRef = useRef<DeckSessionState>(newDeckSessionState())

  const getFriendPct = useCallback((friend: Friend, itemId: string) => {
    return friendRanks(friend, getItem)[itemId]?.pct ?? null
  }, [])

  const getAffinity = useCallback((friendId: string) => {
    const f = activeFriends.find((x) => x.id === friendId)
    if (!f) return null
    const mine = Object.fromEntries(Object.entries(ranks).map(([id, r]) => [id, r.pct]))
    const theirs = Object.fromEntries(Object.entries(friendRanks(f, getItem)).map(([id, r]) => [id, r.pct]))
    return affinity(mine, theirs)
  }, [activeFriends, ranks])

  // Cola de tarjetas con batching (§7)
  const [deckCards, setDeckCards] = useState<DeckCard[]>([])

  const fetchBatch = useCallback((existingIds: Set<string>, count = 20) => {
    const pool = items.filter((i) => i.type === shelf && !existingIds.has(i.id))
    return nextCards({
      shelf,
      items: pool,
      entries,
      rankings,
      profile,
      friends: activeFriends,
      affinity: getAffinity,
      friendPct: getFriendPct,
      session: sessionStateRef.current,
      userVec: userVectors?.[shelf],
    }, Array.from(existingIds), count)
  }, [shelf, entries, rankings, profile, activeFriends, getAffinity, getFriendPct, userVectors])

  // Inicializar o recargar mazo al cambiar estantería
  useEffect(() => {
    sessionSid.current = newSession('deck')
    swipeCount.current = 0
    shownIds.current.clear()
    sessionStateRef.current = newDeckSessionState()
    cardShownAt.current = Date.now()
    setDeckNudge(null)

    const initial = fetchBatch(new Set(), 20)
    setDeckCards(initial)

    return () => {
      track('deck_session_end', {
        shelf,
        sid: sessionSid.current,
        data: { cards: shownIds.current.size, swipes: swipeCount.current },
      })
    }
  }, [shelf, fetchBatch, newSession])

  // Reabastecer mazo cuando quedan <= 8 tarjetas (§7)
  useEffect(() => {
    if (deckCards.length > 0 && deckCards.length <= 8) {
      const existing = new Set(deckCards.map((c) => c.item.id))
      const nextBatch = fetchBatch(existing, 20)
      if (nextBatch.length > 0) {
        setDeckCards((prev) => [...prev, ...nextBatch])
      }
    }
  }, [deckCards.length, fetchBatch])

  // Registrar tarjeta mostrada
  const topCard = deckCards[0]
  useEffect(() => {
    if (topCard && !shownIds.current.has(topCard.item.id)) {
      shownIds.current.add(topCard.item.id)
      cardShownAt.current = Date.now()
      track('deck_shown', {
        shelf,
        itemId: topCard.item.id,
        sid: sessionSid.current,
        data: { pos: shownIds.current.size, bucket: topCard.bucket, score: topCard.score },
      })
    }
  }, [topCard?.item.id, topCard?.bucket, topCard?.score, shelf])

  const onSwipe = (item: Item, dir: SwipeDir) => {
    const ms = Math.max(100, Date.now() - cardShownAt.current)
    cardShownAt.current = Date.now()
    swipeCount.current++

    const cur = topCard
    track('deck_swipe', {
      shelf,
      itemId: item.id,
      sid: sessionSid.current,
      data: { pos: swipeCount.current, bucket: cur?.bucket ?? 'seen_likely', dir, ms },
    })

    // Actualizar adaptación de la sesión (§7.6)
    const decade = `${Math.floor(item.year / 10) * 10}s`
    const macro = item.genres?.[0] || 'General'
    const dStat = sessionStateRef.current.countsByDecade[decade] ??= { seen: 0, up: 0, left: 0, shown: 0 }
    const mStat = sessionStateRef.current.countsByMacro[macro] ??= { seen: 0, up: 0, left: 0, shown: 0 }
    dStat.shown++
    mStat.shown++
    if (dir === 'right') { dStat.seen++; mStat.seen++ }
    else if (dir === 'up') { dStat.up++; mStat.up++ }
    else if (dir === 'left') { dStat.left++; mStat.left++ }

    setDeckCards((prev) => prev.slice(1))
    swipe(item.id, dir)

    // Evaluar Nudge dentro del mazo cada ~15 tarjetas (§5.2)
    if (swipeCount.current > 0 && swipeCount.current % 15 === 0 && !deckNudge) {
      const candidateNudge = evaluateNudges({
        hasAccount: Boolean(user),
        entries: useStore.getState().entries,
        rankings,
        hasImported: Boolean(localStorage.getItem('biblio_has_imported')),
        friendsCount: realFriends.length,
        hasUsedDecide: Boolean(localStorage.getItem('biblio_used_decide')),
        isStandalonePwa: typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || false),
        isMobile: typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
        daysOfUsage: 2,
        dismissHistory,
      })
      if (candidateNudge) {
        setDeckNudge(candidateNudge)
        track('nudge_shown', { itemId: candidateNudge.id, data: { location: 'deck' } })
      }
    }

    if (dir === 'right') { if (settings.rateOnSwipe === false) setToast('Guardada ✓'); else setRating(item.id) }
    else if (dir === 'up') setToast('Guardada en pendientes ✓')
  }

  const undo = () => {
    const id = undoSwipe()
    if (id) {
      const it = getItem(id)
      if (it) {
        setDeckCards((prev) => [{ item: it, bucket: 'seen_likely', score: it.popularity }, ...prev.filter((c) => c.item.id !== id)])
        setRating(null)
      }
    }
  }

  // Contador de obras pendientes de descubrir en toda la estantería (§1.5)
  const remainingCount = useMemo(() => {
    return items.filter((i) => i.type === shelf && !entries[i.id]).length
  }, [shelf, entries])

  const deck = deckCards.map((c) => c.item)
  const label = SHELF_LABEL[shelf]
  const blocked = !!rating || !!deckNudge

  return (
    <div className="h-full flex flex-col relative bg-bg">
      <ScreenTitle
        label={`DESCUBRIR · ${label.plural.toUpperCase()}`}
        title="Descubre y guarda"
        subtitle={remainingCount > 0 ? `${remainingCount} obras por explorar` : undefined}
      />

      <div className="px-5 pb-3 shrink-0">
        <div className="flex gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Estantería">
          {SHELVES.map((s) => (
            <Chip key={s} active={s === shelf} onClick={() => setShelf(s)}>
              {SHELF_LABEL[s].plural}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 px-5 relative">
        {deckNudge ? (
          <div className="h-full flex items-center justify-center">
            <NudgeCard
              variant="card"
              nudge={deckNudge}
              onAction={() => {
                track('nudge_tap', { itemId: deckNudge.id, data: { location: 'deck' } })
                if (deckNudge.actionType === 'login') nav('/perfil')
                else if (deckNudge.targetRoute) nav(deckNudge.targetRoute)
                else if (deckNudge.actionType === 'invite') nav('/perfil')
                setDeckNudge(null)
              }}
              onDismiss={() => {
                track('nudge_dismiss', { itemId: deckNudge.id, data: { location: 'deck' } })
                dismissNudge(deckNudge.id)
                setDeckNudge(null)
              }}
            />
          </div>
        ) : deck.length > 0 ? (
          <SwipeDeck
            ref={deckRef}
            deck={deck}
            shelf={shelf}
            onSwipe={onSwipe}
            onOpen={(it) => {
              track('deck_open', { shelf, itemId: it.id, sid: sessionSid.current })
              nav(`/i/${encodeURIComponent(it.id)}`)
            }}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-5 gap-3">
            <h2 className="text-title text-ink font-medium">¡Has repasado todo {label.plural.toLowerCase()}!</h2>
            <p className="text-mute text-body">Ya no quedan más en esta estantería de la demo.</p>
            <div className="mt-2">
              <Button variant="primary" onClick={() => nav('/comparar')}>
                Ordenar con Comparar
              </Button>
            </div>
            <div className="flex gap-2 mt-3">
              {SHELVES.filter((s) => s !== shelf).map((s) => (
                <Chip key={s} onClick={() => setShelf(s)}>
                  {SHELF_LABEL[s].plural}
                </Chip>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 px-5 pt-2 pb-4">
        <div className="flex items-center justify-center gap-5">
          <button
            onClick={undo}
            disabled={!hasHistory || blocked}
            aria-label="Deshacer"
            title="Deshacer"
            className="w-11 h-11 rounded-full bg-accent text-accent-ink flex items-center justify-center disabled:bg-surface disabled:text-mute disabled:opacity-40 active:scale-90 transition-transform"
          >
            <Icon name="rotateCcw" size={19} strokeWidth={2.4} />
          </button>
          <ActionBtn
            label="No me interesa"
            color="#ef4b4b"
            size={56}
            disabled={!deck.length || blocked}
            onClick={() => deckRef.current?.fling('left')}
          >
            <Icon name="x" size={24} strokeWidth={2.4} />
          </ActionBtn>
          <ActionBtn
            label={`Pendiente: no ${label.pronoun} he ${label.seenPastPart}, me interesa`}
            color="#5b9cf5"
            size={48}
            disabled={!deck.length || blocked}
            onClick={() => deckRef.current?.fling('up')}
          >
            <Icon name="bookmark" size={20} strokeWidth={2.2} />
          </ActionBtn>
          <ActionBtn
            label={`${label.stamp.replace(/[¡!]/g, '')}: ${label.pronoun} he ${label.seenPastPart}`}
            color="#3ec878"
            size={56}
            disabled={!deck.length || blocked}
            onClick={() => deckRef.current?.fling('right')}
          >
            <Icon name="check" size={24} strokeWidth={2.6} />
          </ActionBtn>
          <span className="w-11" aria-hidden />
        </div>
      </div>

      {rating && <RatingFlow key={rating} itemId={rating} withStars onDone={(m) => { setRating(null); if (m) setToast(m) }} />}
      <AnimatePresence>{toast && <Toast key={toast} message={toast} ms={1500} onDone={() => setToast(null)} />}</AnimatePresence>
    </div>
  )
}

/** Botón de gesto sobrio, circular con borde line. */
function ActionBtn({
  label,
  color,
  size,
  disabled,
  onClick,
  children,
}: {
  label: string
  color: string
  size: number
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-full flex items-center justify-center bg-surface border border-line disabled:opacity-25 active:scale-90 transition-transform duration-150"
      style={{ width: size, height: size, color }}
    >
      {children}
    </button>
  )
}
