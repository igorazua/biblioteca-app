import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from 'framer-motion'
import {
  getItem,
  SHELF_LABEL,
  applyDuelToRanking,
  assignSides,
  planNextDuel,
  type Item,
  type PlannedDuel,
  type ShelfType,
  type UserEntry,
} from '@biblioteca/core'
import { posterShape } from '@biblioteca/core/src/lib/posterShape'
import { useStore, starsOfEntries } from '../store/useStore'
import { useMyShelves } from '../lib/myShelves'
import { useCompareOverview } from '../lib/useCompareOverview'
import { useShortcuts } from '../lib/useShortcuts'
import { Poster } from '../components/Poster'
import { Icon } from '../components/Icon'
import { CommentSheet } from '../components/RatingFlow'
import { isShelf, titleOf, useCatalogFor, useViewportH, useViewportW } from './data'

/**
 * Carrete de duelos. Las parejas esperan en cola en profundidad; la activa está delante. Eliges con clic, ← → o
 * arrastrando una carta hacia el centro (el borde D33 se dibuja con el recorrido y pasa a verde). La ganadora sube con
 * un sello que dice cómo cambia su puesto, la pareja sale hacia ti y todo el carrete corre una posición mientras llega
 * otra pareja desde el fondo.
 *
 * Guarda el duelo igual que CompareSession: recordDuel + bumpCompared + applyDuelToRanking (con el ranking del inicio de
 * la sesión como ancla) + markPlaced + applyRanking. La pareja de delante siempre es la que planifica el motor tras el
 * último duelo; las de detrás son una vista previa (el motor depende del resultado), por eso se ven apagadas.
 */

/** Pareja en el carrete. `seq` es la identidad visual: la misma tarjeta avanza de hueco en hueco. */
interface Q {
  seq: number
  left: string
  right: string
  duel: PlannedDuel
}

interface Picked {
  seq: number
  side: 'L' | 'R'
  stamp: string
  sub: string
}

interface Snapshot {
  entries: Record<string, UserEntry>
  ranking: string[]
  queue: Q[]
  count: number
  sides: Record<string, 'L' | 'R'>
  seen: Record<string, number>
  recent: string[]
  compared: Set<string>
  duelKey: { a: string; b: string }
  lastMove: { winner: string; loser: string } | null
}

const SLOTS = 4
/** referencia estable para el selector de zustand cuando no hay ranking */
const NONE: string[] = []
/** recorrido (px) que hay que arrastrar una carta hacia el centro para elegirla */
const THRESH = 150
const DEPTH = { y: 92, z: 520 }

const samePair = (a: { left: string; right: string }, b: { left: string; right: string }) =>
  (a.left === b.left && a.right === b.right) || (a.left === b.right && a.right === b.left)

export function DuelReel() {
  const { shelf: raw } = useParams<{ shelf: string }>()
  const order = useMyShelves()
  const overview = useCompareOverview()
  if (!isShelf(raw)) {
    // sin estantería en la URL: la que más obras tenga esperando sitio, si no la primera con algo que comparar
    const best =
      [...order].filter((s) => overview.shelves[s]?.disponible).sort((a, b) => (overview.shelves[b]?.sinOrdenar ?? 0) - (overview.shelves[a]?.sinOrdenar ?? 0))[0] ??
      order[0]
    return <Navigate to={`/nuevo/duelos/${best}`} replace />
  }
  return <Reel key={raw} shelf={raw} />
}

function Reel({ shelf }: { shelf: ShelfType }) {
  const nav = useNavigate()
  const reduce = useReducedMotion()
  const vh = useViewportH()
  const vw = useViewportW()
  const order = useMyShelves()
  useCatalogFor([shelf])
  const label = SHELF_LABEL[shelf]

  const [queue, setQueue] = useState<Q[]>([])
  const [empty, setEmpty] = useState<'none' | 'complete' | 'need-more'>('none')
  const [count, setCount] = useState(0)
  const [picked, setPicked] = useState<Picked | null>(null)
  const [summary, setSummary] = useState(false)
  const [undo, setUndo] = useState<Snapshot | null>(null)
  const [lastMove, setLastMove] = useState<{ winner: string; loser: string } | null>(null)
  const [commentFor, setCommentFor] = useState<string | null>(null)

  const busy = useRef(false)
  const timers = useRef<number[]>([])
  const seqRef = useRef(0)
  const sidesRef = useRef<Record<string, 'L' | 'R'>>({})
  const seenRef = useRef<Record<string, number>>({})
  const recentRef = useRef<string[]>([])
  const comparedRef = useRef<Set<string>>(new Set())
  const startRank = useRef<string[]>([])
  const countRef = useRef(0)
  countRef.current = count

  // ── motor ─────────────────────────────────────────────────────────────────────────────────────
  /** El siguiente duelo según el estado actual del store, como CompareSession. */
  const plan = useCallback(
    (sessionIndex: number, recent: string[]): PlannedDuel | null => {
      const st = useStore.getState()
      const rk = st.rankings[shelf] ?? []
      const unranked = Object.values(st.entries)
        .filter((e) => e.status === 'seen' && (!rk.includes(e.itemId) || Boolean(e.provisional)) && (e.shelf ?? getItem(e.itemId)?.type) === shelf)
        .sort((a, b) => a.updatedAt - b.updatedAt)
        .map((e) => ({ itemId: e.itemId, stars: e.stars }))
      const cmp: Record<string, number> = {}
      for (const e of Object.values(st.entries)) if (e.cmp) cmp[e.itemId] = e.cmp
      return planNextDuel({
        shelf,
        ranking: rk,
        unranked,
        duels: st.duels[shelf] ?? {},
        cmp,
        sessionIndex,
        starsOf: starsOfEntries(st.entries),
        recent,
        anchor: startRank.current,
        ratings: st.ratings?.[shelf] ?? {},
      })
    },
    [shelf],
  )

  /** Pareja real: fija los lados (T30.3) en las refs de la sesión. */
  const realPair = (d: PlannedDuel, seq: number): Q | null => {
    if (!getItem(d.a) || !getItem(d.b)) return null
    const as = assignSides(d.a, d.b, d.subject, sidesRef.current, { ...seenRef.current })
    sidesRef.current = as.nextSides
    return { seq, left: as.left, right: as.right, duel: d }
  }

  /** Rellena la cola con vistas previas. No toca las refs de la sesión: trabaja con copias. */
  const fillPreviews = (base: Q[]): Q[] => {
    const out = [...base]
    const sides = { ...sidesRef.current }
    let tries = 0
    while (out.length < SLOTS && tries < SLOTS * 2) {
      tries++
      const recent = [...recentRef.current, ...out.flatMap((q) => [q.left, q.right])]
      const d = plan(countRef.current + out.length, recent)
      if (!d || !getItem(d.a) || !getItem(d.b)) break
      const as = assignSides(d.a, d.b, d.subject, sides, { ...seenRef.current })
      Object.assign(sides, as.nextSides)
      const q = { seq: ++seqRef.current, left: as.left, right: as.right, duel: d }
      if (out.some((o) => samePair(o, q))) continue
      out.push(q)
    }
    return out
  }

  const start = () => {
    for (const t of timers.current) window.clearTimeout(t)
    timers.current = []
    busy.current = false
    const st = useStore.getState()
    st.touchLastCompared(shelf)
    startRank.current = st.rankings[shelf] ?? []
    sidesRef.current = {}
    seenRef.current = {}
    recentRef.current = []
    comparedRef.current = new Set()
    countRef.current = 0
    setCount(0)
    setSummary(false)
    setUndo(null)
    setPicked(null)
    setLastMove(null)
    const d = plan(0, [])
    const first = d ? realPair(d, ++seqRef.current) : null
    if (!first) {
      setQueue([])
      const seen = Object.values(st.entries).filter((e) => e.status === 'seen' && (e.shelf ?? getItem(e.itemId)?.type) === shelf).length
      setEmpty(seen < 2 ? 'need-more' : 'complete')
      return
    }
    setEmpty('none')
    setQueue(fillPreviews([first]))
  }

  useEffect(() => {
    start()
    const t = timers.current
    return () => t.forEach((x) => window.clearTimeout(x))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shelf])

  const front = queue[0] ?? null

  const commit = (side: 'L' | 'R') => {
    if (busy.current || !front || summary) return
    busy.current = true
    const st = useStore.getState()
    const { left, right } = front
    const winner = side === 'L' ? left : right
    const loser = side === 'L' ? right : left
    const prevRank = st.rankings[shelf] ?? []
    const wasNew = !prevRank.includes(winner) || Boolean(st.entries[winner]?.provisional)
    const oldPos = prevRank.indexOf(winner)

    const snap: Snapshot = {
      entries: st.entries,
      ranking: prevRank,
      queue,
      count: countRef.current,
      sides: { ...sidesRef.current },
      seen: { ...seenRef.current },
      recent: [...recentRef.current],
      compared: new Set(comparedRef.current),
      duelKey: { a: left, b: right },
      lastMove,
    }

    st.recordDuel(shelf, left, right, winner)
    st.bumpCompared([left, right])
    seenRef.current[left] = (seenRef.current[left] || 0) + 1
    seenRef.current[right] = (seenRef.current[right] || 0) + 1
    recentRef.current.push(left, right)
    comparedRef.current.add(left).add(right)

    const up = useStore.getState()
    const res = applyDuelToRanking({
      ranking: prevRank,
      anchor: startRank.current,
      unranked: Object.values(up.entries)
        .filter((e) => e.status === 'seen' && (e.shelf ?? getItem(e.itemId)?.type) === shelf && (!prevRank.includes(e.itemId) || Boolean(e.provisional)))
        .map((e) => ({ itemId: e.itemId, stars: e.stars })),
      duels: up.duels[shelf] ?? {},
      lastDuel: { a: left, b: right, winner },
      ratings: up.ratings?.[shelf] ?? {},
      entries: up.entries,
      starsOf: starsOfEntries(up.entries),
    })
    for (const id of res.placed) st.markPlaced(id)
    st.applyRanking(shelf, res.ranking, res.placed[0], res.ratings)

    const newRank = useStore.getState().rankings[shelf] ?? []
    const newPos = newRank.indexOf(winner)
    let stamp = '¡Gana!'
    let sub = ''
    if (newPos >= 0) {
      if (wasNew || oldPos < 0) {
        stamp = `¡Entra #${newPos + 1}!`
        sub = 'en tu ranking'
      } else if (newPos < oldPos) {
        stamp = `¡Sube ${oldPos - newPos}!`
        sub = `#${oldPos + 1} → #${newPos + 1}`
      } else {
        stamp = `¡Se queda #${newPos + 1}!`
        sub = 'confirma su puesto'
      }
    }

    const nextCount = countRef.current + 1
    countRef.current = nextCount
    setCount(nextCount)
    setUndo(snap)
    setLastMove({ winner, loser })
    setPicked({ seq: front.seq, side, stamp, sub })

    // la pareja que viene: la que planifica el motor ahora, no la vista previa
    const d = plan(nextCount, recentRef.current)
    const rest = queue.slice(1)
    const nextFront = d ? realPair(d, rest[0]?.seq ?? ++seqRef.current) : null
    const holdMs = reduce ? 450 : 820
    const moveMs = reduce ? 200 : 560

    timers.current.push(
      window.setTimeout(() => {
        setPicked(null)
        if (!nextFront) {
          setQueue([])
          setEmpty('complete')
          busy.current = false
          return
        }
        const kept = rest.slice(1).filter((q) => !samePair(q, nextFront))
        setQueue(fillPreviews([nextFront, ...kept]))
        timers.current.push(window.setTimeout(() => (busy.current = false), moveMs))
      }, holdMs),
    )
  }

  const doUndo = () => {
    if (!undo || busy.current) return
    const st = useStore.getState()
    st.deleteDuel(shelf, undo.duelKey.a, undo.duelKey.b)
    useStore.setState((s) => ({ entries: undo.entries, rankings: { ...s.rankings, [shelf]: undo.ranking } }))
    sidesRef.current = undo.sides
    seenRef.current = undo.seen
    recentRef.current = undo.recent
    comparedRef.current = undo.compared
    countRef.current = undo.count
    setCount(undo.count)
    setQueue(undo.queue)
    setEmpty('none')
    setPicked(null)
    setSummary(false)
    setLastMove(undo.lastMove)
    setUndo(null)
  }

  const finish = () => {
    if (busy.current && picked) return
    if (count > 0) setSummary(true)
    else nav('/nuevo')
  }

  useShortcuts(
    {
      arrowleft: () => commit('L'),
      arrowright: () => commit('R'),
      z: doUndo,
      c: () => lastMove && setCommentFor(lastMove.winner),
      escape: finish,
    },
    !summary && !commentFor,
  )
  useShortcuts({ escape: () => nav('/nuevo') }, summary)

  // ── tamaño de las cartas ────────────────────────────────────────────────────────────────────────
  const square = posterShape(shelf) === 'square'
  // la pareja cabe entre la cabecera (izquierda) y el ranking (derecha): ~360 px a cada lado
  const ratio = square ? 1 : 2 / 3
  const maxW = Math.max(200, (vw - 2 * 370) / 2.22)
  const cardH = Math.round(Math.min(620, Math.max(280, vh * 0.56), maxW / ratio))
  const cardW = Math.round(cardH * ratio)

  if (summary) return <Summary shelf={shelf} startRank={startRank.current} compared={comparedRef.current} count={count} onMore={start} />

  return (
    <section className="relative h-full w-full overflow-hidden select-none" aria-label={`Duelos de ${label.plural.toLowerCase()}`}>
      {/* cabecera: la pregunta y la estantería */}
      <div className="absolute left-10 top-24 z-20 w-[320px]">
        <h1 className="display text-[clamp(56px,4.6vw,96px)] leading-[0.84] text-ink">¿Cuál te gustó más?</h1>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1" role="tablist" aria-label="Estantería">
          {order.map((s) => (
            <Link
              key={s}
              to={`/nuevo/duelos/${s}`}
              role="tab"
              aria-selected={s === shelf}
              className={`display text-[26px] leading-none transition-colors ${s === shelf ? 'text-ink' : 'text-ink/35 hover:text-ink/70'}`}
            >
              {SHELF_LABEL[s].plural}
            </Link>
          ))}
        </div>
      </div>

      {/* escenario con profundidad */}
      <div className="absolute inset-0" style={{ perspective: 1700, perspectiveOrigin: '50% 8%' }}>
        <AnimatePresence initial={false}>
          {queue.map((q, k) => (
            <PairSlot
              key={q.seq}
              q={q}
              k={k}
              w={cardW}
              h={cardH}
              picked={picked && picked.seq === q.seq ? picked : null}
              onCommit={commit}
              reduce={!!reduce}
            />
          ))}
        </AnimatePresence>
      </div>

      {empty !== 'none' && <EmptyState kind={empty} shelf={shelf} />}

      {/* tu ranking en directo */}
      <RankRail shelf={shelf} move={lastMove} />

      {/* pie: deshacer, comentar, terminar */}
      <div className="absolute left-10 bottom-8 z-30 flex items-center gap-3">
        <button
          type="button"
          onClick={doUndo}
          disabled={!undo}
          className="h-12 pl-4 pr-5 rounded-full bg-surface2 text-ink font-semibold flex items-center gap-2 disabled:opacity-35 hover:bg-line transition-colors"
        >
          <Icon name="rotateCcw" size={17} strokeWidth={2.4} /> Deshacer <kbd className="text-mute font-normal">Z</kbd>
        </button>
        {lastMove && (
          <button
            type="button"
            onClick={() => setCommentFor(lastMove.winner)}
            className="h-12 px-5 rounded-full bg-surface2 text-ink font-semibold flex items-center gap-2 hover:bg-line transition-colors"
          >
            Comentar la ganadora <kbd className="text-mute font-normal">C</kbd>
          </button>
        )}
        {count > 0 && (
          <button type="button" onClick={finish} className="h-12 px-5 rounded-full bg-ink text-bg font-semibold hover:bg-ink/85 transition-colors">
            Terminar · {count} {count === 1 ? 'duelo' : 'duelos'}
          </button>
        )}
      </div>
      {front && (
        <p className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap text-[14px] text-ink/70 pointer-events-none">
          Clic, <kbd className="font-semibold text-ink">←</kbd> <kbd className="font-semibold text-ink">→</kbd> o arrastra hacia el centro · Esc para terminar
        </p>
      )}

      {commentFor && <CommentSheet itemId={commentFor} onClose={() => setCommentFor(null)} />}
      <span className="sr-only" aria-live="polite">{picked ? `${picked.stamp} ${picked.sub}` : front ? `${titleOf(getItem(front.left)!)} contra ${titleOf(getItem(front.right)!)}` : ''}</span>
    </section>
  )
}

// ── Una pareja del carrete ─────────────────────────────────────────────────────────────────────────
function PairSlot({ q, k, w, h, picked, onCommit, reduce }: { q: Q; k: number; w: number; h: number; picked: Picked | null; onCommit: (s: 'L' | 'R') => void; reduce: boolean }) {
  const slot = (i: number) =>
    reduce
      ? { opacity: i === 0 ? 1 : 0, y: 0, z: 0 }
      : { opacity: i === 0 ? 1 : Math.max(0, 0.62 - (i - 1) * 0.2), y: -i * DEPTH.y, z: -i * DEPTH.z }
  const active = k === 0
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      style={{ zIndex: 10 - k, pointerEvents: active ? 'auto' : 'none', paddingTop: 40 }}
      initial={slot(SLOTS)}
      animate={slot(k)}
      exit={reduce ? { opacity: 0 } : { opacity: 0, z: 320, y: 40, transition: { duration: 0.42, ease: [0.4, 0, 0.6, 1] } }}
      transition={{ type: 'spring', stiffness: 170, damping: 24, mass: 1 }}
      aria-hidden={!active}
    >
      <div className="flex items-center" style={{ gap: Math.round(w * 0.22) }}>
        <DuelCard id={q.left} side="L" w={w} h={h} active={active} picked={picked} onCommit={onCommit} reduce={reduce} />
        <DuelCard id={q.right} side="R" w={w} h={h} active={active} picked={picked} onCommit={onCommit} reduce={reduce} />
      </div>
    </motion.div>
  )
}

const RIM_R = 14
const rimPath = (w: number, h: number) => {
  const r = RIM_R
  const i = 1.5
  return `M ${w / 2} ${i} H ${w - r} A ${r - i} ${r - i} 0 0 1 ${w - i} ${r} V ${h - r} A ${r - i} ${r - i} 0 0 1 ${w - r} ${h - i} H ${r} A ${r - i} ${r - i} 0 0 1 ${i} ${h - r} V ${r} A ${r - i} ${r - i} 0 0 1 ${r} ${i} Z`
}

function DuelCard({ id, side, w, h, active, picked, onCommit, reduce }: { id: string; side: 'L' | 'R'; w: number; h: number; active: boolean; picked: Picked | null; onCommit: (s: 'L' | 'R') => void; reduce: boolean }) {
  const item = getItem(id) as Item | undefined
  const dir = side === 'L' ? 1 : -1
  const x = useMotionValue(0)
  const prog = useTransform(x, (v) => Math.max(0, Math.min(1, (v * dir) / THRESH)))
  const rotate = useTransform(x, [-320, 320], [-7, 7])
  const done = useMotionValue(0)
  // un arrastre que no llega al umbral no debe contar como clic al soltar
  const dragged = useRef(false)
  const won = picked?.side === side
  const lost = !!picked && !won

  useEffect(() => {
    if (won) animate(done, 1, { duration: reduce ? 0 : 0.16 })
    else done.set(0)
  }, [won, done, reduce])

  const len = useTransform([prog, done] as MotionValue<number>[], ([a, b]: number[]) => Math.max(a, b))
  const greenOp = done
  const color = side === 'L' ? 'var(--color-duel-a)' : 'var(--color-duel-b)'
  if (!item) return <div style={{ width: w, height: h }} className="skeleton" />

  return (
    <motion.button
      type="button"
      tabIndex={active ? 0 : -1}
      aria-label={`Elegir ${titleOf(item)}`}
      disabled={!active || !!picked}
      className="relative outline-none rounded-[14px] focus-visible:ring-4 focus-visible:ring-ink/60 cursor-pointer disabled:cursor-default"
      style={{ width: w, height: h, x, rotate, touchAction: 'pan-y' }}
      drag={active && !picked ? 'x' : false}
      dragSnapToOrigin
      dragElastic={0.9}
      onTapStart={() => (dragged.current = false)}
      onDragStart={() => (dragged.current = true)}
      onDragEnd={() => {
        if (prog.get() >= 1) onCommit(side)
      }}
      onTap={() => !dragged.current && active && !picked && onCommit(side)}
      whileHover={active && !picked && !reduce ? { y: -8, scale: 1.015 } : undefined}
      animate={
        won
          ? { y: reduce ? 0 : -46, scale: reduce ? 1 : 1.06 }
          : lost
          ? { y: reduce ? 0 : 60, scale: 0.94, opacity: 0.3 }
          : { y: 0, scale: 1, opacity: 1 }
      }
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
      <div className="absolute inset-0 rounded-[14px] overflow-hidden bg-surface">
        <AnimatePresence initial={false}>
          <motion.div key={id} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <Poster item={item} showTitle={false} className="absolute inset-0 w-full h-full" />
          </motion.div>
        </AnimatePresence>
        {/* velo neutro para leer el título sobre el póster */}
        <motion.div
          className="absolute inset-x-0 bottom-0 pt-24 px-5 pb-5 text-left"
          style={{ background: 'linear-gradient(to top, rgb(10 9 8 / 0.92), rgb(10 9 8 / 0.6) 55%, transparent)' }}
          animate={{ opacity: active ? 1 : 0 }}
        >
          <div className="text-[22px] leading-[1.12] font-semibold text-white line-clamp-2">{titleOf(item)}</div>
          <div className="text-[14px] text-white/80 mt-1 truncate">{item.year} · {item.creator}</div>
        </motion.div>
      </div>
      {/* borde D33: se dibuja con el arrastre, al elegir se completa en verde */}
      <svg aria-hidden className="absolute inset-0 pointer-events-none overflow-visible" width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
        <motion.path d={rimPath(w, h)} pathLength={1} stroke={color} strokeWidth={4} strokeLinejoin="round" style={{ pathLength: len }} />
        <motion.path d={rimPath(w, h)} pathLength={1} stroke="var(--color-stamp-green)" strokeWidth={5} strokeLinejoin="round" style={{ opacity: greenOp }} />
      </svg>
      {/* letra del lado */}
      {active && !picked && (
        <span className="absolute -top-9 display text-[22px] leading-none" style={{ color, [side === 'L' ? 'left' : 'right']: 0 }} aria-hidden>
          {side === 'L' ? '← Izquierda' : 'Derecha →'}
        </span>
      )}
      {/* sello */}
      <AnimatePresence>
        {won && picked && (
          <motion.div
            className="absolute left-1/2 top-[30%] -translate-x-1/2 z-10 pointer-events-none"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.9, rotate: -14 }}
            animate={{ opacity: 1, scale: 1, rotate: -7 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 20 }}
          >
            <div className="px-5 py-3 border-[5px] border-stamp-green bg-bg/85 text-center whitespace-nowrap">
              <div className="display text-[54px] leading-[0.9] text-stamp-green">{picked.stamp}</div>
              {picked.sub && <div className="text-[15px] font-semibold text-ink mt-1 tabular-nums">{picked.sub}</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// ── Tu ranking en directo, a la derecha ────────────────────────────────────────────────────────────
function RankRail({ shelf, move }: { shelf: ShelfType; move: { winner: string; loser: string } | null }) {
  const ranking = useStore((s) => s.rankings[shelf] ?? NONE)
  const reduce = useReducedMotion()
  const rows = useMemo(() => {
    const keep = new Set<number>()
    for (let i = 0; i < Math.min(5, ranking.length); i++) keep.add(i)
    const near = (id: string | undefined, span: number) => {
      const p = id ? ranking.indexOf(id) : -1
      if (p < 0) return
      for (let i = Math.max(0, p - span); i <= Math.min(ranking.length - 1, p + span); i++) keep.add(i)
    }
    near(move?.winner, 2)
    near(move?.loser, 1)
    const idx = [...keep].sort((a, b) => a - b)
    const out: ({ gap: true; key: string } | { gap: false; id: string; pos: number })[] = []
    idx.forEach((i, n) => {
      if (n > 0 && i - idx[n - 1] > 1) out.push({ gap: true, key: `gap-${idx[n - 1]}` })
      out.push({ gap: false, id: ranking[i], pos: i + 1 })
    })
    return out
  }, [ranking, move])

  if (!ranking.length) return null
  return (
    <aside className="absolute right-10 top-24 bottom-8 z-20 w-[300px] hidden xl:flex flex-col" aria-label="Tu ranking">
      <h2 className="text-[17px] font-semibold text-ink">Tu ranking · {ranking.length}</h2>
      <ol className="mt-4 flex flex-col">
        <AnimatePresence initial={false}>
          {rows.map((r) =>
            r.gap ? (
              <motion.li key={r.key} layout={!reduce} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-6 pl-14 text-ink/40" aria-hidden>
                ⋯
              </motion.li>
            ) : (
              <RailRow key={r.id} id={r.id} pos={r.pos} state={move?.winner === r.id ? 'up' : move?.loser === r.id ? 'down' : null} reduce={!!reduce} />
            ),
          )}
        </AnimatePresence>
      </ol>
    </aside>
  )
}

function RailRow({ id, pos, state, reduce }: { id: string; pos: number; state: 'up' | 'down' | null; reduce: boolean }) {
  const it = getItem(id)
  if (!it) return null
  return (
    <motion.li
      layout={!reduce}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className="flex items-baseline gap-3 py-1.5"
    >
      <span className={`display w-11 text-right text-[34px] leading-none ${pos === 1 ? 'text-accent' : state === 'up' ? 'text-stamp-green' : 'text-ink/55'}`}>{pos}</span>
      <span className={`min-w-0 truncate text-[15px] ${state === 'up' ? 'text-ink font-semibold' : 'text-ink/80'}`}>
        {titleOf(it)} <span className="text-mute font-normal">{it.year}</span>
      </span>
    </motion.li>
  )
}

// ── Vacío y resumen ────────────────────────────────────────────────────────────────────────────────
function EmptyState({ kind, shelf }: { kind: 'complete' | 'need-more'; shelf: ShelfType }) {
  const l = SHELF_LABEL[shelf]
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center">
      <div className="max-w-[560px] text-center">
        <h2 className="display text-[72px] leading-[0.88] text-ink">{kind === 'complete' ? 'Todo comparado' : `Faltan ${l.plural.toLowerCase()}`}</h2>
        <p className="text-[17px] text-ink/80 mt-4">
          {kind === 'complete'
            ? `Ya has enfrentado tus ${l.plural.toLowerCase()} entre sí. Cuando marques más, seguimos ordenando.`
            : `Necesitas al menos dos ${l.seen} para empezar a ordenarlas.`}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to={`/descubrir?shelf=${shelf}`} className="h-12 px-6 rounded-full bg-accent text-accent-ink font-semibold flex items-center">Descubrir {l.plural.toLowerCase()}</Link>
          <Link to={`/nuevo/estanteria/${shelf}`} className="h-12 px-6 rounded-full bg-surface2 text-ink font-semibold flex items-center">Ver el ranking</Link>
        </div>
      </div>
    </div>
  )
}

function Summary({ shelf, startRank, compared, count, onMore }: { shelf: ShelfType; startRank: string[]; compared: Set<string>; count: number; onMore: () => void }) {
  const ranking = useStore((s) => s.rankings[shelf] ?? NONE)
  const reduce = useReducedMotion()
  const l = SHELF_LABEL[shelf]
  const moves = useMemo(() => {
    const start = new Map(startRank.map((id, i) => [id, i + 1]))
    const up: { id: string; from: number; to: number }[] = []
    const down: { id: string; from: number; to: number }[] = []
    const added: { id: string; to: number }[] = []
    ranking.forEach((id, i) => {
      const to = i + 1
      const from = start.get(id)
      if (from === undefined) added.push({ id, to })
      else if (to < from) up.push({ id, from, to })
      else if (to > from && compared.has(id)) down.push({ id, from, to })
    })
    up.sort((a, b) => b.from - b.to - (a.from - a.to))
    down.sort((a, b) => b.to - b.from - (a.to - a.from))
    return { up: up.slice(0, 8), down: down.slice(0, 8), added: added.slice(0, 8) }
  }, [ranking, startRank, compared])

  const col = (title: string, rows: { id: string; from?: number; to: number }[], tone: string, sign: string) =>
    rows.length > 0 && (
      <div className="min-w-0">
        <h3 className="text-[19px] font-semibold text-ink">{title}</h3>
        <ol className="mt-4 flex flex-col gap-3">
          {rows.map((r, i) => {
            const it = getItem(r.id)
            if (!it) return null
            return (
              <motion.li
                key={r.id}
                initial={reduce ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i + 0.15, type: 'spring', stiffness: 300, damping: 26 }}
                className="flex items-center gap-4"
              >
                <Poster item={it} showTitle={false} className="w-12 h-[72px] shrink-0 object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="text-[16px] font-semibold text-ink truncate">{titleOf(it)}</div>
                  <div className="text-[14px] text-mute tabular-nums">{r.from ? `#${r.from} → #${r.to}` : `entra en el #${r.to}`}</div>
                </div>
                <span className="display text-[40px] leading-none" style={{ color: tone }}>{sign}{r.from ? Math.abs(r.from - r.to) : `#${r.to}`}</span>
              </motion.li>
            )
          })}
        </ol>
      </div>
    )

  const none = !moves.up.length && !moves.down.length && !moves.added.length
  return (
    <div className="h-full overflow-y-auto px-10 pt-28 pb-16">
      <p className="text-[17px] text-ink/80">Sesión de {l.plural.toLowerCase()} terminada</p>
      <h1 className="display text-[clamp(96px,11vw,200px)] leading-[0.8] text-ink mt-2">
        {count} {count === 1 ? 'duelo' : 'duelos'}
      </h1>
      <div className="mt-14 grid grid-cols-3 gap-12 max-w-[1500px]">
        {col('Han subido', moves.up, 'var(--color-stamp-green)', '+')}
        {col('Han entrado', moves.added, 'var(--color-accent)', '')}
        {col('Han bajado', moves.down, 'var(--color-stamp-red)', '−')}
      </div>
      {none && <p className="text-[17px] text-ink mt-4">Tu ranking se ha confirmado: no ha cambiado nada.</p>}
      <div className="mt-14 flex gap-3">
        <button type="button" onClick={onMore} className="h-13 px-7 rounded-full bg-accent text-accent-ink font-semibold text-[16px]">Seguir con {l.plural.toLowerCase()}</button>
        <Link to={`/nuevo/estanteria/${shelf}`} className="h-13 px-7 rounded-full bg-surface2 text-ink font-semibold text-[16px] flex items-center">Ver el ranking</Link>
        <Link to="/nuevo" className="h-13 px-7 rounded-full text-ink/80 hover:text-ink font-semibold text-[16px] flex items-center">Inicio</Link>
      </div>
    </div>
  )
}
