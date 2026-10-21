// app/src/components/DuelVariants.tsx
// Diseños del duelo A/B para probarlos en el móvil (REFERENCIAS_UI, 21/10/2026). Igor quiere que todos respondan
// al gesto (se ve qué estás votando mientras arrastras) y que el póster se vea entero, nunca recortado.
import { useEffect, useRef, useState } from 'react'
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

const FAN_COMMIT = 0.55 // progreso a partir del cual soltar la carta la elige

/* 3 · Cartas en abanico: se arrastra la carta hacia el centro (o hacia arriba) y crece mientras la arrastras;
   pasado el umbral, al soltarla ocupa toda la pantalla y la otra desaparece. Tocarla también la elige. */
export function DuelFan({ left, right, onChoose, question }: { left: Side; right: Side; onChoose: (w: 'a' | 'b') => void; question?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const pA = useMotionValue(0)
  const pB = useMotionValue(0)
  const [picked, setPicked] = useState<null | 'a' | 'b'>(null)
  useEffect(() => {
    setPicked(null)
    pA.set(0)
    pB.set(0)
  }, [left.key, right.key, pA, pB])

  const choose = (w: 'a' | 'b') => {
    if (picked) return
    setPicked(w)
    haptic('success')
    setTimeout(() => onChoose(w), 520)
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 select-none">
      <p className="serif text-[22px] font-semibold text-center leading-tight shrink-0">{question ?? '¿Cuál prefieres?'}</p>
      <div ref={box} className="relative flex-1 min-h-0 -mx-4">
        <FanCard side={left} w="a" me={pA} other={pB} picked={picked} box={box} onChoose={choose} />
        <FanCard side={right} w="b" me={pB} other={pA} picked={picked} box={box} onChoose={choose} />
      </div>
      <p className="text-center text-xs text-mute shrink-0 mb-10">Arrastra hacia el centro la que prefieras</p>
    </div>
  )
}

function FanCard({
  side,
  w,
  me,
  other,
  picked,
  box,
  onChoose,
}: {
  side: Side
  w: 'a' | 'b'
  me: MotionValue<number>
  other: MotionValue<number>
  picked: null | 'a' | 'b'
  box: React.RefObject<HTMLDivElement | null>
  onChoose: (w: 'a' | 'b') => void
}) {
  const isLeft = w === 'a'
  const card = useRef<HTMLButtonElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const grow = useMotionValue(0) // 0 → tamaño de carta, 1 → pantalla completa
  const dragged = useRef(false)

  // Progreso del gesto: hacia el centro (x) o hacia arriba (y).
  useEffect(() => {
    const upd = () => {
      const W = box.current?.offsetWidth ?? 360
      const toward = (isLeft ? x.get() : -x.get()) / (W * 0.32)
      const up = -y.get() / (W * 0.45)
      me.set(Math.max(0, Math.min(1, Math.max(toward, up))))
    }
    const a = x.on('change', upd)
    const b = y.on('change', upd)
    return () => {
      a()
      b()
    }
  }, [x, y, me, isLeft, box])

  useEffect(() => {
    x.set(0)
    y.set(0)
    grow.set(0)
  }, [side.key, x, y, grow])

  const rotate = useTransform([me, grow], ([p, g]: number[]) => (isLeft ? -7 : 7) * (1 - p) * (1 - g))
  const scale = useTransform([me, grow], ([p, g]: number[]) => 1 + p * 0.22 + g * 0.55)
  const opacity = useTransform(other, [0, 1], [1, 0.25])
  const zIndex = useTransform(me, (p) => (p > 0.02 ? 3 : 2))

  const expand = () => {
    const W = box.current?.offsetWidth ?? 360
    const r = card.current?.getBoundingClientRect()
    const b = box.current?.getBoundingClientRect()
    // llevar el centro de la carta al centro de la caja
    const dx = r && b ? b.left + b.width / 2 - (r.left + r.width / 2) + x.get() : isLeft ? W * 0.2 : -W * 0.2
    const dy = r && b ? b.top + b.height / 2 - (r.top + r.height / 2) + y.get() : 0
    animate(x, dx, { type: 'spring', stiffness: 260, damping: 28 })
    animate(y, dy, { type: 'spring', stiffness: 260, damping: 28 })
    animate(me, 1, { duration: 0.2 })
    animate(grow, 1, { type: 'spring', stiffness: 220, damping: 26 })
    onChoose(w)
  }

  const won = picked === w
  const lost = picked !== null && !won

  return (
    <motion.button
      ref={card}
      type="button"
      drag={!picked}
      dragMomentum={false}
      dragElastic={0.9}
      onDragStart={() => {
        dragged.current = true
      }}
      onDragEnd={() => {
        if (me.get() >= FAN_COMMIT) expand()
        else {
          animate(x, 0, { type: 'spring', stiffness: 380, damping: 30 })
          animate(y, 0, { type: 'spring', stiffness: 380, damping: 30 })
        }
        setTimeout(() => {
          dragged.current = false
        }, 60)
      }}
      onClick={() => {
        if (!dragged.current && !picked) expand()
      }}
      animate={lost ? { opacity: 0, y: 60 } : undefined}
      className={`absolute top-[4%] w-[47%] aspect-[2/3] ${isLeft ? 'left-[6%] origin-bottom-right' : 'right-[6%] origin-bottom-left'}`}
      style={{ x, y, rotate, scale, opacity: lost ? undefined : opacity, zIndex: won ? 5 : zIndex, touchAction: 'none' }}
      aria-label={`Elegir ${side.title}`}
    >
      <div className={`absolute inset-0 rounded-2xl overflow-hidden border-2 shadow-2xl ${won ? 'border-accent' : 'border-surface'}`}>
        <FullPoster side={side} />
      </div>
      {/* título bajo la carta, sobre fondo liso */}
      <div className={`absolute top-full mt-3 w-[120%] ${isLeft ? 'left-0 text-left' : 'right-0 text-right'}`}>
        <div className="serif text-[16px] font-semibold leading-tight line-clamp-2">{side.title}</div>
        {side.subtitle && <div className="text-[11px] text-mute mt-0.5 line-clamp-1">{side.subtitle}</div>}
      </div>
    </motion.button>
  )
}
