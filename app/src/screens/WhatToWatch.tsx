import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { friendHits, friendsMean, getItem, itemFacts, items, typeName } from '../data/catalog'
import { PLATFORMS, WIZARD_TITLE } from '../config'
import { BOOK_QUESTIONS, QUESTIONS_BY_SHELF, type Question } from '../data/questions'
import { applyShaper, MORE_DUELS, newShaping, nextShaperPair, scoreCandidates, SHAPER_DUELS, type Answers, type Cand, type Shaping } from '../lib/recommend'
import { useStore } from '../store/useStore'
import { SHELVES, SHELF_LABEL, type Item, type ShelfType } from '../types'
import { Poster } from '../components/Poster'
import { SwipePair, type Side } from '../components/SwipePair'
import { RatingFlow } from '../components/RatingFlow'
import { Chip, Toast } from '../components/ui'
import { Icon } from '../components/Icon'

// El progreso se guarda: al volver a Decidir se retoma donde estabas (hasta pulsar «Empezar de nuevo»)
const SNAP_KEY = 'biblioteca-decidir-v3'
interface Snap { shelf: ShelfType | null; phase: string; qi: number; answers: Answers; shaping: Shaping; pair: [string, string] | null; duel: { n: number; of: number }; current: string | null; rejected: string[] }
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

  const [phase, setPhase] = useState<'shelf' | 'ask' | 'shape' | 'propose' | 'done' | 'none'>((snap?.phase as 'ask') ?? (shelf ? 'ask' : 'shelf'))
  const [qi, setQi] = useState(snap?.qi ?? 0)
  const [answers, setAnswers] = useState<Answers>(snap?.answers ?? { platforms: profile.platforms })
  const [shaping, setShaping] = useState<Shaping>(snap?.shaping ?? newShaping)
  const [pair, setPair] = useState<[Item, Item] | null>(snap?.pair ? ([getItem(snap.pair[0]), getItem(snap.pair[1])] as [Item, Item]) : null)
  const [duel, setDuel] = useState(snap?.duel ?? { n: 0, of: SHAPER_DUELS })
  const [current, setCurrent] = useState<string | null>(snap?.current ?? null)
  const [rejected, setRejected] = useState<string[]>(snap?.rejected ?? [])
  const [rating, setRating] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!shelf || phase === 'shelf') return
    const data: Snap = { shelf, phase, qi, answers, shaping, pair: pair && pair[0] && pair[1] ? [pair[0].id, pair[1].id] : null, duel, current, rejected }
    try { localStorage.setItem(SNAP_KEY, JSON.stringify(data)) } catch { /* ok */ }
  }, [shelf, phase, qi, answers, shaping, pair, duel, current, rejected])

  const isBook = shelf === 'book'
  const baseQs: Question[] = !shelf ? [] : isBook ? BOOK_QUESTIONS : QUESTIONS_BY_SHELF[shelf]
  const activeQs = (a: Answers) => baseQs.filter((q) => !q.skipIf?.(a))
  const questions = activeQs(answers)

  // géneros de tus 5 favoritas de esta categoría (para «parecido a lo que te gusta»)
  const topGenres = useMemo(() => (shelf ? (rankings[shelf] ?? []).slice(0, 5).flatMap((id) => getItem(id)?.genres ?? []) : []), [shelf, rankings])

  const candidates = useMemo<Cand[]>(() => {
    if (!shelf || (phase !== 'propose' && phase !== 'done')) return []
    return scoreCandidates({ shelf, items, entries, answers, shaping, friendsMean, platforms: profile.platforms, topGenres })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === 'propose' || phase === 'done', shelf, answers, shaping, entries])

  /* ------------------------------- navegación ------------------------------- */
  // Duelos orientadores (§14.2): obras concretas de la categoría, contrastadas; no son candidatas.
  const startShaping = (a: Answers, sh: Shaping, count: number) => {
    if (!shelf) return
    const next = nextShaperPair(items, shelf, a, sh.shown, Math.random)
    if (!next) { setCurrent(null); setPhase('propose'); return }
    setShaping({ ...sh, shown: [...sh.shown, next[0].id, next[1].id] })
    setPair(next)
    setDuel({ n: 0, of: count })
    setPhase('shape')
  }

  const answer = (q: Question, value: string | string[]) => {
    const next = { ...answers, [q.id]: value }
    setAnswers(next)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      if (qi + 1 >= activeQs(next).length) startShaping(next, newShaping(), SHAPER_DUELS)
      else setQi(qi + 1)
    }, q.multi ? 0 : 200)
  }

  const onShaperChoose = (w: 'a' | 'b') => {
    if (!pair || !shelf) return
    const [a, b] = pair
    const sh = applyShaper(shaping, w === 'a' ? a : b, w === 'a' ? b : a)
    const n = duel.n + 1
    const next = n < duel.of ? nextShaperPair(items, shelf, answers, sh.shown, Math.random) : null
    if (next) {
      setShaping({ ...sh, shown: [...sh.shown, next[0].id, next[1].id] })
      setPair(next)
      setDuel({ ...duel, n })
    } else {
      setShaping(sh)
      setPair(null)
      setCurrent(null)
      setPhase('propose')
    }
  }

  // propuesta: la mejor candidata no descartada
  useEffect(() => {
    if (phase === 'propose' && !current) {
      const pool = candidates.filter((c) => !rejected.includes(c.item.id))
      if (pool.length) setCurrent(pool[0].item.id)
      else setPhase('none')
    }
  }, [phase, current, candidates, rejected])
  const cand = candidates.find((c) => c.item.id === current)

  // «Seguir buscando»: más duelos orientadores y nueva propuesta (§14.2)
  const seguir = () => {
    if (!current) return
    setRejected([...rejected, current])
    startShaping(answers, shaping, MORE_DUELS)
  }

  // Reiniciar vuelve siempre a elegir categoría (§13.2)
  const reset = () => { clearSnap(); setShelf(null); setPhase('shelf'); setQi(0); setCurrent(null); setRejected([]); setShaping(newShaping()); setPair(null) }

  const reason = (c: Cand) => {
    const top = friendHits(c.item.id).filter((h) => h.entry.status === 'seen' && h.entry.score !== undefined)[0]
    const plat = c.item.platforms?.find((p) => profile.platforms.includes(p)) ?? c.item.platforms?.[0]
    return [
      c.like ? `Algo como ${c.like.title}` : null,
      top ? `${top.friend.name} ${isBook ? 'lo' : 'la'} tiene en su ranking` : null,
      c.fromFriends ? null : 'Estaba en tus pendientes',
      !isBook && plat ? `Está en ${plat}` : null,
    ].filter(Boolean).join(' · ')
  }

  const shaperSide = (it: Item): Side => ({ key: it.id, title: it.title, subtitle: `${it.year} · ${it.creator}`, bg: <Poster item={it} showTitle={false} className="absolute inset-0 w-full h-full" /> })

  /* --------------------------------- pantallas --------------------------------- */
  let body: React.ReactNode = null

  if (phase === 'shelf') {
    body = (
      <div className="flex-1 min-h-0 flex flex-col px-4 pb-5 gap-3">
        <p className="text-mute text-[15px] px-1 -mt-1">Elige qué te apetece y te hago unas preguntas rápidas.</p>
        {SHELVES.map((s, i) => {
          const cover = items.filter((it) => it.type === s).sort((a, b) => b.popularity - a.popularity).slice(0, 3)
          return (
            <motion.button
              key={s}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.24 }}
              onClick={() => { setShelf(s); setPhase('ask'); setQi(0) }}
              className="relative flex-1 min-h-[120px] rounded-[26px] overflow-hidden border border-line text-left active:scale-[0.985] transition-transform"
            >
              <div className="absolute inset-0 grid grid-cols-3 gap-px bg-black">
                {cover.map((it) => <Poster key={it.id} item={it} showTitle={false} className="w-full h-full" />)}
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/10" />
              <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-5">
                <span className="serif text-[30px] font-semibold leading-none">{SHELF_LABEL[s].plural}</span>
                <span className="text-sm text-white/75 mt-1.5">{titleOf(s)}</span>
              </div>
              <span className="absolute right-4 bottom-4 w-10 h-10 rounded-full bg-accent text-accent-ink flex items-center justify-center"><Icon name="chevron" size={18} /></span>
            </motion.button>
          )
        })}
      </div>
    )
  } else if (phase === 'ask' && shelf) {
    const q = questions[qi]
    const val = answers[q.id]
    body = (
      <div className="flex-1 min-h-0 flex flex-col px-5 pb-4">
        <div className="flex gap-1 mb-4" aria-label={`Pregunta ${qi + 1} de ${questions.length}`}>
          {questions.map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= qi ? 'bg-accent' : 'bg-line'}`} />)}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={q.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.16 }} className="flex-1 min-h-0 scroll-y">
            <div className="text-xs text-accent font-semibold uppercase tracking-wider">Pregunta {qi + 1} de {questions.length}</div>
            <h2 className="serif text-[28px] leading-tight font-semibold mt-1 mb-4">{q.q}</h2>
            {q.multi ? (
              <div>
                <div className="flex flex-wrap gap-2.5">
                  {PLATFORMS.map((p) => {
                    const arr = (val as string[]) ?? []
                    return <Chip key={p} active={arr.includes(p)} onClick={() => setAnswers({ ...answers, [q.id]: arr.includes(p) ? arr.filter((x) => x !== p) : [...arr, p] })}>{p}</Chip>
                  })}
                </div>
                <p className="text-xs text-mute mt-3">Sin ninguna marcada, no filtramos por plataforma.</p>
                <button onClick={() => (qi + 1 >= questions.length ? startShaping(answers, newShaping(), SHAPER_DUELS) : setQi(qi + 1))} className="mt-6 w-full min-h-[52px] rounded-2xl bg-accent text-accent-ink font-semibold">Seguir</button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {q.options.map((o) => (
                  <button key={o.id} onClick={() => answer(q, o.id)} aria-pressed={val === o.id}
                    className={`w-full text-left rounded-3xl border px-4 min-h-[60px] py-2.5 transition-colors ${val === o.id ? 'bg-accent text-accent-ink border-accent' : 'bg-surface border-line active:bg-surface2'}`}>
                    <div className="text-[17px] font-semibold">{o.label}</div>
                    {o.sub && <div className={`text-sm ${val === o.id ? 'text-accent-ink/75' : 'text-mute'}`}>{o.sub}</div>}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="mt-3 flex">
          <button onClick={() => (qi > 0 ? setQi(qi - 1) : reset())} className="min-h-[46px] px-5 rounded-2xl bg-surface border border-line text-sm">{qi > 0 ? 'Atrás' : 'Cambiar categoría'}</button>
        </div>
      </div>
    )
  } else if (phase === 'shape' && pair) {
    body = (
      <div className="flex-1 min-h-0 flex flex-col px-4 pb-5 -mt-1">
        <div className="flex items-center justify-center gap-1.5 pb-2" aria-label={`Duelo ${duel.n + 1} de ${duel.of}`}>
          {Array.from({ length: duel.of }).map((_, i) => <span key={i} className={`h-1 rounded-full transition-all ${i === duel.n ? 'w-6 bg-accent' : i < duel.n ? 'w-3 bg-accent/60' : 'w-3 bg-line'}`} />)}
        </div>
        <SwipePair left={shaperSide(pair[0])} right={shaperSide(pair[1])} onChoose={onShaperChoose} between={['Me siento más…', '← como esta  ·  como esta →']} />
      </div>
    )
  } else if (phase === 'propose' && cand) {
    body = (
      <div className="flex-1 min-h-0 flex flex-col px-4 pb-8">
        <Link to={`/i/${encodeURIComponent(cand.item.id)}`} key={cand.item.id} className="relative flex-1 min-h-0 rounded-[28px] overflow-hidden border border-line shadow-2xl block pop">
          <Poster item={cand.item} showTitle={false} className="absolute inset-0 w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
          <div className="absolute top-3 left-3 bg-accent text-accent-ink text-xs font-bold px-3 py-1.5 rounded-full">Te propongo esta</div>
          <div className="absolute bottom-0 inset-x-0 p-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-white/70">{typeName(cand.item.type)} · {cand.item.year} · {itemFacts(cand.item)}</div>
            <h2 className="serif text-[30px] leading-[1.05] font-semibold mt-1">{cand.item.title}</h2>
            <p className="text-sm text-accent mt-2 font-medium">{reason(cand)}</p>
            <p className="text-sm text-white/75 mt-1.5 line-clamp-2">{cand.item.synopsis}</p>
          </div>
        </Link>
        <div className="flex gap-2 mt-3">
          <button onClick={seguir} className="flex-1 min-h-[54px] rounded-2xl bg-surface border border-line font-semibold">Seguir buscando</button>
          <button onClick={() => setPhase('done')} className="flex-[1.2] min-h-[54px] rounded-2xl bg-accent text-accent-ink font-semibold text-lg">¡Esta!</button>
        </div>
      </div>
    )
  } else if (phase === 'done' && cand) {
    const plat = cand.item.platforms?.find((p) => profile.platforms.includes(p)) ?? cand.item.platforms?.[0]
    body = (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-6 text-center gap-3">
        <Poster item={cand.item} className="w-36 aspect-[2/3] rounded-2xl shadow-2xl" />
        <h2 className="serif text-3xl font-semibold mt-2">{isBook ? 'A leer 📖' : 'A disfrutar 🍿'}</h2>
        <p className="text-mute">{cand.item.title}</p>
        {!isBook && plat && (
          <button onClick={() => setToast('En la demo no abre la plataforma')} className="min-h-[52px] px-6 rounded-2xl bg-accent text-accent-ink font-semibold flex items-center gap-2"><Icon name="tv" size={20} /> Abrir en {plat}</button>
        )}
        <button onClick={() => { setStatus(cand.item.id, 'seen'); setRating(cand.item.id) }} className="min-h-[48px] px-6 rounded-2xl bg-surface border border-line font-medium">Ya {isBook ? 'lo' : 'la'} he {isBook ? 'leído' : 'visto'}: valorar</button>
        <button onClick={reset} className="text-sm text-mute underline underline-offset-2 mt-1">Empezar de nuevo</button>
      </div>
    )
  } else if (phase === 'none') {
    body = (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3">
        <div className="text-5xl">🤷</div>
        <h2 className="serif text-2xl font-semibold">Se acabaron las candidatas</h2>
        <p className="text-mute text-sm">Prueba con otras respuestas, o guarda más pendientes en Descubrir.</p>
        <button onClick={reset} className="min-h-[50px] px-6 rounded-2xl bg-accent text-accent-ink font-semibold">Empezar de nuevo</button>
        <button onClick={() => nav('/descubrir')} className="text-sm text-mute underline underline-offset-2">Ir a Descubrir</button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col relative">
      <div className="safe-top px-5 pb-3 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{WIZARD_TITLE}</h1>
          {shelf && <div className="text-xs text-accent font-medium mt-0.5">{SHELF_LABEL[shelf].plural} · {titleOf(shelf)}</div>}
        </div>
        {shelf && phase !== 'shelf' && <button onClick={reset} className="min-h-[40px] px-4 rounded-full bg-surface2 border border-line text-sm font-medium flex items-center gap-1.5 active:scale-95 transition-transform"><Icon name="undo" size={15} /> Empezar de nuevo</button>}
      </div>
      {body}
      {rating && <RatingFlow key={rating} itemId={rating} withStars onDone={(m) => { setRating(null); if (m) setToast(m); reset() }} />}
      <AnimatePresence>{toast && <Toast key={toast} message={toast} onDone={() => setToast(null)} />}</AnimatePresence>
    </div>
  )
}
