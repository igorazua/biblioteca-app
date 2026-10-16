import { useEffect, useRef, useState, type ReactNode } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import type { Item } from '../types'
import { Poster } from './Poster'
import { itemFacts, typeName } from '../data/catalog'
import { Icon } from './Icon'

const CHOOSE_DELAY = 340

function PairCard({ item, side, picked, onChoose }: { item: Item; side: 'top' | 'bottom'; picked: null | 'win' | 'lose'; onChoose: () => void }) {
  const y = useMotionValue(0)
  const dragged = useRef(false)
  // arrastrar hacia el centro = elegir
  const toward = side === 'top' ? 1 : -1
  const hint = useTransform(y, (v) => Math.min(1, Math.max(0, (v * toward) / 80)))
  const scale = useTransform(hint, [0, 1], [1, 1.04])
  return (
    <motion.button
      type="button"
      aria-label={`Elegir ${item.title}`}
      className="relative flex-1 min-h-0 rounded-3xl overflow-hidden border border-line bg-surface text-left touch-none-all"
      style={{ y, scale, touchAction: 'none' }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={side === 'top' ? { top: 0.05, bottom: 0.6 } : { top: 0.6, bottom: 0.05 }}
      onDragStart={() => { dragged.current = true }}
      onDragEnd={(_, info) => {
        const d = info.offset.y * toward
        if (d > 60 || info.velocity.y * toward > 450) onChoose()
        else animate(y, 0, { type: 'spring', stiffness: 420, damping: 30 })
        setTimeout(() => { dragged.current = false }, 50)
      }}
      onClick={() => { if (!dragged.current) onChoose() }}
      animate={picked === 'lose' ? { opacity: 0.35, scale: 0.97 } : picked === 'win' ? { scale: 1.03 } : { opacity: 1 }}
      transition={{ duration: 0.18 }}
    >
      <Poster item={item} showTitle={false} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      <motion.div className="absolute inset-0 ring-4 ring-inset ring-accent rounded-3xl" style={{ opacity: hint }} />
      <div className="absolute bottom-0 inset-x-0 p-4">
        <div className="text-[11px] uppercase tracking-wider text-white/70">{typeName(item.type)} · {item.year}</div>
        <div className="serif text-[22px] leading-tight font-semibold text-white mt-0.5 line-clamp-2">{item.title}</div>
        <div className="text-xs text-white/70 mt-0.5 truncate">{item.creator}{itemFacts(item) ? ` · ${itemFacts(item)}` : ''}</div>
      </div>
      {picked === 'win' && (
        <div className="absolute top-3 right-3 bg-accent text-accent-ink rounded-full w-9 h-9 flex items-center justify-center pop font-bold">▲</div>
      )}
    </motion.button>
  )
}

/**
 * Dos tarjetas, una sobre otra. Elegir = tocar o deslizar la ganadora hacia el centro. No hay empate ni «saltar».
 * Tras elegir, una animación breve (ganadora ▲, perdedora atenuada) y entonces se llama a `onChoose`.
 */
export function PairCompare({ a, b, onChoose, children }: { a: Item; b: Item; onChoose: (winner: 'a' | 'b') => void; children?: ReactNode }) {
  const [picked, setPicked] = useState<null | 'a' | 'b'>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => { setPicked(null); return () => clearTimeout(timer.current) }, [a.id, b.id])
  const choose = (w: 'a' | 'b') => {
    if (picked) return
    setPicked(w)
    navigator.vibrate?.(10)
    timer.current = window.setTimeout(() => onChoose(w), CHOOSE_DELAY)
  }
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2">
      <PairCard item={a} side="top" picked={picked ? (picked === 'a' ? 'win' : 'lose') : null} onChoose={() => choose('a')} />
      {children || (
        <div className="flex items-center justify-center -my-5 z-10 pointer-events-none">
          <span className="w-9 h-9 rounded-full bg-bg border border-line flex items-center justify-center text-xs font-bold text-mute"><Icon name="scale" size={17} /></span>
        </div>
      )}
      <PairCard item={b} side="bottom" picked={picked ? (picked === 'b' ? 'win' : 'lose') : null} onChoose={() => choose('b')} />
    </div>
  )
}
