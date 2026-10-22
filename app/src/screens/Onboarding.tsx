import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useTransform, animate, type MotionValue } from 'framer-motion'
import { APP_NAME } from '../config'
import { useStore } from '../store/useStore'
import { useAuth } from '../store/useAuth'
import { getItem } from '../data/catalog'
import { SHELVES, SHELF_LABEL, type Item, type ShelfType } from '../types'
import { Poster } from '../components/Poster'
import { Icon, type IconName } from '../components/Icon'
import { Avatar } from '../components/ui'
import { haptic } from '../lib/haptics'

const SHELF_ICONS: Record<ShelfType, IconName> = {
  movie: 'film',
  series: 'tv',
  book: 'bookOpen',
  boardgame: 'cards',
  artist: 'sparkle',
}

// Obras emblemáticas reales del catálogo para el tutorial interactivo
const TUTORIAL_ITEMS: Item[] = [
  getItem('movie:el-padrino-1972'),
  getItem('movie:pulp-fiction-1994'),
  getItem('series:breaking-bad-2008'),
  getItem('book:1984-1949'),
].filter(Boolean) as Item[]

function Stamp({
  label,
  color,
  opacity,
  className,
}: {
  label: string
  color: string
  opacity: MotionValue<number>
  className: string
}) {
  return (
    <motion.div
      style={{ opacity, color, borderColor: color }}
      className={`absolute z-20 border-[3.5px] rounded-xl px-3 py-1 text-[20px] font-black tracking-wider whitespace-nowrap pointer-events-none select-none shadow-lg ${className}`}
    >
      {label}
    </motion.div>
  )
}

export function Onboarding() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')
  const complete = useStore((s) => s.completeOnboarding)
  const { signInWithGoogle } = useAuth()

  // 0: Bienvenida, 1: Práctica 3 gestos, 2: Ranking A/B, 3: Amigos, 4: Registro / Inicio, 5: Selección de estanterías
  const [step, setStep] = useState(0)

  // Estado de los 3 gestos completados
  const [gestures, setGestures] = useState<{ left: boolean; right: boolean; up: boolean }>({
    left: false,
    right: false,
    up: false,
  })

  // Estanterías elegidas en paso 5
  const [selectedShelves, setSelectedShelves] = useState<ShelfType[]>([...SHELVES])

  // Tarjeta actual de práctica en paso 1
  const [itemIndex, setItemIndex] = useState(0)
  const currentCard = TUTORIAL_ITEMS[itemIndex % TUTORIAL_ITEMS.length]

  // Física de arrastre para la tarjeta real
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-200, 0, 200], [-14, 0, 14])

  // Opacidad de sellos y resplandores reactivos
  const rightO = useTransform(x, [20, 100], [0, 1])
  const leftO = useTransform(x, [-20, -100], [0, 1])
  const upO = useTransform(y, [-20, -90], [0, 1])

  const isBusy = useRef(false)

  // Duelo simulado en paso 2
  const [winner, setWinner] = useState<'a' | 'b' | null>(null)

  const finish = (skip = false, redirectTarget?: string) => {
    complete({})
    const target =
      redirectTarget ||
      (next && next !== '/' && next.startsWith('/') && !next.startsWith('/onboarding') ? next : '/descubrir')
    nav(target, { replace: true })
  }

  const flingCard = (dir: 'left' | 'right' | 'up') => {
    if (isBusy.current) return
    isBusy.current = true
    haptic('tap')
    setGestures((prev) => ({ ...prev, [dir]: true }))

    const exitX = dir === 'right' ? 380 : dir === 'left' ? -380 : 0
    const exitY = dir === 'up' ? -420 : 30

    animate(x, exitX, { duration: 0.24, ease: 'easeIn' })
    animate(y, exitY, { duration: 0.24, ease: 'easeIn' }).then(() => {
      setItemIndex((i) => i + 1)
      x.set(0)
      y.set(0)
      isBusy.current = false
    })
  }

  const allGesturesTried = gestures.left && gestures.right && gestures.up

  const toggleShelf = (s: ShelfType) => {
    if (selectedShelves.includes(s)) {
      if (selectedShelves.length > 1) {
        setSelectedShelves(selectedShelves.filter((x) => x !== s))
      }
    } else {
      setSelectedShelves([...selectedShelves, s])
    }
  }

  return (
    <div className="h-full flex flex-col px-5 safe-top pb-6 bg-bg overflow-y-auto select-none">
      {/* Cabecera común de navegación */}
      <div className="flex items-center justify-between h-14 shrink-0">
        {step > 0 ? (
          <button
            onClick={() => setStep(step - 1)}
            className="text-xs font-semibold text-mute flex items-center gap-1.5 min-h-[44px] px-2 active:opacity-60 transition-opacity"
          >
            <Icon name="back" size={16} /> Atrás
          </button>
        ) : (
          <span className="w-12" />
        )}

        {/* Indicadores de progreso modernos tipo cápsula */}
        <div className="flex items-center gap-1.5" aria-label={`Paso ${step + 1} de 6`}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-accent' : i < step ? 'w-2 bg-accent/50' : 'w-1.5 bg-line'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => finish(true)}
          className="text-xs font-semibold text-mute hover:text-ink px-2 min-h-[44px] transition-colors"
        >
          Saltar
        </button>
      </div>

      {/* Contenedor central animado */}
      <div className="flex-1 min-h-0 flex flex-col justify-center py-2 max-w-sm w-full mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="w-full flex flex-col items-center"
          >
            {/* ============================================================== */}
            {/* PASO 0: BIENVENIDA & MANIFIESTO                                */}
            {/* ============================================================== */}
            {step === 0 && (
              <div className="w-full space-y-7 text-center">
                {/* Composición tridimensional de portadas reales */}
                <div className="relative h-44 w-full flex items-center justify-center pt-2">
                  <motion.div
                    initial={{ rotate: -14, x: -50 }}
                    animate={{ rotate: -10, x: -44 }}
                    className="absolute w-24 h-36 rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-10"
                  >
                    <Poster item={TUTORIAL_ITEMS[1]} showTitle={false} className="w-full h-full object-cover" />
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0.95, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    className="relative w-28 h-40 rounded-2xl overflow-hidden shadow-2xl border border-white/20 z-20"
                  >
                    <Poster item={TUTORIAL_ITEMS[0]} showTitle={false} className="w-full h-full object-cover" />
                  </motion.div>
                  <motion.div
                    initial={{ rotate: 14, x: 50 }}
                    animate={{ rotate: 10, x: 44 }}
                    className="absolute w-24 h-36 rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-10"
                  >
                    <Poster item={TUTORIAL_ITEMS[2]} showTitle={false} className="w-full h-full object-cover" />
                  </motion.div>
                </div>

                <div className="space-y-2">
                  <div className="text-accent text-[11px] font-bold tracking-[0.2em] uppercase">
                    {APP_NAME}
                  </div>
                  <h1 className="serif text-[32px] leading-[1.08] font-bold text-ink">
                    Lo que te ha formado, ordenado por ti.
                  </h1>
                  <p className="text-mute text-sm max-w-xs mx-auto leading-relaxed pt-1">
                    Películas, series, libros, música y juegos de mesa. En estanterías compartidas y sin notas numéricas vacías.
                  </p>
                </div>

                {/* Resumen de las 5 estanterías con iconos profesionales */}
                <div className="grid grid-cols-5 gap-2 pt-1 w-full">
                  {SHELVES.map((s) => (
                    <div
                      key={s}
                      className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-2xl bg-surface border border-line"
                    >
                      <Icon name={SHELF_ICONS[s]} size={19} className="text-accent" />
                      <span className="text-[10px] font-medium text-mute tracking-tight truncate max-w-full">
                        {SHELF_LABEL[s].plural}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 w-full">
                  <button
                    onClick={() => {
                      haptic('tap')
                      setStep(1)
                    }}
                    className="w-full min-h-[52px] rounded-2xl bg-accent text-accent-ink font-bold text-sm tracking-wide active:scale-[0.98] transition-transform shadow-lg shadow-accent/15"
                  >
                    Empezar tutorial
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* PASO 1: LOS 3 GESTOS CON TARJETA REAL Y FÍSICA AUTÉNTICA       */}
            {/* ============================================================== */}
            {step === 1 && (
              <div className="w-full space-y-4">
                <div className="text-center space-y-1">
                  <h2 className="serif text-[26px] leading-tight font-bold text-ink">
                    Descubre con tres gestos
                  </h2>
                  <p className="text-mute text-xs">
                    Desliza la tarjeta en cualquier dirección o pulsa los botones.
                  </p>
                </div>

                {/* Tarjeta real con proporciones auténticas y sellos */}
                <div className="relative h-[290px] w-full max-w-[270px] mx-auto">
                  {/* Tarjeta del fondo para dar sensación de mazo */}
                  <div className="absolute inset-0 rounded-[24px] bg-surface2 border border-line scale-95 translate-y-3 opacity-60 pointer-events-none" />

                  {/* Tarjeta interactiva arrastrable */}
                  <motion.div
                    style={{ x, y, rotate }}
                    drag
                    dragElastic={0.9}
                    onDragEnd={(_, info) => {
                      const ox = info.offset.x
                      const oy = info.offset.y
                      if (Math.abs(ox) > 85) {
                        flingCard(ox > 0 ? 'right' : 'left')
                      } else if (oy < -70) {
                        flingCard('up')
                      } else {
                        animate(x, 0, { type: 'spring', stiffness: 420, damping: 28 })
                        animate(y, 0, { type: 'spring', stiffness: 420, damping: 28 })
                      }
                    }}
                    className="absolute inset-0 rounded-[24px] overflow-hidden bg-surface border border-line shadow-2xl shadow-black/70 cursor-grab active:cursor-grabbing touch-none select-none"
                  >
                    {/* Póster de alta calidad alojado */}
                    <Poster item={currentCard} showTitle={false} className="absolute inset-0 w-full h-full object-cover" />

                    {/* Degradado cinematográfico */}
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />
                    <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

                    {/* Sellos de swipe reactivos */}
                    <Stamp
                      label="LA HE VISTO"
                      color="var(--color-stamp-green, #3ec878)"
                      opacity={rightO}
                      className="top-[24%] left-4 -rotate-12 border-emerald-400 text-emerald-400 bg-black/40 backdrop-blur-xs"
                    />
                    <Stamp
                      label="NO ME INTERESA"
                      color="var(--color-stamp-red, #ef4b4b)"
                      opacity={leftO}
                      className="top-[24%] right-4 rotate-12 border-rose-500 text-rose-500 bg-black/40 backdrop-blur-xs"
                    />
                    <Stamp
                      label="PENDIENTE"
                      color="var(--color-stamp-blue, #5b9cf5)"
                      opacity={upO}
                      className="top-[32%] left-1/2 -translate-x-1/2 -rotate-6 border-sky-400 text-sky-400 bg-black/40 backdrop-blur-xs"
                    />

                    {/* Resplandores reactivos */}
                    <motion.div
                      style={{ opacity: rightO }}
                      className="absolute inset-0 bg-emerald-500/20 pointer-events-none"
                    />
                    <motion.div
                      style={{ opacity: leftO }}
                      className="absolute inset-0 bg-rose-500/20 pointer-events-none"
                    />
                    <motion.div
                      style={{ opacity: upO }}
                      className="absolute inset-0 bg-sky-500/20 pointer-events-none"
                    />

                    {/* Metadatos de la tarjeta real */}
                    <div className="absolute bottom-0 inset-x-0 p-4 text-white">
                      <div className="text-[10px] uppercase font-bold tracking-widest text-accent">
                        {SHELF_LABEL[currentCard.type]?.singular || 'Obra'} · {currentCard.year}
                      </div>
                      <h3 className="serif text-xl font-bold leading-tight mt-0.5 line-clamp-2">
                        {currentCard.title}
                      </h3>
                      <p className="text-xs text-white/70 truncate mt-0.5">{currentCard.creator}</p>
                    </div>
                  </motion.div>
                </div>

                {/* Indicadores de los 3 gestos con botones de disparo directo */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => flingCard('left')}
                    className={`py-2 px-1.5 rounded-2xl border flex flex-col items-center gap-1 transition-all active:scale-95 ${
                      gestures.left
                        ? 'bg-rose-500/15 border-rose-500 text-rose-400 shadow-sm'
                        : 'bg-surface border-line text-mute'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-bold text-xs">
                      <span>←</span>
                      <Icon name="x" size={14} strokeWidth={2.5} />
                    </div>
                    <span className="text-[11px] font-semibold text-center leading-tight">No me interesa</span>
                  </button>

                  <button
                    onClick={() => flingCard('up')}
                    className={`py-2 px-1.5 rounded-2xl border flex flex-col items-center gap-1 transition-all active:scale-95 ${
                      gestures.up
                        ? 'bg-sky-500/15 border-sky-500 text-sky-400 shadow-sm'
                        : 'bg-surface border-line text-mute'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-bold text-xs">
                      <span>↑</span>
                      <Icon name="bookmark" size={13} strokeWidth={2.5} />
                    </div>
                    <span className="text-[11px] font-semibold text-center leading-tight">Guardar</span>
                  </button>

                  <button
                    onClick={() => flingCard('right')}
                    className={`py-2 px-1.5 rounded-2xl border flex flex-col items-center gap-1 transition-all active:scale-95 ${
                      gestures.right
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm'
                        : 'bg-surface border-line text-mute'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-bold text-xs">
                      <span>→</span>
                      <Icon name="check" size={14} strokeWidth={2.5} />
                    </div>
                    <span className="text-[11px] font-semibold text-center leading-tight">La he visto</span>
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      haptic('tap')
                      setStep(2)
                    }}
                    className={`w-full min-h-[50px] rounded-2xl font-bold text-sm transition-all shadow-md ${
                      allGesturesTried
                        ? 'bg-accent text-accent-ink active:scale-[0.98]'
                        : 'bg-surface2 text-mute border border-line'
                    }`}
                  >
                    {allGesturesTried ? 'Continuar al ranking' : 'Prueba los 3 gestos para continuar'}
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* PASO 2: TU RANKING SIN NOTAS VACÍAS (DUELO REAL A/B)           */}
            {/* ============================================================== */}
            {step === 2 && (
              <div className="w-full space-y-6 text-center">
                <div className="space-y-1">
                  <h2 className="serif text-[28px] leading-tight font-bold text-ink">
                    Tu ranking sin poner notas
                  </h2>
                  <p className="text-mute text-xs leading-relaxed max-w-xs mx-auto">
                    Poner un 7 o un 8 no define tu gusto. En Biblioteca eliges entre dos y el motor ordena tu lista de forma natural.
                  </p>
                </div>

                {/* Comparación visual viva entre dos obras reales */}
                <div className="py-2 flex items-center justify-center gap-3 w-full">
                  {/* Tarjeta A */}
                  <motion.div
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      haptic('tick')
                      setWinner('a')
                    }}
                    className={`relative w-36 h-52 rounded-2xl overflow-hidden border cursor-pointer transition-all duration-300 shadow-xl ${
                      winner === 'a'
                        ? 'border-accent ring-2 ring-accent scale-105 z-20'
                        : winner === 'b'
                        ? 'opacity-40 scale-95 border-line'
                        : 'border-line rotate-[-4deg]'
                    }`}
                  >
                    <Poster item={TUTORIAL_ITEMS[0]} showTitle={false} className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/60 to-transparent p-3 flex flex-col justify-end text-left text-white">
                      <div className="text-[10px] font-bold text-accent">#1</div>
                      <div className="text-xs font-bold truncate leading-tight">{TUTORIAL_ITEMS[0].title}</div>
                      <div className="text-[10px] text-white/70">{TUTORIAL_ITEMS[0].year}</div>
                    </div>
                    {winner === 'a' && (
                      <div className="absolute top-2 right-2 bg-accent text-accent-ink p-1 rounded-full shadow">
                        <Icon name="check" size={14} strokeWidth={3} />
                      </div>
                    )}
                  </motion.div>

                  <div className="text-xs font-black text-mute px-1">VS</div>

                  {/* Tarjeta B */}
                  <motion.div
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      haptic('tick')
                      setWinner('b')
                    }}
                    className={`relative w-36 h-52 rounded-2xl overflow-hidden border cursor-pointer transition-all duration-300 shadow-xl ${
                      winner === 'b'
                        ? 'border-accent ring-2 ring-accent scale-105 z-20'
                        : winner === 'a'
                        ? 'opacity-40 scale-95 border-line'
                        : 'border-line rotate-[4deg]'
                    }`}
                  >
                    <Poster item={TUTORIAL_ITEMS[1]} showTitle={false} className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/60 to-transparent p-3 flex flex-col justify-end text-left text-white">
                      <div className="text-[10px] font-bold text-accent">#2</div>
                      <div className="text-xs font-bold truncate leading-tight">{TUTORIAL_ITEMS[1].title}</div>
                      <div className="text-[10px] text-white/70">{TUTORIAL_ITEMS[1].year}</div>
                    </div>
                    {winner === 'b' && (
                      <div className="absolute top-2 right-2 bg-accent text-accent-ink p-1 rounded-full shadow">
                        <Icon name="check" size={14} strokeWidth={3} />
                      </div>
                    )}
                  </motion.div>
                </div>

                <div className="text-xs text-mute font-medium">
                  {winner ? '¡Elegida! Con pocos duelos tu lista queda perfectamente ordenada.' : 'Toca la que más te guste para probar'}
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      haptic('tap')
                      setStep(3)
                    }}
                    className="w-full min-h-[50px] rounded-2xl bg-accent text-accent-ink font-bold text-sm active:scale-[0.98] transition-transform shadow-lg shadow-accent/15"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* PASO 3: AMIGOS Y CRÍTICA HONESTA                               */}
            {/* ============================================================== */}
            {step === 3 && (
              <div className="w-full space-y-6 text-center">
                <div className="space-y-1">
                  <h2 className="serif text-[28px] leading-tight font-bold text-ink">
                    El criterio de tus amigos
                  </h2>
                  <p className="text-mute text-xs leading-relaxed max-w-xs mx-auto">
                    Sin algoritmos comerciales. Ves quién la ha visto, en qué puesto de su ranking la coloca y sus notas reales.
                  </p>
                </div>

                {/* Tarjeta de muestra con presencia social real */}
                <div className="w-full max-w-[270px] mx-auto rounded-3xl bg-surface border border-line p-4 shadow-xl text-left space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-16 rounded-xl overflow-hidden shrink-0 border border-line">
                      <Poster item={TUTORIAL_ITEMS[0]} showTitle={false} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-ink truncate">{TUTORIAL_ITEMS[0].title}</div>
                      <div className="text-[11px] text-mute">{TUTORIAL_ITEMS[0].year} · Coppola</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Avatar name="Carlos" color="#f59e0b" size={24} />
                        <Avatar name="Laura" color="#3b82f6" size={24} />
                        <span className="text-[11px] text-mute font-medium">La tienen en su top</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface2 rounded-2xl p-3 border border-line text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-ink">Carlos</span>
                      <span className="text-accent font-bold">Puesto #1</span>
                    </div>
                    <p className="text-mute text-[11px] leading-snug">
                      «Una obra maestra absoluta de ritmo y fotografía.»
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      haptic('tap')
                      setStep(4)
                    }}
                    className="w-full min-h-[50px] rounded-2xl bg-accent text-accent-ink font-bold text-sm active:scale-[0.98] transition-transform shadow-lg shadow-accent/15"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* PASO 4: CÓMO EMPEZAR                                           */}
            {/* ============================================================== */}
            {step === 4 && (
              <div className="w-full space-y-4">
                <div className="text-center space-y-1 mb-2">
                  <h2 className="serif text-[28px] leading-tight font-bold text-ink">
                    ¿Cómo quieres empezar?
                  </h2>
                  <p className="text-mute text-xs">
                    Elige cómo prefieres comenzar a guardar tus obras.
                  </p>
                </div>

                {/* Opción 1: Google con branding oficial limpio */}
                <div className="bg-surface border border-line rounded-3xl p-4 space-y-2 hover:border-accent/40 transition-colors shadow-sm">
                  <button
                    type="button"
                    onClick={() => {
                      haptic('tap')
                      signInWithGoogle()
                    }}
                    className="w-full min-h-[48px] rounded-2xl bg-white text-black text-sm font-semibold flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform shadow"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    Entrar con Google
                  </button>
                  <p className="text-[11px] text-mute text-center px-1 leading-snug">
                    Sincroniza tus listas en la nube de forma segura para no perder tus datos.
                  </p>
                </div>

                {/* Opción 2: Importar */}
                <div className="bg-surface border border-line rounded-3xl p-4 space-y-2 hover:border-accent/40 transition-colors shadow-sm">
                  <button
                    type="button"
                    onClick={() => {
                      haptic('tap')
                      finish(true, '/importar')
                    }}
                    className="w-full min-h-[48px] rounded-2xl bg-surface2 border border-line text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform text-ink"
                  >
                    <Icon name="sparkle" size={17} className="text-accent" />
                    Importar mis listas existentes
                  </button>
                  <p className="text-[11px] text-mute text-center px-1 leading-snug">
                    Trae tu historial de Letterboxd, IMDb, Goodreads o Netflix en segundos.
                  </p>
                </div>

                {/* Opción 3: Explorar */}
                <div className="bg-surface/50 border border-line/60 rounded-3xl p-3.5 space-y-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      haptic('tap')
                      setStep(5)
                    }}
                    className="w-full min-h-[44px] rounded-2xl bg-transparent text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform text-mute hover:text-ink"
                  >
                    Explorar sin cuenta
                    <Icon name="chevron" size={14} />
                  </button>
                  <p className="text-[11px] text-mute/80 text-center px-1 leading-snug">
                    Pruébala directamente en tu móvil sin iniciar sesión.
                  </p>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* PASO 5: ELECCIÓN DE ESTANTERÍAS                                */}
            {/* ============================================================== */}
            {step === 5 && (
              <div className="w-full space-y-5">
                <div className="text-center space-y-1">
                  <h2 className="serif text-[28px] leading-tight font-bold text-ink">
                    ¿Qué te interesa guardar?
                  </h2>
                  <p className="text-mute text-xs">
                    Elige qué estanterías quieres tener activas en tu biblioteca.
                  </p>
                </div>

                <div className="space-y-2">
                  {SHELVES.map((s) => {
                    const active = selectedShelves.includes(s)
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          haptic('tap')
                          toggleShelf(s)
                        }}
                        className={`w-full min-h-[52px] rounded-2xl px-4 flex items-center justify-between border transition-all active:scale-[0.99] ${
                          active
                            ? 'bg-accent/10 border-accent text-ink font-semibold'
                            : 'bg-surface border-line text-mute'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <Icon
                            name={SHELF_ICONS[s]}
                            size={18}
                            className={active ? 'text-accent' : 'text-mute'}
                          />
                          <span className="text-sm">{SHELF_LABEL[s].plural}</span>
                        </span>
                        <span
                          className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs transition-colors ${
                            active ? 'bg-accent border-accent text-accent-ink' : 'border-line text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      haptic('tap')
                      finish(false)
                    }}
                    className="w-full min-h-[52px] rounded-2xl bg-accent text-accent-ink font-bold text-sm tracking-wide active:scale-[0.98] transition-transform shadow-lg shadow-accent/15"
                  >
                    Entrar a mi biblioteca
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
