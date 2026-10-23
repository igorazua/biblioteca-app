import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { friends as seedFriends, getItem, itemFacts, items, itemsById, typeName } from '../data/catalog'
import { PLATFORMS, WIZARD_TITLE } from '../config'
import { BOOK_QUESTIONS, QUESTIONS_BY_SHELF, type Question } from '../data/questions'
import {
  initDecideSession,
  nextDuel,
  applyDuelChoice,
  skipDuelUnknown,
  shouldPropose,
  getProposal,
  rejectAndContinue,
  type DecideProposal,
  type DecideState,
  type DuelPair,
} from '../lib/engine/decide'
import { useStore } from '../store/useStore'
import { useFriends } from '../store/useFriends'
import { useRanks } from '../store/useScores'
import { track, useEvents } from '../store/useEvents'
import { affinity } from '../lib/affinity'
import { friendRanks } from '../lib/rank'
import { SHELVES, SHELF_LABEL, type Friend, type Item, type ShelfType } from '../types'
import { Poster, posterLayoutId } from '../components/Poster'
import { SwipePair, type Side } from '../components/SwipePair'
import { RatingFlow } from '../components/RatingFlow'
import { PlatformPicker, Toast } from '../components/ui'
import { Icon } from '../components/Icon'
import { ScreenTitle } from '../components/ScreenTitle'
import { Button } from '../components/Button'

export type Answers = Record<string, string | string[] | undefined>

const SNAP_KEY = 'biblioteca-decidir-v4'
interface Snap {
  shelf: ShelfType | null
  phase: string
  qi: number
  answers: Answers
  pair: [string, string] | null
  duel: { n: number; of: number }
  current: string | null
  rejected: string[]
}

const loadSnap = (): Snap | null => {
  try {
    const r = localStorage.getItem(SNAP_KEY)
    const x = r ? (JSON.parse(r) as Snap) : null
    if (!x || !x.shelf) return null
    if (x.pair && !(getItem(x.pair[0]) && getItem(x.pair[1]))) return null
    if (x.phase === 'shape' && !x.pair) return null
    return x
  } catch { return null }
}
const clearSnap = () => { try { localStorage.removeItem(SNAP_KEY) } catch { /* ok */ } }

const titleOf = (s: ShelfType) => (s === 'book' ? '¿Qué leo ahora?' : s === 'boardgame' ? '¿A qué jugamos hoy?' : s === 'artist' ? '¿Qué escucho hoy?' : '¿Qué vemos hoy?')

export function WhatToWatch() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const t0 = params.get('t')
  const urlShelf = t0 && (SHELVES as string[]).includes(t0) ? (t0 as ShelfType) : null
  const [snap] = useState<Snap | null>(() => { const x = loadSnap(); return x && (!urlShelf || x.shelf === urlShelf) ? x : null })
  const [shelf, setShelf] = useState<ShelfType | null>(snap?.shelf ?? urlShelf)
  const profile = useStore((s) => s.profile)
  const entries = useStore((s) => s.entries)
  const rankings = useStore((s) => s.rankings)
  const setStatus = useStore((s) => s.setStatus)
  const ranks = useRanks()

  const realFriends = useFriends((s) => s.realFriends)
  const activeFriends = realFriends.length > 0 ? realFriends : seedFriends

  const [phase, setPhase] = useState<'shelf' | 'ask' | 'shape' | 'propose' | 'done' | 'none'>((snap?.phase as 'ask') ?? (shelf ? 'ask' : 'shelf'))
  const [qi, setQi] = useState(snap?.qi ?? 0)
  const [answers, setAnswers] = useState<Answers>(snap?.answers ?? { platforms: profile.platforms })
  const [pair, setPair] = useState<[Item, Item] | null>(snap?.pair ? ([getItem(snap.pair[0]), getItem(snap.pair[1])] as [Item, Item]) : null)
  const [duel, setDuel] = useState(snap?.duel ?? { n: 0, of: 5 })
  const [duelPhase, setDuelPhase] = useState<'coarse' | 'fine'>('coarse')
  const [current, setCurrent] = useState<string | null>(snap?.current ?? null)
  const [rejected, setRejected] = useState<string[]>(snap?.rejected ?? [])
  const [rating, setRating] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const [decideState, setDecideState] = useState<DecideState | null>(null)
  const [proposal, setProposal] = useState<DecideProposal | null>(null)

  const newSession = useEvents((s) => s.newSession)
  const sessionSid = useRef(newSession('dec'))
  const roundRef = useRef(1)
  const duelStepRef = useRef(0)
  const duelStartTimeRef = useRef<number>(performance.now())
  const currentDuelPairRef = useRef<DuelPair | null>(null)
  const [showUnknownBtn, setShowUnknownBtn] = useState(false)
  const unknownTimerRef = useRef<number | null>(null)

  // Botón «No conozco ninguna» tras 2,5 segundos sin elegir (T19 §1.3)
  useEffect(() => {
    setShowUnknownBtn(false)
    if (unknownTimerRef.current) {
      window.clearTimeout(unknownTimerRef.current)
      unknownTimerRef.current = null
    }

    if (phase === 'shape' && pair) {
      unknownTimerRef.current = window.setTimeout(() => {
        setShowUnknownBtn(true)
      }, 2500)
    }

    return () => {
      if (unknownTimerRef.current) {
        window.clearTimeout(unknownTimerRef.current)
        unknownTimerRef.current = null
      }
    }
  }, [phase, pair])

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

  useEffect(() => {
    if (!shelf || phase === 'shelf') return
    const data: Snap = { shelf, phase, qi, answers, pair: pair && pair[0] && pair[1] ? [pair[0].id, pair[1].id] : null, duel, current, rejected }
    try { localStorage.setItem(SNAP_KEY, JSON.stringify(data)) } catch { /* ok */ }
  }, [shelf, phase, qi, answers, pair, duel, current, rejected])

  const isBook = shelf === 'book'
  const baseQs: Question[] = !shelf ? [] : isBook ? BOOK_QUESTIONS : QUESTIONS_BY_SHELF[shelf]
  const activeQs = (a: Answers) => baseQs.filter((q) => !q.skipIf?.(a))
  const questions = activeQs(answers)

  /* ------------------------------- navegación ------------------------------- */
  // Duelos orientadores (§8): obras concretas de la categoría; no son candidatas.
  const startShaping = (a: Answers, targetDuels = 5) => {
    if (!shelf) return
    sessionSid.current = newSession('dec')
    roundRef.current = 1
    duelStepRef.current = 0
    track('dec_start', {
      shelf,
      sid: sessionSid.current,
      data: { answers: a },
    })

    const userVec = useStore.getState().userVectors?.[shelf]
    const state = initDecideSession({
      shelf,
      items,
      entries,
      rankings,
      profile,
      friends: activeFriends,
      answers: a,
      affinity: getAffinity,
      friendPct: getFriendPct,
      deckLearn: useStore.getState().deckLearn?.[shelf],
      recentOrienters: useStore.getState().recentOrienters?.[shelf],
      userVec,
    })
    setDecideState(state)

    const next = nextDuel(state, items, new Set())
    if (!next) {
      const prop = getProposal(state, itemsById, activeFriends, profile)
      if (prop) {
        setProposal(prop)
        setCurrent(prop.item.id)
        setPhase('propose')
      } else {
        setPhase('none')
      }
      return
    }

    currentDuelPairRef.current = next
    duelStartTimeRef.current = performance.now()
    setPair([next.a, next.b])
    setDuelPhase(next.phase as any)
    setDuel({ n: 0, of: targetDuels })
    setPhase('shape')
  }

  const answer = (q: Question, value: string | string[]) => {
    const next = { ...answers, [q.id]: value }
    setAnswers(next)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      if (qi + 1 >= activeQs(next).length) startShaping(next, 5)
      else setQi(qi + 1)
    }, q.multi ? 0 : 200)
  }

  const onShaperChoose = (w: 'a' | 'b') => {
    if (!pair || !shelf || !decideState) return
    const [a, b] = pair
    const winner = w === 'a' ? a : b
    const loser = w === 'a' ? b : a

    setShowUnknownBtn(false)
    if (unknownTimerRef.current) {
      window.clearTimeout(unknownTimerRef.current)
      unknownTimerRef.current = null
    }

    const elapsedMs = Math.round(performance.now() - duelStartTimeRef.current)
    const currentDuel = currentDuelPairRef.current

    const updatedState = applyDuelChoice(
      decideState,
      winner,
      loser,
      itemsById,
      elapsedMs,
      currentDuel?.dimension
    )
    setDecideState(updatedState)
    duelStepRef.current++

    const infoGain = currentDuel?.infoGain ?? (Math.round((0.5 + Math.abs(a.popularity - b.popularity) / 200) * 100) / 100)
    track('dec_duel', {
      shelf,
      sid: sessionSid.current,
      data: {
        a: a.id,
        b: b.id,
        winner: winner.id,
        step: duelStepRef.current,
        phase: currentDuel?.phase || duelPhase,
        dimension: currentDuel?.dimension,
        rA: currentDuel?.rA,
        rB: currentDuel?.rB,
        tierA: currentDuel?.tierA,
        tierB: currentDuel?.tierB,
        isOwnA: currentDuel?.isOwnA,
        isOwnB: currentDuel?.isOwnB,
        ms: elapsedMs,
        infoGain,
      },
    })

    if (shouldPropose(updatedState)) {
      const prop = getProposal(updatedState, itemsById, activeFriends, profile)
      if (prop) {
        useStore.getState().recordOrienters(shelf, updatedState.shown)
        setProposal(prop)
        setCurrent(prop.item.id)
        setPair(null)
        setPhase('propose')
        track('dec_propose', {
          shelf,
          itemId: prop.item.id,
          sid: sessionSid.current,
          data: {
            round: roundRef.current,
            score: prop.finalScore,
            candidates: updatedState.pool.length,
          },
        })
        return
      }
    }

    const next = nextDuel(updatedState, items, new Set(updatedState.shown))
    if (next) {
      currentDuelPairRef.current = next
      duelStartTimeRef.current = performance.now()
      setPair([next.a, next.b])
      setDuelPhase(next.phase as any)
      setDuel((d) => ({ ...d, n: d.n + 1 }))
    } else {
      const prop = getProposal(updatedState, itemsById, activeFriends, profile)
      if (prop) {
        useStore.getState().recordOrienters(shelf, updatedState.shown)
        setProposal(prop)
        setCurrent(prop.item.id)
        setPair(null)
        setPhase('propose')
      } else {
        setPhase('none')
      }
    }
  }

  const onShaperUnknown = () => {
    if (!pair || !shelf || !decideState) return
    const [a, b] = pair

    setShowUnknownBtn(false)
    if (unknownTimerRef.current) {
      window.clearTimeout(unknownTimerRef.current)
      unknownTimerRef.current = null
    }

    const elapsedMs = Math.round(performance.now() - duelStartTimeRef.current)
    const currentDuel = currentDuelPairRef.current

    const updatedState = skipDuelUnknown(
      decideState,
      a,
      b,
      elapsedMs,
      currentDuel?.dimension
    )
    setDecideState(updatedState)
    duelStepRef.current++

    track('dec_duel', {
      shelf,
      sid: sessionSid.current,
      data: {
        a: a.id,
        b: b.id,
        winner: null,
        unknown: true,
        step: duelStepRef.current,
        phase: currentDuel?.phase || duelPhase,
        dimension: currentDuel?.dimension,
        rA: currentDuel?.rA,
        rB: currentDuel?.rB,
        tierA: currentDuel?.tierA,
        tierB: currentDuel?.tierB,
        isOwnA: currentDuel?.isOwnA,
        isOwnB: currentDuel?.isOwnB,
        ms: elapsedMs,
        infoGain: 0,
      },
    })

    if (shouldPropose(updatedState)) {
      const prop = getProposal(updatedState, itemsById, activeFriends, profile)
      if (prop) {
        useStore.getState().recordOrienters(shelf, updatedState.shown)
        setProposal(prop)
        setCurrent(prop.item.id)
        setPair(null)
        setPhase('propose')
        track('dec_propose', {
          shelf,
          itemId: prop.item.id,
          sid: sessionSid.current,
          data: {
            round: roundRef.current,
            score: prop.finalScore,
            candidates: updatedState.pool.length,
          },
        })
        return
      }
    }

    const next = nextDuel(updatedState, items, new Set(updatedState.shown))
    if (next) {
      currentDuelPairRef.current = next
      duelStartTimeRef.current = performance.now()
      setPair([next.a, next.b])
      setDuelPhase(next.phase as any)
      setDuel((d) => ({ ...d, n: d.n + 1 }))
    } else {
      const prop = getProposal(updatedState, itemsById, activeFriends, profile)
      if (prop) {
        useStore.getState().recordOrienters(shelf, updatedState.shown)
        setProposal(prop)
        setCurrent(prop.item.id)
        setPair(null)
        setPhase('propose')
      } else {
        setPhase('none')
      }
    }
  }

  const handleAccept = () => {
    const currentItem = proposal?.item ?? (current ? getItem(current) : null)
    if (currentItem && shelf) {
      track('dec_accept', {
        shelf,
        itemId: currentItem.id,
        sid: sessionSid.current,
        data: { round: roundRef.current },
      })
    }
    setPhase('done')
  }

  const seguir = () => {
    if (!current || !shelf || !decideState) return
    track('dec_reject', {
      shelf,
      itemId: current,
      sid: sessionSid.current,
      data: { round: roundRef.current },
    })
    roundRef.current++
    const newRejected = [...rejected, current]
    setRejected(newRejected)

    const updatedState = rejectAndContinue(decideState, current)
    setDecideState(updatedState)

    const next = nextDuel(updatedState, items, new Set(updatedState.shown))
    if (next) {
      currentDuelPairRef.current = next
      duelStartTimeRef.current = performance.now()
      setPair([next.a, next.b])
      setDuelPhase(next.phase as any)
      setDuel({ n: 0, of: 3 })
      setPhase('shape')
    } else {
      const prop = getProposal(updatedState, itemsById, activeFriends, profile)
      if (prop) {
        setProposal(prop)
        setCurrent(prop.item.id)
        setPhase('propose')
      } else {
        setPhase('none')
      }
    }
  }

  const reset = () => {
    if (shelf && phase !== 'done' && phase !== 'shelf') {
      track('dec_abandon', {
        shelf,
        sid: sessionSid.current,
        data: { step: duelStepRef.current, phase },
      })
    }
    clearSnap()
    setShelf(null)
    setPhase('shelf')
    setQi(0)
    setCurrent(null)
    setRejected([])
    setDecideState(null)
    setProposal(null)
    setPair(null)
  }

  const shelfTerms = shelf ? SHELF_LABEL[shelf] : SHELF_LABEL.movie
  const currentItem = proposal?.item ?? (current ? getItem(current) : null)
  const shaperSide = (it: Item): Side => ({
    key: it.id,
    title: it.title,
    subtitle: `${it.year} · ${it.creator}`,
    bg: <Poster item={it} showTitle={false} className="absolute inset-0 w-full h-full" />,
  })

  /* --------------------------------- pantallas --------------------------------- */
  let header: React.ReactNode = null
  let body: React.ReactNode = null

  if (phase === 'shelf') {
    header = (
      <ScreenTitle
        label="DECIDIR"
        title="¿Por dónde tiramos hoy?"
        subtitle="Elige qué te apetece y te hago unas preguntas rápidas."
      />
    )
    body = (
      <div className="flex-1 min-h-0 flex flex-col px-5 pb-6 gap-3">
        {SHELVES.map((s, i) => {
          const cover = items.filter((it) => it.type === s).sort((a, b) => b.popularity - a.popularity).slice(0, 3)
          return (
            <motion.button
              key={s}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              onClick={() => { setShelf(s); setPhase('ask'); setQi(0) }}
              className="relative flex-1 min-h-[110px] rounded-2xl overflow-hidden border border-line text-left active:scale-[0.985] transition-transform bg-surface"
            >
              <div className="absolute inset-0 grid grid-cols-3 gap-px opacity-30">
                {cover.map((it) => <Poster key={it.id} item={it} showTitle={false} className="w-full h-full" />)}
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/80 to-transparent" />
              <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-5">
                <span className="text-title text-ink font-semibold">{SHELF_LABEL[s].plural}</span>
                <span className="text-meta mt-1">{titleOf(s)}</span>
              </div>
              <span className="absolute right-4 bottom-4 w-9 h-9 rounded-full bg-surface2 border border-line text-ink flex items-center justify-center">
                <Icon name="chevron" size={16} />
              </span>
            </motion.button>
          )
        })}
      </div>
    )
  } else if (phase === 'ask' && shelf) {
    const q = questions[qi]
    const val = answers[q?.id]
    header = (
      <ScreenTitle
        label={`DECIDIR · ${shelfTerms.plural.toUpperCase()}`}
        step={{ current: qi + 1, total: questions.length }}
        title={q?.q || 'Pregunta'}
        action={
          <Button variant="text" onClick={reset}>
            Reiniciar
          </Button>
        }
      />
    )
    body = (
      <div className="flex-1 min-h-0 flex flex-col px-5 pb-5">
        <AnimatePresence mode="wait">
          {q && (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.16 }}
              className="flex-1 min-h-0 scroll-y"
            >
              {q.multi ? (
                <div>
                  <PlatformPicker
                    value={(val as string[]) ?? []}
                    onChange={(newPlatforms) => setAnswers({ ...answers, [q.id]: newPlatforms })}
                  />
                  <p className="text-meta mt-3">Sin ninguna o con todas marcadas, no filtramos por plataforma.</p>
                  <Button
                    variant="primary"
                    onClick={() => (qi + 1 >= questions.length ? startShaping(answers, 5) : setQi(qi + 1))}
                    className="mt-6 w-full"
                  >
                    Seguir
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {q.options.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => answer(q, o.id)}
                      aria-pressed={val === o.id}
                      className={`w-full text-left rounded-2xl border px-5 py-4 min-h-[56px] transition-colors ${
                        val === o.id
                          ? 'bg-surface2 border-accent text-ink'
                          : 'bg-surface border-line active:bg-surface2 text-ink'
                      }`}
                    >
                      <div className="text-body font-medium">{o.label}</div>
                      {o.sub && <div className="text-meta mt-0.5">{o.sub}</div>}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="mt-4 flex">
          <Button variant="secondary" onClick={() => (qi > 0 ? setQi(qi - 1) : reset())}>
            {qi > 0 ? 'Atrás' : 'Cambiar categoría'}
          </Button>
        </div>
      </div>
    )
  } else if (phase === 'shape' && pair) {
    header = (
      <ScreenTitle
        label={`DECIDIR · ${shelfTerms.plural.toUpperCase()}`}
        step={{ current: duel.n + 1, total: duel.of }}
        title={duelPhase === 'coarse' ? '¿Por dónde tiramos hoy?' : 'Afinando el tiro'}
        action={
          <Button variant="text" onClick={reset}>
            Reiniciar
          </Button>
        }
      />
    )
    body = (
      <div className="flex-1 min-h-0 flex flex-col px-5 pb-6">
        <SwipePair left={shaperSide(pair[0])} right={shaperSide(pair[1])} onChoose={onShaperChoose} kind="decide" />
        <div className="h-11 flex items-center justify-center shrink-0">
          <AnimatePresence>
            {showUnknownBtn && (
              <motion.button
                key="unknown-btn"
                type="button"
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                onClick={onShaperUnknown}
                className="min-h-[40px] px-5 py-2 rounded-full bg-surface2/90 hover:bg-surface2 border border-line text-meta text-mute hover:text-ink active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:border-line/80 font-medium select-none"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-mute/60" />
                <span>No conozco ninguna</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    )
  } else if (phase === 'propose' && currentItem) {
    const reasonsText = proposal?.reasons.join(' · ') || 'Sugerencia basada en tus respuestas'
    header = (
      <ScreenTitle
        label={`DECIDIR · ${shelfTerms.plural.toUpperCase()}`}
        title="Te propongo esta"
        action={
          <Button variant="text" onClick={reset}>
            Reiniciar
          </Button>
        }
      />
    )
    body = (
      <div className="flex-1 min-h-0 flex flex-col px-5 pb-6">
        <Link
          to={`/i/${encodeURIComponent(currentItem.id)}`}
          key={currentItem.id}
          className="relative flex-1 min-h-0 rounded-2xl overflow-hidden border border-line bg-surface block"
        >
          <Poster item={currentItem} showTitle={false} layoutId={posterLayoutId(currentItem.id)} className="absolute inset-0 w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
          <div className="absolute bottom-0 inset-x-0 p-5">
            <div className="text-label text-mute">
              {typeName(currentItem.type)} · {currentItem.year} · {itemFacts(currentItem)}
            </div>
            <h2 className="text-display text-ink mt-1">{currentItem.title}</h2>
            <p className="text-meta text-accent mt-2 font-medium">{reasonsText}</p>
            <p className="text-body text-mute mt-1.5 line-clamp-2">{currentItem.synopsis}</p>
          </div>
        </Link>
        <div className="flex gap-3 mt-4">
          <Button variant="secondary" onClick={seguir} className="flex-1">
            Seguir buscando
          </Button>
          <Button variant="primary" onClick={handleAccept} className="flex-[1.2]">
            ¡Esta!
          </Button>
        </div>
      </div>
    )
  } else if (phase === 'done' && currentItem) {
    const plat = currentItem.platforms?.find((p) => profile.platforms.includes(p)) ?? currentItem.platforms?.[0]
    header = (
      <ScreenTitle
        label={`DECIDIR · ${shelfTerms.plural.toUpperCase()}`}
        title={shelf === 'book' ? 'A leer' : shelf === 'boardgame' ? 'A jugar' : shelf === 'artist' ? 'A escuchar' : 'A disfrutar'}
        subtitle={currentItem.title}
      />
    )
    body = (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-6 text-center gap-4">
        <Poster item={currentItem} className="w-36 aspect-[2/3] rounded-2xl border border-line" />
        <div className="flex flex-col gap-2.5 w-full max-w-xs mt-2">
          {!isBook && plat && (
            <Button variant="primary" onClick={() => setToast('En la demo no abre la plataforma')} icon={<Icon name="tv" size={18} />}>
              Abrir en {plat}
            </Button>
          )}
          <Button variant="secondary" onClick={() => { setStatus(currentItem.id, 'seen'); setRating(currentItem.id) }}>
            Ya {shelfTerms.pronoun} he {shelfTerms.seenPastPart}: valorar
          </Button>
          <Button variant="text" onClick={reset}>
            Empezar de nuevo
          </Button>
        </div>
      </div>
    )
  } else if (phase === 'none') {
    header = (
      <ScreenTitle
        label="DECIDIR"
        title="Se acabaron las candidatas"
        subtitle="Prueba con otras respuestas, o guarda más pendientes en Descubrir."
      />
    )
    body = (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3">
        <Button variant="primary" onClick={reset}>
          Empezar de nuevo
        </Button>
        <Button variant="text" onClick={() => nav('/descubrir')}>
          Ir a Descubrir
        </Button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col relative bg-bg">
      {header}
      {body}
      {rating && <RatingFlow key={rating} itemId={rating} withStars onDone={(m) => { setRating(null); if (m) setToast(m); reset() }} />}
      <AnimatePresence>{toast && <Toast key={toast} message={toast} onDone={() => setToast(null)} />}</AnimatePresence>
    </div>
  )
}
