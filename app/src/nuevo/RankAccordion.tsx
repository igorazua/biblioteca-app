import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { getItem, type Item, type ShelfType } from '@biblioteca/core'
import { posterShape } from '@biblioteca/core/src/lib/posterShape'
import { useShortcuts } from '../lib/useShortcuts'
import { Poster } from '../components/Poster'
import { Icon } from '../components/Icon'
import { titleOf } from './data'

/** espera antes de abrir con el ratón: evita que dos portadas se peleen mientras el muelle las mueve bajo el puntero */
const HOVER_MS = 70
const CTRL_H = 44
/** giro de las portadas de canto (grados) */
const TURN = 68
/** hueco entre la ficha de la activa y la primera vecina, y entre la activa y la vecina de la izquierda */
const GAP = 16
/** hueco entre la portada activa y su ficha */
const INFO_GAP = 22

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

/** escala de una portada según su distancia a la activa: más pequeña hacia el fondo */
const scaleAt = (d: number) => (d === 0 ? 1 : Math.max(0.8, 0.92 - 0.022 * (Math.abs(d) - 1)))
/** velo oscuro de una portada de canto: más oscuro hacia el fondo */
const shadeAt = (d: number) => (d === 0 ? 0 : Math.min(0.62, 0.2 + 0.07 * (Math.abs(d) - 1)))

interface Geo {
  posterW: number
  posterH: number
  infoW: number
  /** paso entre portadas de canto */
  S: number
  /** semiancho proyectado de una portada de canto: lado que se acerca y lado que se aleja */
  near: number
  far: number
  persp: number
  /** lo que sobresale por arriba el borde cercano de la vecina de la activa (la perspectiva lo agranda desde la base) */
  over: number
}

/** Posiciones objetivo (en px desde el borde izquierdo de la hilera) con la activa en `a`. */
function layout(n: number, a: number, g: Geo) {
  const { posterW, infoW, S, near, far } = g
  const cx: number[] = new Array(n)
  const s1 = scaleAt(1)
  // izquierda: empaquetadas antes de la activa, la más lejana pegada al borde
  const activeLeft = a > 0 ? Math.round(near * scaleAt(a) + (a - 1) * S + far * s1 + GAP) : 0
  for (let k = 0; k < a; k++) cx[k] = activeLeft - GAP - far * s1 - (a - 1 - k) * S
  cx[a] = activeLeft + posterW / 2
  const infoLeft = activeLeft + posterW + INFO_GAP
  const infoRight = infoLeft + infoW
  for (let k = a + 1; k < n; k++) cx[k] = infoRight + GAP + far * s1 + (k - a - 1) * S
  const total = n - 1 > a ? cx[n - 1] + near * scaleAt(n - 1 - a) : infoRight
  return { cx, activeLeft, infoLeft, infoRight, total }
}

/**
 * Acordeón 3D del ranking: las portadas en fila, giradas casi de canto (≈68° en Y) y solapadas como libros de pie en un
 * estante visto en diagonal; más pequeñas y más oscuras cuanto más lejos de la activa. La activa (al empezar, la primera
 * del tramo: tu n.º 1 en el primer tramo) gira a 0° y queda de frente, grande, con el puesto en número hueco, título y
 * año al lado; empuja a las vecinas con un muelle. Al pasar el ratón se abre la que señalas y la anterior vuelve a
 * ponerse de canto; también con Tab y con ← →. Clic en la activa abre la ficha; clic en otra la activa. Con mucho
 * ranking se muestra un tramo y se pasa de tramo con las flechas, los botones o arrastrando.
 *
 * Profundidad: cada portada lleva su propia perspectiva (`transformPerspective`), así todas se ven con el mismo ángulo
 * esté donde esté, y la hilera NO usa preserve-3d entre portadas: así manda el z-index (más arriba cuanto más cerca de
 * la activa) y las portadas solapadas no se cortan entre sí. Dentro de cada portada sí hay preserve-3d para el lomo.
 * Solo se animan transform y opacity.
 *
 * Se mide a sí mismo: ocupa la caja que le dé el padre (ancho y alto).
 */
export function RankAccordion({ ids, shelf, ranked = true, keys = true, label }: { ids: string[]; shelf: ShelfType; ranked?: boolean; keys?: boolean; label: string }) {
  const nav = useNavigate()
  const reduce = useReducedMotion()
  const box = useRef<HTMLDivElement>(null)
  const { w: W, h: H0 } = useBox(box)
  const ratio = posterShape(shelf) === 'square' ? 1 : 2 / 3

  // ── geometría ─────────────────────────────────────────────────────────────────────────────────
  const H = Math.max(240, H0 - CTRL_H)
  const geo = useMemo<Geo>(() => {
    // la activa con su ficha ocupa como mucho ~50 % del ancho y llena el alto; el borde cercano de las vecinas crece
    // hacia arriba con la perspectiva (factor ≈ escala × persp / (persp − z)), así que el alto se recorta para que quepa
    const t = (TURN * Math.PI) / 180
    const make = (posterH: number) => {
      const posterW = Math.round(posterH * ratio)
      const persp = Math.round(Math.max(900, posterW * 3.2))
      const cw = (posterW / 2) * Math.cos(t)
      const sz = (posterW / 2) * Math.sin(t)
      const grow = Math.max(1, scaleAt(1) * (persp / (persp - sz)))
      return { posterW, persp, cw, sz, grow }
    }
    let posterH = Math.round(Math.min(H * 0.96, (W * 0.5) / (ratio + 0.55)))
    let m = make(posterH)
    if (posterH * m.grow > H * 0.98) {
      posterH = Math.floor((H * 0.98) / m.grow)
      m = make(posterH)
    }
    const { posterW, persp, cw, sz, grow } = m
    const infoW = Math.round(Math.max(170, Math.min(300, posterH * 0.55)))
    const near = cw * (persp / (persp - sz))
    const far = cw * (persp / (persp + sz))
    const S = Math.round(Math.max(30, Math.min(72, posterW * 0.19)))
    return { posterW, posterH, infoW, S, near, far, persp, over: Math.ceil(posterH * (grow - 1)) }
  }, [W, H, ratio])

  // cuántas caben por tramo: la peor colocación (activa en medio) tiene que caber en el ancho
  const per = useMemo(() => {
    let best = 2
    for (let n = 2; n <= 16; n++) {
      let worst = 0
      for (let a = 0; a < n; a++) worst = Math.max(worst, layout(n, a, geo).total)
      if (worst <= W) best = n
      else break
    }
    return best
  }, [geo, W])
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

  // al cambiar de ranking, que la activa siga existiendo
  useEffect(() => setActive((v) => Math.min(v, Math.max(0, ids.length - 1))), [ids.length])

  const n = slice.length
  const la = a - start
  const L = layout(n, la, geo)
  // la hilera va centrada según su colocación más ancha: así no baila de lado al cambiar de activa
  const maxTotal = useMemo(() => {
    let m = 0
    for (let k = 0; k < n; k++) m = Math.max(m, layout(n, k, geo).total)
    return m
  }, [n, geo])
  const offX = Math.max(0, Math.round((W - maxTotal) / 2))
  // centrada contando lo que sobresalen las vecinas por arriba
  const top = Math.max(geo.over, Math.round((H - geo.posterH - geo.over) / 2 + geo.over))

  const goPage = (np: number, focusFirst = false) => {
    const q = Math.max(0, Math.min(pages - 1, np))
    if (q === p) return
    setDir(q > p ? 1 : -1)
    setPage(q)
    setActive(q * per)
    if (focusFirst) requestAnimationFrame(() => btns.current[q * per]?.focus())
  }
  const step = (d: 1 | -1) => {
    const nx = a + d
    if (nx < 0 || nx >= ids.length) return
    const inside = box.current?.contains(document.activeElement)
    if (nx < start || nx >= start + per) {
      setDir(d)
      setPage(Math.floor(nx / per))
    }
    setActive(nx)
    if (inside) requestAnimationFrame(() => btns.current[nx]?.focus())
  }
  useShortcuts({ arrowleft: () => step(-1), arrowright: () => step(1) }, keys && ids.length > 1)

  const intend = (i: number) => {
    if (hover.current) window.clearTimeout(hover.current)
    if (i === a) return
    hover.current = window.setTimeout(() => setActive(i), HOVER_MS)
  }
  useEffect(() => () => { if (hover.current) window.clearTimeout(hover.current) }, [])

  /**
   * Qué portada señala el puntero, según la colocación OBJETIVO (no la animada): la activa y su ficha son una zona ancha;
   * de cada portada de canto se ve la franja entre el borde cercano de la anterior y el suyo. Solo se mira al mover el
   * ratón, así que el muelle no dispara cambios en cadena con el puntero quieto.
   */
  const pick = (px: number) => {
    const x = px - offX
    if (x >= L.activeLeft && x <= L.infoRight) return la
    if (x > L.infoRight) {
      for (let k = la + 1; k < n; k++) if (x <= L.cx[k] + geo.near * scaleAt(k - la)) return k
      return n - 1
    }
    for (let k = la - 1; k >= 0; k--) if (x >= L.cx[k] - geo.near * scaleAt(la - k)) return k
    return 0
  }

  const spring = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 260, damping: 30, mass: 0.9 }
  const activeItem = getItem(slice[la]) as Item | undefined

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
        onPointerMove={(e) => {
          if (e.pointerType !== 'mouse') return
          const r = e.currentTarget.getBoundingClientRect()
          const y = e.clientY - r.top
          if (y < top - geo.over || y > top + geo.posterH) return
          intend(start + pick(e.clientX - r.left))
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
            className="absolute inset-0"
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -dir * 60 }}
            transition={{ duration: reduce ? 0.12 : 0.28, ease: [0.2, 0.7, 0.2, 1] }}
          >
            {slice.map((id, k) => {
              const i = start + k
              const it = getItem(id) as Item | undefined
              if (!it) return null
              const d = k - la
              const on = d === 0
              return (
                <li key={id} className="contents">
                  <motion.button
                    ref={(el) => { btns.current[i] = el }}
                    type="button"
                    aria-label={`${ranked ? `Puesto ${i + 1}: ` : ''}${titleOf(it)}, ${it.year}`}
                    aria-current={on ? 'true' : undefined}
                    onFocus={() => setActive(i)}
                    onClick={() => {
                      if (panned.current) return
                      if (on) nav(`/i/${it.id}`)
                      else setActive(i)
                    }}
                    className="absolute left-0 rounded-[12px] outline-none focus-visible:ring-4 focus-visible:ring-ink/70 cursor-pointer"
                    style={{
                      top,
                      width: geo.posterW,
                      height: geo.posterH,
                      zIndex: 100 - Math.abs(d),
                      transformPerspective: geo.persp,
                      transformStyle: 'preserve-3d',
                      originX: 0.5,
                      originY: 1,
                    }}
                    initial={false}
                    animate={{
                      x: Math.round(offX + L.cx[k] - geo.posterW / 2),
                      rotateY: d === 0 ? 0 : d > 0 ? -TURN : TURN,
                      scale: scaleAt(d),
                    }}
                    transition={spring}
                  >
                    <Cover item={it} pos={i + 1} d={d} ranked={ranked} w={geo.posterW} h={geo.posterH} reduce={!!reduce} />
                  </motion.button>
                </li>
              )
            })}
          </motion.ol>
        </AnimatePresence>

        {/* ficha de la activa: plana, fuera del 3D, siempre legible; viaja con el muelle junto a su portada */}
        {activeItem && (
          <motion.div
            aria-hidden
            className="absolute left-0 cursor-pointer"
            style={{ top, width: geo.infoW, height: geo.posterH, zIndex: 120 }}
            // la ficha también abre la obra (el botón de la portada ya cubre teclado y lector de pantalla)
            onClick={() => {
              if (!panned.current) nav(`/i/${activeItem.id}`)
            }}
            initial={false}
            animate={{ x: Math.round(offX + L.infoLeft) }}
            transition={spring}
          >
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={activeItem.id}
                className="absolute inset-0 flex flex-col justify-end text-left"
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0, transition: { duration: reduce ? 0.1 : 0.24, delay: reduce ? 0 : 0.1 } }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
              >
                <Info item={activeItem} pos={a + 1} ranked={ranked} infoW={geo.infoW} posterH={geo.posterH} />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
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

/**
 * Una portada con lomo. El lomo son dos caras finas a 90° en los bordes (preserve-3d dentro de la portada); con
 * `backface-visibility: hidden` solo se ve la del borde que se acerca al girar. Encima de la cara, un velo que oscurece
 * las de canto hacia el fondo y, en el borde cercano, el puesto pequeño.
 */
function Cover({ item, pos, d, ranked, w, h, reduce }: { item: Item; pos: number; d: number; ranked: boolean; w: number; h: number; reduce: boolean }) {
  const t = Math.max(8, Math.round(w * 0.06))
  const fade = { duration: reduce ? 0 : 0.22 }
  const first = pos === 1
  const spine = (side: 'L' | 'R') => (
    <div
      aria-hidden
      className="absolute top-0"
      style={{
        left: side === 'R' ? w - t / 2 : -t / 2,
        width: t,
        height: h,
        transform: `translateZ(${-t / 2}px) rotateY(${side === 'R' ? 90 : -90}deg)`,
        backfaceVisibility: 'hidden',
        background: 'color-mix(in srgb, var(--color-surface2) 70%, black)',
        borderTop: '2px solid var(--color-line)',
        borderBottom: '2px solid var(--color-line)',
      }}
    />
  )
  return (
    <>
      {spine('L')}
      {spine('R')}
      <div className="absolute inset-0 rounded-[12px] overflow-hidden bg-surface" style={{ boxShadow: '0 24px 50px -22px rgb(0 0 0 / 0.8)' }}>
        <Poster item={item} showTitle={false} className="absolute inset-0 w-full h-full" />
        <motion.div aria-hidden className="absolute inset-0 bg-black" initial={false} animate={{ opacity: shadeAt(d) }} transition={fade} />
        {ranked && (
          <motion.span
            aria-hidden
            className={`display absolute bottom-3 leading-[0.8] ${first ? 'text-accent' : 'text-white'}`}
            // en el borde que se acerca: el derecho en las de la derecha, el izquierdo en las de la izquierda
            style={{ fontSize: Math.round(w * 0.2), ...(d < 0 ? { left: 12 } : { right: 12 }) }}
            initial={false}
            animate={{ opacity: d === 0 ? 0 : 1 }}
            transition={fade}
          >
            {pos}
          </motion.span>
        )}
      </div>
    </>
  )
}

/** Puesto enorme hueco (macizo en rojo si es el n.º 1), título y año. */
function Info({ item, pos, ranked, infoW, posterH }: { item: Item; pos: number; ranked: boolean; infoW: number; posterH: number }) {
  const first = pos === 1
  const size = Math.round(Math.min(infoW * (pos > 99 ? 0.52 : pos > 9 ? 0.78 : 1.1), posterH * 0.55))
  return (
    <>
      {ranked && (
        <span
          className="display absolute left-0 top-0 leading-[0.8]"
          style={
            first
              ? { fontSize: size, color: 'var(--color-accent)' }
              : { fontSize: size, color: 'transparent', WebkitTextStroke: '3px var(--color-ink)' }
          }
        >
          {pos}
        </span>
      )}
      <div className="text-[clamp(20px,1.6vw,28px)] leading-[1.1] font-semibold text-ink line-clamp-3">{titleOf(item)}</div>
      <div className="text-[16px] text-ink/80 mt-1.5 truncate">{item.year}{item.creator ? ` · ${item.creator}` : ''}</div>
      <div className="text-[14px] text-mute mt-3 flex items-center gap-1">Ver la ficha <Icon name="chevron" size={13} strokeWidth={2.6} /></div>
    </>
  )
}
