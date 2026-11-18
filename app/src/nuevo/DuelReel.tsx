import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
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
import { isShelf, titleOf, useCatalogFor, useShelfData, useViewportH, useViewportW } from './data'

/**
 * Duelos en escritorio: el mismo gesto que el abanico del móvil (DuelFan) a tamaño grande. Dos cartas ligeramente
 * inclinadas y enfrentadas, solapadas; al elegir (clic, ← →, o arrastrando en horizontal: a la derecha elige la de la
 * izquierda), la elegida viaja al centro, se endereza y se pone POR DELANTE de la otra, que se aparta y se apaga. El borde
 * D33 se dibuja con el arrastre y al confirmar pasa a verde con un pulso.
 *
 * Cola honesta: detrás solo hay un mazo boca abajo, sin caras. Nunca se enseña una pareja futura: el motor decide la
 * siguiente pareja (planNextDuel) solo después de guardar el duelo, y entonces dos cartas del mazo vienen al frente y se
 * dan la vuelta. El mazo corre una posición en cada reparto.
 *
 * Guarda el duelo igual que CompareSession: recordDuel + bumpCompared + applyDuelToRanking (con el ranking del inicio de
 * la sesión como ancla) + markPlaced + applyRanking.
 */

/** Pareja en juego. `seq` cuenta los repartos (identidad visual de la pareja y del mazo). */
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
  pair: Q
  count: number
  sides: Record<string, 'L' | 'R'>
  seen: Record<string, number>
  recent: string[]
  compared: Set<string>
  duelKey: { a: string; b: string }
  lastMove: { winner: string; loser: string } | null
}

/** referencia estable para el selector de zustand cuando no hay ranking */
const NONE: string[] = []
/** inclinación de reposo de cada carta (como DuelFan) */
const TILT = 6
/** distancia entre los centros de las dos cartas, en anchos de carta: se solapan como en el móvil */
const SPREAD = 0.83
/** cartas visibles en el mazo boca abajo */
const DECK = 6
/** escala de las cartas del mazo respecto a las de la pareja */
const DECK_SCALE = 0.36
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

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
  const data = useShelfData(shelf)
  const label = SHELF_LABEL[shelf]

  const [pair, setPair] = useState<Q | null>(null)
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
      setPair(null)
      const seen = Object.values(st.entries).filter((e) => e.status === 'seen' && (e.shelf ?? getItem(e.itemId)?.type) === shelf).length
      setEmpty(seen < 2 ? 'need-more' : 'complete')
      return
    }
    setEmpty('none')
    setPair(first)
  }

  useEffect(() => {
    start()
    const t = timers.current
    return () => t.forEach((x) => window.clearTimeout(x))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shelf])

  const front = pair

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
      pair: front,
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

    // la pareja que viene la decide el motor ahora, con el duelo ya guardado; hasta entonces el mazo no tiene caras
    const d = plan(nextCount, recentRef.current)
    const next = d ? realPair(d, ++seqRef.current) : null
    const holdMs = reduce ? 450 : 900
    const dealMs = reduce ? 250 : 750

    timers.current.push(
      window.setTimeout(() => {
        setPicked(null)
        if (!next) {
          setPair(null)
          setEmpty('complete')
          busy.current = false
          return
        }
        setPair(next)
        timers.current.push(window.setTimeout(() => (busy.current = false), dealMs))
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
    // la pareja deshecha vuelve a repartirse (nuevo seq: se da la vuelta otra vez)
    setPair({ ...undo.pair, seq: ++seqRef.current })
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

  // ── tamaños ────────────────────────────────────────────────────────────────────────────────────
  // escenario: entre la barra superior (64) y el pie (112); a lo ancho, entre la cabecera (izquierda) y el ranking (derecha)
  const square = posterShape(shelf) === 'square'
  const ratio = square ? 1 : 2 / 3
  const stageH = Math.max(420, vh - 80 - 112)
  const fanW = Math.max(420, vw - 2 * 370)
  // el abanico ocupa ~1,95 anchos de carta (dos cartas solapadas más la inclinación)
  const cardW0 = Math.min(fanW / 1.95, (Math.min(620, stageH * 0.74)) * ratio)
  const cardW = Math.round(cardW0)
  const cardH = Math.round(cardW0 / ratio)
  const cy = Math.round(stageH / 2 + cardH * 0.08)
  // el mazo asoma por encima de la pareja, pero su carta más alta nunca queda bajo la barra superior (top ≥ 72)
  const deckY = -Math.round(Math.min(cardH * 0.56, 80 + cy - 72 - (cardH * DECK_SCALE) / 2 - (DECK - 1) * 7))
  // lo que se aparta la perdedora: sin meterse bajo la cabecera ni bajo el ranking
  const outX = Math.round(Math.max(24, Math.min(cardW * 0.42, (fanW - 1.83 * cardW) / 2 + 20)))

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
        {/* cifra real, aparte del mazo: el motor no saca la pareja de esta pila */}
        {data.unranked.length > 0 && (
          <p className="mt-6 text-[15px] text-ink/80 tabular-nums">
            <span className="display text-[34px] leading-none text-ink mr-2">{data.unranked.length}</span>
            {data.unranked.length === 1 ? 'espera su sitio' : 'esperan su sitio'}
          </p>
        )}
      </div>

      {/* escenario: el mazo boca abajo detrás y la pareja delante */}
      {pair && (
        <div className="absolute inset-x-0" style={{ top: 80, height: stageH }}>
          <div className="absolute left-1/2" style={{ top: cy, width: 0, height: 0 }}>
            <Deck dealt={pair.seq} w={cardW} h={cardH} y={deckY} reduce={!!reduce} />
            <AnimatePresence initial={false} mode="wait">
              <Fan
                key={pair.seq}
                q={pair}
                w={cardW}
                h={cardH}
                deckY={deckY}
                outX={outX}
                thresh={Math.min(220, Math.max(140, vw * 0.12))}
                picked={picked && picked.seq === pair.seq ? picked : null}
                onCommit={commit}
                reduce={!!reduce}
              />
            </AnimatePresence>
          </div>
        </div>
      )}

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
          Clic, <kbd className="font-semibold text-ink">←</kbd> <kbd className="font-semibold text-ink">→</kbd> o arrastra hacia el centro · la siguiente pareja la elige el motor cuando votas · Esc para terminar
        </p>
      )}

      {commentFor && <CommentSheet itemId={commentFor} onClose={() => setCommentFor(null)} />}
      <span className="sr-only" aria-live="polite">{picked ? `${picked.stamp} ${picked.sub}` : front ? `${titleOf(getItem(front.left)!)} contra ${titleOf(getItem(front.right)!)}` : ''}</span>
    </section>
  )
}

// ── El mazo boca abajo ─────────────────────────────────────────────────────────────────────────────
/**
 * Cartas sin cara: no representan obras concretas, solo que hay más duelos. Cada carta tiene una identidad fija
 * (`dealt*2 + i`), así que en cada reparto las dos de delante desaparecen (son las que acaban de darse la vuelta) y el
 * resto corre una posición hacia delante.
 */
function Deck({ dealt, w, h, y, reduce }: { dealt: number; w: number; h: number; y: number; reduce: boolean }) {
  const base = dealt * 2
  const ids = Array.from({ length: DECK }, (_, i) => base + i)
  return (
    <div aria-hidden className="absolute" style={{ left: 0, top: 0, width: 0, height: 0 }}>
      <AnimatePresence initial={false}>
        {ids.map((id) => {
          const i = id - base
          const slot = { x: (i - (DECK - 1) / 2) * 3, y: y - i * 7, scale: DECK_SCALE * (1 - i * 0.025), opacity: 1 - i * 0.12, rotate: (i % 2 ? 1 : -1) * (1 + i * 0.4) }
          return (
            <motion.div
              key={id}
              className="absolute"
              style={{ left: -w / 2, top: -h / 2, width: w, height: h, zIndex: DECK - i }}
              initial={reduce ? { ...slot, opacity: 0 } : { ...slot, y: slot.y - 30, opacity: 0 }}
              animate={slot}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            >
              <CardBack />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

/** Dorso de carta: Taquilla, sin carátula. */
function CardBack() {
  return (
    <div className="absolute inset-0 rounded-[18px] bg-surface2 border-[3px] border-line overflow-hidden flex items-center justify-center" style={{ boxShadow: '0 18px 40px -16px rgb(0 0 0 / 0.7)' }}>
      <div className="absolute inset-3 rounded-[12px] border-2 border-ink/10" />
      <span className="display text-[64px] leading-none text-ink/15 -rotate-90 whitespace-nowrap">Biblioteca</span>
    </div>
  )
}

// ── La pareja en abanico ───────────────────────────────────────────────────────────────────────────
function Fan({
  q,
  w,
  h,
  deckY,
  outX,
  thresh,
  picked,
  onCommit,
  reduce,
}: {
  q: Q
  w: number
  h: number
  deckY: number
  outX: number
  thresh: number
  picked: Picked | null
  onCommit: (s: 'L' | 'R') => void
  reduce: boolean
}) {
  // x > 0 empuja la carta de la izquierda hacia el centro; x < 0, la de la derecha
  const x = useMotionValue(0)
  const gL = useTransform(x, (v) => clamp01(v / thresh))
  const gR = useTransform(x, (v) => clamp01(-v / thresh))
  const dragged = useRef(false)

  useEffect(() => {
    if (!picked) return
    const to = picked.side === 'L' ? thresh : -thresh
    const c = animate(x, to, reduce ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 })
    return () => c.stop()
  }, [picked, thresh, reduce, x])

  return (
    <motion.div
      className="absolute"
      style={{ left: 0, top: 0, width: 0, height: 0 }}
      onPanStart={() => {
        if (picked) return
        dragged.current = true
        x.stop()
      }}
      onPan={(_, info) => {
        if (!picked) x.set(info.offset.x)
      }}
      onPanEnd={(_, info) => {
        if (!picked) {
          const ox = info.offset.x
          if (Math.abs(ox) >= thresh || Math.abs(info.velocity.x) > 900) onCommit(ox > 0 ? 'L' : 'R')
          else animate(x, 0, { type: 'spring', stiffness: 420, damping: 32 })
        }
        window.setTimeout(() => (dragged.current = false), 60)
      }}
      exit={reduce ? { opacity: 0, transition: { duration: 0.15 } } : { opacity: 0, y: 40, transition: { duration: 0.26, ease: [0.4, 0, 0.6, 1] } }}
    >
      {/* superficie de arrastre: todo el escenario; el gesto se recoge en el contenedor (también sobre las cartas) */}
      <div className="absolute cursor-grab active:cursor-grabbing" style={{ left: -w * 1.6, top: -h * 0.62, width: w * 3.2, height: h * 1.24 }} />
      <FanCard id={q.left} side="L" w={w} h={h} deckY={deckY} outX={outX} g={gL} og={gR} picked={picked} dragged={dragged} onCommit={onCommit} reduce={reduce} />
      <FanCard id={q.right} side="R" w={w} h={h} deckY={deckY} outX={outX} g={gR} og={gL} picked={picked} dragged={dragged} onCommit={onCommit} reduce={reduce} />
    </motion.div>
  )
}

function FanCard({
  id,
  side,
  w,
  h,
  deckY,
  outX,
  g,
  og,
  picked,
  dragged,
  onCommit,
  reduce,
}: {
  id: string
  side: 'L' | 'R'
  w: number
  h: number
  deckY: number
  outX: number
  g: MotionValue<number>
  og: MotionValue<number>
  picked: Picked | null
  dragged: React.RefObject<boolean>
  onCommit: (s: 'L' | 'R') => void
  reduce: boolean
}) {
  const item = getItem(id) as Item | undefined
  const isLeft = side === 'L'
  const sign = isLeft ? -1 : 1
  const x0 = sign * (SPREAD / 2) * w
  const rot0 = isLeft ? -TILT : TILT
  const won = picked?.side === side
  const lost = !!picked && !won

  // como DuelFan: la elegida va en línea recta al centro, se endereza, sube un poco y crece algo; la otra se aparta y se apaga
  const tx = useTransform([g, og] as MotionValue<number>[], ([a, b]: number[]) => -x0 * a + sign * outX * b)
  const ty = useTransform(g, (v) => -22 * v)
  const rotate = useTransform(g, (v) => rot0 * (1 - v))
  const scale = useTransform([g, og] as MotionValue<number>[], ([a, b]: number[]) => (1 + 0.07 * a) * (1 - 0.1 * b))
  const opacity = useTransform(og, (v) => 1 - 0.72 * clamp01(v))
  const zIndex = useTransform(g, (v) => (v > 0.01 ? 4 : 2))
  const shadow = useTransform(g, (v) => `0 ${18 + 14 * v}px ${40 + 30 * v}px -14px rgba(0,0,0,${0.6 + 0.2 * v})`)

  // reparto: viene del mazo (arriba, pequeña, boca abajo) y se da la vuelta en su sitio
  const dealFrom = reduce
    ? { opacity: 0 }
    : { x: -x0, y: deckY, scale: DECK_SCALE, rotateY: 180, opacity: 1 }
  const dealTo = { x: 0, y: 0, scale: 1, rotateY: 0, opacity: 1 }

  return (
    <motion.div
      className="absolute"
      style={{ left: x0 - w / 2, top: -h / 2, width: w, height: h, transformStyle: 'preserve-3d', transformPerspective: 1400, zIndex }}
      initial={dealFrom}
      animate={dealTo}
      whileHover={!picked && !reduce ? { y: -8 } : undefined}
      transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 150, damping: 20, delay: isLeft ? 0 : 0.09 }}
    >
      <motion.button
        type="button"
        aria-label={item ? `Elegir ${titleOf(item)}` : 'Elegir'}
        disabled={!!picked}
        onClick={() => {
          if (!dragged.current && !picked) onCommit(side)
        }}
        className="absolute inset-0 outline-none rounded-[18px] focus-visible:ring-4 focus-visible:ring-ink/70 cursor-pointer disabled:cursor-default"
        style={{ x: tx, y: ty, rotate, scale, opacity, transformStyle: 'preserve-3d', boxShadow: shadow }}
      >
        {/* cara */}
        <div className="absolute inset-0 rounded-[18px] overflow-hidden bg-surface" style={{ backfaceVisibility: 'hidden' }}>
          {item ? <Poster item={item} showTitle={false} className="absolute inset-0 w-full h-full" /> : <div className="absolute inset-0 skeleton" />}
          {item && (
            <div
              className="absolute inset-x-0 bottom-0 pt-24 px-5 pb-5 text-left"
              style={{ background: 'linear-gradient(to top, rgb(10 9 8 / 0.92), rgb(10 9 8 / 0.6) 55%, transparent)' }}
            >
              <div className="text-[22px] leading-[1.12] font-semibold text-white line-clamp-2">{titleOf(item)}</div>
              <div className="text-[14px] text-white/80 mt-1 truncate">{item.year}{item.creator ? ` · ${item.creator}` : ''}</div>
            </div>
          )}
          <Rim w={w} h={h} side={side} g={g} done={won} reduce={reduce} />
        </div>
        {/* dorso: lo que se ve mientras viene del mazo */}
        <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <CardBack />
        </div>
        {/* sello de la ganadora */}
        <AnimatePresence>
          {won && picked && (
            <motion.div
              className="absolute left-1/2 top-[28%] -translate-x-1/2 z-10 pointer-events-none"
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
      {lost && <span className="sr-only">descartada</span>}
    </motion.div>
  )
}

// ── Borde D33 ──────────────────────────────────────────────────────────────────────────────────────
const RIM_R = 18
const RIM_W = 4
const metal = (v: string) => [
  { at: 0, color: `color-mix(in srgb, ${v} 50%, white)` },
  { at: 0.3, color: v },
  { at: 0.56, color: `color-mix(in srgb, ${v} 55%, black)` },
  { at: 0.8, color: v },
  { at: 1, color: `color-mix(in srgb, ${v} 50%, white)` },
]

/**
 * El borde empieza arriba en el centro y baja primero por el lado que mira al centro de la mesa (en espejo, como
 * DuelFan). Se dibuja con el arrastre; al confirmar se completa, pasa a verde y da un pulso de grosor.
 */
function Rim({ w, h, side, g, done, reduce }: { w: number; h: number; side: 'L' | 'R'; g: MotionValue<number>; done: boolean; reduce: boolean }) {
  const uid = useId().replace(/:/g, '')
  const isLeft = side === 'L'
  const i = RIM_W / 2
  const r = RIM_R - i
  const x0 = i, y0 = i, x1 = w - i, y1 = h - i, mx = w / 2
  const d = isLeft
    ? `M ${mx} ${y0} L ${x1 - r} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y0 + r} L ${x1} ${y1 - r} A ${r} ${r} 0 0 1 ${x1 - r} ${y1} L ${x0 + r} ${y1} A ${r} ${r} 0 0 1 ${x0} ${y1 - r} L ${x0} ${y0 + r} A ${r} ${r} 0 0 1 ${x0 + r} ${y0} L ${mx} ${y0}`
    : `M ${mx} ${y0} L ${x0 + r} ${y0} A ${r} ${r} 0 0 0 ${x0} ${y0 + r} L ${x0} ${y1 - r} A ${r} ${r} 0 0 0 ${x0 + r} ${y1} L ${x1 - r} ${y1} A ${r} ${r} 0 0 0 ${x1} ${y1 - r} L ${x1} ${y0 + r} A ${r} ${r} 0 0 0 ${x1 - r} ${y0} L ${mx} ${y0}`
  const fin = useMotionValue(0)
  const pulse = useMotionValue(0)
  useEffect(() => {
    if (!done) {
      fin.set(0)
      pulse.set(0)
      return
    }
    if (reduce) {
      fin.set(1)
      return
    }
    const a = animate(fin, 1, { duration: 0.14, ease: 'easeOut' })
    const b = animate(pulse, [0, 1, 0], { duration: 0.3, times: [0, 0.37, 1], ease: 'easeInOut', delay: 0.14 })
    return () => {
      a.stop()
      b.stop()
    }
  }, [done, reduce, fin, pulse])
  const len = useTransform([g, fin] as MotionValue<number>[], ([a, b]: number[]) => Math.max(a, b))
  const greenW = useTransform(pulse, (v) => RIM_W + 3 * v)
  const grad = { gradientUnits: 'userSpaceOnUse' as const, x1: isLeft ? 0 : w, y1: 0, x2: isLeft ? w : 0, y2: h }
  const stops = (list: { at: number; color: string }[]) => list.map((s) => <stop key={s.at} offset={s.at} style={{ stopColor: s.color }} />)
  return (
    <svg aria-hidden className="absolute inset-0 pointer-events-none" width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <defs>
        <linearGradient id={`rim-${uid}`} {...grad}>{stops(metal(isLeft ? 'var(--color-duel-a)' : 'var(--color-duel-b)'))}</linearGradient>
        <linearGradient id={`rim-ok-${uid}`} {...grad}>{stops(metal('var(--color-stamp-green)'))}</linearGradient>
      </defs>
      <motion.path d={d} pathLength={1} stroke={`url(#rim-${uid})`} strokeWidth={RIM_W} strokeLinejoin="round" style={{ pathLength: len }} />
      <motion.path d={d} pathLength={1} stroke={`url(#rim-ok-${uid})`} strokeLinejoin="round" style={{ opacity: fin, strokeWidth: greenW }} />
    </svg>
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
          <Link to={`/nuevo/descubrir/${shelf}`} className="h-12 px-6 rounded-full bg-accent text-accent-ink font-semibold flex items-center">Descubrir {l.plural.toLowerCase()}</Link>
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
