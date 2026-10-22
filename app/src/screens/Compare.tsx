import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { getItem } from '../data/catalog'
import { useStore, starsOfEntries } from '../store/useStore'
import { SHELVES, SHELF_LABEL, type Item, type ShelfType, type UserEntry } from '../types'
import {
  answerPlacement, answerRefine, finishPlacement, newRefineState, nextRefinePair, placementOpponent, startPlacement,
  type Placement, type RefinePair, type RefineState,
} from '../lib/ranking'
import { SwipePair, type Side } from '../components/SwipePair'
import { Poster } from '../components/Poster'
import { CommentSheet } from '../components/RatingFlow'
import { Chip, Toast } from '../components/ui'
import { Icon } from '../components/Icon'
import { ScreenTitle } from '../components/ScreenTitle'
import { Button } from '../components/Button'
import { Group, Row } from '../components/Group'

export const PAIRS_PER_SESSION = 7

type Current =
  | { kind: 'place'; p: Placement }
  | { kind: 'boot'; a: string; b: string }
  | { kind: 'refine'; pair: RefinePair }
  | { kind: 'empty' }

interface Snapshot { entries: Record<string, UserEntry>; ranking: string[]; current: Current; refine: RefineState; count: number }

const sideOf = (it: Item): Side => ({
  key: it.id,
  title: it.title,
  subtitle: `${it.year} · ${it.creator}`,
  bg: <Poster item={it} showTitle={false} className="absolute inset-0 w-full h-full" />,
})

export function Compare() {
  const nav = useNavigate()
  const [shelf, setShelf] = useState<ShelfType>(() => {
    try { const v = sessionStorage.getItem('compare-shelf') as ShelfType; if (v && (SHELVES as readonly string[]).includes(v)) return v } catch { /* ok */ }
    return 'movie'
  })
  const choose = (s: ShelfType) => { setShelf(s); try { sessionStorage.setItem('compare-shelf', s) } catch { /* ok */ } }
  const entries = useStore((s) => s.entries)
  const ranking = useStore((s) => s.rankings[shelf] ?? [])
  const settings = useStore((s) => s.settings)
  const loadSample = useStore((s) => s.loadSample)

  const pending = useMemo(
    () => Object.values(entries).filter((e) => e.status === 'seen' && (!e.ranked || e.provisional) && getItem(e.itemId)?.type === shelf).length,
    [entries, shelf],
  )

  const [current, setCurrent] = useState<Current | null>(null)
  const refineRef = useRef<RefineState>(newRefineState())
  const [count, setCount] = useState(0)
  const [summary, setSummary] = useState(false)
  const startRank = useRef<string[]>(ranking ?? [])
  const [commentFor, setCommentFor] = useState<string | null>(null)
  const [undo, setUndo] = useState<Snapshot | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // El refinado prioriza las obras con menos comparaciones, contando también las de sesiones anteriores (§14.4)
  const seededRefine = (): RefineState => ({ ...newRefineState(), counts: Object.fromEntries(Object.values(useStore.getState().entries).map((e) => [e.itemId, e.cmp ?? 0])) })
  const resetSession = () => { setCount(0); setSummary(false); setUndo(null); setCurrent(null); startRank.current = useStore.getState().rankings[shelf] ?? [] }
  useEffect(() => { refineRef.current = seededRefine(); resetSession() /* eslint-disable-next-line */ }, [shelf])

  // Calcula la siguiente comparación. Prioridad: sin ordenar y provisionales (colocados solo por estrellas).
  useEffect(() => {
    if (summary || (current && current.kind !== 'empty')) return
    const setEmpty = () => setCurrent((c) => (c?.kind === 'empty' ? c : { kind: 'empty' }))
    const st = useStore.getState()
    const rk = st.rankings[shelf] ?? []
    const starsOf = starsOfEntries(st.entries)
    const un = Object.values(st.entries)
      .filter((e) => e.status === 'seen' && (!e.ranked || e.provisional) && getItem(e.itemId)?.type === shelf)
      .sort((a, b) => a.updatedAt - b.updatedAt)
    if (un.length) {
      if (rk.length === 0) {
        if (un.length >= 2) setCurrent({ kind: 'boot', a: un[0].itemId, b: un[1].itemId })
        else setEmpty()
        return
      }
      const p = startPlacement(rk, starsOf, un[0].itemId, un[0].stars, 8)
      if (p.done) { st.applyRanking(shelf, finishPlacement(p), un[0].itemId); setCurrent(null); return }
      setCurrent({ kind: 'place', p })
      return
    }
    if (rk.length >= 2) {
      const pair = nextRefinePair(rk, refineRef.current, Math.random)
      if (pair) setCurrent({ kind: 'refine', pair })
      else setEmpty()
      return
    }
    setEmpty()
  }, [current, shelf, entries, ranking, summary])

  const pairItems = (c: Current | null): { left: Item; right: Item; leftIsSubject: boolean } | null => {
    if (!c || c.kind === 'empty') return null
    if (c.kind === 'boot') return { left: getItem(c.a)!, right: getItem(c.b)!, leftIsSubject: true }
    if (c.kind === 'place') {
      const opp = placementOpponent(c.p)
      if (!opp) return null
      const nw = getItem(c.p.id)!, ot = getItem(opp)!
      return c.p.comparisons % 2 === 1 ? { left: ot, right: nw, leftIsSubject: false } : { left: nw, right: ot, leftIsSubject: true }
    }
    const sj = getItem(c.pair.subject)!, op = getItem(c.pair.opponent)!
    const flip = ((refineRef.current.counts[c.pair.subject] ?? 0) + (refineRef.current.counts[c.pair.opponent] ?? 0)) % 2 === 1
    return flip ? { left: op, right: sj, leftIsSubject: false } : { left: sj, right: op, leftIsSubject: true }
  }
  const pair = pairItems(current)

  const onChoose = (w: 'a' | 'b') => {
    if (!current || !pair) return
    const st = useStore.getState()
    const subjectWon = (w === 'a') === pair.leftIsSubject
    const winnerId = w === 'a' ? pair.left.id : pair.right.id
    setUndo({ entries: st.entries, ranking: st.rankings[shelf] ?? [], current, refine: refineRef.current, count })
    st.bumpCompared([pair.left.id, pair.right.id])

    if (current.kind === 'boot') {
      const loser = w === 'a' ? current.b : current.a
      st.applyRanking(shelf, [winnerId, loser], undefined)
      for (const id of [winnerId, loser]) st.markPlaced(id)
      setCurrent(null)
    } else if (current.kind === 'place') {
      const next = answerPlacement(current.p, subjectWon)
      if (next.done) { st.applyRanking(shelf, finishPlacement(next), current.p.id); setCurrent(null) }
      else setCurrent({ kind: 'place', p: next })
    } else if (current.kind === 'refine') {
      const res = answerRefine(st.rankings[shelf] ?? [], refineRef.current, current.pair, subjectWon)
      refineRef.current = res.state
      st.applyRanking(shelf, res.ranking)
      if (res.jumped) setToast(current.pair.kind === 'jumpUp' ? '¡Sube mucho! ⬆️' : 'Baja bastante ⬇️')
      setCurrent(null)
    }
    const n = count + 1
    setCount(n)
    if (n >= PAIRS_PER_SESSION) setSummary(true)
    if (settings.commentBoxInPairs) setCommentFor(winnerId)
  }

  const doUndo = () => {
    if (!undo) return
    useStore.setState((s) => ({ entries: undo.entries, rankings: { ...s.rankings, [shelf]: undo.ranking } }))
    refineRef.current = undo.refine
    setCurrent(undo.current)
    setCount(undo.count)
    setSummary(false)
    setUndo(null)
  }

  // resumen: quién ha subido y bajado más durante la sesión
  const moves = useMemo(() => {
    if (!summary) return null
    const now = useStore.getState().rankings[shelf] ?? []
    const start = startRank.current
    const list = now.map((id, i) => ({ id, delta: start.includes(id) ? start.indexOf(id) - i : null }))
    return {
      up: list.filter((m) => m.delta !== null && m.delta > 0).sort((a, b) => (b.delta as number) - (a.delta as number)).slice(0, 3),
      down: list.filter((m) => m.delta !== null && m.delta < 0).sort((a, b) => (a.delta as number) - (b.delta as number)).slice(0, 3),
      added: list.filter((m) => m.delta === null).slice(0, 4),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary])

  return (
    <div className="h-full flex flex-col relative bg-bg">
      <ScreenTitle
        label={`COMPARAR · ${SHELF_LABEL[shelf].plural.toUpperCase()}`}
        step={
          current?.kind !== 'empty' && !summary
            ? { current: Math.min(count + 1, PAIRS_PER_SESSION), total: PAIRS_PER_SESSION }
            : undefined
        }
        title={summary ? 'Sesión completada' : current?.kind === 'empty' ? 'Tu ranking' : '¿Cuál te gustó más?'}
        subtitle={
          summary
            ? `${PAIRS_PER_SESSION} comparaciones en ${SHELF_LABEL[shelf].plural.toLowerCase()}`
            : current?.kind !== 'empty'
            ? `${ranking.length + pending} obras en tu ranking`
            : undefined
        }
        action={
          undo && !summary ? (
            <button
              onClick={doUndo}
              className="text-meta text-mute hover:text-ink hover:underline flex items-center gap-1 active:scale-95"
            >
              <Icon name="undo" size={14} /> Deshacer
            </button>
          ) : undefined
        }
      />

      <div className="px-5 pb-3 shrink-0">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {SHELVES.map((s) => (
            <Chip key={s} active={s === shelf} onClick={() => choose(s)}>
              {SHELF_LABEL[s].plural}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 px-5 pb-6 flex flex-col">
        {summary && moves ? (
          <div className="flex-1 min-h-0 flex flex-col pop">
            <div className="flex-1 min-h-0 scroll-y space-y-4">
              <MoveList title="Han subido" arrow="▲" color="#3ec878" rows={moves.up} />
              <MoveList title="Han bajado" arrow="▼" color="#ef4b4b" rows={moves.down} />
              <MoveList title="Nuevas en tu ranking" arrow="★" color="#F5B544" rows={moves.added} />
              {!moves.up.length && !moves.down.length && !moves.added.length && (
                <p className="text-body text-mute py-4">Tu ranking se ha confirmado: no ha cambiado nada.</p>
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="secondary" onClick={() => nav(`/estanteria/${shelf}`)} className="flex-1">
                Ver mi ranking
              </Button>
              <Button variant="primary" onClick={resetSession} className="flex-1">
                Seguir valorando
              </Button>
            </div>
          </div>
        ) : pair ? (
          <SwipePair left={sideOf(pair.left)} right={sideOf(pair.right)} onChoose={onChoose} kind="rank" />
        ) : current?.kind === 'empty' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-5">
            <h2 className="text-title text-ink">Nada que comparar en {SHELF_LABEL[shelf].plural.toLowerCase()}</h2>
            <p className="text-mute text-body max-w-sm">
              Necesitas al menos dos {SHELF_LABEL[shelf].seen} para ordenarlas. Haz swipe en Descubrir o carga unos datos de ejemplo.
            </p>
            <div className="mt-2">
              <Button variant="primary" onClick={loadSample}>
                Importar datos de ejemplo
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {commentFor && <CommentSheet key={commentFor + count} itemId={commentFor} onClose={() => setCommentFor(null)} />}
      <AnimatePresence>{toast && <Toast key={toast} message={toast} onDone={() => setToast(null)} />}</AnimatePresence>
    </div>
  )
}

function MoveList({ title, arrow, color, rows }: { title: string; arrow: string; color: string; rows: { id: string; delta: number | null }[] }) {
  if (!rows.length) return null
  return (
    <Group title={title}>
      {rows.map((r) => {
        const it = getItem(r.id)!
        return (
          <Row
            key={r.id}
            title={
              <div className="flex items-center gap-3">
                <Poster item={it} className="w-8 h-12 rounded-[6px] shrink-0 object-cover" />
                <span className="serif text-item font-medium line-clamp-1">{it.title}</span>
              </div>
            }
            right={
              <span className="font-semibold tabular-nums text-sm text-right shrink-0" style={{ color }}>
                {arrow} {r.delta ? Math.abs(r.delta) : ''}
              </span>
            }
          />
        )
      })}
    </Group>
  )
}
