import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import { animate, motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion'
import type { Item, ShelfType } from '../types'
import { SHELF_LABEL } from '../types'
import { Poster, posterLayoutId } from './Poster'
import { FriendBubbles, Tag } from './ui'
import { itemFacts, typeName } from '../data/catalog'
import { haptic } from '../lib/haptics'

export type SwipeDir = 'left' | 'right' | 'up'
export interface DeckHandle { fling: (dir: SwipeDir) => void }

// Umbrales del diseño (§4.2): 30 % del ancho en horizontal, 20 % del alto en vertical, o velocidad suficiente.
const H_THRESHOLD = 0.3
const V_THRESHOLD = 0.2
const FLICK = 600

/** `flight`: solo la tarjeta de arriba vuela a la ficha (un único layoutId montado por obra). */
function CardFace({ item, bubbles = true, flight = false }: { item: Item; bubbles?: boolean; flight?: boolean }) {
  return (
    <div className="absolute inset-0 rounded-[28px] overflow-hidden bg-surface border border-line shadow-2xl shadow-black/60">
      <Poster item={item} showTitle={false} layoutId={flight ? posterLayoutId(item.id) : undefined} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/95 via-black/55 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent" />
      {bubbles && <div className="absolute top-3 right-3"><FriendBubbles itemId={item.id} shelf={item.type} /></div>}
      <div className="absolute bottom-0 inset-x-0 p-5 pb-4">
        <div className="text-label text-ink/80">{typeName(item.type)} · {item.year}</div>
        <h2 className="text-display text-ink mt-1 line-clamp-3" style={{ textWrap: 'balance' } as React.CSSProperties}>{item.title}</h2>
        <div className="text-meta text-ink/80 mt-1 truncate">{item.creator}</div>
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          {itemFacts(item) && <Tag variant="brand">{itemFacts(item)}</Tag>}
          {item.genres.slice(0, 2).map((g) => (
            <Tag key={g} variant="brand">{g}</Tag>
          ))}
        </div>
      </div>
    </div>
  )
}

function Stamp({ label, color, opacity, className }: { label: string; color: string; opacity: MotionValue<number>; className: string }) {
  return (
    <motion.div style={{ opacity, color, borderColor: color }} className={`absolute z-10 border-[5px] rounded-xl px-3 py-1 text-[26px] font-black tracking-wider whitespace-nowrap pointer-events-none ${className}`}>
      {label}
    </motion.div>
  )
}

interface Props {
  deck: Item[]
  shelf: ShelfType
  onSwipe: (item: Item, dir: SwipeDir) => void
  onOpen: (item: Item) => void
  stamps?: {
    right?: string
    left?: string
    up?: string
  }
}

export const SwipeDeck = forwardRef<DeckHandle, Props>(function SwipeDeck({ deck, shelf, onSwipe, onOpen, stamps }, ref) {
  const box = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const busy = useRef(false)
  const dragged = useRef(false)
  // pasado el umbral, soltar ya cuenta: un toque leve lo avisa una vez por cruce
  const armed = useRef(false)
  const size = () => ({ W: box.current?.offsetWidth ?? 360, H: box.current?.offsetHeight ?? 560 })
  const top = deck[0]

  // La tarjeta nueva aparece en el centro antes de pintar
  useLayoutEffect(() => { x.set(0); y.set(0); busy.current = false; armed.current = false }, [top?.id, x, y])

  const rotate = useTransform(x, [-260, 0, 260], [-15, 0, 15])
  const rightO = useTransform([x, y], ([xv, yv]: number[]) => (xv > 0 && Math.abs(xv) >= Math.abs(yv) ? Math.min(1, xv / (size().W * H_THRESHOLD)) : 0))
  const leftO = useTransform([x, y], ([xv, yv]: number[]) => (xv < 0 && Math.abs(xv) >= Math.abs(yv) ? Math.min(1, -xv / (size().W * H_THRESHOLD)) : 0))
  const upO = useTransform([x, y], ([xv, yv]: number[]) => (yv < 0 && Math.abs(yv) > Math.abs(xv) ? Math.min(1, -yv / (size().H * V_THRESHOLD)) : 0))
  const progress = useTransform([x, y], ([xv, yv]: number[]) => Math.min(1, Math.hypot(xv, yv) / 160))
  const s2 = useTransform(progress, [0, 1], [0.95, 1])
  const y2 = useTransform(progress, [0, 1], [14, 0])
  const s3 = useTransform(progress, [0, 1], [0.9, 0.95])
  const y3 = useTransform(progress, [0, 1], [28, 14])

  const commit = (dir: SwipeDir) => {
    if (busy.current || !top) return
    busy.current = true
    const { W, H } = size()
    haptic('tap')
    const opts = { duration: 0.26, ease: 'easeIn' as const }
    const c =
      dir === 'up'
        ? animate(y, -H * 1.35, opts)
        : (animate(y, y.get() + (dir === 'left' ? 30 : 30), opts), animate(x, (dir === 'left' ? -1 : 1) * W * 1.5, opts))
    c.then(() => onSwipe(top, dir))
  }
  useImperativeHandle(ref, () => ({ fling: commit }))

  const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }
  const settle = () => { animate(x, 0, spring); animate(y, 0, spring) }

  if (!top) return null
  return (
    // la tarjeta nunca más ancha que un póster (2:3 + el hueco de 30 px del montón): si falta alto, se estrecha
    <div ref={box} className="relative h-full max-w-full mx-auto" style={{ aspectRatio: '2 / 3.15' }}>
      {deck[2] && (
        <motion.div className="absolute inset-x-0 top-0 bottom-[30px]" style={{ scale: s3, y: y3, transformOrigin: '50% 100%' }}>
          <CardFace item={deck[2]} bubbles={false} />
        </motion.div>
      )}
      {deck[1] && (
        <motion.div className="absolute inset-x-0 top-0 bottom-[30px]" style={{ scale: s2, y: y2, transformOrigin: '50% 100%' }}>
          <CardFace item={deck[1]} />
        </motion.div>
      )}
      <motion.div
        key={top.id}
        className="absolute inset-x-0 top-0 bottom-[30px] cursor-grab active:cursor-grabbing touch-none-all"
        style={{ x, y, rotate, touchAction: 'none' }}
        drag
        dragMomentum={false}
        dragElastic={1}
        onDragStart={() => { dragged.current = true }}
        onDrag={() => {
          const { W, H } = size()
          const ox = x.get(), oy = y.get()
          const past = Math.abs(ox) >= Math.abs(oy) ? Math.abs(ox) > W * H_THRESHOLD : oy < 0 && -oy > H * V_THRESHOLD
          if (past && !armed.current) haptic('tick')
          armed.current = past
        }}
        onDragEnd={(_, info) => {
          const { W, H } = size()
          const ox = x.get(), oy = y.get()
          const horizontal = Math.abs(ox) >= Math.abs(oy)
          let dir: SwipeDir | null = null
          if (horizontal) {
            if (Math.abs(ox) > W * H_THRESHOLD || (Math.abs(info.velocity.x) > FLICK && Math.abs(ox) > 40)) dir = ox > 0 ? 'right' : 'left'
          } else if (oy < 0 && (-oy > H * V_THRESHOLD || (info.velocity.y < -FLICK && -oy > 40))) dir = 'up'
          if (dir) commit(dir)
          else settle()
          setTimeout(() => { dragged.current = false }, 60)
        }}
        onTap={() => { if (!dragged.current && !busy.current) onOpen(top) }}
        aria-label={`${top.title}. Desliza a la derecha si ${SHELF_LABEL[shelf].pronoun} has ${SHELF_LABEL[shelf].seenPastPart}, a la izquierda si no te interesa, arriba para pendientes. Toca para ver la ficha.`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') commit('right')
          else if (e.key === 'ArrowLeft') commit('left')
          else if (e.key === 'ArrowUp') commit('up')
          else if (e.key === 'Enter') onOpen(top)
        }}
      >
        <CardFace item={top} flight />
        <motion.div className="absolute inset-0 rounded-[28px] bg-stamp-green/25 pointer-events-none" style={{ opacity: rightO }} />
        <motion.div className="absolute inset-0 rounded-[28px] bg-stamp-red/25 pointer-events-none" style={{ opacity: leftO }} />
        <motion.div className="absolute inset-0 rounded-[28px] bg-stamp-blue/25 pointer-events-none" style={{ opacity: upO }} />
        <Stamp label={stamps?.right ?? SHELF_LABEL[shelf].stamp} color="var(--color-stamp-green)" opacity={rightO} className="top-[22%] left-5 -rotate-12" />
        <Stamp label={stamps?.left ?? "NO ME INTERESA"} color="var(--color-stamp-red)" opacity={leftO} className="top-[22%] right-4 rotate-12 text-[22px]" />
        <Stamp label={stamps?.up ?? "PENDIENTE"} color="var(--color-stamp-blue)" opacity={upO} className="top-[38%] left-1/2 -translate-x-1/2 -rotate-6" />
      </motion.div>
    </div>
  )
})
