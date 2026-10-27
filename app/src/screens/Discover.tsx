import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { friends as seedFriends, getItem, itemsOfType } from '../data/catalog'
import { useSongsLoaded } from '../data/songs'
import { nextCards, newDeckSessionState, type DeckCard, type DeckSessionState } from '../lib/engine/deck'
import { useStore } from '../store/useStore'
import { useAuth } from '../store/useAuth'
import { useFriends } from '../store/useFriends'
import { track, useEvents } from '../store/useEvents'
import { evaluateNudges, type Nudge } from '../lib/nudges'
import { affinity } from '../lib/affinity'
import { friendRanks } from '../lib/rank'
import { useRanks } from '../store/useScores'
import { ACTIVE_SHELVES, SHELVES, SHELF_LABEL, type Friend, type Item, type ShelfType } from '../types'
import { SwipeDeck, type DeckHandle, type SwipeDir } from '../components/SwipeDeck'
import { RatingFlow } from '../components/RatingFlow'
import { NudgeCard } from '../components/NudgeCard'
import { Chip, Sheet, Toast } from '../components/ui'
import { Icon, type IconName } from '../components/Icon'
import { Button } from '../components/Button'
import { Poster } from '../components/Poster'

export type DiscoverVariant = 'bottom_dock' | 'hub' | 'header_sheet' | 'tabs'

const VARIANT_NAMES: Record<DiscoverVariant, { label: string; desc: string; badge: string }> = {
  bottom_dock: {
    label: 'Dock Inferior',
    desc: 'Cabecera 100% limpia para el póster; selector táctil al alcance del pulgar',
    badge: 'V1 · Ergonómico',
  },
  hub: {
    label: 'Hub de Categorías',
    desc: 'Pantalla intermedia con portadas y contadores antes de entrar al mazo',
    badge: 'V2 · Pantalla previa',
  },
  header_sheet: {
    label: 'Cabecera + Sheet',
    desc: 'Botón minimalista arriba que despliega hoja modal con las categorías',
    badge: 'V3 · Minimal',
  },
  tabs: {
    label: 'Pestañas Clásicas',
    desc: 'Barra de chips horizontal con scroll arriba (diseño original)',
    badge: 'V4 · Clásico',
  },
}

const SHELF_ICON: Record<ShelfType, IconName> = {
  movie: 'film',
  series: 'tv',
  song: 'music',
  book: 'bookOpen',
  boardgame: 'dice',
  artist: 'user',
}

const readShelf = (): ShelfType => {
  try {
    const v = sessionStorage.getItem('discover-shelf') as ShelfType
    if (v && (ACTIVE_SHELVES as readonly string[]).includes(v)) return v
  } catch {
    /* sin almacenamiento */
  }
  return ACTIVE_SHELVES[0] ?? 'movie'
}

const readVariant = (): DiscoverVariant => {
  try {
    const v = localStorage.getItem('biblio_discover_variant') as DiscoverVariant
    if (v && ['bottom_dock', 'hub', 'header_sheet', 'tabs'].includes(v)) return v
  } catch {
    /* ok */
  }
  return 'bottom_dock'
}

export function Discover() {
  const nav = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const shelfParam = searchParams.get('shelf') as ShelfType | null
  const validParamShelf =
    shelfParam && (ACTIVE_SHELVES as readonly string[]).includes(shelfParam) ? shelfParam : null

  const [shelf, setShelfState] = useState<ShelfType>(() => validParamShelf ?? readShelf())
  const [variant, setVariantState] = useState<DiscoverVariant>(readVariant)
  const [showVariantMenu, setShowVariantMenu] = useState(false)
  const [showSheetSelector, setShowSheetSelector] = useState(false)
  const [showHub, setShowHub] = useState(() => variant === 'hub' && !validParamShelf)

  const setVariant = (v: DiscoverVariant) => {
    setVariantState(v)
    try {
      localStorage.setItem('biblio_discover_variant', v)
    } catch {
      /* ok */
    }
  }

  useEffect(() => {
    if (validParamShelf && validParamShelf !== shelf) {
      setShelfState(validParamShelf)
      setShowHub(false)
      try {
        sessionStorage.setItem('discover-shelf', validParamShelf)
      } catch {
        /* ok */
      }
    }
  }, [validParamShelf, shelf])

  const setShelf = (s: ShelfType) => {
    setShelfState(s)
    try {
      sessionStorage.setItem('discover-shelf', s)
    } catch {
      /* ok */
    }
    setSearchParams({ shelf: s }, { replace: true })
  }

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

  const getAffinity = useCallback(
    (friendId: string) => {
      const f = activeFriends.find((x) => x.id === friendId)
      if (!f) return null
      const mine = Object.fromEntries(Object.entries(ranks).map(([id, r]) => [id, r.pct]))
      const theirs = Object.fromEntries(
        Object.entries(friendRanks(f, getItem)).map(([id, r]) => [id, r.pct])
      )
      return affinity(mine, theirs)
    },
    [activeFriends, ranks]
  )

  // Cola de tarjetas con batching (§7)
  const [deckCards, setDeckCards] = useState<DeckCard[]>([])
  const songsLoaded = useSongsLoaded()

  const fetchBatch = useCallback(
    (existingIds: Set<string>, count = 20) => {
      const pool = itemsOfType(shelf).filter((i) => !existingIds.has(i.id))
      return nextCards(
        {
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
        },
        Array.from(existingIds),
        count
      )
    },
    [shelf, entries, rankings, profile, activeFriends, getAffinity, getFriendPct, userVectors, songsLoaded]
  )

  const fetchBatchRef = useRef(fetchBatch)
  fetchBatchRef.current = fetchBatch
  const shelfReady = shelf !== 'song' || songsLoaded

  // Inicializar o recargar mazo al cambiar estantería
  useEffect(() => {
    sessionSid.current = newSession('deck')
    cardShownAt.current = Date.now()
    swipeCount.current = 0
    shownIds.current.clear()
    sessionStateRef.current = newDeckSessionState()
    if (!shelfReady) {
      setDeckCards([])
      return
    }
    const firstBatch = fetchBatchRef.current(shownIds.current)
    firstBatch.forEach((c) => shownIds.current.add(c.item.id))
    setDeckCards(firstBatch)
  }, [shelf, shelfReady])

  // Reabastecer mazo cuando quedan <= 8 tarjetas (§7)
  const checkRestock = useCallback(
    (remainingLength: number) => {
      if (remainingLength <= 8 && shelfReady) {
        const more = fetchBatchRef.current(shownIds.current, 20)
        if (more.length > 0) {
          more.forEach((c) => shownIds.current.add(c.item.id))
          setDeckCards((prev) => [...prev, ...more])
        }
      }
    },
    [shelfReady]
  )

  const topCard = deckCards[0]

  useEffect(() => {
    if (topCard?.item) {
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
    swipeCount.current += 1

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

    const remaining = deckCards.filter((c) => c.item.id !== item.id)
    setDeckCards(remaining)
    checkRestock(remaining.length)
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
        isStandalonePwa:
          typeof window !== 'undefined' &&
          (window.matchMedia?.('(display-mode: standalone)').matches || false),
        isMobile:
          typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
        daysOfUsage: 2,
        dismissHistory,
      })
      if (candidateNudge) {
        setDeckNudge(candidateNudge)
        track('nudge_shown', { itemId: candidateNudge.id, data: { location: 'deck' } })
      }
    }

    if (dir === 'right') {
      if (settings.rateOnSwipe === false) setToast('Guardada ✓')
      else setRating(item.id)
    } else if (dir === 'up') setToast('Guardada en pendientes ✓')
  }

  const undo = () => {
    const id = undoSwipe()
    if (id) {
      const it = getItem(id)
      if (it) {
        setDeckCards((prev) => [
          { item: it, bucket: 'seen_likely', score: it.popularity },
          ...prev.filter((c) => c.item.id !== id),
        ])
        setRating(null)
      }
    }
  }

  // Contador de obras pendientes de descubrir en toda la estantería (§1.5)
  const remainingCount = useMemo(() => {
    return itemsOfType(shelf).filter((i) => !entries[i.id]).length
  }, [shelf, entries, songsLoaded])

  const deck = deckCards.map((c) => c.item)
  const label = SHELF_LABEL[shelf]
  const blocked = !!rating || !!deckNudge

  // RENDER: Pantalla Intermedia / Hub de Exploración (V2)
  if (variant === 'hub' && showHub) {
    return (
      <div className="h-full flex flex-col scroll-y bg-bg px-5 pb-8 safe-top">
        <div className="flex items-center justify-between pt-3 pb-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
              Explorar Catálogo
            </span>
            <h1 className="text-2xl font-bold text-ink tracking-tight">¿Qué te apetece hoy?</h1>
          </div>
          <VariantSwitchButton variant={variant} onClick={() => setShowVariantMenu(true)} />
        </div>

        <p className="text-xs text-mute mb-5 leading-relaxed">
          Elige una estantería cultural para empezar una sesión de tarjetas y descubrir obras afines.
        </p>

        <div className="grid grid-cols-2 gap-3.5">
          {ACTIVE_SHELVES.map((s) => {
            const items = itemsOfType(s)
            const count = items.filter((i) => !entries[i.id]).length
            const top3 = items.slice(0, 3)
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setShelf(s)
                  setShowHub(false)
                }}
                className="rounded-3xl bg-surface border border-line p-4 flex flex-col text-left active:scale-[0.98] transition-all hover:border-line2 group shadow-xs relative overflow-hidden"
              >
                {/* Mini previsualización de portadas */}
                <div className="h-20 w-full flex items-center justify-center mb-3 relative">
                  <div className="flex -space-x-4">
                    {top3.map((it, i) => (
                      <div
                        key={it.id}
                        className="w-12 h-16 rounded-lg border border-line shadow-md overflow-hidden bg-surface2 transform transition-transform group-hover:scale-105"
                        style={{ transform: `rotate(${(i - 1) * 8}deg)` }}
                      >
                        <Poster item={it} showTitle={false} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-accent mb-0.5">
                  <Icon name={SHELF_ICON[s]} size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {SHELF_LABEL[s].singular}
                  </span>
                </div>

                <h2 className="text-base font-bold text-ink leading-tight">
                  {SHELF_LABEL[s].plural}
                </h2>

                <div className="flex items-center justify-between mt-3 text-xs text-mute font-medium">
                  <span className="tabular-nums">{count} por ver</span>
                  <span className="text-accent flex items-center font-semibold text-[11px] group-hover:translate-x-0.5 transition-transform">
                    Swipear <Icon name="chevron" size={13} />
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Modal de selección de variantes */}
        {showVariantMenu && (
          <VariantModal
            current={variant}
            onSelect={(v) => {
              setVariant(v)
              if (v !== 'hub') setShowHub(false)
              setShowVariantMenu(false)
            }}
            onClose={() => setShowVariantMenu(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col relative bg-bg">
      {/* 1. CABECERA SEGÚN LA VARIANTE DE DISEÑO SELECCIONADA */}
      {variant === 'tabs' && (
        <div className="safe-top px-5 pb-2 shrink-0">
          <div className="flex items-center justify-between pb-1.5 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-mute">
              Estantería
            </span>
            <VariantSwitchButton variant={variant} onClick={() => setShowVariantMenu(true)} />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Estantería">
            {ACTIVE_SHELVES.map((s) => (
              <Chip key={s} active={s === shelf} onClick={() => setShelf(s)}>
                {SHELF_LABEL[s].plural}
              </Chip>
            ))}
          </div>
          <div className="text-meta text-center mt-2 tabular-nums">
            {remainingCount > 0 ? `${remainingCount} ${label.plural.toLowerCase()} por descubrir` : ' '}
          </div>
        </div>
      )}

      {variant === 'bottom_dock' && (
        <div className="safe-top px-5 pt-2 pb-1 shrink-0 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
              Descubrir
            </span>
            <h1 className="text-sm font-semibold text-ink leading-tight flex items-center gap-1.5">
              {SHELF_LABEL[shelf].plural}
              <span className="text-meta text-mute font-normal tabular-nums">
                · {remainingCount > 0 ? `${remainingCount} por ver` : 'Al día'}
              </span>
            </h1>
          </div>
          <VariantSwitchButton variant={variant} onClick={() => setShowVariantMenu(true)} />
        </div>
      )}

      {variant === 'header_sheet' && (
        <div className="safe-top px-5 pt-2 pb-2 shrink-0 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowSheetSelector(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-line text-ink font-semibold text-sm active:scale-95 transition-transform shadow-xs"
          >
            <Icon name={SHELF_ICON[shelf]} size={16} className="text-accent" />
            <span>{SHELF_LABEL[shelf].plural}</span>
            <Icon name="chevron" size={13} className="rotate-90 text-mute ml-0.5" />
            <span className="text-meta text-mute font-normal ml-1 tabular-nums border-l border-line pl-2">
              {remainingCount}
            </span>
          </button>
          <VariantSwitchButton variant={variant} onClick={() => setShowVariantMenu(true)} />
        </div>
      )}

      {variant === 'hub' && (
        <div className="safe-top px-5 pt-2 pb-2 shrink-0 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowHub(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-line text-xs font-semibold text-ink active:scale-95 transition-transform shadow-xs"
          >
            <Icon name="back" size={14} />
            <span>Todas las categorías</span>
            <span className="text-meta text-mute font-normal ml-1 tabular-nums">
              ({SHELF_LABEL[shelf].plural})
            </span>
          </button>
          <VariantSwitchButton variant={variant} onClick={() => setShowVariantMenu(true)} />
        </div>
      )}

      {/* 2. ZONA CENTRAL: TARJETA DE SWIPEDECK */}
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
                Ordenar con ¡Duelos!
              </Button>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap justify-center">
              {ACTIVE_SHELVES.filter((s) => s !== shelf).map((s) => (
                <Chip key={s} onClick={() => setShelf(s)}>
                  {SHELF_LABEL[s].plural}
                </Chip>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. PARTE INFERIOR: DOCK SEGÚN VARIANTE + BOTONES DE ACCIÓN */}
      <div className="shrink-0 px-5 pt-1 pb-4">
        {/* Selector Flotante Inferior de la Variante 1 (Dock) */}
        {variant === 'bottom_dock' && (
          <div className="flex items-center justify-center mb-2.5 px-1">
            <div className="flex items-center gap-1 bg-surface/90 backdrop-blur-md p-1 rounded-full border border-line shadow-lg max-w-full overflow-x-auto no-scrollbar">
              {ACTIVE_SHELVES.map((s) => {
                const active = s === shelf
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setShelf(s)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                      active
                        ? 'bg-accent text-accent-ink shadow-xs font-semibold'
                        : 'text-mute hover:text-ink hover:bg-surface2 font-medium'
                    }`}
                  >
                    <Icon name={SHELF_ICON[s]} size={14} strokeWidth={active ? 2.4 : 1.8} />
                    <span>{SHELF_LABEL[s].plural}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={undo}
            disabled={!hasHistory || blocked}
            aria-label="Deshacer"
            title="Deshacer"
            className="w-12 h-12 rounded-full bg-accent text-accent-ink flex items-center justify-center disabled:bg-surface disabled:text-mute disabled:opacity-40 active:scale-90 transition-transform"
          >
            <Icon name="rotateCcw" size={20} strokeWidth={2.4} />
          </button>
          <ActionBtn
            label="No me interesa"
            color="#ef4b4b"
            size={68}
            disabled={!deck.length || blocked}
            onClick={() => deckRef.current?.fling('left')}
          >
            <Icon name="x" size={30} strokeWidth={2.6} />
          </ActionBtn>
          <ActionBtn
            label={`Pendiente: no ${label.pronoun} he ${label.seenPastPart}, me interesa`}
            color="#5b9cf5"
            size={56}
            disabled={!deck.length || blocked}
            onClick={() => deckRef.current?.fling('up')}
          >
            <Icon name="bookmark" size={24} strokeWidth={2.4} />
          </ActionBtn>
          <ActionBtn
            label={`${label.stamp.replace(/[¡!]/g, '')}: ${label.pronoun} he ${label.seenPastPart}`}
            color="#3ec878"
            size={68}
            disabled={!deck.length || blocked}
            onClick={() => deckRef.current?.fling('right')}
          >
            <Icon name="check" size={32} strokeWidth={2.8} />
          </ActionBtn>
          <span className="w-12" aria-hidden />
        </div>
      </div>

      {/* MODAL / SHEET: Selector de Categorías para la Variante 3 (Header Sheet) */}
      {showSheetSelector && (
        <Sheet label="Elegir estantería" onClose={() => setShowSheetSelector(false)} height="60%">
          <div className="space-y-3">
            <h3 className="text-title text-ink font-bold">Elige qué descubrir</h3>
            <div className="space-y-1.5">
              {ACTIVE_SHELVES.map((s) => {
                const isCurrent = s === shelf
                const count = itemsOfType(s).filter((i) => !entries[i.id]).length
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setShelf(s)
                      setShowSheetSelector(false)
                    }}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all active:scale-[0.99] ${
                      isCurrent
                        ? 'bg-accent/15 border-accent text-ink font-semibold'
                        : 'bg-surface border-line hover:border-line2 text-ink/90'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-surface2 flex items-center justify-center text-accent">
                        <Icon name={SHELF_ICON[s]} size={16} />
                      </span>
                      <div>
                        <div className="text-sm font-semibold">{SHELF_LABEL[s].plural}</div>
                        <div className="text-[11px] text-mute">{count} obras por descubrir</div>
                      </div>
                    </div>
                    {isCurrent && <Icon name="check" size={18} className="text-accent" strokeWidth={2.5} />}
                  </button>
                )
              })}
            </div>
          </div>
        </Sheet>
      )}

      {/* MODAL: Switcher Interactivo entre los 4 Diseños de Prueba */}
      {showVariantMenu && (
        <VariantModal
          current={variant}
          onSelect={(v) => {
            setVariant(v)
            if (v === 'hub') setShowHub(true)
            setShowVariantMenu(false)
          }}
          onClose={() => setShowVariantMenu(false)}
        />
      )}

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
      <AnimatePresence>
        {toast && <Toast key={toast} message={toast} ms={1500} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}

/** Botón indicador en cabecera para cambiar de prototipo interactivo */
function VariantSwitchButton({
  variant,
  onClick,
}: {
  variant: DiscoverVariant
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/15 border border-accent/35 text-accent text-xs font-semibold active:scale-95 transition-transform"
      title="Cambiar diseño de prueba para Explorar"
    >
      <Icon name="sparkle" size={13} />
      <span>{VARIANT_NAMES[variant].label}</span>
      <Icon name="chevron" size={11} className="rotate-90 opacity-70" />
    </button>
  )
}

/** Modal con las 4 variantes de diseño disponibles para probar */
function VariantModal({
  current,
  onSelect,
  onClose,
}: {
  current: DiscoverVariant
  onSelect: (v: DiscoverVariant) => void
  onClose: () => void
}) {
  return (
    <Sheet label="Diseño de pantalla Explorar" onClose={onClose} height="65%">
      <div className="space-y-3.5">
        <div>
          <h3 className="text-title text-ink font-bold">Prototipos de diseño</h3>
          <p className="text-xs text-mute">
            Prueba cómo se siente cada alternativa sin las categorías arriba:
          </p>
        </div>

        <div className="space-y-2">
          {(['bottom_dock', 'hub', 'header_sheet', 'tabs'] as DiscoverVariant[]).map((vKey) => {
            const isCurrent = vKey === current
            const info = VARIANT_NAMES[vKey]
            return (
              <button
                key={vKey}
                type="button"
                onClick={() => onSelect(vKey)}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all active:scale-[0.99] ${
                  isCurrent
                    ? 'bg-accent/10 border-accent text-ink shadow-xs'
                    : 'bg-surface border-line hover:border-line2 text-ink/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isCurrent ? 'bg-accent text-accent-ink' : 'bg-surface2 text-mute'
                    }`}
                  >
                    {vKey === 'bottom_dock'
                      ? 'V1'
                      : vKey === 'hub'
                      ? 'V2'
                      : vKey === 'header_sheet'
                      ? 'V3'
                      : 'V4'}
                  </span>
                  <div>
                    <div className="font-semibold text-sm text-ink flex items-center gap-2">
                      {info.label}
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isCurrent
                            ? 'bg-accent/20 text-accent'
                            : 'bg-surface2 text-mute'
                        }`}
                      >
                        {info.badge}
                      </span>
                    </div>
                    <div className="text-xs text-mute mt-0.5 leading-snug">{info.desc}</div>
                  </div>
                </div>
                {isCurrent && (
                  <Icon name="check" size={18} className="text-accent shrink-0 ml-2" strokeWidth={2.5} />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </Sheet>
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
