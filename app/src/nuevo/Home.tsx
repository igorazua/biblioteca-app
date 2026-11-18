import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { getItem, items, itemsOfType, SHELF_LABEL, type ShelfType } from '@biblioteca/core'
import { posterShape } from '@biblioteca/core/src/lib/posterShape'
import { useStore } from '../store/useStore'
import { useMyShelves } from '../lib/myShelves'
import { useCompareOverview } from '../lib/useCompareOverview'
import { Poster } from '../components/Poster'
import { Icon } from '../components/Icon'
import { PosterRing } from './Ring'
import { RankAccordion } from './RankAccordion'
import { SHELF_TINT, titleOf, useAllShelves, useCatalogFor, useViewportH, type ShelfData } from './data'

const SPRING = { type: 'spring', stiffness: 260, damping: 26 } as const

export function Home() {
  const order = useMyShelves()
  useCatalogFor(order)
  const shelves = useAllShelves(order)
  const name = useStore((s) => s.profile.name.split(' ')[0])

  // la estantería del escaparate: la primera con ranking; si no, la primera con algo visto
  const firstGood = shelves.find((s) => s.ranked.length > 0) ?? shelves.find((s) => s.seen > 0) ?? shelves[0]
  const [heroShelf, setHeroShelf] = useState<ShelfType | null>(null)
  const hero = shelves.find((s) => s.shelf === heroShelf) ?? firstGood

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden no-scrollbar">
      {hero && <Hero data={hero} shelves={shelves} onShelf={setHeroShelf} name={name} />}
      <Folders shelves={shelves} />
      <Doors shelves={shelves} />
      <footer className="px-10 pt-24 pb-10">
        <div className="display text-[18vw] leading-[0.78] text-surface2 select-none" aria-hidden>Biblioteca</div>
      </footer>
    </div>
  )
}

// ── Escaparate: tu ranking en acordeón 3D (la n.º 1 de frente, las demás de canto) ───────────────────────────
function Hero({ data, shelves, onShelf, name }: { data: ShelfData; shelves: ShelfData[]; onShelf: (s: ShelfType) => void; name: string }) {
  const vh = useViewportH()
  const reduce = useReducedMotion()
  const label = SHELF_LABEL[data.shelf]
  // el número 1 sale solo del ranking: una obra sin ordenar no se presenta como tu favorita
  const top = data.ranked[0] ? getItem(data.ranked[0]) : null
  // sin ranking, el anillo queda como decoración (sin nada en el centro): tus vistas o el catálogo de la estantería
  const ringIds = useMemo(() => {
    const own = data.unranked.slice(0, 20)
    if (own.length >= 4) return own
    return itemsOfType(data.shelf).slice(0, 18).map((i) => i.id)
  }, [data])
  const scale = Math.min(1.25, Math.max(0.7, vh / 940))

  return (
    <section className="relative h-screen min-h-[640px] flex" aria-label="Tu escaparate">
      {/* texto: columna izquierda, sobre fondo liso para que se lea siempre */}
      <div className="relative z-10 w-[30%] min-w-[340px] max-w-[520px] pl-10 pr-6 pt-28 pb-10 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={data.shelf + (top?.id ?? '')}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
            transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
            className="flex flex-col"
          >
            {top ? (
              <>
                <p className="text-[17px] text-ink/80">{name}, así va tu ranking de</p>
                <h1 className="display text-ink mt-2 text-[clamp(64px,6.4vw,124px)] leading-[0.84]">{label.plural}</h1>
                <p className="text-[15px] text-mute mt-5 max-w-[34ch]">
                  {data.ranked.length > 1 ? `${data.ranked.length} en tu ranking, con tu número 1 delante.` : 'Tu número 1 aún no tiene rivales: haz duelos.'}
                  {data.unranked.length > 0 && ` ${data.unranked.length} esperan su sitio.`}
                </p>
              </>
            ) : (
              <>
                <p className="text-[17px] text-ink/80">{name}, aún no tienes número 1 en {label.plural.toLowerCase()}</p>
                <h1 className="display text-ink mt-3 text-[clamp(56px,5.6vw,112px)] leading-[0.86]">
                  {data.seen >= 2 ? 'Decide cuál manda' : 'Empieza por lo que ya has visto'}
                </h1>
                {data.seen > 0 && <p className="text-[15px] text-mute mt-6 max-w-[34ch]">{data.seen} {label.seen} sin ordenar todavía. Unos duelos y sale tu número 1.</p>}
              </>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-8">
              {data.seen >= 2 ? (
                <Link to={`/nuevo/duelos/${data.shelf}`} className="h-13 px-7 rounded-full bg-accent text-accent-ink font-semibold text-[16px] flex items-center gap-2 hover:brightness-110 active:scale-[0.97] transition-[filter,transform]">
                  Ordenar con duelos <Icon name="chevron" size={16} strokeWidth={2.6} />
                </Link>
              ) : (
                <Link to={`/nuevo/descubrir/${data.shelf}`} className="h-13 px-7 rounded-full bg-accent text-accent-ink font-semibold text-[16px] flex items-center">
                  Descubrir {label.plural.toLowerCase()}
                </Link>
              )}
              {data.seen > 0 && (
                <Link to={`/nuevo/estanteria/${data.shelf}`} className="h-13 px-6 rounded-full bg-surface2 text-ink font-semibold text-[16px] flex items-center hover:bg-line transition-colors">
                  Ver la estantería
                </Link>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* cambio de estantería del escaparate */}
        <div className="mt-auto flex flex-wrap items-end gap-x-6 gap-y-2" role="tablist" aria-label="Estantería del escaparate">
          {shelves.map((s) => {
            const on = s.shelf === data.shelf
            return (
              <button
                key={s.shelf}
                role="tab"
                aria-selected={on}
                onClick={() => onShelf(s.shelf)}
                className={`display text-[30px] leading-none pb-1 relative transition-colors ${on ? 'text-ink' : 'text-ink/35 hover:text-ink/70'}`}
              >
                {SHELF_LABEL[s.shelf].plural}
                <sup className="ml-1 text-[14px] font-semibold not-italic" style={{ fontStretch: '100%' }}>{s.seen}</sup>
                {on && <motion.span layoutId="hero-shelf" className="absolute left-0 right-0 -bottom-1 h-[3px]" style={{ background: SHELF_TINT[s.shelf] }} transition={SPRING} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* derecha: el acordeón con tu ranking; sin ranking, el anillo como decoración */}
      <div className="relative flex-1 min-w-0 pt-24 pb-10 pr-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={data.shelf + (top ? ':r' : ':d')}
            className="absolute inset-0 pt-24 pb-10 pr-10"
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
            transition={{ ...SPRING, opacity: { duration: 0.25 } }}
          >
            {top ? (
              <div className="relative w-full h-full">
                <RankAccordion ids={data.ranked} shelf={data.shelf} label={`Tu ranking de ${label.plural.toLowerCase()}`} />
              </div>
            ) : (
              <PosterRing ids={ringIds} scale={scale} label={`${label.plural} del catálogo`} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}

// ── Estanterías como carpetas, con las carátulas asomando ─────────────────────────────────────────
function Folders({ shelves }: { shelves: ShelfData[] }) {
  const overview = useCompareOverview()
  return (
    <section className="px-10 pt-16" aria-labelledby="h-shelves">
      <h2 id="h-shelves" className="display text-[clamp(48px,5vw,88px)] leading-[0.9] text-ink">Tus estanterías</h2>
      <div className="flex items-end gap-6 overflow-x-auto no-scrollbar pt-32 pb-6">
        {shelves.map((s, i) => (
          <FolderCard key={s.shelf} data={s} pct={overview.shelves[s.shelf]?.ordenado ?? 0} lift={i % 2 === 1} />
        ))}
      </div>
    </section>
  )
}

const posterVariants = {
  rest: (i: number) => ({ y: 0, x: (i - 1) * 18, rotate: (i - 1) * 3 }),
  open: (i: number) => ({ y: -118 + Math.abs(i - 1) * 26, x: (i - 1) * 74, rotate: (i - 1) * 11 }),
}

function FolderCard({ data, pct, lift }: { data: ShelfData; pct: number; lift: boolean }) {
  const reduce = useReducedMotion()
  const label = SHELF_LABEL[data.shelf]
  const tint = SHELF_TINT[data.shelf]
  const ids = [...data.ranked, ...data.unranked, ...data.pending].slice(0, 3)
  const square = posterShape(data.shelf) === 'square'
  // el orden visual: la del centro (la mejor) delante
  const order = ids.length === 3 ? [1, 0, 2] : ids.map((_, i) => i)
  return (
    <motion.div initial="rest" animate="rest" whileHover="open" whileFocus="open" className={`shrink-0 ${lift ? 'mb-10' : ''}`}>
      <Link
        to={data.seen ? `/nuevo/estanteria/${data.shelf}` : `/nuevo/descubrir/${data.shelf}`}
        className="relative block w-[300px] h-[380px] focus-visible:outline-offset-4"
        aria-label={`${label.plural}: ${data.seen} ${label.seen}, ${pct} % ordenado`}
      >
        {/* trasera de la carpeta, con la pestaña del color de la estantería */}
        <div className="absolute inset-x-0 bottom-0 top-6" style={{ background: tint, clipPath: 'polygon(0 0, 44% 0, 52% 22px, 100% 22px, 100% 100%, 0 100%)', opacity: 0.9 }} />
        {/* carátulas dentro */}
        <div className="absolute inset-x-0 top-14 flex justify-center">
          {order.map((k) => {
            const it = getItem(ids[k])
            if (!it) return null
            return (
              <motion.div
                key={ids[k]}
                custom={k}
                variants={reduce ? undefined : posterVariants}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                className="absolute"
                style={{ width: 128, height: square ? 128 : 192, zIndex: k === 1 ? 2 : 1 }}
              >
                <Poster item={it} className="w-full h-full" />
              </motion.div>
            )
          })}
        </div>
        {/* frontal */}
        <motion.div
          className="absolute inset-x-0 bottom-0 h-[64%] bg-surface2 px-6 pb-6 flex flex-col justify-end"
          style={{ clipPath: 'polygon(0 18px, 62% 18px, 70% 0, 100% 0, 100% 100%, 0 100%)' }}
          variants={reduce ? undefined : { rest: { y: 0 }, open: { y: 8 } }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        >
          <div className="display text-[112px] leading-[0.8] text-ink">{data.seen}</div>
          <div className="mt-3 flex items-baseline justify-between gap-3">
            <span className="text-[22px] font-semibold text-ink">{label.plural}</span>
            <span className="text-[14px] text-ink/75 tabular-nums">{data.seen ? `${pct} % ordenado` : 'Vacía'}</span>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  )
}

// ── Puertas: Duelos, Descubrir y Decidir como marcapáginas con su cifra enorme ──────────────────
function Doors({ shelves }: { shelves: ShelfData[] }) {
  const entries = useStore((s) => s.entries)
  const toPlace = shelves.reduce((n, s) => n + s.unranked.length, 0)
  const ranked = shelves.reduce((n, s) => n + s.ranked.length, 0)
  const pending = shelves.reduce((n, s) => n + s.pending.length, 0)
  const [left, setLeft] = useState(0)
  useEffect(() => {
    const active = new Set(shelves.map((s) => s.shelf))
    setLeft(items.filter((i) => active.has(i.type) && !entries[i.id]).length)
  }, [entries, shelves])
  const fmt = (n: number) => n.toLocaleString('es-ES')

  return (
    <section className="px-10 pt-28" aria-label="Qué hacer ahora">
      <div className="grid grid-cols-[1.35fr_1fr_1fr] gap-6 items-end">
        <Bookmark
          to="/nuevo/duelos"
          figure={fmt(toPlace || ranked)}
          title="Duelos"
          line={toPlace ? 'obras esperan su sitio en tus rankings. Dos carátulas, eliges una, y el ranking se mueve.' : 'obras en tus rankings. Cada duelo afina el orden.'}
          duel
          tall
        />
        <Bookmark to="/nuevo/descubrir" figure={fmt(left)} title="Descubrir" line="obras del catálogo que aún no has marcado. Desliza: vista, pendiente o paso." />
        <Bookmark to="/decidir" figure={fmt(pending)} title="Decidir" line="pendientes. Te proponemos qué ver hoy entre ellas." />
      </div>
    </section>
  )
}

function Bookmark({ to, figure, title, line, duel, tall }: { to: string; figure: string; title: string; line: string; duel?: boolean; tall?: boolean }) {
  const reduce = useReducedMotion()
  return (
    <motion.div initial="rest" animate="rest" whileHover="open" whileFocus="open">
      <Link to={to} className={`relative bg-surface ${tall ? 'h-[440px]' : 'h-[360px]'} p-8 flex flex-col overflow-hidden`} style={{ clipPath: 'polygon(0 26px, 58% 26px, 64% 0, 100% 0, 100% 100%, 0 100%)' }}>
        {duel && (
          <span aria-hidden className="absolute top-0 right-0 w-[36%] h-[26px] flex">
            <span className="flex-1 bg-duel-a" />
            <span className="flex-1 bg-duel-b" />
          </span>
        )}
        <div className="mt-6 flex items-center justify-between">
          <span className="text-[24px] font-semibold text-ink">{title}</span>
          <motion.span variants={reduce ? undefined : { rest: { x: 0 }, open: { x: 6 } }} className="text-ink">
            <Icon name="chevron" size={22} strokeWidth={2.4} />
          </motion.span>
        </div>
        <motion.div
          className={`display ${tall ? 'text-[200px]' : 'text-[150px]'} leading-[0.78] text-ink mt-auto origin-bottom-left`}
          variants={reduce ? undefined : { rest: { scale: 1, y: 0 }, open: { scale: 1.05, y: -4 } }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        >
          {figure}
        </motion.div>
        <p className="text-[15px] text-ink/80 mt-4 max-w-[36ch]">{line}</p>
      </Link>
    </motion.div>
  )
}
