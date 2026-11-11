import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { FlatList } from 'react-native-gesture-handler'
import { router, useFocusEffect, useLocalSearchParams, useScrollToTop } from 'expo-router'
import Animated, { FadeOut } from 'react-native-reanimated'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import {
  ACTIVE_SHELVES,
  BOOK_QUESTIONS,
  QUESTIONS_BY_SHELF,
  SHELF_LABEL,
  affinity,
  applyDuelChoice,
  duelBudget,
  friendRanks,
  friends as seedFriends,
  getItem,
  getProposal,
  isShelfLoaded,
  itemFacts,
  items,
  itemsById,
  nextDuel,
  rejectAndContinue,
  sessionTaste,
  shouldPropose,
  subscribeCatalog,
  typeName,
  type Answers,
  type Decide2State as DecideState,
  type DecideProposal,
  type DuelPair,
  type Friend,
  type Item,
  type OptionArt,
  type QCtx,
  type Question,
  type ShelfType,
} from '@biblioteca/core'
import { posterRadius } from '@biblioteca/core/src/lib/posterShape'
import { loadShelves } from '../../data/loadData'
import { skipDecide, startDecide, track, useCatalog, useEvents, useFriends, useRanks, useStore } from '../../store'
import { useFlight } from '../../lib/flight'
import { posterAspect, titleOf } from '../../lib/item'
import { colors, tx } from '../../theme'
import { AppText } from '../../components/AppText'
import { Icon } from '../../components/Icon'
import { Poster } from '../../components/Poster'
import { Press } from '../../components/Press'
import { Button, Sheet, Toast } from '../../components/ui'
import { RatingFlow } from '../../components/flows/RatingFlow'
import { Appear, ChoiceCard, Fade, PassButton, PlatformTiles, ShelfCard } from '../../components/duel/DecideParts'
import { DuelHeader } from '../../components/duel/DuelHeader'
import { SwipePair } from '../../components/duel/SwipePair'
import { sideOf } from '../../components/duel/sides'

const SNAP_KEY = 'biblioteca-decidir-v5'
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

type DShelf = Exclude<ShelfType, 'song'>
type Phase = 'shelf' | 'ask' | 'shape' | 'propose' | 'done' | 'none'

/** Solo se recuerda la propuesta ya hecha: el estado del motor de los duelos no se guarda, así que un duelo o una pregunta a medias no se retoma. */
const parseSnap = (raw: string | null): Snap | null => {
  try {
    const x = raw ? (JSON.parse(raw) as Snap) : null
    if (!x || !x.shelf) return null
    if (x.pair && !(getItem(x.pair[0]) && getItem(x.pair[1]))) return null
    if (x.phase !== 'propose' && x.phase !== 'done') return null
    return x
  } catch {
    return null
  }
}
const clearSnap = () => {
  void AsyncStorage.removeItem(SNAP_KEY).catch(() => {})
}

const titleOfShelf = (s: ShelfType) => (s === 'book' ? '¿Qué leo ahora?' : s === 'boardgame' ? '¿A qué jugamos hoy?' : s === 'artist' ? '¿Qué escucho hoy?' : '¿Qué vemos hoy?')

const DECIDE_SHELVES = ACTIVE_SHELVES.filter((s): s is DShelf => s !== 'song')

/** Los duelos necesitan el detalle completo de la estantería (plataformas, nota media, país…): se espera a que llegue. */
function ensureShelfCatalog(shelf: ShelfType): Promise<void> {
  if (isShelfLoaded(shelf)) return Promise.resolve()
  void loadShelves(shelf)
  return new Promise((resolve) => {
    const off = subscribeCatalog(() => {
      if (isShelfLoaded(shelf)) {
        off?.()
        resolve()
      }
    })
    // por si ya llegó entre medias
    if (isShelfLoaded(shelf)) {
      off?.()
      resolve()
    }
  })
}

export default function Decidir() {
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null)
  useScrollToTop(scrollRef)
  const { t: t0 } = useLocalSearchParams<{ t?: string }>()
  const urlShelf = t0 && (DECIDE_SHELVES as string[]).includes(t0) ? (t0 as DShelf) : null
  const flight = useFlight()
  const cardRef = useRef<ComponentRef<typeof View>>(null)

  const [loaded, setLoaded] = useState(false)
  const [shelf, setShelf] = useState<DShelf | null>(null)
  const profile = useStore((s) => s.profile)
  const entries = useStore((s) => s.entries)
  const rankings = useStore((s) => s.rankings)
  const setStatus = useStore((s) => s.setStatus)
  const ranks = useRanks()
  const catalogVersion = useCatalog((s) => s.version)

  const realFriends = useFriends((s) => s.realFriends)
  const activeFriends = realFriends.length > 0 ? realFriends : seedFriends

  const [phase, setPhase] = useState<Phase>('shelf')
  const [qi, setQi] = useState(0)
  const [answers, setAnswers] = useState<Answers>({ platforms: profile.platforms })
  const [pair, setPair] = useState<[Item, Item] | null>(null)
  const [duel, setDuel] = useState({ n: 0, of: 5 })
  const [duelPhase, setDuelPhase] = useState<'coarse' | 'fine'>('coarse')
  const [current, setCurrent] = useState<string | null>(null)
  const [rejected, setRejected] = useState<string[]>([])
  const [rating, setRating] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showAlts, setShowAlts] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [decideState, setDecideState] = useState<DecideState | null>(null)
  const [proposal, setProposal] = useState<DecideProposal | null>(null)

  const newSession = useEvents((s) => s.newSession)
  const sessionSid = useRef('')
  const roundRef = useRef(1)
  const duelStepRef = useRef(0)
  const duelStartTimeRef = useRef<number>(performance.now())
  const currentDuelPairRef = useRef<DuelPair | null>(null)
  const [showUnknownBtn, setShowUnknownBtn] = useState(false)
  const unknownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  if (!sessionSid.current) sessionSid.current = newSession('dec')

  // Recuperar la propuesta guardada (la PWA la leía de forma síncrona al montar)
  useEffect(() => {
    let alive = true
    void AsyncStorage.getItem(SNAP_KEY)
      .catch(() => null)
      .then((raw) => {
        if (!alive) return
        const snap = parseSnap(raw)
        if (snap && snap.shelf !== 'song' && (!urlShelf || snap.shelf === urlShelf)) {
          setShelf(snap.shelf as DShelf)
          setPhase(snap.phase as Phase)
          setQi(snap.qi)
          setAnswers(snap.answers)
          setPair(snap.pair ? ([getItem(snap.pair[0]), getItem(snap.pair[1])] as [Item, Item]) : null)
          setDuel(snap.duel)
          setCurrent(snap.current)
          setRejected(snap.rejected)
        }
        setLoaded(true)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ya elegida una de la pareja: mientras se confirma y se procesa, «Pasar» no aparece (Igor, 25/10)
  const pickedRef = useRef(false)
  const clearUnknownTimer = () => {
    if (unknownTimerRef.current) {
      clearTimeout(unknownTimerRef.current)
      unknownTimerRef.current = null
    }
  }
  const hidePass = () => {
    pickedRef.current = true
    setShowUnknownBtn(false)
    clearUnknownTimer()
  }

  // Botón «Pasar» tras 2,5 segundos sin elegir (T19 §1.3; antes «No conozco ninguna»)
  useEffect(() => {
    pickedRef.current = false
    setShowUnknownBtn(false)
    clearUnknownTimer()
    if (phase === 'shape' && pair) {
      unknownTimerRef.current = setTimeout(() => {
        if (!pickedRef.current) setShowUnknownBtn(true)
      }, 2500)
    }
    return clearUnknownTimer
  }, [phase, pair])

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

  useEffect(() => {
    if (!loaded) return
    if (!shelf || (phase !== 'propose' && phase !== 'done')) {
      if (phase === 'shelf' || phase === 'ask' || phase === 'shape') clearSnap()
      return
    }
    const data: Snap = { shelf, phase, qi, answers, pair: pair && pair[0] && pair[1] ? [pair[0].id, pair[1].id] : null, duel, current, rejected }
    void AsyncStorage.setItem(SNAP_KEY, JSON.stringify(data)).catch(() => {})
  }, [loaded, shelf, phase, qi, answers, pair, duel, current, rejected])

  // Cuántas vistas y guardadas tiene en la estantería: decide qué preguntas tienen sentido (sin vistas no hay «repetir»)
  const qctx = useMemo<QCtx>(() => {
    const c = { seen: 0, pending: 0 }
    if (!shelf) return c
    for (const e of Object.values(entries)) {
      const it = getItem(e.itemId)
      if (!it || it.hidden || it.type !== shelf) continue
      if (e.status === 'seen') c.seen++
      else if (e.status === 'pending') c.pending++
    }
    return c
  }, [entries, shelf])

  // Portadas del fondo de cada tarjeta de respuesta: tus mejores vistas, tus guardadas o las más conocidas que no tienes
  const art = useMemo<Record<OptionArt, Item[]>>(() => {
    const out: Record<OptionArt, Item[]> = { seen: [], pending: [], new: [] }
    if (!shelf) return out
    const mine = Object.values(entries).filter((e) => getItem(e.itemId)?.type === shelf)
    const ranked = (rankings[shelf] ?? []).filter((id) => entries[id]?.status === 'seen')
    out.seen = [...ranked, ...mine.filter((e) => e.status === 'seen' && !ranked.includes(e.itemId)).map((e) => e.itemId)]
      .slice(0, 3)
      .map(getItem)
      .filter(Boolean) as Item[]
    out.pending = mine
      .filter((e) => e.status === 'pending')
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 3)
      .map((e) => getItem(e.itemId))
      .filter(Boolean) as Item[]
    out.new = items
      .filter((it) => it.type === shelf && !it.hidden && !entries[it.id] && it.posterUrl)
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 3)
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, rankings, shelf, catalogVersion])

  // Portadas de las tarjetas de estantería
  const covers = useMemo(() => {
    const out = {} as Record<DShelf, Item[]>
    for (const s of DECIDE_SHELVES) out[s] = items.filter((it) => it.type === s).sort((a, b) => b.popularity - a.popularity).slice(0, 3)
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogVersion])

  // el detalle de la estantería llega mientras responde las preguntas
  useEffect(() => {
    if (shelf) void ensureShelfCatalog(shelf)
  }, [shelf])

  const isBook = shelf === 'book'
  const baseQs: Question[] = !shelf ? [] : isBook ? BOOK_QUESTIONS : QUESTIONS_BY_SHELF[shelf as Exclude<ShelfType, 'book' | 'song'>]
  const activeQs = (a: Answers) => baseQs.filter((q) => !q.skipIf?.(a, qctx))
  const questions = activeQs(answers)

  /* ------------------------------- navegación ------------------------------- */
  const startShaping = (a: Answers, targetDuels = 5, forShelf: DShelf | null = shelf) => {
    if (!forShelf) return
    void ensureShelfCatalog(forShelf).then(() => startShapingNow(a, targetDuels, forShelf))
  }
  const startShapingNow = (a: Answers, targetDuels: number, sh: DShelf) => {
    sessionSid.current = newSession('dec')
    roundRef.current = 1
    duelStepRef.current = 0
    track('dec_start', { shelf: sh, sid: sessionSid.current, data: { answers: a, engine: 'v2' } })

    const st0 = useStore.getState()
    const state = startDecide({
      shelf: sh,
      items,
      entries: st0.entries,
      rankings: st0.rankings,
      profile: st0.profile,
      friends: activeFriends,
      answers: a,
      affinity: getAffinity,
      friendPct: getFriendPct,
      deckLearn: st0.deckLearn?.[sh],
      recentOrienters: st0.recentOrienters?.[sh],
      userVec: st0.userVectors?.[sh],
      tasteMemory: st0.decideTaste?.[sh],
    })
    setDecideState(state)

    // con una sola candidata (o ninguna) no hay nada que preguntar
    const next = shouldPropose(state) ? null : nextDuel(state, items, new Set())
    if (!next) {
      const prop = getProposal(state, itemsById, activeFriends, st0.profile)
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
    setDuelPhase(next.phase as 'coarse' | 'fine')
    setDuel({ n: 0, of: Math.min(targetDuels, duelBudget(state).max) })
    setPhase('shape')
  }

  const answer = (q: Question, value: string | string[]) => {
    const next = { ...answers, [q.id]: value }
    setAnswers(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(
      () => {
        if (qi + 1 >= activeQs(next).length) startShaping(next, 6)
        else setQi(qi + 1)
      },
      q.multi ? 0 : 200,
    )
  }

  /** Tras un duelo respondido o pasado: propone, o sigue con el siguiente duelo, o no quedan candidatas. */
  const afterDuel = (updatedState: DecideState, sh: DShelf, proposeEvent: boolean) => {
    if (shouldPropose(updatedState)) {
      const prop = getProposal(updatedState, itemsById, activeFriends, profile)
      if (prop) {
        useStore.getState().recordOrienters(sh, updatedState.shown)
        useStore.getState().saveDecideTaste(sh, sessionTaste(updatedState))
        setProposal(prop)
        setCurrent(prop.item.id)
        setPair(null)
        setPhase('propose')
        if (proposeEvent)
          track('dec_propose', {
            shelf: sh,
            itemId: prop.item.id,
            sid: sessionSid.current,
            data: { round: roundRef.current, score: prop.finalScore, candidates: updatedState.pool.length },
          })
        return
      }
    }
    const next = nextDuel(updatedState, items, new Set(updatedState.shown))
    if (next) {
      currentDuelPairRef.current = next
      duelStartTimeRef.current = performance.now()
      setPair([next.a, next.b])
      setDuelPhase(next.phase as 'coarse' | 'fine')
      setDuel((d) => ({ ...d, n: d.n + 1 }))
    } else {
      const prop = getProposal(updatedState, itemsById, activeFriends, profile)
      if (prop) {
        useStore.getState().recordOrienters(sh, updatedState.shown)
        useStore.getState().saveDecideTaste(sh, sessionTaste(updatedState))
        setProposal(prop)
        setCurrent(prop.item.id)
        setPair(null)
        setPhase('propose')
      } else {
        setPhase('none')
      }
    }
  }

  const onShaperChoose = (w: 'a' | 'b') => {
    if (!pair || !shelf || !decideState) return
    const [a, b] = pair
    const winner = w === 'a' ? a : b
    const loser = w === 'a' ? b : a

    setShowUnknownBtn(false)
    clearUnknownTimer()

    const elapsedMs = Math.round(performance.now() - duelStartTimeRef.current)
    const currentDuel = currentDuelPairRef.current

    const updatedState = applyDuelChoice(decideState, winner, loser, itemsById, elapsedMs, currentDuel?.dimension)
    setDecideState(updatedState)
    duelStepRef.current++

    const infoGain = currentDuel?.infoGain ?? Math.round((0.5 + Math.abs(a.popularity - b.popularity) / 200) * 100) / 100
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
    afterDuel(updatedState, shelf, true)
  }

  const onShaperUnknown = () => {
    if (!pair || !shelf || !decideState) return
    const [a, b] = pair

    setShowUnknownBtn(false)
    clearUnknownTimer()

    const elapsedMs = Math.round(performance.now() - duelStartTimeRef.current)
    const currentDuel = currentDuelPairRef.current

    const updatedState = skipDecide(decideState, a, b, elapsedMs, currentDuel?.dimension)
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
    afterDuel(updatedState, shelf, true)
  }

  const handleAccept = () => {
    const currentItem = proposal?.item ?? (current ? getItem(current) : null)
    if (currentItem && shelf) {
      track('dec_accept', { shelf, itemId: currentItem.id, sid: sessionSid.current, data: { round: roundRef.current } })
    }
    setPhase('done')
  }

  const seguir = () => {
    if (!current || !shelf) return
    if (!decideState) {
      setRejected([...rejected, current])
      startShaping(answers, 3)
      return
    }
    track('dec_reject', { shelf, itemId: current, sid: sessionSid.current, data: { round: roundRef.current } })
    roundRef.current++
    setRejected([...rejected, current])

    const updatedState = rejectAndContinue(decideState, current)
    setDecideState(updatedState)

    const next = nextDuel(updatedState, items, new Set(updatedState.shown))
    if (next) {
      currentDuelPairRef.current = next
      duelStartTimeRef.current = performance.now()
      setPair([next.a, next.b])
      setDuelPhase(next.phase as 'coarse' | 'fine')
      setDuel({ n: 0, of: duelBudget(updatedState).max })
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
      track('dec_abandon', { shelf, sid: sessionSid.current, data: { step: duelStepRef.current, phase } })
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
    setAnswers({ platforms: profile.platforms })
  }

  // Enlace con `?t=<estantería>` (Biblioteca, Descubrir…): la PWA lo leía al montar; aquí la pestaña sigue montada, así que se
  // mira cada vez que gana el foco y solo cambia de categoría si no es ya la que se está viendo.
  useFocusEffect(
    useCallback(() => {
      if (!loaded || !urlShelf || shelf === urlShelf) return
      clearSnap()
      setShelf(urlShelf)
      setAnswers({ platforms: profile.platforms })
      setPhase('ask')
      setQi(0)
      setCurrent(null)
      setRejected([])
      setDecideState(null)
      setProposal(null)
      setPair(null)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loaded, urlShelf]),
  )

  const shelfTerms = shelf ? SHELF_LABEL[shelf] : SHELF_LABEL.movie
  const currentItem = proposal?.item ?? (current ? getItem(current) : null)
  const resetBtn = (
    <Button variant="text" onPress={reset}>
      Reiniciar
    </Button>
  )

  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.bg }} />

  /* --------------------------------- pantallas --------------------------------- */
  let header: React.ReactNode = null
  let body: React.ReactNode = null

  if (phase === 'shelf') {
    header = <DuelHeader label="DECIDIR" title="¿Por dónde tiramos hoy?" subtitle="Elige qué te apetece y te hago unas preguntas rápidas." />
    body = (
      // con scroll y aire al final: en pantallas bajas la última tarjeta tiene que poder verse entera
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 64, gap: 12 }} contentInsetAdjustmentBehavior="never">
        {DECIDE_SHELVES.map((s, i) => (
          <ShelfCard
            key={s}
            index={i}
            title={SHELF_LABEL[s].plural}
            sub={titleOfShelf(s)}
            cover={covers[s]}
            onPress={() => {
              setShelf(s)
              setAnswers({ platforms: profile.platforms })
              setPhase('ask')
              setQi(0)
            }}
          />
        ))}
      </ScrollView>
    )
  } else if (phase === 'ask' && shelf) {
    const q = questions[qi]
    const val = answers[q?.id]
    header = (
      <DuelHeader
        label={`DECIDIR · ${shelfTerms.plural.toUpperCase()}`}
        step={{ current: qi + 1, total: questions.length }}
        title={q?.q || 'Pregunta'}
        action={resetBtn}
      />
    )
    const main = q ? q.options.filter((o) => o.id !== 'igual') : []
    const any = q?.options.find((o) => o.id === 'igual')
    const twoCols = main.length === 4
    const rows: (typeof main)[] = twoCols ? [main.slice(0, 2), main.slice(2)] : main.map((o) => [o])
    body = (
      <View style={{ flex: 1, minHeight: 0, paddingHorizontal: 20, paddingBottom: 20 }}>
        {q && (
          <Appear key={q.id} ms={160} dx={16} style={{ flex: 1, minHeight: 0 }}>
            {q.multi ? (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
                <PlatformTiles
                  value={(val as string[]) ?? []}
                  onChange={(newPlatforms) => setAnswers({ ...answers, [q.id]: newPlatforms })}
                  onNext={() => (qi + 1 >= questions.length ? startShaping(answers, 6) : setQi(qi + 1))}
                />
              </ScrollView>
            ) : (
              // Las respuestas también son tarjetas, como los duelos (Igor, 27/10); «Me da igual» queda debajo, en texto
              <View style={{ flex: 1, minHeight: 0 }}>
                <View style={{ flex: 1, gap: 12 }}>
                  {rows.map((row, r) => (
                    <View key={r} style={{ flex: 1, minHeight: 96, flexDirection: 'row', gap: 12 }}>
                      {row.map((o, i) => (
                        <View key={o.id} style={{ flex: 1 }}>
                          <ChoiceCard option={o} posters={o.art ? art[o.art] : []} selected={val === o.id} delay={(r * row.length + i) * 0.04} onPress={() => answer(q, o.id)} />
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
                {any && (
                  <Press
                    onPress={() => answer(q, any.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: val === any.id }}
                    style={{ alignSelf: 'center', marginTop: 8, minHeight: 44, paddingHorizontal: 20, justifyContent: 'center' }}
                  >
                    <AppText style={[tx('meta'), { fontFamily: 'Inter-500', color: val === any.id ? colors.ink : colors.accent }]}>{any.label}</AppText>
                  </Press>
                )}
              </View>
            )}
          </Appear>
        )}
        <View style={{ marginTop: 16, flexDirection: 'row' }}>
          <Button
            variant="secondary"
            onPress={() => {
              if (qi === 0) return reset()
              const prev = questions[qi - 1]
              if (prev && !prev.multi) {
                const { [prev.id]: _drop, ...rest } = answers
                setAnswers(rest)
              }
              setQi(qi - 1)
            }}
          >
            {qi > 0 ? 'Atrás' : 'Cambiar categoría'}
          </Button>
        </View>
      </View>
    )
  } else if (phase === 'shape' && pair) {
    header = (
      <DuelHeader
        label={`DECIDIR · ${shelfTerms.plural.toUpperCase()}`}
        step={{ current: duel.n + 1, total: Math.max(duel.of, duel.n + 1) }}
        title={duelPhase === 'coarse' ? '¿Por dónde tiramos hoy?' : 'Afinando el tiro'}
        action={resetBtn}
      />
    )
    body = (
      <View style={{ flex: 1, minHeight: 0, paddingHorizontal: 20, paddingBottom: 24 }}>
        <SwipePair
          key={`${pair[0].id}|${pair[1].id}`}
          left={sideOf(pair[0])}
          right={sideOf(pair[1])}
          onChoose={onShaperChoose}
          onPick={hidePass}
          kind="decide"
          extra={
            <View style={{ height: 48, alignItems: 'center', justifyContent: 'center' }}>
              {showUnknownBtn && (
                <Animated.View exiting={FadeOut.duration(220)}>
                  <PassButton onPress={onShaperUnknown} />
                </Animated.View>
              )}
            </View>
          }
        />
      </View>
    )
  } else if (phase === 'propose' && currentItem) {
    const reasonsText = proposal?.reasons.join(' · ') || 'Sugerencia basada en tus respuestas'
    header = <DuelHeader label={`DECIDIR · ${shelfTerms.plural.toUpperCase()}`} title={`Te propongo ${shelfTerms.fem ? 'esta' : 'este'}`} action={resetBtn} />
    body = (
      <View style={{ flex: 1, minHeight: 0, paddingHorizontal: 20, paddingBottom: 24 }}>
        <View ref={cardRef} collapsable={false} style={{ flex: 1, minHeight: 0 }}>
        <Press
          key={currentItem.id}
          onPress={() => flight.openFromRef(currentItem, cardRef, 16)}
          accessibilityRole="button"
          accessibilityLabel={`Abrir la ficha de ${titleOf(currentItem)}`}
          style={{ flex: 1, minHeight: 0, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface }}
        >
          <Poster item={currentItem} showTitle={false} noBlur style={StyleSheet.absoluteFill} />
          <Fade dir="up" stops={[[0, '#1e1b17', 1], [0.5, '#1e1b17', 0.4], [1, '#1e1b17', 0]]} />
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 }}>
            <AppText style={tx('label')}>
              {typeName(currentItem.type)} · {currentItem.year} · {itemFacts(currentItem)}
            </AppText>
            <AppText style={[tx('display'), { color: colors.ink, marginTop: 4 }]}>{titleOf(currentItem)}</AppText>
            <AppText style={[tx('meta'), { fontFamily: 'Inter-500', color: colors.accent, marginTop: 8 }]}>{reasonsText}</AppText>
            <AppText numberOfLines={2} style={[tx('body'), { color: colors.mute, marginTop: 6 }]}>
              {currentItem.synopsis}
            </AppText>
          </View>
        </Press>
        </View>
        {!!proposal?.alternatives?.length && (
          <Press onPress={() => setShowAlts(true)} accessibilityRole="button" style={{ alignSelf: 'center', marginTop: 12, minHeight: 36, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <AppText style={[tx('meta'), { fontFamily: 'Inter-500', color: colors.accent }]}>Ver {shelfTerms.fem ? 'otras' : 'otros'} {proposal.alternatives.length} {shelfTerms.fem ? 'candidatas' : 'candidatos'}</AppText>
            <Icon name="chevron" size={14} color={colors.accent} />
          </Press>
        )}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          <Button variant="secondary" onPress={seguir} style={{ flex: 1 }}>
            Seguir buscando
          </Button>
          <Button variant="primary" onPress={handleAccept} style={{ flex: 1.2 }}>
            {shelfTerms.fem ? '¡Esta!' : '¡Este!'}
          </Button>
        </View>
      </View>
    )
  } else if (phase === 'done' && currentItem) {
    const plat = currentItem.platforms?.find((p) => profile.platforms.includes(p)) ?? currentItem.platforms?.[0]
    header = (
      <DuelHeader
        label={`DECIDIR · ${shelfTerms.plural.toUpperCase()}`}
        title={shelf === 'book' ? 'A leer' : shelf === 'boardgame' ? 'A jugar' : shelf === 'artist' ? 'A escuchar' : 'A disfrutar'}
        subtitle={titleOf(currentItem)}
      />
    )
    body = (
      <View style={{ flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 16 }}>
        <View style={{ width: 144, aspectRatio: posterAspect(currentItem), borderRadius: posterRadius(currentItem.type, 16) as number, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}>
          <Poster item={currentItem} showTitle={false} style={StyleSheet.absoluteFill} />
        </View>
        <View style={{ gap: 10, width: '100%', maxWidth: 320, marginTop: 8 }}>
          {!isBook && plat && (
            <Button variant="primary" onPress={() => setToast('En la demo no abre la plataforma')} icon={<Icon name="tv" size={18} color={colors.accentInk} />}>
              {`Abrir en ${plat}`}
            </Button>
          )}
          <Button
            variant="secondary"
            onPress={() => {
              setStatus(currentItem.id, 'seen')
              setRating(currentItem.id)
            }}
          >
            {`Ya ${shelfTerms.pronoun} he ${shelfTerms.seenPastPart}: valorar`}
          </Button>
          <Button variant="text" onPress={reset}>
            Empezar de nuevo
          </Button>
        </View>
      </View>
    )
  } else if (phase === 'none') {
    header = <DuelHeader label="DECIDIR" title={shelfTerms.fem ? 'Se acabaron las candidatas' : 'Se acabaron los candidatos'} subtitle="Prueba con otras respuestas, o guarda más pendientes en Descubrir." />
    body = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 12 }}>
        <Button variant="primary" onPress={reset}>
          Empezar de nuevo
        </Button>
        <Button variant="text" onPress={() => (shelf ? router.push({ pathname: '/descubrir', params: { shelf } }) : router.push('/descubrir'))}>
          {`Ir a Descubrir ${shelf ? SHELF_LABEL[shelf].plural.toLowerCase() : ''}`}
        </Button>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {header}
      {body}
      {rating && (
        <RatingFlow
          key={rating}
          itemId={rating}
          withStars
          onDone={(m) => {
            setRating(null)
            if (m) setToast(m)
            reset()
          }}
        />
      )}
      {toast && <Toast key={toast} message={toast} onDone={() => setToast(null)} />}
      {showAlts && proposal?.alternatives && (
        <Sheet label={shelfTerms.fem ? 'Otras candidatas' : 'Otros candidatos'} onClose={() => setShowAlts(false)} height="70%">
          <AppText style={[tx('title'), { color: colors.ink }]}>{shelfTerms.fem ? 'Otras candidatas' : 'Otros candidatos'}</AppText>
          <AppText style={[tx('meta'), { marginBottom: 12 }]}>Por orden, según lo que has elegido. Toca {shelfTerms.fem ? 'una' : 'uno'} para que sea la propuesta.</AppText>
          <FlatList
            data={proposal.alternatives}
            keyExtractor={(it) => it.id}
            style={{ marginHorizontal: -8, flexGrow: 0, maxHeight: '80%' }}
            contentContainerStyle={{ gap: 4 }}
            renderItem={({ item: it, index: i }) => (
              <Press
                accessibilityRole="button"
                accessibilityLabel={titleOf(it)}
                onPress={() => {
                  const rest = [proposal.item, ...proposal.alternatives!.filter((x) => x.id !== it.id)]
                  setProposal({ ...proposal, item: it, reasons: [shelfTerms.fem ? 'Elegida de tus otras candidatas' : 'Elegido de tus otros candidatos'], alternatives: rest })
                  setCurrent(it.id)
                  setShowAlts(false)
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 12 }}
              >
                <AppText style={[tx('meta'), { width: 20, textAlign: 'center', fontVariant: ['tabular-nums'] }]}>{i + 2}</AppText>
                <View style={{ width: 40, aspectRatio: posterAspect(it), borderRadius: posterRadius(it.type, 6) as number, overflow: 'hidden', alignSelf: 'center', flexShrink: 0 }}>
                  <Poster item={it} showTitle={false} style={StyleSheet.absoluteFill} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText numberOfLines={1} style={[tx('item'), { color: colors.ink }]}>
                    {titleOf(it)}
                  </AppText>
                  <AppText numberOfLines={1} style={tx('meta')}>
                    {it.year} · {it.creator}
                  </AppText>
                </View>
              </Press>
            )}
          />
        </Sheet>
      )}
    </View>
  )
}
