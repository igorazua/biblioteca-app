import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { APP_NAME, AVATAR_COLORS } from '../config'
import { useStore } from '../store/useStore'
import { useAuth } from '../store/useAuth'
import { Avatar, PlatformPicker } from '../components/ui'
import { Icon } from '../components/Icon'

export function Onboarding() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')
  const complete = useStore((s) => s.completeOnboarding)
  const { signInWithGoogle } = useAuth()
  const [step, setStep] = useState(0) // 0: Bienvenida, 1: Nombre y color, 2: Año y plataformas
  const [name, setName] = useState('')
  const [color, setColor] = useState(AVATAR_COLORS[0])
  const [year, setYear] = useState('')
  const [platforms, setPlatforms] = useState<string[]>([])

  const finish = (skip = false, redirectTarget?: string) => {
    const y = parseInt(year, 10)
    complete({
      name: name.trim() || 'Tú',
      avatarColor: color,
      platforms: skip ? [] : platforms,
      ...(y >= 1930 && y <= new Date().getFullYear() - 6 ? { birthYear: y } : {}),
    })
    const target = redirectTarget || (next && next !== '/' && next.startsWith('/') && !next.startsWith('/onboarding') ? next : '/descubrir')
    nav(target, { replace: true })
  }

  return (
    <div className="h-full flex flex-col px-6 safe-top pb-6 bg-bg overflow-y-auto">
      {step > 0 && (
        <div className="flex items-center justify-between h-11 shrink-0">
          <button
            onClick={() => setStep(step - 1)}
            className="text-xs font-semibold text-mute flex items-center gap-1 min-h-[44px]"
          >
            <Icon name="back" size={16} /> Atrás
          </button>
          <div className="flex gap-1.5" aria-label={`Paso ${step} de 2`}>
            {[1, 2].map((i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-8 bg-accent' : 'w-3 bg-line'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => finish(true)}
            className="text-xs text-mute px-2 min-h-[44px]"
          >
            Saltar
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col justify-center py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && (
              <div className="space-y-6 max-w-sm mx-auto w-full">
                <div>
                  <div className="text-accent text-xs font-bold tracking-widest uppercase mb-1.5">
                    {APP_NAME}
                  </div>
                  <h1 className="serif text-[32px] leading-[1.1] font-semibold text-ink">
                    Guarda y comparte lo que te ha formado.
                  </h1>
                  <p className="text-mute text-sm mt-2.5 leading-relaxed">
                    Tus películas, series y libros favoritos en estanterías personales, con la opinión de tus amigos a mano.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  {/* Opción 1: Entrar con Google */}
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
                      Sincroniza tus notas en la nube de forma segura y conecta con tus amigos reales.
                    </p>
                  </div>

                  {/* Opción 2: Importar desde Letterboxd / IMDb */}
                  <div className="bg-surface border border-line rounded-3xl p-4 space-y-2 hover:border-accent/40 transition-colors">
                    <button
                      onClick={() => finish(true, '/importar')}
                      className="w-full min-h-[46px] rounded-2xl bg-surface2 border border-line text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform text-ink"
                    >
                      <Icon name="sparkle" size={17} className="text-accent" />
                      Importar mis listas
                    </button>
                    <p className="text-[12px] text-mute text-center px-1 leading-snug">
                      Trae tu historial de Letterboxd, IMDb, Goodreads o Netflix en segundos sin empezar de cero.
                    </p>
                  </div>

                  {/* Opción 3: Explorar sin cuenta */}
                  <div className="bg-surface/50 border border-line/60 rounded-3xl p-4 space-y-2">
                    <button
                      onClick={() => setStep(1)}
                      className="w-full min-h-[46px] rounded-2xl bg-transparent border border-line text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform text-mute hover:text-ink"
                    >
                      Explorar sin cuenta
                      <span className="text-xs">›</span>
                    </button>
                    <p className="text-[12px] text-mute/80 text-center px-1 leading-snug">
                      Prueba la app de inmediato; tus notas se guardan solo en este dispositivo.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="max-w-sm mx-auto w-full">
                <h1 className="serif text-[30px] leading-[1.1] font-semibold">¿Cómo te llamas?</h1>
                <p className="text-mute text-sm mt-2">Personaliza cómo te verán tus amigos en tus listas compartidas.</p>
                <div className="flex items-center gap-4 mt-6">
                  <Avatar name={name || 'Tú'} color={color} size={64} />
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre o alias"
                    maxLength={24}
                    autoComplete="off"
                    className="flex-1 min-w-0 bg-surface border border-line rounded-2xl px-4 min-h-[52px] text-lg focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="text-xs text-mute uppercase font-semibold mt-6 mb-2">Color del avatar</div>
                <div className="flex gap-2.5 flex-wrap" role="radiogroup" aria-label="Color del avatar">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      role="radio"
                      aria-checked={c === color}
                      aria-label={`Color ${c}`}
                      onClick={() => setColor(c)}
                      className={`w-11 h-11 rounded-full border-2 ${
                        c === color ? 'border-white scale-105' : 'border-transparent'
                      } transition-transform`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="max-w-sm mx-auto w-full space-y-5">
                <div>
                  <h1 className="serif text-[28px] leading-[1.1] font-semibold">Tus preferencias</h1>
                  <p className="text-mute text-sm mt-1.5">
                    Para calibrar el asistente «Decidir» y las primeras recomendaciones.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-mute uppercase mb-1.5">
                    Año de nacimiento (opcional)
                  </label>
                  <input
                    value={year}
                    onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    inputMode="numeric"
                    placeholder="1995"
                    aria-label="Año de nacimiento"
                    className="w-full bg-surface border border-line rounded-2xl px-4 min-h-[50px] text-xl serif text-center focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-mute uppercase mb-1.5">
                    ¿Qué plataformas utilizas?
                  </label>
                  <PlatformPicker value={platforms} onChange={setPlatforms} />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {step > 0 && (
        <button
          onClick={() => (step < 2 ? setStep(step + 1) : finish())}
          className="min-h-[52px] rounded-2xl bg-accent text-accent-ink font-semibold text-base active:scale-[0.98] transition-transform max-w-sm mx-auto w-full shrink-0 shadow"
        >
          {step < 2 ? 'Continuar' : 'Empezar a explorar'}
        </button>
      )}
    </div>
  )
}
