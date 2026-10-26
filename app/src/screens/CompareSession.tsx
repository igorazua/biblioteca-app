import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { getItem } from '../data/catalog'
import { useStore, starsOfEntries } from '../store/useStore'
import { ACTIVE_SHELVES, SHELF_LABEL, type Item, type ShelfType, type UserEntry, type DuelRecord } from '../types'
import {
  applyDuelToRanking, assignSides, DUEL_MILESTONE,
  planNextDuel, RANK_DUELS_FOR_DONE,
  type PlannedDuel,
} from '../lib/ranking'
import { SwipePair, type Side } from '../components/SwipePair'
import { Poster } from '../components/Poster'
import { posterBox } from '../lib/posterShape'
import { CommentSheet } from '../components/RatingFlow'
import { Icon } from '../components/Icon'
import { ScreenTitle } from '../components/ScreenTitle'
import { Button } from '../components/Button'
import { Group, Row } from '../components/Group'

interface Snapshot {
  entries: Record<string, UserEntry>
  ranking: string[]
  current: PlannedDuel | null
  count: number
  sides: Record<string, 'L' | 'R'>
  recent: string[]
  duelKey?: { a: string; b: string }
}

const sideOf = (it: Item): Side => ({
  key: it.id,
  title: it.title,
  subtitle: `${it.year} · ${it.creator}`,
  bg: <Poster item={it} showTitle={false} className="absolute inset-0 w-full h-full" />,
  type: it.type,
  ratio: it.type === 'boardgame' ? it.posterRatio : undefined,
})

function calcShelfOrdenado(
  entries: Record<string, UserEntry>,
  rankings: Record<ShelfType, string[]>,
  shDuels: Record<string, DuelRecord>,
  shelf: ShelfType,
): number {
  const rk = rankings[shelf] ?? []
  const seen = Object.values(entries).filter(
    (e) => e.status === 'seen' && (e.shelf ?? getItem(e.itemId)?.type) === shelf,
  )
  if (seen.length === 0) return 0
  const duelCounts: Record<string, number> = {}
  for (const k of Object.keys(shDuels)) {
    const sep = k.indexOf('|')
    if (sep > 0) {
      const a = k.slice(0, sep)
      const b = k.slice(sep + 1)
      duelCounts[a] = (duelCounts[a] || 0) + 1
      duelCounts[b] = (duelCounts[b] || 0) + 1
    }
  }
  let bien = 0
  for (const e of seen) {
    if (rk.includes(e.itemId) && !e.provisional && (duelCounts[e.itemId] ?? 0) >= RANK_DUELS_FOR_DONE) {
      bien++
    }
  }
  return Math.round((100 * bien) / seen.length)
}

function countDuelsForItem(shDuels: Record<string, DuelRecord>, id: string): number {
  let c = 0
  for (const key of Object.keys(shDuels)) {
    const sep = key.indexOf('|')
    if (sep > 0) {
      const a = key.slice(0, sep)
      const b = key.slice(sep + 1)
      if (a === id || b === id) c++
    }
  }
  return c
}

export function CompareSession() {
  const nav = useNavigate()
  const location = useLocation()
  const initialDuel = location.state?.duel as PlannedDuel | undefined
  const initialDuelConsumed = useRef(false)

  const { shelf: rawShelf } = useParams<{ shelf: string }>()
  const shelf = (ACTIVE_SHELVES.includes(rawShelf as any) ? rawShelf : (ACTIVE_SHELVES[0] ?? 'movie')) as ShelfType

  const entries = useStore((s) => s.entries)
  const ranking = useStore((s) => s.rankings[shelf] ?? [])
  const duels = useStore((s) => s.duels[shelf] ?? {})
  const settings = useStore((s) => s.settings)
  const loadSample = useStore((s) => s.loadSample)

  const [count, setCount] = useState(0)
  const [summary, setSummary] = useState(false)
  const [currentDuel, setCurrentDuel] = useState<PlannedDuel | null>(null)
  const [emptyState, setEmptyState] = useState<'none' | 'complete' | 'need-more'>('none')

  // Asignación persistente de lado (T30.3): si una obra se repite, siempre en el mismo lado
  const [sides, setSides] = useState<Record<string, 'L' | 'R'>>({})
  const seenCountRef = useRef<Record<string, number>>({})
  const recentRef = useRef<string[]>([])

  const startRank = useRef<string[]>(ranking ?? [])
  const startOrdenado = useRef<number>(0)
  const [commentFor, setCommentFor] = useState<string | null>(null)
  const [undo, setUndo] = useState<Snapshot | null>(null)
  // Aviso discreto del último duelo
  const [flash, setFlash] = useState<{ up: string; down: string; n: number } | null>(null)
  // Aviso de hito cada 25 duelos (DUEL_MILESTONE) que no bloquea la interacción
  const [milestoneNotice, setMilestoneNotice] = useState<string | null>(null)

  const lastPair = useRef<{ left: Item; right: Item; leftIsSubject: boolean } | null>(null)
  const lastPairKey = useRef(0)

  // Registrar visita y recencia al abrir la estantería
  useEffect(() => {
    useStore.getState().touchLastCompared(shelf)
  }, [shelf])

  const resetSession = () => {
    setCount(0)
    setSummary(false)
    setUndo(null)
    setCurrentDuel(null)
    setEmptyState('none')
    setSides({})
    seenCountRef.current = {}
    recentRef.current = []
    initialDuelConsumed.current = false
    startRank.current = useStore.getState().rankings[shelf] ?? []
    startOrdenado.current = calcShelfOrdenado(
      useStore.getState().entries,
      useStore.getState().rankings,
      useStore.getState().duels[shelf] ?? {},
      shelf,
    )
    useStore.getState().touchLastCompared(shelf)
  }

  useEffect(() => {
    resetSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shelf])

  // Desvanecer aviso de hito a los 3.5 segundos
  useEffect(() => {
    if (!milestoneNotice) return
    const t = window.setTimeout(() => setMilestoneNotice(null), 3500)
    return () => window.clearTimeout(t)
  }, [milestoneNotice])

  // Planificar el siguiente duelo de la sesión (sin límite arbitrario)
  useEffect(() => {
    if (summary) return

    // Si viene con un duelo inicial de la portada
    if (count === 0 && !initialDuelConsumed.current && initialDuel) {
      initialDuelConsumed.current = true
      setCurrentDuel(initialDuel)
      setEmptyState('none')
      return
    }

    const st = useStore.getState()
    const rk = st.rankings[shelf] ?? []
    const shDuels = st.duels[shelf] ?? {}
    const unranked = Object.values(st.entries)
      .filter((e) => e.status === 'seen' && (!rk.includes(e.itemId) || Boolean(e.provisional)) && (e.shelf ?? getItem(e.itemId)?.type) === shelf)
      .sort((a, b) => a.updatedAt - b.updatedAt)
      .map((e) => ({ itemId: e.itemId, stars: e.stars }))

    const counts: Record<string, number> = {}
    for (const e of Object.values(st.entries)) {
      if (e.cmp) counts[e.itemId] = e.cmp
    }

    const next = planNextDuel({
      shelf,
      ranking: rk,
      unranked,
      duels: shDuels,
      cmp: counts,
      sessionIndex: count,
      starsOf: starsOfEntries(st.entries),
      recent: recentRef.current,
      anchor: startRank.current,
    })

    if (next) {
      setCurrentDuel(next)
      setEmptyState('none')
    } else {
      setCurrentDuel(null)
      const totalSeen = Object.values(st.entries).filter(
        (e) => e.status === 'seen' && (e.shelf ?? getItem(e.itemId)?.type) === shelf,
      ).length
      if (totalSeen < 2) {
        setEmptyState('need-more')
      } else {
        setEmptyState('complete')
      }
    }
  }, [summary, count, shelf, entries, ranking, duels])

  // Obtener los dos items a comparar respetando siempre su lado asignado (T30.3)
  const pair = useMemo<{ left: Item; right: Item; leftIsSubject: boolean } | null>(() => {
    if (!currentDuel) return null
    const itA = getItem(currentDuel.a)
    const itB = getItem(currentDuel.b)
    if (!itA || !itB) return null

    const assign = assignSides(currentDuel.a, currentDuel.b, currentDuel.subject, sides, seenCountRef.current)
    if (JSON.stringify(assign.nextSides) !== JSON.stringify(sides)) {
      setSides(assign.nextSides)
    }

    const leftItem = assign.left === itA.id ? itA : itB
    const rightItem = assign.right === itA.id ? itA : itB

    return {
      left: leftItem,
      right: rightItem,
      leftIsSubject: assign.leftIsSubject,
    }
  }, [currentDuel, sides])

  if (pair) {
    lastPair.current = pair
    lastPairKey.current = count
  }
  const shownPair = pair ?? (emptyState === 'none' && !summary ? lastPair.current : null)

  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => setFlash(null), 1400)
    return () => window.clearTimeout(t)
  }, [flash])

  const onChoose = (w: 'a' | 'b') => {
    if (!currentDuel || !pair) return
    const st = useStore.getState()
    const winnerId = w === 'a' ? pair.left.id : pair.right.id
    const loserId = w === 'a' ? pair.right.id : pair.left.id

    // Guardar snapshot de deshacer (T30.2 regla 9)
    setUndo({
      entries: st.entries,
      ranking: st.rankings[shelf] ?? [],
      current: currentDuel,
      count,
      sides,
      recent: [...recentRef.current],
      duelKey: { a: pair.left.id, b: pair.right.id },
    })

    setFlash({ up: winnerId, down: loserId, n: count })

    // Registrar duelo
    st.recordDuel(shelf, pair.left.id, pair.right.id, winnerId)
    st.bumpCompared([pair.left.id, pair.right.id])

    // Actualizar recencia y conteos de aparición de obras
    seenCountRef.current[pair.left.id] = (seenCountRef.current[pair.left.id] || 0) + 1
    seenCountRef.current[pair.right.id] = (seenCountRef.current[pair.right.id] || 0) + 1
    recentRef.current.push(pair.left.id, pair.right.id)

    // Coloca las obras cuya búsqueda ya terminó y reordena las colocadas por su nota, con la prior del ranking al
    // empezar la sesión (applyDuelToRanking). Las sin colocar no entran en el ranking hasta estar colocadas.
    const updatedState = useStore.getState()
    const shelfDuels = updatedState.duels[shelf] ?? {}
    const unrankedItems = Object.values(updatedState.entries)
      .filter((e) => e.status === 'seen' && (e.shelf ?? getItem(e.itemId)?.type) === shelf && (!ranking.includes(e.itemId) || Boolean(e.provisional)))
      .map((e) => ({ itemId: e.itemId, stars: e.stars }))
    const { ranking: newRanking, placed } = applyDuelToRanking({
      ranking,
      anchor: startRank.current,
      unranked: unrankedItems,
      duels: shelfDuels,
      starsOf: starsOfEntries(updatedState.entries),
    })
    for (const id of placed) st.markPlaced(id)

    // Aplicar el nuevo ordenamiento general y ajustar estrellas de los que cambiaron (T30.2.4)
    st.applyRanking(shelf, newRanking)
    setCurrentDuel(null)

    const nextCount = count + 1
    setCount(nextCount)

    // Cada 25 duelos, aviso discreto que no bloquea la sesión (T30.1)
    if (nextCount > 0 && nextCount % DUEL_MILESTONE === 0) {
      setMilestoneNotice(`Llevas ${nextCount}. Sigue o pulsa Terminar`)
    }

    if (settings.commentBoxInPairs) {
      setCommentFor(winnerId)
    }
  }

  const doUndo = () => {
    if (!undo) return
    const st = useStore.getState()
    if (undo.duelKey) {
      st.deleteDuel(shelf, undo.duelKey.a, undo.duelKey.b)
    }
    useStore.setState((s) => ({
      entries: undo.entries,
      rankings: { ...s.rankings, [shelf]: undo.ranking },
    }))
    setSides(undo.sides)
    recentRef.current = undo.recent
    setCurrentDuel(undo.current)
    setCount(undo.count)
    setSummary(false)
    setUndo(null)
    setFlash(null)
    setMilestoneNotice(null)
  }

  // Resumen al terminar
  const nowOrdenado = useMemo(() => {
    if (!summary) return 0
    return calcShelfOrdenado(entries, useStore.getState().rankings, duels, shelf)
  }, [summary, entries, duels, shelf])

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

  const handleBack = () => {
    if (count > 0 && !summary) {
      setSummary(true)
    } else {
      nav('/comparar')
    }
  }

  return (
    <div className="h-full flex flex-col relative bg-bg select-none">
      <ScreenTitle
        label={`DUELOS · ${SHELF_LABEL[shelf].plural.toUpperCase()}`}
        title={
          summary
            ? 'Sesión completada'
            : currentDuel
            ? '¿Cuál te gustó más?'
            : 'Tu ranking'
        }
        subtitle={
          summary
            ? (startOrdenado.current !== nowOrdenado
                ? `${SHELF_LABEL[shelf].plural}: del ${startOrdenado.current} % al ${nowOrdenado} %`
                : `${SHELF_LABEL[shelf].plural}: ${nowOrdenado} % ordenado`)
            : undefined
        }
        onBack={handleBack}
        action={
          !summary ? (
            <div className="flex items-center gap-2.5">
              {count > 0 && (
                <span className="text-meta tabular-nums text-ink/75 font-medium">
                  {count} {count === 1 ? 'duelo' : 'duelos'}
                </span>
              )}
              {count > 0 && (
                <button
                  type="button"
                  onClick={() => setSummary(true)}
                  className="px-2.5 py-1 text-meta font-medium rounded-full bg-surface border border-line text-ink hover:text-ink/80 active:scale-95 transition-all"
                >
                  Terminar
                </button>
              )}
              {undo && (
                <button
                  onClick={doUndo}
                  aria-label="Deshacer la última elección"
                  title="Deshacer"
                  className="w-8 h-8 rounded-full bg-accent text-accent-ink flex items-center justify-center active:scale-90 transition-transform"
                >
                  <Icon name="rotateCcw" size={16} strokeWidth={2.4} />
                </button>
              )}
            </div>
          ) : undefined
        }
      />

      {/* Aviso flotante discreto del hito cada 25 duelos (T30.1) */}
      <AnimatePresence>
        {milestoneNotice && !summary && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-16 inset-x-0 mx-auto w-fit z-40 bg-surface/95 border border-line px-3.5 py-1.5 rounded-full text-meta text-ink shadow-lg pointer-events-none"
          >
            {milestoneNotice}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 min-h-0 px-5 pb-6 flex flex-col">
        {summary && moves ? (
          <div className="flex-1 min-h-0 flex flex-col pop">
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
              <MoveList title="Han subido" arrow="▲" color="#3ec878" rows={moves.up} />
              <MoveList title="Han bajado" arrow="▼" color="#ef4b4b" rows={moves.down} />
              <MoveList title="Nuevas en tu ranking" arrow="★" color="#F5B544" rows={moves.added} />
              {!moves.up.length && !moves.down.length && !moves.added.length && (
                <p className="text-body text-mute py-4">Tu ranking se ha confirmado: no ha cambiado nada.</p>
              )}
            </div>

            <div className="flex flex-col gap-2 mt-4 pt-2">
              <Button variant="primary" onClick={resetSession} className="w-full">
                Seguir con {SHELF_LABEL[shelf].plural}
              </Button>
              <Button variant="secondary" onClick={() => nav(`/estanteria/${shelf}`)} className="w-full">
                Ver tu ranking de {SHELF_LABEL[shelf].plural.toLowerCase()}
              </Button>
              <Button variant="text" onClick={() => nav('/comparar')} className="w-full">
                Elegir otra estantería
              </Button>
            </div>
          </div>
        ) : shownPair ? (
          <div className="relative flex-1 min-h-0 flex flex-col">
            <SwipePair key={lastPairKey.current} left={sideOf(shownPair.left)} right={sideOf(shownPair.right)} onChoose={onChoose} kind="rank" />
            <div className="absolute inset-x-0 top-[42%] z-30 flex justify-center pointer-events-none px-6" aria-live="polite">
              <AnimatePresence mode="wait">
                {flash && (
                  <motion.div
                    key={flash.n}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.14 }}
                    className="flex flex-col gap-1 rounded-xl bg-bg/80 px-3 py-2 text-[13px] max-w-full"
                  >
                    <FlashName id={flash.up} up />
                    <FlashName id={flash.down} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : emptyState === 'complete' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-5">
            <h2 className="text-title text-ink">
              Has comparado todas tus {SHELF_LABEL[shelf].plural.toLowerCase()} entre sí
            </h2>
            <p className="text-mute text-body max-w-sm">
              Cuando marques más, seguimos ordenando.
            </p>
            <div className="mt-4 flex flex-col gap-2.5 w-full max-w-xs">
              <Button variant="primary" onClick={() => nav(`/estanteria/${shelf}`)}>
                Ver tu ranking
              </Button>
              <Button variant="secondary" onClick={() => nav('/descubrir')}>
                Ir a Descubrir
              </Button>
              <Button variant="text" onClick={() => nav('/comparar')}>
                Elegir otra estantería
              </Button>
            </div>
          </div>
        ) : emptyState === 'need-more' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-5">
            <h2 className="text-title text-ink">Nada que comparar en {SHELF_LABEL[shelf].plural.toLowerCase()}</h2>
            <p className="text-mute text-body max-w-sm">
              Necesitas al menos dos {SHELF_LABEL[shelf].seen} para ordenarlas. Haz swipe en Descubrir o carga unos datos de ejemplo.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <Button variant="primary" onClick={loadSample}>
                Importar datos de ejemplo
              </Button>
              <Button variant="text" onClick={() => nav('/comparar')}>
                Elegir otra estantería
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {commentFor && <CommentSheet key={commentFor + count} itemId={commentFor} onClose={() => setCommentFor(null)} />}
    </div>
  )
}

function FlashName({ id, up = false }: { id: string; up?: boolean }) {
  const it = getItem(id)
  if (!it) return null
  return (
    <span className="flex items-center gap-1 min-w-0">
      <span aria-hidden style={{ color: up ? '#3ec878' : '#ef4b4b' }}>{up ? '▲' : '▼'}</span>
      <span className="truncate max-w-[14rem] text-ink">{it.title}</span>
      <span className="sr-only">{up ? 'sube' : 'baja'}</span>
    </span>
  )
}

function MoveList({
  title,
  arrow,
  color,
  rows,
}: {
  title: string
  arrow: string
  color: string
  rows: { id: string; delta: number | null }[]
}) {
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
                <Poster item={it} style={it.type === 'boardgame' ? posterBox(it).style : undefined} className={`w-8 ${it.type === 'boardgame' ? posterBox(it).className : 'h-12'} rounded-[6px] shrink-0 object-cover`} />
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
