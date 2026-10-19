import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion'
import { APP_NAME } from '../config'
import { useStore } from '../store/useStore'
import { useAuth } from '../store/useAuth'
import { SHELVES, SHELF_LABEL, type ShelfType } from '../types'
import { Icon } from '../components/Icon'

export function Onboarding() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')
  const complete = useStore((s) => s.completeOnboarding)
  const { signInWithGoogle } = useAuth()

  // 0: Qué es, 1: Gestos práctica, 2: Ranking duelos, 3: Amigos, 4: Cómo empezar, 5: Elegir estanterías
  const [step, setStep] = useState(0)

  // Práctica de gestos
  const [gestures, setGestures] = useState<{ left: boolean; right: boolean; up: boolean }>({
    left: false,
    right: false,
    up: false,
  })

  // Estanterías elegidas en paso 5
  const [selectedShelves, setSelectedShelves] = useState<ShelfType[]>([...SHELVES])

  // Drag motion values para la tarjeta de práctica
  const cardX = useMotionValue(0)
  const cardY = useMotionValue(0)
  const cardRotate = useTransform(cardX, [-180, 0, 180], [-12, 0, 12])

  const finish = (skip = false, redirectTarget?: string) => {
    complete({})
    const target = redirectTarget || (next && next !== '/' && next.startsWith('/') && !next.startsWith('/onboarding') ? next : '/descubrir')
    nav(target, { replace: true })
  }

  const handlePracticeSwipe = (dir: 'left' | 'right' | 'up') => {
    navigator.vibrate?.(10)
    setGestures((prev) => ({ ...prev, [dir]: true }))
    cardX.set(0)
    cardY.set(0)
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
    <div className="h-full flex flex-col px-6 safe-top pb-6 bg-bg overflow-y-auto">
      {/* Cabecera común con botón atrás, puntos de progreso y Saltar */}
      <div className="flex items-center justify-between h-12 shrink-0">
        {step > 0 ? (
          <button
            onClick={() => setStep(step - 1)}
            className="text-xs font-semibold text-mute flex items-center gap-1 min-h-[44px]"
          >
            <Icon name="back" size={16} /> Atrás
          </button>
        ) : (
          <span className="w-12" />
        )}

        <div className="flex gap-1.5" aria-label={`Paso ${step + 1} de 6`}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-accent' : i < step ? 'w-2.5 bg-accent/50' : 'w-2 bg-line'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => finish(true)}
          className="text-xs font-medium text-mute hover:text-ink px-2 min-h-[44px]"
        >
          Saltar
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col justify-center py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full max-w-sm mx-auto"
          >
            {/* Paso 0: Qué es */}
            {step === 0 && (
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-accent/15 text-accent flex items-center justify-center shadow-lg shadow-accent/10">
                  <span className="text-3xl">📚</span>
                </div>
                <div>
                  <div className="text-accent text-xs font-bold tracking-widest uppercase mb-2">
                    {APP_NAME}
                  </div>
                  <h1 className="serif text-[32px] leading-[1.1] font-semibold text-ink">
                    Tus pelis, series, libros, música y juegos en estanterías.
                  </h1>
                  <p className="text-mute text-base mt-3 leading-relaxed">
                    Lo que te ha formado, ordenado por ti. Todo en un único lugar sin notas vacías.
                  </p>
                </div>

                {/* Estanterías miniatura */}
                <div className="grid grid-cols-5 gap-2 pt-2">
                  {SHELVES.map((s) => (
                    <div key={s} className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-surface border border-line">
                      <span className="text-lg">
                        {s === 'movie' ? '🎬' : s === 'series' ? '📺' : s === 'book' ? '📖' : s === 'artist' ? '🎵' : '🎲'}
                      </span>
                      <span className="text-[10px] font-medium text-mute truncate max-w-full">
                        {SHELF_LABEL[s].plural}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => setStep(1)}
                    className="w-full min-h-[50px] rounded-2xl bg-accent text-accent-ink font-semibold text-sm active:scale-95 transition-transform"
                  >
                    Empezar tutorial
                  </button>
                </div>
              </div>
            )}

            {/* Paso 1: Los 3 gestos, practicando */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="text-center">
                  <h1 className="serif text-[26px] leading-tight font-semibold text-ink">
                    Descubre con 3 gestos
                  </h1>
                  <p className="text-mute text-xs mt-1">
                    Prueba a deslizar o pulsa los botones para familiarizarte.
                  </p>
                </div>

                {/* Tarjeta interactiva de práctica */}
                <div className="relative h-60 w-full rounded-2xl bg-surface border border-line p-4 flex flex-col justify-between overflow-hidden shadow-xl">
                  <motion.div
                    style={{ x: cardX, y: cardY, rotate: cardRotate }}
                    drag
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.x > 80) handlePracticeSwipe('right')
                      else if (info.offset.x < -80) handlePracticeSwipe('left')
                      else if (info.offset.y < -60) handlePracticeSwipe('up')
                      else {
                        cardX.set(0)
                        cardY.set(0)
                      }
                    }}
                    className="absolute inset-0 bg-gradient-to-t from-black via-zinc-900 to-zinc-800 p-5 flex flex-col justify-between cursor-grab active:cursor-grabbing select-none"
                  >
                    <div className="flex items-center justify-between text-xs text-white/70">
                      <span>🎬 Película de ejemplo</span>
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Práctica</span>
                    </div>
                    <div>
                      <h3 className="serif text-2xl font-bold text-white leading-tight">El Padrino</h3>
                      <p className="text-xs text-white/70 mt-1">1972 · Francis Ford Coppola</p>
                    </div>
                  </motion.div>
                </div>

                {/* Checklist de 3 gestos */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handlePracticeSwipe('left')}
                    className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                      gestures.left
                        ? 'bg-rose-500/15 border-rose-500 text-rose-400'
                        : 'bg-surface border-line text-mute'
                    }`}
                  >
                    <span className="text-base font-bold">← {gestures.left ? '✓' : '✕'}</span>
                    <span className="text-[11px] font-medium leading-tight text-center">No me interesa</span>
                  </button>

                  <button
                    onClick={() => handlePracticeSwipe('up')}
                    className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                      gestures.up
                        ? 'bg-blue-500/15 border-blue-500 text-blue-400'
                        : 'bg-surface border-line text-mute'
                    }`}
                  >
                    <span className="text-base font-bold">↑ {gestures.up ? '✓' : '🔖'}</span>
                    <span className="text-[11px] font-medium leading-tight text-center">Pendiente</span>
                  </button>

                  <button
                    onClick={() => handlePracticeSwipe('right')}
                    className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                      gestures.right
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                        : 'bg-surface border-line text-mute'
                    }`}
                  >
                    <span className="text-base font-bold">→ {gestures.right ? '✓' : '★'}</span>
                    <span className="text-[11px] font-medium leading-tight text-center">La he visto</span>
                  </button>
                </div>

                <button
                  onClick={() => setStep(2)}
                  className={`w-full min-h-[50px] rounded-2xl font-semibold text-sm transition-all ${
                    allGesturesTried
                      ? 'bg-accent text-accent-ink active:scale-95'
                      : 'bg-surface2 text-mute border border-line'
                  }`}
                >
                  {allGesturesTried ? '¡Listo! Continuar' : 'Prueba los 3 gestos para continuar'}
                </button>
              </div>
            )}

            {/* Paso 2: Tu ranking */}
            {step === 2 && (
              <div className="space-y-6 text-center">
                <div className="flex items-center justify-center gap-3 py-2">
                  <div className="w-24 h-36 rounded-2xl bg-surface border border-line p-3 flex flex-col justify-between shadow-lg rotate-[-6deg]">
                    <span className="text-xs font-bold text-accent">Obra A</span>
                    <span className="text-2xl">⚖️</span>
                    <span className="text-[11px] text-mute">¿Cuál prefieres?</span>
                  </div>
                  <span className="text-xl font-black text-mute">VS</span>
                  <div className="w-24 h-36 rounded-2xl bg-surface border border-line p-3 flex flex-col justify-between shadow-lg rotate-[6deg]">
                    <span className="text-xs font-bold text-accent">Obra B</span>
                    <span className="text-2xl">⚖️</span>
                    <span className="text-[11px] text-mute">¿Cuál prefieres?</span>
                  </div>
                </div>

                <div>
                  <h1 className="serif text-[28px] leading-tight font-semibold text-ink">
                    Tu ranking sin poner notas
                  </h1>
                  <p className="text-mute text-sm mt-2.5 leading-relaxed">
                    Poner un 7 o un 8 no dice nada. En Biblioteca eliges entre dos y la app ordena tu lista con precisión matemática.
                  </p>
                </div>

                <div className="bg-surface rounded-2xl border border-line p-3.5 flex items-center justify-around text-xs text-mute">
                  <span>🏆 nº 1 Favorita</span>
                  <span>•</span>
                  <span>🥈 nº 2 Gran recuerdo</span>
                  <span>•</span>
                  <span>🥉 nº 3 Notable</span>
                </div>

                <button
                  onClick={() => setStep(3)}
                  className="w-full min-h-[50px] rounded-2xl bg-accent text-accent-ink font-semibold text-sm active:scale-95 transition-transform"
                >
                  Siguiente
                </button>
              </div>
            )}

            {/* Paso 3: Amigos */}
            {step === 3 && (
              <div className="space-y-6 text-center">
                <div className="w-full py-4 flex items-center justify-center">
                  <div className="relative rounded-2xl bg-surface border border-line p-4 w-64 shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-ink">Parásitos</span>
                      <span className="text-xs text-accent font-bold">2019</span>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-line/60">
                      <div className="w-8 h-8 rounded-full bg-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center">
                        C
                      </div>
                      <div className="w-8 h-8 rounded-full bg-sky-500/30 text-sky-300 font-bold text-xs flex items-center justify-center">
                        L
                      </div>
                      <span className="text-xs text-mute font-medium">Carlos y Laura la han visto</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h1 className="serif text-[28px] leading-tight font-semibold text-ink">
                    La opinión de tus amigos
                  </h1>
                  <p className="text-mute text-sm mt-2.5 leading-relaxed">
                    Ves directamente qué han visto tus amigos, qué puesto le dan y sus comentarios honestos sin algoritmos extraños.
                  </p>
                </div>

                <button
                  onClick={() => setStep(4)}
                  className="w-full min-h-[50px] rounded-2xl bg-accent text-accent-ink font-semibold text-sm active:scale-95 transition-transform"
                >
                  Siguiente
                </button>
              </div>
            )}

            {/* Paso 4: Cómo empezar */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <h1 className="serif text-[28px] leading-tight font-semibold text-ink">
                    ¿Cómo quieres empezar?
                  </h1>
                  <p className="text-mute text-xs mt-1">
                    Elige cómo prefieres comenzar tu biblioteca.
                  </p>
                </div>

                {/* Opción 1: Google */}
                <div className="bg-surface border border-line rounded-3xl p-4 space-y-2 hover:border-accent/40 transition-colors">
                  <button
                    onClick={() => signInWithGoogle()}
                    className="w-full min-h-[46px] rounded-2xl bg-white text-black text-sm font-semibold flex items-center justify-center gap-2.5 active:scale-95 transition-transform shadow"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    Entrar con Google
                  </button>
                  <p className="text-[12px] text-mute text-center px-1 leading-snug">
                    Sincroniza tus notas en la nube de forma segura y no pierdas tus datos.
                  </p>
                </div>

                {/* Opción 2: Importar */}
                <div className="bg-surface border border-line rounded-3xl p-4 space-y-2 hover:border-accent/40 transition-colors">
                  <button
                    onClick={() => finish(true, '/importar')}
                    className="w-full min-h-[46px] rounded-2xl bg-surface2 border border-line text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform text-ink"
                  >
                    <Icon name="sparkle" size={17} className="text-accent" />
                    Importar mis listas
                  </button>
                  <p className="text-[12px] text-mute text-center px-1 leading-snug">
                    Trae tu historial de Letterboxd, IMDb, Goodreads o Netflix en 1 minuto.
                  </p>
                </div>

                {/* Opción 3: Explorar */}
                <div className="bg-surface/50 border border-line/60 rounded-3xl p-4 space-y-2">
                  <button
                    onClick={() => setStep(5)}
                    className="w-full min-h-[46px] rounded-2xl bg-transparent border border-line text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform text-mute hover:text-ink"
                  >
                    Explorar sin cuenta
                    <span className="text-xs">›</span>
                  </button>
                  <p className="text-[12px] text-mute/80 text-center px-1 leading-snug">
                    Pruébala directamente; tus notas se guardan en este dispositivo.
                  </p>
                </div>
              </div>
            )}

            {/* Paso 5: Elegir estanterías que te interesan */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h1 className="serif text-[28px] leading-tight font-semibold text-ink">
                    ¿Qué te interesa guardar?
                  </h1>
                  <p className="text-mute text-sm mt-1.5">
                    Elige qué estanterías quieres tener visibles (puedes cambiarlas en cualquier momento).
                  </p>
                </div>

                <div className="space-y-2.5">
                  {SHELVES.map((s) => {
                    const active = selectedShelves.includes(s)
                    return (
                      <button
                        key={s}
                        onClick={() => toggleShelf(s)}
                        className={`w-full min-h-[56px] rounded-2xl px-4 flex items-center justify-between border transition-all ${
                          active
                            ? 'bg-accent/15 border-accent text-ink font-semibold'
                            : 'bg-surface border-line text-mute'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="text-xl">
                            {s === 'movie' ? '🎬' : s === 'series' ? '📺' : s === 'book' ? '📖' : s === 'artist' ? '🎵' : '🎲'}
                          </span>
                          <span>{SHELF_LABEL[s].plural}</span>
                        </span>
                        <span className="w-6 h-6 rounded-full border flex items-center justify-center text-xs">
                          {active ? '✓' : ''}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => finish(false)}
                  className="w-full min-h-[50px] rounded-2xl bg-accent text-accent-ink font-semibold text-sm active:scale-95 transition-transform"
                >
                  Entrar a mi biblioteca
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
