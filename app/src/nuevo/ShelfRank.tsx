import { useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { getItem, SHELF_LABEL, type Item, type ShelfType } from '@biblioteca/core'
import { posterShape } from '@biblioteca/core/src/lib/posterShape'
import { useMyShelves } from '../lib/myShelves'
import { useCompareOverview } from '../lib/useCompareOverview'
import { useShortcuts } from '../lib/useShortcuts'
import { Poster } from '../components/Poster'
import { Icon } from '../components/Icon'
import { useStore } from '../store/useStore'
import { SHELF_TINT, isShelf, titleOf, useCatalogFor, useShelfData, useViewportH } from './data'

/**
 * Estantería / ranking de una categoría. Arriba, tu top en un carrusel de foco (la carátula grande en el centro, las
 * demás pequeñas a los lados) con la ficha de la enfocada a la izquierda. Debajo, el ranking entero en columnas de
 * cartelera: puesto, carátula, título y año.
 */
export function ShelfRank() {
  const { type } = useParams()
  if (!isShelf(type)) return <Navigate to="/nuevo" replace />
  return <ShelfView key={type} shelf={type} />
}

const TOP = 10

function ShelfView({ shelf }: { shelf: ShelfType }) {
  useCatalogFor([shelf])
  const data = useShelfData(shelf)
  const order = useMyShelves()
  const overview = useCompareOverview()
  const entries = useStore((s) => s.entries)
  const reduce = useReducedMotion()
  const vh = useViewportH()
  const label = SHELF_LABEL[shelf]
  const pct = overview.shelves[shelf]?.ordenado ?? 0

  const ranked = data.ranked
  const topIds = (ranked.length ? ranked : data.unranked).slice(0, TOP)
  const [focus, setFocus] = useState(0)
  const f = Math.min(focus, Math.max(0, topIds.length - 1))
  const go = (d: number) => setFocus((v) => Math.max(0, Math.min(topIds.length - 1, Math.min(v, topIds.length - 1) + d)))
  useShortcuts({ arrowleft: () => go(-1), arrowright: () => go(1) }, topIds.length > 1)

  const focused = topIds[f] ? getItem(topIds[f]) : null
  const isRanked = ranked.length > 0
  const square = posterShape(shelf) === 'square'
  const h0 = Math.round(Math.min(560, Math.max(320, vh * 0.54)))
  const w0 = Math.round(square ? h0 : (h0 * 2) / 3)

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden no-scrollbar">
      <section className="relative h-screen min-h-[640px] flex" aria-label={`Tu top de ${label.plural.toLowerCase()}`}>
        {/* ficha de la enfocada */}
        <div className="relative z-10 w-[34%] pl-10 pr-6 pt-24 pb-10 flex flex-col">
          <div className="flex flex-wrap gap-x-5 gap-y-1" role="tablist" aria-label="Estantería">
            {order.map((s) => (
              <Link key={s} to={`/nuevo/estanteria/${s}`} role="tab" aria-selected={s === shelf} className={`display text-[26px] leading-none transition-colors ${s === shelf ? 'text-ink' : 'text-ink/35 hover:text-ink/70'}`}>
                {SHELF_LABEL[s].plural}
              </Link>
            ))}
          </div>
          <h1 className="display text-[clamp(88px,9vw,168px)] leading-[0.8] text-ink mt-6">{label.plural}</h1>
          <p className="text-[16px] text-ink/80 mt-3 tabular-nums">
            {data.seen} {label.seen} · <span style={{ color: SHELF_TINT[shelf] }}>{pct} % ordenado</span>
            {data.pending.length > 0 && ` · ${data.pending.length} pendientes`}
          </p>

          <div className="mt-auto min-h-[240px]">
            <AnimatePresence mode="wait">
              {focused && (
                <motion.div
                  key={focused.id}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
                  transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
                >
                  <div className="flex items-end gap-5">
                    <span className={`display text-[150px] leading-[0.76] ${isRanked && f === 0 ? 'text-accent' : 'text-ink'}`}>{isRanked ? f + 1 : '·'}</span>
                    <div className="min-w-0 pb-1">
                      <div className="text-[28px] leading-[1.08] font-semibold text-ink line-clamp-2">{titleOf(focused)}</div>
                      <div className="text-[16px] text-ink/80 mt-1 truncate">{focused.year} · {focused.creator}</div>
                      {entries[focused.id]?.stars ? <div className="text-[15px] text-ink mt-1" aria-label={`${entries[focused.id]?.stars} estrellas`}>{'★'.repeat(Math.round(entries[focused.id]!.stars!))}</div> : null}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-7">
                    <Link to={`/i/${focused.id}`} className="h-12 px-6 rounded-full bg-surface2 text-ink font-semibold flex items-center hover:bg-line transition-colors">Ver la ficha</Link>
                    {data.seen >= 2 && (
                      <Link to={`/nuevo/duelos/${shelf}`} className="h-12 px-6 rounded-full bg-accent text-accent-ink font-semibold flex items-center gap-2 hover:brightness-110 transition-[filter]">
                        Seguir ordenando <Icon name="chevron" size={15} strokeWidth={2.6} />
                      </Link>
                    )}
                  </div>
                  {!isRanked && <p className="text-[15px] text-mute mt-4">Aún sin ordenar: haz duelos para ver tu top de verdad.</p>}
                </motion.div>
              )}
            </AnimatePresence>
            {!focused && (
              <div>
                <p className="text-[18px] text-ink">Esta estantería está vacía.</p>
                <Link to={`/descubrir?shelf=${shelf}`} className="mt-5 h-12 px-6 rounded-full bg-accent text-accent-ink font-semibold inline-flex items-center">Descubrir {label.plural.toLowerCase()}</Link>
              </div>
            )}
          </div>
        </div>

        {/* carrusel de foco */}
        {topIds.length > 0 && (
          <FocusCarousel ids={topIds} focus={f} onFocus={setFocus} w0={w0} h0={h0} ranked={isRanked} reduce={!!reduce} />
        )}
      </section>

      {/* el ranking entero, en columnas de cartelera */}
      {ranked.length > 0 && (
        <section className="px-10 pt-10" aria-labelledby="h-all">
          <h2 id="h-all" className="display text-[clamp(48px,5vw,88px)] leading-[0.9] text-ink">Todo tu ranking</h2>
          <ol className="mt-10 columns-3 2xl:columns-4 gap-x-14">
            {ranked.map((id, i) => {
              const it = getItem(id)
              return it ? <BillRow key={id} item={it} pos={i + 1} onFocus={i < TOP ? () => { setFocus(i); document.querySelector('[data-scroll-top]')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }) } : undefined} /> : null
            })}
          </ol>
        </section>
      )}

      {data.unranked.length > 0 && (
        <section className="px-10 pt-20" aria-labelledby="h-new">
          <div className="flex items-end justify-between gap-6">
            <h2 id="h-new" className="display text-[clamp(40px,4vw,72px)] leading-[0.9] text-ink">Esperan su sitio · {data.unranked.length}</h2>
            {data.seen >= 2 && <Link to={`/nuevo/duelos/${shelf}`} className="h-12 px-6 rounded-full bg-surface2 text-ink font-semibold flex items-center hover:bg-line transition-colors shrink-0">Colocarlas con duelos</Link>}
          </div>
          <div className="mt-8 flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {data.unranked.map((id) => {
              const it = getItem(id)
              return it ? (
                <Link key={id} to={`/i/${id}`} className="shrink-0 w-[140px] group">
                  <div className={`relative w-full ${square ? 'aspect-square' : 'aspect-[2/3]'} overflow-hidden`}>
                    <Poster item={it} showTitle className="absolute inset-0 w-full h-full transition-transform duration-300 group-hover:scale-[1.04]" />
                  </div>
                  <div className="text-[14px] font-semibold text-ink mt-2 line-clamp-2">{titleOf(it)}</div>
                  <div className="text-[13px] text-mute">{it.year}</div>
                </Link>
              ) : null
            })}
          </div>
        </section>
      )}
      <div className="h-24" />
    </div>
  )
}

function FocusCarousel({ ids, focus, onFocus, w0, h0, ranked, reduce }: { ids: string[]; focus: number; onFocus: (i: number) => void; w0: number; h0: number; ranked: boolean; reduce: boolean }) {
  const SIDE = 0.56
  const gap = 28
  const panned = useRef(false)
  const xOf = (d: number) => {
    if (d === 0) return 0
    const s = Math.sign(d)
    const a = Math.abs(d)
    return s * (w0 / 2 + gap + (w0 * SIDE) / 2 + (a - 1) * (w0 * SIDE * 0.82))
  }
  return (
    <motion.div
      data-scroll-top
      className="absolute inset-y-0 right-0 left-[30%] touch-pan-y cursor-grab active:cursor-grabbing"
      role="group"
      aria-roledescription="carrusel"
      aria-label="Tu top. Usa las flechas o arrastra."
      onPanStart={() => (panned.current = true)}
      onPanEnd={(_, info) => {
        window.setTimeout(() => (panned.current = false), 60)
        const steps = Math.round(-(info.offset.x + info.velocity.x * 0.15) / (w0 * SIDE * 0.8))
        if (steps) onFocus(Math.max(0, Math.min(ids.length - 1, focus + steps)))
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: 30 }}>
        {ids.map((id, i) => {
          const it = getItem(id) as Item | undefined
          if (!it) return null
          const d = i - focus
          const a = Math.abs(d)
          const on = d === 0
          return (
            <motion.button
              key={id}
              type="button"
              tabIndex={on ? 0 : -1}
              aria-label={on ? `${ranked ? `Puesto ${i + 1}: ` : ''}${titleOf(it)}` : `Enfocar ${titleOf(it)}`}
              aria-current={on}
              onClick={() => !panned.current && onFocus(i)}
              className="absolute"
              style={{ width: w0, height: h0, zIndex: 50 - a, pointerEvents: a > 4 ? 'none' : 'auto' }}
              initial={false}
              animate={{
                x: xOf(d),
                scale: on ? 1 : SIDE,
                opacity: a > 4 ? 0 : 1,
              }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 28 }}
              whileHover={!on && !reduce ? { y: -10 } : undefined}
            >
              <Poster item={it} showTitle className="absolute inset-0 w-full h-full" />
              <motion.span aria-hidden className="absolute inset-0 bg-black pointer-events-none" animate={{ opacity: on ? 0 : Math.min(0.62, 0.22 + a * 0.1) }} />
              {ranked && (
                <span
                  aria-hidden
                  className={`absolute display leading-[0.8] ${on ? 'text-[120px] -left-6 -bottom-8' : 'text-[150px] left-3 bottom-2'} ${i === 0 ? 'text-accent' : 'text-ink'}`}
                  style={{ textShadow: '0 2px 18px rgb(0 0 0 / 0.55)' }}
                >
                  {i + 1}
                </span>
              )}
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}

function BillRow({ item, pos, onFocus }: { item: Item; pos: number; onFocus?: () => void }) {
  const square = posterShape(item.type) === 'square'
  return (
    <li className="break-inside-avoid">
      <Link
        to={`/i/${item.id}`}
        onClick={(e) => {
          if (onFocus) { e.preventDefault(); onFocus() }
        }}
        className="group flex items-center gap-4 py-2 pr-2 -ml-2 pl-2 rounded-lg hover:bg-surface transition-colors"
      >
        <span className={`display w-14 shrink-0 text-right text-[40px] leading-none tabular-nums ${pos === 1 ? 'text-accent' : 'text-ink/85'}`}>{pos}</span>
        <Poster item={item} showTitle={false} className={`w-11 ${square ? 'h-11' : 'h-[66px]'} shrink-0 object-cover`} />
        <span className="min-w-0">
          <span className="block text-[16px] font-semibold text-ink truncate group-hover:text-white">{titleOf(item)}</span>
          <span className="block text-[14px] text-mute">{item.year}{item.creator ? ` · ${item.creator}` : ''}</span>
        </span>
      </Link>
    </li>
  )
}
