import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform, type TargetAndTransition, type Transition, type Variants } from 'framer-motion'
import {
  friends as seedFriends,
  getItem,
  itemsOfType,
  nextCards,
  newDeckSessionState,
  affinity,
  friendRanks,
  ACTIVE_SHELVES,
  SHELF_LABEL,
  type DeckCard,
  type DeckSessionState,
  type Friend,
  type Item,
  type ShelfType,
} from '@biblioteca/core'
import { posterShape } from '@biblioteca/core/src/lib/posterShape'
import { ensureShelfCatalog, ensureShelfEngine, useSongsLoaded } from '../data/loadData'
import { useMyShelves } from '../lib/myShelves'
import { useCatalog } from '../store/useCatalog'
import { useStore } from '../store/useStore'
import { useFriends } from '../store/useFriends'
import { track, useEvents } from '../store/useEvents'
import { useRanks } from '../store/useScores'
import { useShortcuts } from '../lib/useShortcuts'
import { RatingFlow } from '../components/RatingFlow'
import { Poster } from '../components/Poster'
import { Icon } from '../components/Icon'
import { isShelf, titleOf, useViewportH, useViewportW } from './data'

type Dir = 'left' | 'right' | 'up'

/**
 * Descubrir en arco (escritorio). La carta actual grande en el centro; la que acabas de pasar, pequeña e inclinada a la
 * izquierda; la que viene, a la derecha. Tres gestos: ← no me interesa, → vista, ↑ pendiente (botones, teclado o
 * arrastre), Z deshace. La carta sale hacia su lado y el arco corre una posición.
 *
 * El mazo es el de verdad, con la misma lógica que `screens/Discover.tsx` (copiada aquí para no tocar la app móvil):
 * `nextCards` con el mismo contexto, lotes de 20 que se reponen al quedar 8, contadores de adaptación de la sesión,
 * `swipe` del store, eventos `deck_shown` / `deck_swipe` y valoración con estrellas tras «vista» (si está activada).
 */
export function DiscoverArc() {
  const { shelf: raw } = useParams<{ shelf: string }>()
  const order = useMyShelves()
  if (!isShelf(raw)) {
    let s: ShelfType | null = null
    try {
      const v = sessionStorage.getItem('discover-shelf')
      if (v && (ACTIVE_SHELVES as readonly string[]).includes(v) && order.includes(v as ShelfType)) s = v as ShelfType
    } catch {
      /* sin almacenamiento */
    }
    return <Navigate to={`/nuevo/descubrir/${s ?? order[0] ?? 'movie'}`} replace />
  }
  return <Arc key={raw} shelf={raw} />
}

/** última acción (para elegir de dónde entra la carta nueva) */
type Last = 'swipe' | 'undo' | 'init'

function Arc({ shelf }: { shelf: ShelfType }) {
  const nav = useNavigate()
  const reduce = useReducedMotion()
  const vh = useViewportH()
  const vw = useViewportW()
  const order = useMyShelves()
  const label = SHELF_LABEL[shelf]

  useEffect(() => {
    try {
      sessionStorage.setItem('discover-shelf', shelf)
    } catch {
      /* ok */
    }
    void ensureShelfEngine(shelf)
    void ensureShelfCatalog(shelf)
  }, [shelf])

  // ── el mazo de verdad (como Discover.tsx) ─────────────────────────────────────────────────────
  const entries = useStore((s) => s.entries)
  const profile = useStore((s) => s.profile)
  const rankings = useStore((s) => s.rankings)
  const shelfUserVec = useStore((s) => s.userVectors?.[shelf])
  const catalogVersion = useCatalog((s) => s.version)
  const ranks = useRanks()
  const swipe = useStore((s) => s.swipe)
  const settings = useStore((s) => s.settings)
  const undoSwipe = useStore((s) => s.undoSwipe)
  const realFriends = useFriends((s) => s.realFriends)
  const activeFriends = realFriends.length > 0 ? realFriends : seedFriends
  const songsLoaded = useSongsLoaded()

  const newSession = useEvents((s) => s.newSession)
  const sessionSid = useRef(newSession('deck'))
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
    [activeFriends, ranks],
  )

  const [deck, setDeck] = useState<DeckCard[]>([])
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
          userVec: shelfUserVec,
        },
        Array.from(existingIds),
        count,
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shelf, entries, rankings, profile, activeFriends, getAffinity, getFriendPct, shelfUserVec, songsLoaded, catalogVersion],
  )
  const fetchRef = useRef(fetchBatch)
  fetchRef.current = fetchBatch
  const shelfReady = shelf !== 'song' || songsLoaded

  useEffect(() => {
    sessionSid.current = newSession('deck')
    cardShownAt.current = Date.now()
    swipeCount.current = 0
    shownIds.current.clear()
    sessionStateRef.current = newDeckSessionState()
    if (!shelfReady) {
      setDeck([])
      return
    }
    const first = fetchRef.current(shownIds.current)
    first.forEach((c) => shownIds.current.add(c.item.id))
    setDeck(first)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shelf, shelfReady])

  const restock = (remaining: number) => {
    if (remaining > 8 || !shelfReady) return
    const more = fetchRef.current(shownIds.current, 20)
    if (!more.length) return
    more.forEach((c) => shownIds.current.add(c.item.id))
    setDeck((prev) => [...prev, ...more])
  }

  const top = deck[0]
  useEffect(() => {
    if (top?.item) {
      track('deck_shown', { shelf, itemId: top.item.id, sid: sessionSid.current, data: { pos: shownIds.current.size, bucket: top.bucket, score: top.score } })
    }
  }, [top?.item.id, top?.bucket, top?.score, shelf])

  // ── el arco ───────────────────────────────────────────────────────────────────────────────────
  /** las que has pasado en esta sesión del arco (la última va a la izquierda); Z solo deshace estas */
  const [passed, setPassed] = useState<{ id: string; dir: Dir }[]>([])
  const [leaving, setLeaving] = useState<{ id: string; dir: Dir } | null>(null)
  const [exitDir, setExitDir] = useState<Dir>('right')
  const [rating, setRating] = useState<string | null>(null)
  const last = useRef<Last>('init')
  const busy = useRef(false)
  const timer = useRef<number | null>(null)
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  const doSwipe = (item: Item, dir: Dir) => {
    const ms = Math.max(100, Date.now() - cardShownAt.current)
    cardShownAt.current = Date.now()
    swipeCount.current += 1
    track('deck_swipe', { shelf, itemId: item.id, sid: sessionSid.current, data: { pos: swipeCount.current, bucket: top?.bucket ?? 'seen_likely', dir, ms } })

    // adaptación de la sesión (§7.6), igual que Discover
    const decade = `${Math.floor(item.year / 10) * 10}s`
    const macro = item.genres?.[0] || 'General'
    const dStat = (sessionStateRef.current.countsByDecade[decade] ??= { seen: 0, up: 0, left: 0, shown: 0 })
    const mStat = (sessionStateRef.current.countsByMacro[macro] ??= { seen: 0, up: 0, left: 0, shown: 0 })
    dStat.shown++
    mStat.shown++
    if (dir === 'right') { dStat.seen++; mStat.seen++ }
    else if (dir === 'up') { dStat.up++; mStat.up++ }
    else { dStat.left++; mStat.left++ }

    last.current = 'swipe'
    setExitDir(dir)
    const remaining = deck.filter((c) => c.item.id !== item.id)
    setDeck(remaining)
    restock(remaining.length)
    swipe(item.id, dir)
    setPassed((p) => [...p, { id: item.id, dir }].slice(-20))
    setLeaving(null)
    if (dir === 'right' && settings.rateOnSwipe !== false) setRating(item.id)
    busy.current = false
  }

  /** con botón o teclado: el sello sale un instante y luego la carta se va hacia su lado */
  const act = (dir: Dir, fromDrag = false) => {
    if (busy.current || !top || rating) return
    busy.current = true
    setExitDir(dir)
    if (fromDrag || reduce) return doSwipe(top.item, dir)
    setLeaving({ id: top.item.id, dir })
    const item = top.item
    timer.current = window.setTimeout(() => doSwipe(item, dir), 230)
  }

  const lastPassed = passed[passed.length - 1]
  const hist = useStore.getState().history
  const canUndo = !!lastPassed && hist[hist.length - 1]?.itemId === lastPassed.id
  const undo = () => {
    if (busy.current || !canUndo) return
    const id = undoSwipe()
    if (!id) return
    const it = getItem(id)
    last.current = 'undo'
    setPassed((p) => p.slice(0, -1))
    setRating(null)
    if (it) setDeck((prev) => [{ item: it, bucket: 'seen_likely', score: it.popularity }, ...prev.filter((c) => c.item.id !== id)])
  }

  useShortcuts({ arrowleft: () => act('left'), arrowright: () => act('right'), arrowup: () => act('up'), z: undo }, !rating)

  // ── tamaños ── la del centro, como mucho el 62 % del alto bajo la barra superior ─────────────────
  const ratio = posterShape(shelf) === 'square' ? 1 : 2 / 3
  const availH = vh - 64
  const stageTop = 64 + 84
  const stageBottom = 150
  const stageH = Math.max(300, vh - stageTop - stageBottom)
  const cardH = Math.round(Math.min(availH * 0.62, stageH - 24, 640))
  const cardW = Math.round(cardH * ratio)
  const SIDE = 0.64
  const sideX = Math.round(cardW / 2 + (cardW * SIDE) / 2 + Math.max(40, cardW * 0.14))
  const sideY = Math.round(cardH * 0.09)
  const slot = {
    prev: { x: -sideX, y: sideY, rotate: -9, scale: SIDE, opacity: 0.6 },
    cur: { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 },
    next: { x: sideX, y: sideY, rotate: 9, scale: SIDE, opacity: 0.6 },
    far: { x: sideX + cardW * 0.7, y: sideY * 2.2, rotate: 16, scale: SIDE * 0.8, opacity: 0 },
    farL: { x: -sideX - cardW * 0.7, y: sideY * 2.2, rotate: -16, scale: SIDE * 0.8, opacity: 0 },
  }
  const exits: Record<Dir, { x: number; y: number; rotate: number; opacity: number }> = {
    left: { x: -vw * 0.55, y: sideY * 2, rotate: -22, opacity: 0 },
    right: { x: vw * 0.55, y: sideY * 2, rotate: 22, opacity: 0 },
    up: { x: 0, y: -vh * 0.75, rotate: 0, opacity: 0 },
  }
  const spring = reduce ? { duration: 0.18 } : { type: 'spring' as const, stiffness: 210, damping: 26 }

  const prevItem = lastPassed ? getItem(lastPassed.id) : undefined
  const nextItem = deck[1]?.item
  const remainingCount = useMemo(() => itemsOfType(shelf).filter((i) => !entries[i.id]).length, [shelf, entries, songsLoaded])

  return (
    <section className="relative h-full w-full overflow-hidden select-none" aria-label={`Descubrir ${label.plural.toLowerCase()}`}>
      {/* cabecera */}
      <div className="absolute left-10 right-10 top-20 z-20 flex items-end justify-between gap-6">
        <div className="flex items-end gap-x-6 gap-y-1 flex-wrap" role="tablist" aria-label="Estantería">
          {order.map((s) => (
            <Link key={s} to={`/nuevo/descubrir/${s}`} role="tab" aria-selected={s === shelf} className={`display text-[30px] leading-none transition-colors ${s === shelf ? 'text-ink' : 'text-ink/35 hover:text-ink/70'}`}>
              {SHELF_LABEL[s].plural}
            </Link>
          ))}
        </div>
        <p className="text-[15px] text-ink/80 tabular-nums whitespace-nowrap">
          {remainingCount > 0 ? `${remainingCount.toLocaleString('es-ES')} por descubrir` : 'Al día'}
        </p>
      </div>

      {/* el arco */}
      {top ? (
        <div className="absolute inset-x-0" style={{ top: stageTop, height: stageH }}>
          <div className="absolute left-1/2 top-1/2" style={{ width: 0, height: 0 }}>
            <AnimatePresence initial={false} custom={last.current}>
              {prevItem && lastPassed && (
                <motion.div
                  key={`prev-${prevItem.id}`}
                  className="absolute"
                  style={{ left: -cardW / 2, top: -cardH / 2, width: cardW, height: cardH, zIndex: 1 }}
                  initial={reduce ? { ...slot.prev, opacity: 0 } : { ...slot.prev, x: slot.prev.x + 40, opacity: 0 }}
                  animate={slot.prev}
                  custom={last.current}
                  variants={{ gone: (l: Last) => (l === 'undo' ? { ...slot.cur, opacity: 0 } : slot.farL) } satisfies Variants}
                  exit="gone"
                  transition={spring}
                >
                  <button type="button" onClick={undo} disabled={!canUndo} aria-label={`Deshacer: ${titleOf(prevItem)}`} className="absolute inset-0 rounded-[16px] overflow-hidden outline-none focus-visible:ring-4 focus-visible:ring-ink/70 enabled:cursor-pointer">
                    <Poster item={prevItem} showTitle className="absolute inset-0 w-full h-full" />
                    <span className="absolute inset-0 bg-black/30" aria-hidden />
                    <PassedStamp dir={lastPassed.dir} shelf={shelf} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false} custom={exitDir}>
              {nextItem && (
                <motion.div
                  key={nextItem.id}
                  className="absolute pointer-events-none"
                  style={{ left: -cardW / 2, top: -cardH / 2, width: cardW, height: cardH, zIndex: 2 }}
                  initial={last.current === 'undo' ? slot.cur : slot.far}
                  animate={slot.next}
                  exit={{ ...slot.far, transition: { duration: 0.15 } }}
                  transition={spring}
                  aria-hidden
                >
                  <div className="absolute inset-0 rounded-[16px] overflow-hidden">
                    <Poster item={nextItem} showTitle className="absolute inset-0 w-full h-full" />
                    <span className="absolute inset-0 bg-black/30" />
                  </div>
                </motion.div>
              )}
              <CenterCard
                key={top.item.id}
                item={top.item}
                w={cardW}
                h={cardH}
                initial={last.current === 'undo' ? slot.prev : slot.next}
                animate={slot.cur}
                exits={reduce ? null : exits}
                transition={spring}
                leaving={leaving && leaving.id === top.item.id ? leaving.dir : null}
                shelf={shelf}
                onAct={(d) => act(d, true)}
                onOpen={() => nav(`/i/${encodeURIComponent(top.item.id)}`)}
                reduce={!!reduce}
              />
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="max-w-[560px] text-center">
            <h2 className="display text-[72px] leading-[0.88] text-ink">{shelfReady ? `Has repasado ${label.plural.toLowerCase()}` : 'Cargando…'}</h2>
            {shelfReady && <p className="text-[17px] text-ink/80 mt-4">Ya no quedan más en esta estantería. Ordena lo que has visto con duelos.</p>}
            {shelfReady && (
              <div className="mt-8 flex justify-center">
                <Link to={`/nuevo/duelos/${shelf}`} className="h-12 px-6 rounded-full bg-accent text-accent-ink font-semibold flex items-center">Ordenar con duelos</Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* los tres gestos */}
      <div className="absolute inset-x-0 bottom-8 z-30 flex flex-col items-center gap-3">
        <div className="flex items-center gap-4">
          <button type="button" onClick={undo} disabled={!canUndo} className="h-12 pl-4 pr-5 rounded-full bg-surface2 text-ink font-semibold flex items-center gap-2 disabled:opacity-35 hover:bg-line transition-colors">
            <Icon name="rotateCcw" size={17} strokeWidth={2.4} /> Deshacer <kbd className="text-mute font-normal">Z</kbd>
          </button>
          <GestureBtn onClick={() => act('left')} disabled={!top || !!rating} kbd="←" tone="var(--color-stamp-red)" icon="x" label="No me interesa" />
          <GestureBtn onClick={() => act('up')} disabled={!top || !!rating} kbd="↑" tone="var(--color-ink)" icon="bookmark" label="Pendiente" />
          <GestureBtn onClick={() => act('right')} disabled={!top || !!rating} kbd="→" tone="var(--color-stamp-green)" icon="check" label={label.actionPast} primary />
        </div>
      </div>

      {rating && (
        <RatingFlow key={rating} itemId={rating} withStars onDone={() => setRating(null)} />
      )}
      <span className="sr-only" aria-live="polite">{top ? `${titleOf(top.item)}, ${top.item.year}` : ''}</span>
    </section>
  )
}

function GestureBtn({ onClick, disabled, kbd, tone, icon, label, primary }: { onClick: () => void; disabled: boolean; kbd: string; tone: string; icon: 'x' | 'bookmark' | 'check'; label: string; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-14 pl-5 pr-6 rounded-full font-semibold text-[16px] flex items-center gap-2.5 disabled:opacity-30 transition-colors outline-none focus-visible:ring-4 focus-visible:ring-ink/60 ${primary ? 'bg-ink text-bg hover:bg-ink/85' : 'bg-surface2 text-ink hover:bg-line'}`}
    >
      <span style={{ color: primary ? undefined : tone }}><Icon name={icon} size={20} strokeWidth={2.6} /></span>
      {label}
      <kbd className={`font-normal ${primary ? 'text-bg/60' : 'text-mute'}`}>{kbd}</kbd>
    </button>
  )
}

const stampText = (dir: Dir, shelf: ShelfType) => (dir === 'right' ? SHELF_LABEL[shelf].stamp : dir === 'up' ? 'PENDIENTE' : 'PASO')
const stampTone = (dir: Dir) => (dir === 'right' ? 'var(--color-stamp-green)' : dir === 'up' ? 'var(--color-ink)' : 'var(--color-stamp-red)')

function PassedStamp({ dir, shelf }: { dir: Dir; shelf: ShelfType }) {
  return (
    <span className="absolute left-3 top-3 px-2.5 py-1 border-[3px] bg-bg/80 display text-[24px] leading-none -rotate-6" style={{ color: stampTone(dir), borderColor: stampTone(dir) }}>
      {stampText(dir, shelf)}
    </span>
  )
}

function CenterCard({
  item,
  w,
  h,
  initial,
  animate,
  exits,
  transition,
  leaving,
  shelf,
  onAct,
  onOpen,
  reduce,
}: {
  item: Item
  w: number
  h: number
  initial: TargetAndTransition
  animate: TargetAndTransition
  exits: Record<Dir, TargetAndTransition> | null
  transition: Transition
  leaving: Dir | null
  shelf: ShelfType
  onAct: (d: Dir) => void
  onOpen: () => void
  reduce: boolean
}) {
  const dx = useMotionValue(0)
  const dy = useMotionValue(0)
  const tilt = useTransform(dx, [-300, 300], [-10, 10])
  const dragged = useRef(false)
  const [hintDir, setHintDir] = useState<Dir | null>(null)
  const show = leaving ?? hintDir

  return (
    <motion.div
      className="absolute"
      style={{ left: -w / 2, top: -h / 2, width: w, height: h, zIndex: 3 }}
      initial={initial}
      animate={animate}
      variants={{ gone: (d: Dir) => (exits ? exits[d] : { opacity: 0 }) } as Variants}
      exit="gone"
      transition={transition}
    >
      <motion.button
        type="button"
        aria-label={`${titleOf(item)}, ${item.year}. Abrir la ficha`}
        className="absolute inset-0 rounded-[18px] overflow-hidden outline-none focus-visible:ring-4 focus-visible:ring-ink/70 cursor-grab active:cursor-grabbing"
        style={{ x: dx, y: dy, rotate: tilt, boxShadow: '0 30px 60px -24px rgb(0 0 0 / 0.75)' }}
        drag={!leaving}
        dragSnapToOrigin
        dragElastic={0.85}
        onDragStart={() => (dragged.current = true)}
        onDrag={(_, { offset: { x, y } }) => setHintDir(y < -90 && Math.abs(x) < 120 ? 'up' : x > 90 ? 'right' : x < -90 ? 'left' : null)}
        onDragEnd={(_, info) => {
          setHintDir(null)
          window.setTimeout(() => (dragged.current = false), 60)
          const { x, y } = info.offset
          if (y < -120 && Math.abs(x) < 160) onAct('up')
          else if (x > 140) onAct('right')
          else if (x < -140) onAct('left')
        }}
        onClick={() => {
          if (!dragged.current) onOpen()
        }}
      >
        <Poster item={item} showTitle={false} className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-x-0 bottom-0 pt-28 px-6 pb-6 text-left" style={{ background: 'linear-gradient(to top, rgb(10 9 8 / 0.94), rgb(10 9 8 / 0.62) 55%, transparent)' }}>
          <div className="text-[clamp(20px,1.7vw,28px)] leading-[1.1] font-semibold text-white line-clamp-2">{titleOf(item)}</div>
          <div className="text-[15px] text-white/80 mt-1 truncate">{item.year}{item.creator ? ` · ${item.creator}` : ''}</div>
        </div>
        <AnimatePresence>
          {show && (
            <motion.span
              key={show}
              aria-hidden
              className="absolute left-1/2 top-[30%] -translate-x-1/2 px-5 py-2.5 border-[5px] bg-bg/85 display text-[56px] leading-[0.9] whitespace-nowrap"
              style={{ color: stampTone(show), borderColor: stampTone(show) }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.8, rotate: -14 }}
              animate={{ opacity: 1, scale: 1, rotate: -7 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 520, damping: 22 }}
            >
              {stampText(show, shelf)}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  )
}
