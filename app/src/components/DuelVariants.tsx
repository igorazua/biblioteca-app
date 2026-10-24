// app/src/components/DuelVariants.tsx
// Diseño 3 (abanico) del duelo A/B: cartas que responden al gesto y póster entero (T19 §4.1).
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from 'framer-motion'
import { haptic } from '../lib/haptics'
import type { Side } from './SwipePair'

// ── Textos del duelo ────────────────────────────────────────────────────────────────────────────
export type DuelKind = 'rank' | 'decide'
export type DuelCopy = 'A' | 'B' | 'C'
export interface DuelTexts {
  /** pregunta del centro (diseños 1 y 2) o de encima de las cartas (diseño 3) */
  question: string
  /** línea pequeña: qué hace cada lado */
  hint: [string, string]
  /** texto al elegir: «{prefix}<título>» */
  prefix: string
  /** texto corto de la pastilla del diseño 2 (si es null, se usa el texto al elegir) */
  pill: string | null
}
export const DUEL_COPIES: { id: DuelCopy; name: string; texts: DuelTexts }[] = [
  { id: 'A', name: 'Sensación', texts: { question: 'Hoy me apetece más…', hint: ['← algo así', 'algo así →'], prefix: 'Más tipo ', pill: null } },
  { id: 'B', name: 'Rumbo', texts: { question: '¿Por dónde tiramos hoy?', hint: ['← por aquí', 'por aquí →'], prefix: 'Vamos por ', pill: null } },
  { id: 'C', name: 'Ambiente', texts: { question: 'Elige el ambiente', hint: ['← este rollo', 'este rollo →'], prefix: 'Apuntado: rollo ', pill: null } },
]
const RANK_TEXTS: DuelTexts = { question: '¿Cuál te gustó más?', hint: ['← esta', 'esta →'], prefix: 'Gana ', pill: '¡Genial!' }
export function duelTexts(kind: DuelKind, copy: DuelCopy): DuelTexts {
  return kind === 'rank' ? RANK_TEXTS : (DUEL_COPIES.find((c) => c.id === copy) ?? DUEL_COPIES[0]).texts
}

const COPY_KEY = 'biblioteca-duel-copy'
const COPY_EVT = 'duel-copy-change'
function readCopy(): DuelCopy {
  try {
    const v = localStorage.getItem(COPY_KEY) as DuelCopy | null
    return DUEL_COPIES.some((c) => c.id === v) ? (v as DuelCopy) : 'A'
  } catch {
    return 'A'
  }
}
/** Variante de texto de «Decidir», guardada en este móvil (solo para pruebas con usuarios). */
export function useDuelCopy(): [DuelCopy, (c: DuelCopy) => void] {
  const [copy, setCopy] = useState<DuelCopy>(readCopy)
  useEffect(() => {
    const on = () => setCopy(readCopy())
    window.addEventListener(COPY_EVT, on)
    return () => window.removeEventListener(COPY_EVT, on)
  }, [])
  const set = (c: DuelCopy) => {
    try {
      localStorage.setItem(COPY_KEY, c)
    } catch {
      /* sin almacenamiento */
    }
    setCopy(c)
    window.dispatchEvent(new Event(COPY_EVT))
  }
  return [copy, set]
}

/** Milisegundos que dura la confirmación antes de pasar al siguiente duelo (el ✓ se dibuja despacio). */
export const pickDelay = (reduce: boolean | null) => (reduce ? 600 : 1050)
/** En Comparar se encadenan duelos a toda velocidad: solo lo justo para ver la carta elegida moverse. */
const FAST_DELAY = 170
/** En Decidir, sin texto de confirmación: el borde iluminado basta (Igor, 23/10). */
const DECIDE_DELAY = 380

/** «Gana *título*» con el título en cursiva serif. */
export function Chosen({ texts, title }: { texts: DuelTexts; title: string }) {
  return (
    <>
      {texts.prefix}
      <em className="serif italic font-semibold">{title}</em>
    </>
  )
}

// ── Confirmaciones al elegir ────────────────────────────────────────────────────────────────────
/**
 * Común a los tres diseños, en el centro de la pantalla: el texto («Gana *título*») sale al instante y grande, y
 * debajo un ✓ pequeño que se dibuja despacio (primero el círculo, luego el tick).
 */
function PickBadge({ color, texts, title, reduce }: { color: string; texts: DuelTexts; title: string; reduce: boolean | null }) {
  return (
    <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center px-6" aria-live="polite">
      <div
        className="max-w-full flex flex-col items-center gap-3 rounded-2xl bg-bg/85 border border-line px-6 pt-4 pb-3.5 shadow-2xl"
      >
        <div className="text-center text-[22px] leading-[1.15] text-ink line-clamp-3" style={{ textWrap: 'balance' } as React.CSSProperties}>
          <Chosen texts={texts} title={title} />
        </div>
        <svg viewBox="0 0 36 36" width="28" height="28" fill="none" aria-hidden>
          <motion.circle
            cx="18" cy="18" r="15.5"
            stroke={color} strokeWidth="2.2" strokeLinecap="round"
            transform="rotate(-90 18 18)"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.08, ease: 'easeInOut' }}
          />
          <motion.path
            d="M11.5 18.5 L16 23 L24.5 13.5"
            stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.36, delay: 0.56, ease: 'easeOut' }}
          />
        </svg>
      </div>
    </div>
  )
}

/** Borde en la carta elegida, más la confirmación común. */
export function PickStrip({ color, card, texts, title, reduce }: { color: string; card: { left: number; top: number; w: number; h: number; r: number }; texts: DuelTexts; title: string; reduce: boolean | null }) {
  return (
    <>
      <PickBadge color={color} texts={texts} title={title} reduce={reduce} />
    </>
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

const FIT_MARGIN = 26 // px libres alrededor de la carta elegida a tamaño completo
const IDLE_HINT_FIRST_MS = 4800 // solo para usuarios noveles: espera previa a la primera insinuación
const FAN_COMMIT = 0.28 // fracción del ancho para elegir al soltar (igual que el diseño 1)
const LEARNED_KEY = 'biblioteca-duel-learned'

export function isDuelLearned(): boolean {
  try {
    return localStorage.getItem(LEARNED_KEY) === 'true'
  } catch {
    return false
  }
}

export function markDuelLearned() {
  try {
    localStorage.setItem(LEARNED_KEY, 'true')
  } catch {}
}
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k

/** Reparto de la mesa del abanico según el tamaño disponible. */
function fanLayout(w: number, h: number) {
  const padTop = 8
  const qH = 0 // la pregunta va en la cabecera de la pantalla (SISTEMA_DISENO §5.5)
  const qGap = 0
  const hintH = 64 // hueco de la pista inferior (y de la pastilla de diseño)
  const titleH = 56
  const gap = 14
  const availH = Math.max(220, h - padTop - hintH)
  const cardW = Math.min(w * 0.48, (availH - qH - qGap - titleH - gap) / 1.5)
  const cardH = cardW * 1.5
  const blockH = qH + qGap + cardH + gap + titleH
  const qTop = padTop + Math.max(0, (availH - blockH) / 2)
  const top = qTop + qH + qGap
  return {
    w,
    h,
    cardW,
    cardH,
    qTop,
    qH,
    cy: top + cardH / 2,
    titleTop: top + cardH + gap,
    cx: { a: w * 0.3, b: w * 0.7 },
    // el póster entero, con un margen igual por los cuatro lados para que el borde iluminado no se corte
    fitW: Math.min(w - 2 * FIT_MARGIN, (h - 2 * FIT_MARGIN) / 1.5),
  }
}
type FanLayout = ReturnType<typeof fanLayout>

/**
 * 3 · Cartas en abanico, sin arrastre libre. Se desliza en horizontal en cualquier parte: a la derecha elige la carta
 * de la izquierda, a la izquierda la de la derecha («empujarla hacia el centro»). La elegida sigue una trayectoria fija
 * hacia el centro, se endereza y crece hasta casi llenar la pantalla; la otra se apaga. Todo va ligado al progreso del gesto.
 */
export function DuelFan({ left, right, onChoose, texts, fast = false }: { left: Side; right: Side; onChoose: (w: 'a' | 'b') => void; texts: DuelTexts; /** sin confirmación central y casi sin espera (Comparar) */ fast?: boolean }) {
  const reduce = useReducedMotion()
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

  // Pista solo la primera vez si el usuario es nuevo y tarda en interactuar.
  // En cuanto interactúa o se insinúa una vez, queda aprendido y nunca más se mueve solo.
  const touched = useRef(false)
  useEffect(() => {
    touched.current = false
    if (reduce || isDuelLearned()) return

    let stop: (() => void) | null = null
    const hint = () => {
      if (touched.current || dragged.current) return
      // Amplitud sutil (~8-11px): un leve vaivén orgánico que insinúa el eje sin distraer
      const d = Math.min(11, Math.max(7, W() * FAN_COMMIT * 0.11))
      const ctl = animate(x, [0, d, 0, -d, 0], { duration: 1.6, times: [0, 0.22, 0.48, 0.72, 1], ease: 'easeInOut' })
      stop = () => ctl.stop()
      markDuelLearned()
    }
    const timer = window.setTimeout(hint, IDLE_HINT_FIRST_MS)
    return () => {
      window.clearTimeout(timer)
      stop?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left.key, right.key, reduce])

  // q: -1 (elige la de la derecha) … 1 (elige la de la izquierda)
  const q = useTransform(x, (v) => Math.max(-1, Math.min(1, v / (W() * FAN_COMMIT))))
  const gA = useTransform(q, (v) => Math.max(0, v))
  const gB = useTransform(q, (v) => Math.max(0, -v))
  const any = useTransform(q, (v) => Math.abs(v))
  const uiOp = useTransform(any, (v) => clamp01(1 - v * 1.7))
  const uiBlur = useTransform(any, (v) => `blur(${Math.min(1, v) * 9}px)`)

  const choose = (w: 'a' | 'b') => {
    if (picked) return
    touched.current = true
    markDuelLearned()
    setPicked(w)
    haptic('success')
    const to = w === 'a' ? W() * FAN_COMMIT : -W() * FAN_COMMIT
    animate(x, to, reduce ? { duration: 0 } : fast ? { duration: 0.16, ease: 'easeOut' } : { type: 'spring', stiffness: 300, damping: 30 })
    setTimeout(() => onChoose(w), fast ? FAST_DELAY : reduce ? pickDelay(reduce) : DECIDE_DELAY)
  }

  return (
    <motion.div
      ref={box}
      className="relative flex-1 min-h-0 -mx-4 overflow-hidden select-none"
      style={{ touchAction: 'pan-y' }}
      onPanStart={() => {
        dragged.current = true
        touched.current = true
        markDuelLearned()
        x.stop()
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

      <FanCard side={left} which="a" color="#F5B544" g={gA} og={gB} lay={lay} picked={picked} onTap={() => { if (!dragged.current) choose('a') }} />
      <FanCard side={right} which="b" color="#9A86FF" g={gB} og={gA} lay={lay} picked={picked} onTap={() => { if (!dragged.current) choose('b') }} />

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

    </motion.div>
  )
}

function FanBackdrop({ side, g }: { side: Side; g: MotionValue<number> }) {
  const opacity = useTransform(g, (v) => clamp01(v) * 0.95)
  return (
    <motion.div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity }} aria-hidden>
      {/* fondo liso que tapa la mesa mientras la elegida crece (sin desenfoques: SISTEMA_DISENO §1.3) */}
      <div className="absolute inset-0 bg-bg" />
    </motion.div>
  )
}

function FanCard({
  side,
  which,
  color,
  g,
  og,
  lay,
  picked,
  onTap,
}: {
  side: Side
  which: 'a' | 'b'
  /** color del borde que se ilumina al elegirla (DUEL_LEFT / DUEL_RIGHT de SwipePair.tsx) */
  color: string
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
      {/* póster a sangre, sin marco ni relleno difuminado alrededor (los pósteres ya son verticales, T14) */}
      <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: 'inherit' }}>
        {side.bg}
      </div>
      {/* borde iluminado de la elegida: la confirmación del duelo */}
      <motion.div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ borderRadius: 'inherit', boxShadow: `0 0 0 2px ${color}, 0 0 10px 1px ${color}aa` }}
        initial={false}
        animate={{ opacity: picked === which ? 1 : 0 }}
        transition={{ duration: 0.12 }}
      />
    </motion.button>
  )
}
