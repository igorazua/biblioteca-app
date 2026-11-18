import { useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { animate, motion, useAnimationFrame, useMotionValue, useReducedMotion, useTransform, type MotionValue } from 'framer-motion'
import { getItem, type Item } from '@biblioteca/core'
import { posterShape } from '@biblioteca/core/src/lib/posterShape'
import { Poster } from '../components/Poster'
import { titleOf } from './data'

/** Grados por segundo del giro solo. */
const SPIN = 7
/** Grados por píxel arrastrado. */
const DRAG_GAIN = 0.28

/**
 * Anillo 3D de carátulas, inclinado, que gira solo y se arrastra con inercia. Todo el giro es un único valor
 * (`rotateY` del contenedor); cada carta solo oscurece su cara cuando pasa por detrás. En el centro, sin girar,
 * va `center` (el número 1), dentro del mismo contexto 3D, así que las carátulas pasan por delante y por detrás.
 */
export function PosterRing({ ids, center, scale = 1, label }: { ids: string[]; center?: ReactNode; scale?: number; label: string }) {
  const reduce = useReducedMotion()
  const angle = useMotionValue(0)
  const dragging = useRef(false)
  const moved = useRef(false)
  const hovering = useRef(false)

  useAnimationFrame((_, delta) => {
    if (reduce || dragging.current) return
    // con el ratón encima va más despacio, para poder apuntar a una carátula
    const k = hovering.current ? 0.25 : 1
    angle.set(angle.get() + (SPIN * k * Math.min(delta, 64)) / 1000)
  })

  const items = ids.map((id) => getItem(id)).filter(Boolean) as Item[]
  // con pocas obras el anillo se ve hueco: se repiten hasta 12 caras
  const faces: Item[] = []
  if (items.length) while (faces.length < Math.max(12, items.length)) faces.push(items[faces.length % items.length])
  const n = Math.min(faces.length, 20)
  const square = posterShape(faces[0]?.type) === 'square'
  const w = 128
  const h = square ? 128 : 192
  const radius = Math.max(380, (n * (w + 22)) / (2 * Math.PI))

  const step = (dir: 1 | -1) => animate(angle, angle.get() + dir * (360 / n), { type: 'spring', stiffness: 120, damping: 20 })

  return (
    <motion.div
      className="relative w-full h-full touch-none cursor-grab active:cursor-grabbing focus-visible:outline-none"
      style={{ perspective: 1600 }}
      tabIndex={0}
      role="group"
      aria-roledescription="carrusel"
      aria-label={`${label}. Arrastra para girar o usa las flechas.`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); step(1) }
        if (e.key === 'ArrowRight') { e.preventDefault(); step(-1) }
      }}
      onHoverStart={() => (hovering.current = true)}
      onHoverEnd={() => (hovering.current = false)}
      onPanStart={() => { dragging.current = true; moved.current = true; angle.stop() }}
      onPan={(_, info) => angle.set(angle.get() + info.delta.x * DRAG_GAIN)}
      onPanEnd={(_, info) => {
        animate(angle, { type: 'inertia', velocity: info.velocity.x * DRAG_GAIN, power: 0.35, timeConstant: 520, onComplete: () => (dragging.current = false) })
        // el giro solo vuelve cuando la inercia se apaga; si el clic llega justo después del arrastre, no abre la ficha
        window.setTimeout(() => (moved.current = false), 60)
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center" style={{ transformStyle: 'preserve-3d', transform: `scale(${scale}) rotateX(-11deg)` }}>
        {center && <div className="absolute" style={{ transformStyle: 'preserve-3d', transform: 'translateZ(0px)' }}>{center}</div>}
        <motion.div className="absolute" style={{ transformStyle: 'preserve-3d', rotateY: angle, width: 0, height: 0 }}>
          {faces.slice(0, n).map((it, i) => (
            <RingFace key={i} item={it} theta={(360 / n) * i} radius={radius} angle={angle} w={w} h={h} moved={moved} />
          ))}
        </motion.div>
      </div>
    </motion.div>
  )
}

function RingFace({ item, theta, radius, angle, w, h, moved }: { item: Item; theta: number; radius: number; angle: MotionValue<number>; w: number; h: number; moved: React.RefObject<boolean> }) {
  // 0 de frente, 1 justo detrás: la cara se apaga al alejarse
  const shade = useTransform(angle, (a) => {
    const r = ((a + theta) * Math.PI) / 180
    return ((1 - Math.cos(r)) / 2) * 0.78
  })
  return (
    <Link
      to={`/i/${item.id}`}
      draggable={false}
      onClick={(e) => { if (moved.current) e.preventDefault() }}
      aria-label={titleOf(item)}
      tabIndex={-1}
      className="absolute block"
      style={{ width: w, height: h, left: -w / 2, top: -h / 2, transform: `rotateY(${theta}deg) translateZ(${radius}px)` }}
    >
      <Poster item={item} showTitle className="absolute inset-0 w-full h-full" />
      <motion.span aria-hidden className="absolute inset-0 bg-black pointer-events-none" style={{ opacity: shade }} />
    </Link>
  )
}
