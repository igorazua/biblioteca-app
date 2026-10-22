// app/src/components/DuelVariants.tsx
// Diseños del duelo A/B para probarlos en el móvil (REFERENCIAS_UI, 21/10/2026). Igor quiere que todos respondan
// al gesto (se ve qué estás votando mientras arrastras) y que el póster se vea entero, nunca recortado.
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { animate, motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion'
import { haptic } from '../lib/haptics'
import type { Side } from './SwipePair'

export type DuelStyle = 'diagonal' | 'entero' | 'abanico'
export const DUEL_STYLES: { id: DuelStyle; name: string }[] = [
  { id: 'diagonal', name: '1 · Diagonal (actual)' },
  { id: 'entero', name: '2 · Diagonal con póster entero' },
  { id: 'abanico', name: '3 · Cartas en abanico' },
]

const KEY = 'biblioteca-duel-style'
const EVT = 'duel-style-change'

/** Estilo elegido, guardado en este móvil (es solo para pruebas; no va al store ni a la nube). */
export function useDuelStyle(): [DuelStyle, () => void] {
  const read = (): DuelStyle => {
    try {
      const v = localStorage.getItem(KEY) as DuelStyle | null
      return DUEL_STYLES.some((s) => s.id === v) ? (v as DuelStyle) : 'diagonal'
    } catch {
      return 'diagonal'
    }
  }
  const [style, setStyle] = useState<DuelStyle>(read)
  useEffect(() => {
    const on = () => setStyle(read())
    window.addEventListener(EVT, on)
    return () => window.removeEventListener(EVT, on)
  }, [])
  const next = () => {
    const i = DUEL_STYLES.findIndex((s) => s.id === style)
    const n = DUEL_STYLES[(i + 1) % DUEL_STYLES.length].id
    try {
      localStorage.setItem(KEY, n)
    } catch {
      /* sin almacenamiento: solo cambia en esta sesión */
    }
    setStyle(n)
    window.dispatchEvent(new Event(EVT))
  }
  return [style, next]
}

/**
 * Póster entero dentro de cualquier caja: la imagen se ve completa (sin recortar logos ni fotos apaisadas)
 * y el hueco sobrante lo rellena la misma imagen, difuminada.
 */
export function FullPoster({ side, className = '' }: { side: Side; className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <div className="absolute -inset-6 blur-2xl opacity-70 scale-110">{side.bg}</div>
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-0 [&_img]:object-contain">{side.bg}</div>
    </div>
  )
}

/** Tamaño en px de una caja (se actualiza al girar el móvil o cambiar la ventana). */
export function useBoxSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 375, h: 600 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const upd = () => setSize((o) => (o.w === el.offsetWidth && o.h === el.offsetHeight ? o : { w: el.offsetWidth, h: el.offsetHeight }))
    upd()
    const ro = new ResizeObserver(upd)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return size
}

const FAN_COMMIT = 0.28 // fracción del ancho para elegir al soltar (igual que el diseño 1)
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k

/** Reparto de la mesa del abanico según el tamaño disponible. */
function fanLayout(w: number, h: number) {
  const qTop = 64 // hueco de la pregunta
  const hintH = 64 // hueco de la pista inferior (y de la pastilla de diseño)
  const titleH = 56
  const gap = 14
  const availH = Math.max(220, h - qTop - hintH)
  const cardW = Math.min(w * 0.48, (availH - titleH - gap) / 1.5)
  const cardH = cardW * 1.5
  const top = qTop + (availH - (cardH + gap + titleH)) / 2
  return {
    w,
    h,
    cardW,
    cardH,
    cy: top + cardH / 2,
    titleTop: top + cardH + gap,
    cx: { a: w * 0.3, b: w * 0.7 },
    fitW: Math.min(w, h / 1.5), // el póster entero, de borde a borde en ancho o en alto
  }
}
type FanLayout = ReturnType<typeof fanLayout>

/**
 * 3 · Cartas en abanico, sin arrastre libre. Se desliza en horizontal en cualquier parte: a la derecha elige la carta
 * de la izquierda, a la izquierda la de la derecha («empujarla hacia el centro»). La elegida sigue una trayectoria fija
 * hacia el centro, se endereza y crece hasta casi llenar la pantalla; la otra se apaga. Todo va ligado al progreso del gesto.
 */
export function DuelFan({ left, right, onChoose, question }: { left: Side; right: Side; onChoose: (w: 'a' | 'b') => void; question?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const size = useBoxSize(box)
  const L = fanLayout(size.w, size.h)
  const lay = useRef(L)
  lay.current = L
  const x = useMotionValue(0)
  const [picked, setPicked] = useState<null | 'a' | 'b'>(null)
  const dragged = useRef(false)
  const W = () => box.current?.offsetWidth ?? lay.current.w

  useEffect(() => {
    setPicked(null)
    x.set(0)
  }, [left.key, right.key, x])

  // q: -1 (elige la de la derecha) … 1 (elige la de la izquierda)
  const q = useTransform(x, (v) => Math.max(-1, Math.min(1, v / (W() * FAN_COMMIT))))
  const gA = useTransform(q, (v) => Math.max(0, v))
  const gB = useTransform(q, (v) => Math.max(0, -v))
  const any = useTransform(q, (v) => Math.abs(v))
  const uiOp = useTransform(any, (v) => clamp01(1 - v * 1.7))
  const uiBlur = useTransform(any, (v) => `blur(${Math.min(1, v) * 9}px)`)

  const choose = (w: 'a' | 'b') => {
    if (picked) return
    setPicked(w)
    haptic('success')
    animate(x, w === 'a' ? W() * FAN_COMMIT : -W() * FAN_COMMIT, { type: 'spring', stiffness: 300, damping: 30 })
    setTimeout(() => onChoose(w), 420)
  }

  return (
    <motion.div
      ref={box}
      className="relative flex-1 min-h-0 -mx-4 overflow-hidden select-none"
      style={{ touchAction: 'pan-y' }}
      onPanStart={() => {
        dragged.current = true
      }}
      onPan={(_, info) => {
        if (!picked) x.set(info.offset.x)
      }}
      onPanEnd={(_, info) => {
        const ox = info.offset.x
        if (!picked) {
          if (Math.abs(ox) > W() * FAN_COMMIT || Math.abs(info.velocity.x) > 650) choose(ox > 0 ? 'a' : 'b')
          else animate(x, 0, { type: 'spring', stiffness: 420, damping: 32 })
        }
        setTimeout(() => {
          dragged.current = false
        }, 60)
      }}
      role="group"
      aria-label="Desliza a la derecha para elegir la carta de la izquierda, o a la izquierda para la de la derecha"
    >
      {/* Fondo difuminado de la elegida: aparece a medida que crece, para que no queden huecos vacíos */}
      <FanBackdrop side={left} g={gA} />
      <FanBackdrop side={right} g={gB} />

      <motion.p
        className="absolute inset-x-4 top-3 serif text-[22px] font-semibold text-center leading-tight pointer-events-none"
        style={{ opacity: uiOp, filter: uiBlur }}
      >
        {question ?? '¿Cuál prefieres?'}
      </motion.p>

      <FanCard side={left} which="a" g={gA} og={gB} lay={lay} picked={picked} onTap={() => { if (!dragged.current) choose('a') }} />
      <FanCard side={right} which="b" g={gB} og={gA} lay={lay} picked={picked} onTap={() => { if (!dragged.current) choose('b') }} />

      {/* Títulos: texto liso bajo cada carta, que se desvanece al crecer la elegida */}
      {(['a', 'b'] as const).map((k) => {
        const s = k === 'a' ? left : right
        const tw = L.w * 0.4
        return (
          <motion.div
            key={k}
            className="absolute pointer-events-none text-center"
            style={{ left: L.cx[k] - tw / 2, width: tw, top: L.titleTop, opacity: uiOp, filter: uiBlur }}
          >
            <div className="serif text-[16px] font-semibold leading-tight line-clamp-2" lang="es" style={{ textWrap: 'balance' } as React.CSSProperties}>
              {s.title}
            </div>
            {s.subtitle && <div className="text-[11.5px] text-mute mt-0.5 line-clamp-1">{s.subtitle}</div>}
          </motion.div>
        )
      })}

      <motion.p
        className="absolute inset-x-4 bottom-12 text-center text-xs text-mute pointer-events-none"
        style={{ opacity: uiOp, filter: uiBlur }}
      >
        Empuja hacia el centro la que prefieras
      </motion.p>
    </motion.div>
  )
}

function FanBackdrop({ side, g }: { side: Side; g: MotionValue<number> }) {
  const opacity = useTransform(g, (v) => clamp01(v) * 0.95)
  return (
    <motion.div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity }} aria-hidden>
      <div className="absolute -inset-8 blur-2xl scale-110">{side.bg}</div>
      <div className="absolute inset-0 bg-black/55" />
    </motion.div>
  )
}

function FanCard({
  side,
  which,
  g,
  og,
  lay,
  picked,
  onTap,
}: {
  side: Side
  which: 'a' | 'b'
  g: MotionValue<number>
  og: MotionValue<number>
  lay: RefObject<FanLayout>
  picked: null | 'a' | 'b'
  onTap: () => void
}) {
  const isLeft = which === 'a'
  const L = lay.current
  const rot0 = isLeft ? -6 : 6
  // Trayectoria fija: del sitio de reposo al centro, en línea recta; no depende del dedo en vertical.
  const tx = useTransform(g, (v) => (lay.current.w / 2 - lay.current.cx[which]) * v)
  const ty = useTransform(g, (v) => (lay.current.h / 2 - lay.current.cy) * v)
  const rotate = useTransform(g, (v) => rot0 * (1 - v))
  const grow = useTransform(g, (v) => lerp(1, lay.current.fitW / lay.current.cardW, v))
  // la otra se aparta y se apaga
  const ox = useTransform(og, (v) => (isLeft ? -1 : 1) * lay.current.w * 0.22 * v)
  const oScale = useTransform(og, (v) => 1 - 0.1 * v)
  const x = useTransform([tx, ox] as MotionValue<number>[], ([a, b]: number[]) => a + b)
  const scale = useTransform([grow, oScale] as MotionValue<number>[], ([a, b]: number[]) => a * b)
  const opacity = useTransform(og, (v) => clamp01(1 - v * 1.15))
  const zIndex = useTransform(g, (v) => (v > 0.01 ? 4 : 2))
  const shadow = useTransform(g, (v) => `0 ${lerp(18, 6, v)}px ${lerp(36, 20, v)}px -10px rgba(0,0,0,${lerp(0.65, 0.4, v)})`)

  return (
    <motion.button
      type="button"
      onClick={onTap}
      aria-label={`Elegir ${side.title}`}
      disabled={!!picked}
      className="absolute outline-none"
      style={{
        left: L.cx[which] - L.cardW / 2,
        top: L.cy - L.cardH / 2,
        width: L.cardW,
        height: L.cardH,
        x,
        y: ty,
        rotate,
        scale,
        opacity,
        zIndex,
        boxShadow: shadow,
        borderRadius: 18,
        touchAction: 'pan-y',
      }}
    >
      <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: 'inherit' }}>
        <FullPoster side={side} />
      </div>
    </motion.button>
  )
}
