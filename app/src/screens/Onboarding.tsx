import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { APP_NAME, AVATAR_COLORS, PLATFORMS } from '../config'
import { useStore } from '../store/useStore'
import { Avatar, Chip } from '../components/ui'

/** 3 pantallas rápidas y saltables. Si venimos de un link compartido (`next`), vuelve allí al terminar. */
export function Onboarding() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')
  const complete = useStore((s) => s.completeOnboarding)
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [color, setColor] = useState(AVATAR_COLORS[0])
  const [year, setYear] = useState('')
  const [platforms, setPlatforms] = useState<string[]>([])

  const finish = (skip = false) => {
    const y = parseInt(year, 10)
    complete({
      name: name.trim() || 'Tú',
      avatarColor: color,
      platforms: skip ? [] : platforms,
      ...(y >= 1930 && y <= new Date().getFullYear() - 6 ? { birthYear: y } : {}),
    })
    nav(next && next !== '/' && next.startsWith('/') && !next.startsWith('/onboarding') ? next : '/descubrir', { replace: true })
  }
  const go = () => (step < 2 ? setStep(step + 1) : finish())

  return (
    <div className="h-full flex flex-col px-6 safe-top pb-6 bg-bg">
      <div className="flex items-center justify-between h-11">
        <div className="flex gap-1.5" aria-label={`Paso ${step + 1} de 3`}>
          {[0, 1, 2].map((i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-8 bg-accent' : 'w-3 bg-line'}`} />)}
        </div>
        <button onClick={() => (step < 2 ? setStep(step + 1) : finish(true))} className="text-sm text-mute px-3 min-h-[44px]">Saltar</button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
            {step === 0 && (
              <div>
                <div className="text-accent text-sm font-semibold tracking-widest uppercase">{APP_NAME}</div>
                <h1 className="serif text-[34px] leading-[1.1] font-semibold mt-2">Todo lo que te ha formado, en tus estanterías.</h1>
                <p className="text-mute mt-3">Guarda, ordena y comparte pelis, series y libros. Con la opinión de tus amigos a mano.</p>
                <div className="flex items-center gap-4 mt-8">
                  <Avatar name={name || 'Tú'} color={color} size={64} />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="¿Cómo te llamas?"
                    maxLength={24}
                    autoComplete="off"
                    className="flex-1 min-w-0 bg-surface border border-line rounded-2xl px-4 min-h-[52px] text-lg focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="flex gap-2.5 mt-5 flex-wrap" role="radiogroup" aria-label="Color del avatar">
                  {AVATAR_COLORS.map((c) => (
                    <button key={c} role="radio" aria-checked={c === color} aria-label={`Color ${c}`} onClick={() => setColor(c)}
                      className={`w-11 h-11 rounded-full border-2 ${c === color ? 'border-white' : 'border-transparent'}`} style={{ background: c }} />
                  ))}
                </div>
              </div>
            )}
            {step === 1 && (
              <div>
                <h1 className="serif text-[30px] leading-[1.1] font-semibold">¿En qué año naciste?</h1>
                <p className="text-mute mt-3">Para enseñarte primero lo que más probablemente has visto. Es opcional y se queda en tu móvil.</p>
                <input
                  value={year}
                  onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  inputMode="numeric"
                  placeholder="1990"
                  aria-label="Año de nacimiento"
                  className="mt-6 w-full bg-surface border border-line rounded-2xl px-4 min-h-[60px] text-3xl serif text-center focus:outline-none focus:border-accent"
                />
              </div>
            )}
            {step === 2 && (
              <div>
                <h1 className="serif text-[30px] leading-[1.1] font-semibold">¿Qué plataformas tienes o has tenido?</h1>
                <p className="text-mute mt-3">Así el asistente «Decidir» te propone cosas que puedes ver ya.</p>
                <div className="flex flex-wrap gap-2.5 mt-6">
                  {PLATFORMS.map((p) => (
                    <Chip key={p} active={platforms.includes(p)} onClick={() => setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]))}>{p}</Chip>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <button onClick={go} className="min-h-[54px] rounded-2xl bg-accent text-accent-ink font-semibold text-lg active:scale-[0.98] transition-transform">
        {step < 2 ? 'Continuar' : 'Empieza a hacer swipe'}
      </button>
    </div>
  )
}
