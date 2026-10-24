import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { motion, type Transition } from 'framer-motion'
import type { Item } from '../types'
import { typeName } from '../data/catalog'
import { posterShape } from '../lib/posterShape'

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

// Paletas oscuras y saturadas (fondo profundo → tono medio), elegidas a mano para que ninguna quede plana.
const PALETTES: [string, string, string][] = [
  ['#0d1b2a', '#1b4965', '#5fa8d3'], // azul noche
  ['#1a0b10', '#6d1a36', '#e07a5f'], // burdeos
  ['#0b1a14', '#1f4d3a', '#8cc084'], // verde bosque
  ['#160f24', '#45306b', '#b392f0'], // violeta
  ['#1f1206', '#7a4210', '#f2a541'], // ámbar
  ['#0a1416', '#16525a', '#7ad3c9'], // petróleo
  ['#1c0a06', '#8c2f1b', '#f28c5e'], // teja
  ['#101010', '#3a3a46', '#c9c3b6'], // grafito
]

/** Transición del póster que «vuela» entre pantallas (biblioteca/mazo → ficha) con el mismo `layoutId`. */
export const POSTER_FLIGHT: Transition = { type: 'spring', stiffness: 420, damping: 40, mass: 0.9 }
export const posterLayoutId = (itemId: string) => `poster-${itemId}`

const GRAIN = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")"

/**
 * Portada: la real del catálogo o, si falta, una generada (§13.4) que parezca una portada minimalista de diseño:
 * paleta oscura derivada del título, composición geométrica sutil, grano y viñeta, y el título completo en la serif.
 * Con `showTitle={false}` (cuando el título ya va encima) solo pinta la composición, sin texto.
 * Con `layoutId` el póster vuela hasta otro con el mismo id al cambiar de pantalla; en cada pantalla solo puede haber uno
 * montado por id (usa `posterLayoutId`). Mientras la imagen de red carga, un brillo ocupa su hueco.
 */
export function Poster({ item, className = '', style, alt, showTitle = true, layoutId }: { item?: Item | null; className?: string; style?: CSSProperties; alt?: string; showTitle?: boolean; layoutId?: string }) {
  const [imgError, setImgError] = useState(false)
  // fade: solo si llegó por red después de montar; si ya estaba en caché aparece sin animación
  const [loaded, setLoaded] = useState<{ src: string; fade: boolean } | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const src = item?.posterUrl ?? null
  // una imagen ya en caché puede haber cargado antes de enganchar onLoad: sin esto se quedaría con el brillo
  useLayoutEffect(() => {
    const img = imgRef.current
    if (src && img?.complete && img.naturalWidth > 0) setLoaded({ src, fade: false })
  }, [src])
  const flight = layoutId ? { layoutId, transition: { layout: POSTER_FLIGHT } } : {}
  if (!item) {
    return (
      <div
        className={`skeleton border border-line ${className}`}
        style={style}
        aria-hidden="true"
      />
    )
  }
  // Juegos de mesa: sus imágenes casi nunca son verticales (cajas). Se ve
  // la imagen entera y el aire se rellena con ella misma ampliada y difuminada, para que tome su color
  // (Igor, 23/10; excepción a SISTEMA_DISENO §1.3). Para música se usa object-cover en contenedor cuadrado (T27 §27.3 regla 7).
  if (src && !imgError && item.type === 'boardgame') {
    const done = loaded?.src === src
    return (
      <motion.div {...flight} className={`relative overflow-hidden bg-surface2 ${done ? '' : 'skeleton'} ${className}`} style={style}>
        <img src={src} alt="" aria-hidden draggable={false} className="absolute inset-0 w-full h-full object-cover scale-125 blur-xl opacity-70" />
        <img
          ref={imgRef}
          src={src}
          alt={alt ?? `Portada de ${item.title}`}
          onLoad={() => setLoaded((l) => (l?.src === src ? l : { src, fade: true }))}
          onError={() => setImgError(true)}
          draggable={false}
          className={`absolute inset-0 w-full h-full object-contain ${done && loaded.fade ? 'img-in' : ''}`}
        />
      </motion.div>
    )
  }
  if (src && !imgError) {
    const done = loaded?.src === src
    return (
      <motion.img
        ref={imgRef}
        src={src}
        alt={alt ?? `Portada de ${item.title}`}
        onLoad={() => setLoaded((l) => (l?.src === src ? l : { src, fade: true }))}
        onError={() => setImgError(true)}
        draggable={false}
        className={`object-cover ${done ? (loaded.fade ? 'img-in' : '') : 'skeleton'} ${className}`}
        style={style}
        {...flight}
      />
    )
  }
  const h = hash(item.id)
  const [deep, mid, light] = PALETTES[h % PALETTES.length]
  const angle = 155 + ((h >> 5) % 50)
  const cx = 25 + ((h >> 9) % 50)
  const cy = 18 + ((h >> 13) % 30)
  const shape = (h >> 17) % 3 // 0 círculo, 1 arco, 2 franja
  const len = item.title.length
  const isSquare = posterShape(item.type) === 'square'
  const size = isSquare
    ? len > 30 ? '8.5cqw' : len > 18 ? '10.5cqw' : len > 10 ? '12.5cqw' : '15cqw'
    : len > 30 ? '9.5cqw' : len > 18 ? '11.5cqw' : len > 10 ? '13.5cqw' : '16cqw'
  return (
    <motion.div
      {...flight}
      role="img"
      aria-label={alt ?? `Portada de ${item.title}`}
      className={`relative overflow-hidden ${className}`}
      style={{ background: `linear-gradient(${angle}deg, ${mid} 0%, ${deep} 72%)`, containerType: 'inline-size', ...style }}
    >
      {/* composición geométrica */}
      {shape === 0 && <div className="absolute rounded-full" style={{ width: '62cqw', height: '62cqw', left: `${cx - 31}cqw`, top: `${cy}%`, background: `radial-gradient(circle at 35% 35%, ${light}, ${mid} 70%)`, opacity: 0.55 }} />}
      {shape === 1 && <div className="absolute rounded-full" style={{ width: '110cqw', height: '110cqw', left: `${cx - 55}cqw`, top: `${cy - 10}%`, border: `1.6cqw solid ${light}`, opacity: 0.35 }} />}
      {shape === 2 && <div className="absolute" style={{ left: '-20%', right: '-20%', top: `${cy + 8}%`, height: '22%', background: `linear-gradient(90deg, transparent, ${light}, transparent)`, opacity: 0.32, transform: `rotate(${-18 + ((h >> 3) % 36)}deg)` }} />}
      <div className="absolute inset-0" style={{ background: `radial-gradient(120% 90% at ${cx}% ${cy}%, ${light}22, transparent 60%)` }} />
      {/* viñeta y grano */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 100% at 50% 40%, transparent 55%, rgb(0 0 0 / 0.55))' }} />
      <div className="absolute inset-0 opacity-[0.22] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />

      {showTitle && (
        <div className={`absolute inset-0 flex flex-col justify-end ${isSquare ? 'p-[6.5cqw]' : 'p-[8cqw]'}`}>
          <div className="uppercase tracking-[0.24em] text-white/60 font-semibold" style={{ fontSize: isSquare ? '4.2cqw' : '4.6cqw' }}>{typeName(item.type)}</div>
          <div className="serif text-white font-semibold leading-[1.02] mt-[2.5cqw] break-words hyphens-auto" lang="es" style={{ fontSize: size, textWrap: 'balance' } as CSSProperties}>
            {item.title}
          </div>
          <div className="mt-[3cqw] h-px w-[18cqw]" style={{ background: light, opacity: 0.8 }} />
          <div className="text-white/65 mt-[2.5cqw] truncate" style={{ fontSize: isSquare ? '4.5cqw' : '5cqw' }}>{item.year} · {item.creator}</div>
        </div>
      )}
    </motion.div>
  )
}
