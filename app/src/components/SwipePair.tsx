import { useEffect, useRef, useState, type ReactNode } from 'react'
import { animate, motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion'

export interface Side {
  key: string
  title: string
  subtitle?: string
  /** fondo a sangre del lado (póster, collage…) */
  bg: ReactNode
}

export const DUEL_LEFT = '#F5B544' // ámbar del acento
export const DUEL_RIGHT = '#9A86FF' // violeta contrastado
const COMMIT = 0.28 // fracción del ancho para elegir al soltar
const SLANT = 9 // % de alto que baja la diagonal de un lado a otro
const GAP = 1.6 // % de alto del hueco diagonal entre las dos tarjetas
const BAND = 46 // px de la banda de color con la flecha

/**
 * Duelo (§13.3): la opción de ARRIBA se elige deslizando a la IZQUIERDA (pegada al borde izquierdo, ámbar, ◀)
 * y la de ABAJO deslizando a la DERECHA (pegada al borde derecho, violeta, ▶). Las separa un corte diagonal grueso.
 * Al arrastrar, la del lado elegido se ilumina y crece; la otra se apaga. Tocar una tarjeta también la elige.
 * Ocupa todo el ancho de la pantalla (se come el padding horizontal del contenedor con -mx-4).
 */
export function SwipePair({ left, right, onChoose, between }: { left: Side; right: Side; onChoose: (w: 'a' | 'b') => void; between?: [string, string] }) {
  const box = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const [picked, setPicked] = useState<null | 'a' | 'b'>(null)
  const dragged = useRef(false)
  const W = () => box.current?.offsetWidth ?? 380

  useEffect(() => { setPicked(null); x.set(0) }, [left.key, right.key, x])

  // progreso -1 (elige arriba/izquierda) … 1 (elige abajo/derecha)
  const ringO = useTransform(x, (v) => Math.min(1, Math.abs(v) / (W() * COMMIT)))
  const p = useTransform(x, (v) => Math.max(-1, Math.min(1, v / (W() * COMMIT))))

  const choose = (w: 'a' | 'b') => {
    if (picked) return
    setPicked(w)
    navigator.vibrate?.(12)
    animate(x, w === 'a' ? -W() * COMMIT : W() * COMMIT, { duration: 0.16, ease: 'easeOut' })
    setTimeout(() => onChoose(w), 420)
  }

  return (
    <motion.div
      ref={box}
      className="relative flex-1 min-h-0 -mx-4 touch-none-all select-none"
      style={{ touchAction: 'none' }}
      onPanStart={() => { dragged.current = true }}
      onPan={(_, info) => { if (!picked) x.set(info.offset.x) }}
      onPanEnd={(_, info) => {
        const ox = info.offset.x
        if (!picked) {
          if (Math.abs(ox) > W() * COMMIT || Math.abs(info.velocity.x) > 650) choose(ox < 0 ? 'a' : 'b')
          else animate(x, 0, { type: 'spring', stiffness: 420, damping: 32 })
        }
        setTimeout(() => { dragged.current = false }, 60)
      }}
      role="group"
      aria-label="Desliza a la izquierda para elegir la de arriba, o a la derecha para la de abajo"
    >
      <DuelCard side={left} which="a" p={p} picked={picked} onTap={() => { if (!dragged.current) choose('a') }} />
      <DuelCard side={right} which="b" p={p} picked={picked} onTap={() => { if (!dragged.current) choose('b') }} />
      <CenterHint p={p} picked={picked} between={between} />
      <motion.div className="absolute inset-0 z-20 pointer-events-none rounded-[34px]" style={{ opacity: ringO, boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.5), inset 0 0 0 5px rgba(255,255,255,0.07)' }} />
    </motion.div>
  )
}

function DuelCard({ side, which, p, picked, onTap }: { side: Side; which: 'a' | 'b'; p: MotionValue<number>; picked: null | 'a' | 'b'; onTap: () => void }) {
  const top = which === 'a'
  const color = top ? DUEL_LEFT : DUEL_RIGHT
  // t: 0 neutro, 1 = este lado elegido, -1 = el otro lado elegido
  const t = useTransform(p, (v) => (top ? -v : v))
  const scale = useTransform(t, [-1, 0], [0.96, 1])
  // e: cuánto se expande esta tarjeta sobre la otra (0 neutro … 1 pantalla completa), §14.3
  const e = useTransform(t, (v) => Math.max(0, Math.min(1, v)))
  const lerp = (a: number, b: number, k: number) => a + (b - a) * k
  const bright = useTransform(t, [-1, 0, 1], [0.42, 0.92, 1.12])
  const filter = useTransform(bright, (b) => `brightness(${b}) saturate(${0.6 + b * 0.4})`)
  const glow = useTransform(t, [0, 1], [0, 1])
  const bandOp = useTransform(e, [0, 1], [1, 0.35]) // a pantalla completa, la banda casi desaparece
  const bandW = useTransform(t, [-1, 0, 1], [BAND * 0.7, BAND, BAND * 1.9])
  const arrowX = useTransform(t, [0, 1], [0, top ? -6 : 6])

  // Corte diagonal: la de arriba baja hacia la izquierda; la de abajo sube hacia la derecha.
  // Al elegirla, la de arriba baja y la de abajo sube hasta cubrir toda la pantalla.
  const half = 50 + SLANT / 2
  const clip = useTransform(e, (k) =>
    top
      ? `polygon(0 0, 100% 0, 100% ${lerp(half - SLANT - GAP / 2, 100, k)}%, 0 ${lerp(half - GAP / 2, 100, k)}%)`
      : `polygon(0 ${lerp(half + GAP / 2, 0, k)}%, 100% ${lerp(half - SLANT + GAP / 2, 0, k)}%, 100% 100%, 0 100%)`,
  )
  const cardH = useTransform(e, (k) => `${lerp(half + 2, 100, k)}%`)
  const inset = useTransform(e, (k) => `${lerp(9, 0, k)}%`)
  const zIndex = useTransform(t, (v) => (v > 0.02 ? 3 : 2))
  // al expandirse, el lado pegado al borde se redondea como el marco del móvil
  const rFlush = useTransform(e, (k) => lerp(0, 34, k))

  const isWinner = picked === which
  const isLoser = picked && picked !== which

  return (
    <motion.button
      type="button"
      onClick={onTap}
      aria-label={`${top ? 'Desliza a la izquierda' : 'Desliza a la derecha'} para elegir ${side.title}`}
      className="absolute inset-0 text-left outline-none"
      style={{ clipPath: clip, scale, filter, zIndex: isWinner ? 4 : zIndex, transformOrigin: top ? '20% 25%' : '80% 75%' }}
      animate={isLoser ? { opacity: 0.25 } : { opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Tarjeta: pegada a su borde (izquierdo arriba, derecho abajo), redondeada solo por el lado contrario */}
      <motion.div
        className={`absolute overflow-hidden bg-surface ${top ? 'left-0 top-0 rounded-r-[30px]' : 'right-0 bottom-0 rounded-l-[30px]'}`}
        style={{ height: cardH, ...(top ? { right: inset, borderTopLeftRadius: rFlush, borderBottomLeftRadius: rFlush } : { left: inset, borderTopRightRadius: rFlush, borderBottomRightRadius: rFlush }) }}
      >
        <div className="absolute inset-0 [&_img]:object-[center_22%]">{side.bg}</div>
        <div className={`absolute inset-0 ${top ? 'bg-gradient-to-b from-black/10 via-black/20 to-black/90' : 'bg-gradient-to-t from-black/10 via-black/20 to-black/90'}`} />
        <motion.div className="absolute inset-0 pointer-events-none rounded-[inherit]" style={{ opacity: glow, boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,0.55), inset 0 0 0 5px rgba(255,255,255,0.08), inset 0 0 46px ${color}40` }} />

        {/* Banda de color con flecha, en el borde al que pertenece */}
        <motion.div
          className={`absolute inset-y-0 flex flex-col items-center justify-center gap-3 backdrop-blur-xl ${top ? 'left-0' : 'right-0'}`}
          style={{
            width: bandW,
            background: `linear-gradient(${top ? '90deg' : '270deg'}, ${color}38, rgba(255,255,255,0.06))`,
            opacity: bandOp,
            WebkitMaskImage: `linear-gradient(${top ? 'to right' : 'to left'}, #000 0%, #000 50%, transparent 100%)`,
            maskImage: `linear-gradient(${top ? 'to right' : 'to left'}, #000 0%, #000 50%, transparent 100%)`,
            boxShadow: `inset ${top ? '' : '-'}2px 0 0 ${color}`,
          }}
        >
          <motion.svg width="22" height="34" viewBox="0 0 22 34" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ x: arrowX, opacity: 0.92 }} aria-hidden>
            {top ? (
              <><path d="M14 5 L5 17 L14 29" /><path d="M20 10 L14 17 L20 24" opacity="0.45" /></>
            ) : (
              <><path d="M8 5 L17 17 L8 29" /><path d="M2 10 L8 17 L2 24" opacity="0.45" /></>
            )}
          </motion.svg>
          <span className="text-[9px] font-semibold tracking-[0.28em] text-white/70 [writing-mode:vertical-rl] rotate-180">DESLIZA</span>
        </motion.div>

        {/* Texto: en la zona libre de la tarjeta, lejos del corte */}
        <div
          className={`absolute ${top ? 'top-3 right-3 text-right' : 'bottom-4 left-3 text-left'} w-fit rounded-xl bg-black/35 backdrop-blur-xl ring-1 ring-white/15 px-3 py-2 shadow-lg shadow-black/30`}
          style={{ maxWidth: `calc(100% - ${BAND + 24}px)` }}
        >
          <div className="serif text-[20px] leading-[1.05] font-semibold text-white line-clamp-3" style={{ textWrap: 'balance' } as React.CSSProperties}>
            {side.title}
          </div>
          {side.subtitle && <div className="text-[11.5px] text-white/75 mt-0.5 line-clamp-1">{side.subtitle}</div>}
        </div>

        {isWinner && (
          <div className={`absolute ${top ? 'bottom-[22%] left-1/2' : 'top-[22%] left-1/2'} -translate-x-1/2 pop w-16 h-16 rounded-full flex items-center justify-center text-3xl font-black text-black shadow-2xl`} style={{ background: color }}>✓</div>
        )}
      </motion.div>
    </motion.button>
  )
}

/** Centro del corte: texto en cristal («tipo esto / o tipo esto») o, sin texto, flechas tenues. */
function CenterHint({ p, picked, between }: { p: MotionValue<number>; picked: null | 'a' | 'b'; between?: [string, string] }) {
  const l = useTransform(p, [-1, 0], [1, 0.55])
  const r = useTransform(p, [0, 1], [0.55, 1])
  if (picked) return null
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[3deg] z-10 pointer-events-none rounded-[22px] bg-white/[0.12] backdrop-blur-2xl ring-1 ring-white/35 px-5 py-2.5 shadow-[0_10px_40px_-8px_rgba(0,0,0,0.7),0_0_36px_-8px_rgba(245,181,68,0.55)] text-center whitespace-nowrap">
      {between ? (
        <>
          <div className="serif text-[19px] leading-none font-semibold text-white">{between[0]}</div>
          <div className="mt-1.5 text-[12px] font-semibold tracking-wide flex items-center justify-center gap-2">
            <motion.span style={{ color: DUEL_LEFT, opacity: l }}>{between[1].split('·')[0].trim()}</motion.span>
            <span className="text-white/40">·</span>
            <motion.span style={{ color: DUEL_RIGHT, opacity: r }}>{(between[1].split('·')[1] ?? '').trim()}</motion.span>
          </div>
        </>
      ) : (
        <span className="serif italic text-[15px] text-white/90">o</span>
      )}
    </div>
  )
}
