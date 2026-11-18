import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { getItem, type Item, type ShelfType } from '@biblioteca/core'
import { posterShape } from '@biblioteca/core/src/lib/posterShape'
import { useShortcuts } from '../lib/useShortcuts'
import { Poster } from '../components/Poster'
import { Icon } from '../components/Icon'
import { titleOf } from './data'

/** espera antes de expandir con el ratón: evita que dos tiras se peleen mientras el muelle las mueve bajo el puntero */
const HOVER_MS = 70
const GAP = 6
const CTRL_H = 44

function useBox(ref: React.RefObject<HTMLElement | null>) {
  const [s, set] = useState({ w: 1000, h: 520 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const upd = () => set((o) => (o.w === el.clientWidth && o.h === el.clientHeight ? o : { w: el.clientWidth, h: el.clientHeight }))
    upd()
    const ro = new ResizeObserver(upd)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return s
}

/**
 * Acordeón vertical del ranking: tiras de póster en fila. La activa (al empezar, la primera del tramo, que es tu n.º 1
 * en el primer tramo) se ve ancha, con el póster entero, el puesto enorme hueco, título y año; las demás son tiras
 * estrechas con su puesto. Con el ratón (o el foco del teclado) se expande otra y la anterior se recoge, con muelle
 * (`layout` de framer-motion: transform, sin saltos de altura). Con mucho ranking se muestra un tramo y se pasa de tramo
 * con las flechas, los botones o arrastrando. Clic en la expandida abre la ficha.
 *
 * Se mide a sí mismo: ocupa la caja que le dé el padre (ancho y alto).
 */
export function RankAccordion({ ids, shelf, ranked = true, keys = true, label }: { ids: string[]; shelf: ShelfType; ranked?: boolean; keys?: boolean; label: string }) {
  const nav = useNavigate()
  const reduce = useReducedMotion()
  const box = useRef<HTMLDivElement>(null)
  const { w: W, h: H0 } = useBox(box)
  const ratio = posterShape(shelf) === 'square' ? 1 : 2 / 3

  // geometría: la expandida (póster + ficha) como mucho ~52 % del ancho; las tiras, ~15 % del alto del póster
  const H = Math.max(240, H0 - CTRL_H)
  const posterH = Math.round(Math.min(H, (W * 0.52) / (ratio + 0.5)))
  const posterW = Math.round(posterH * ratio)
  const infoW = Math.round(Math.max(160, Math.min(300, posterH * 0.5)))
  const E = posterW + infoW
  const S = Math.round(Math.max(52, Math.min(88, posterH * 0.15)))
  const per = Math.max(3, Math.min(10, Math.floor((W - E) / (S + GAP)) + 1))
  const pages = Math.max(1, Math.ceil(ids.length / per))

  const [page, setPage] = useState(0)
  const [dir, setDir] = useState(1)
  const p = Math.min(page, pages - 1)
  const start = p * per
  const slice = ids.slice(start, start + per)
  const [active, setActive] = useState(start)
  const a = active >= start && active < start + slice.length ? active : start
  const hover = useRef<number | null>(null)
  const panned = useRef(false)
  const btns = useRef<Record<number, HTMLButtonElement | null>>({})

  // al cambiar de ranking o de tamaño, vuelve al principio del tramo
  useEffect(() => setActive((v) => Math.min(v, Math.max(0, ids.length - 1))), [ids.length])

  const goPage = (np: number, focusFirst = false) => {
    const q = Math.max(0, Math.min(pages - 1, np))
    if (q === p) return
    setDir(q > p ? 1 : -1)
    setPage(q)
    setActive(q * per)
    if (focusFirst) requestAnimationFrame(() => btns.current[q * per]?.focus())
  }
  const step = (d: 1 | -1) => {
    const n = a + d
    if (n < 0 || n >= ids.length) return
    const inside = box.current?.contains(document.activeElement)
    if (n < start || n >= start + per) {
      setDir(d)
      setPage(Math.floor(n / per))
    }
    setActive(n)
    if (inside) requestAnimationFrame(() => btns.current[n]?.focus())
  }
  useShortcuts({ arrowleft: () => step(-1), arrowright: () => step(1) }, keys && ids.length > 1)

  const intend = (i: number) => {
    if (hover.current) window.clearTimeout(hover.current)
    hover.current = window.setTimeout(() => setActive(i), HOVER_MS)
  }
  useEffect(() => () => { if (hover.current) window.clearTimeout(hover.current) }, [])

  const spring = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 320, damping: 34, mass: 0.9 }

  return (
    <div ref={box} className="absolute inset-0 flex flex-col" role="group" aria-roledescription="acordeón" aria-label={`${label}. Pasa el ratón o usa las flechas; Intro abre la ficha.`}>
      <motion.div
        className="relative flex-1 min-h-0 overflow-hidden touch-pan-y"
        onPanStart={() => (panned.current = true)}
        onPanEnd={(_, info) => {
          window.setTimeout(() => (panned.current = false), 60)
          if (info.offset.x < -80) goPage(p + 1)
          else if (info.offset.x > 80) goPage(p - 1)
        }}
        onMouseLeave={() => {
          if (hover.current) window.clearTimeout(hover.current)
          if (!box.current?.contains(document.activeElement)) setActive(start)
        }}
      >
        <AnimatePresence initial={false} mode="popLayout" custom={dir}>
          <motion.ol
            key={p}
            custom={dir}
            className="absolute inset-0 flex items-center"
            style={{ gap: GAP }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -dir * 60 }}
            transition={{ duration: reduce ? 0.12 : 0.28, ease: [0.2, 0.7, 0.2, 1] }}
          >
            {slice.map((id, k) => {
              const i = start + k
              const it = getItem(id) as Item | undefined
              if (!it) return null
              const on = i === a
              return (
                <li key={id} className="contents">
                  <motion.button
                    ref={(el) => { btns.current[i] = el }}
                    type="button"
                    layout
                    transition={spring}
                    aria-label={`${ranked ? `Puesto ${i + 1}: ` : ''}${titleOf(it)}, ${it.year}`}
                    aria-expanded={on}
                    onMouseEnter={() => intend(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => {
                      if (panned.current) return
                      if (on) nav(`/i/${it.id}`)
                      else setActive(i)
                    }}
                    className="relative shrink-0 overflow-hidden rounded-[14px] bg-surface outline-none focus-visible:ring-4 focus-visible:ring-ink/70 cursor-pointer"
                    style={{ width: on ? E : S, height: posterH }}
                  >
                    <Strip item={it} pos={i + 1} on={on} ranked={ranked} posterW={posterW} posterH={posterH} infoW={infoW} S={S} spring={spring} />
                  </motion.button>
                </li>
              )
            })}
          </motion.ol>
        </AnimatePresence>
      </motion.div>

      {pages > 1 && (
        <div className="shrink-0 flex items-center gap-3 pt-3" style={{ height: CTRL_H }}>
          <button type="button" onClick={() => goPage(p - 1, true)} disabled={p === 0} aria-label="Tramo anterior" className="w-10 h-10 rounded-full bg-surface2 text-ink flex items-center justify-center disabled:opacity-30 hover:bg-line transition-colors">
            <Icon name="chevron" size={18} strokeWidth={2.6} className="rotate-180" />
          </button>
          <button type="button" onClick={() => goPage(p + 1, true)} disabled={p >= pages - 1} aria-label="Tramo siguiente" className="w-10 h-10 rounded-full bg-surface2 text-ink flex items-center justify-center disabled:opacity-30 hover:bg-line transition-colors">
            <Icon name="chevron" size={18} strokeWidth={2.6} />
          </button>
          <span className="text-[14px] text-ink/70 tabular-nums">
            {start + 1}–{start + slice.length} de {ids.length}
          </span>
        </div>
      )}
    </div>
  )
}

function Strip({ item, pos, on, ranked, posterW, posterH, infoW, S, spring }: { item: Item; pos: number; on: boolean; ranked: boolean; posterW: number; posterH: number; infoW: number; S: number; spring: object }) {
  // el bloque interior tiene el ancho de la expandida y va anclado a la izquierda; recogida, se corre para que la tira
  // enseñe el centro del póster. `layout` corrige la escala del muelle para que nada se deforme.
  const shift = on ? 0 : -(posterW - S) / 2
  const first = pos === 1
  return (
    <motion.div layout transition={spring} className="absolute left-0 top-0 flex" style={{ width: posterW + infoW, height: posterH }} animate={{ x: shift }}>
      <div className="relative shrink-0" style={{ width: posterW, height: posterH }}>
        <Poster item={item} showTitle={false} className="absolute inset-0 w-full h-full" />
        {/* recogida: velo y puesto, solo en la franja visible */}
        <motion.div
          aria-hidden
          className="absolute top-0 bottom-0 flex flex-col justify-end items-center pb-3"
          style={{ left: (posterW - S) / 2, width: S, background: 'linear-gradient(to top, rgb(10 9 8 / 0.9), rgb(10 9 8 / 0.35) 45%, rgb(10 9 8 / 0.25))' }}
          animate={{ opacity: on ? 0 : 1 }}
          transition={{ duration: 0.18 }}
        >
          {ranked && <span className={`display leading-[0.8] ${first ? 'text-accent' : 'text-white'}`} style={{ fontSize: Math.round(S * 0.62) }}>{pos}</span>}
        </motion.div>
      </div>
      {/* ficha de la expandida, sobre fondo liso: siempre legible */}
      <motion.div
        className="relative shrink-0 bg-surface flex flex-col justify-end px-5 pb-5 pt-4 text-left overflow-hidden"
        style={{ width: infoW, height: posterH }}
        animate={{ opacity: on ? 1 : 0 }}
        transition={{ duration: on ? 0.22 : 0.1, delay: on ? 0.08 : 0 }}
      >
        {ranked && (
          <span
            aria-hidden
            className="display absolute left-4 top-2 leading-[0.8]"
            style={{
              fontSize: Math.round(Math.min(infoW * (pos > 99 ? 0.5 : pos > 9 ? 0.72 : 1.05), posterH * 0.5)),
              color: 'transparent',
              WebkitTextStroke: `3px ${first ? 'var(--color-accent)' : 'var(--color-ink)'}`,
            }}
          >
            {pos}
          </span>
        )}
        <div className="text-[clamp(18px,1.5vw,26px)] leading-[1.1] font-semibold text-ink line-clamp-3">{titleOf(item)}</div>
        <div className="text-[15px] text-ink/80 mt-1.5 truncate">{item.year}{item.creator ? ` · ${item.creator}` : ''}</div>
        <div className="text-[13px] text-mute mt-3 flex items-center gap-1">Ver la ficha <Icon name="chevron" size={13} strokeWidth={2.6} /></div>
      </motion.div>
    </motion.div>
  )
}
