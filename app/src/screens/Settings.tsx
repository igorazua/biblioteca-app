// app/src/screens/Settings.tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { APP_NAME } from '../config'
import { ENGINE_VERSION } from '../lib/engine/params'
import { useStore } from '../store/useStore'
import { useAuth } from '../store/useAuth'
import { PlatformPicker, Confirm, Sheet, Toast } from '../components/ui'
import { Icon } from '../components/Icon'
import { pushLocalEntriesToCloud, pullCloudEntries } from '../lib/sync'
import { subscribeToPush, isPushSupported } from '../lib/push'
import { supabase } from '../lib/supabase'
import { PhoneDiscovery } from '../components/PhoneDiscovery'

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`w-14 h-8 rounded-full p-1 transition-colors shrink-0 ${on ? 'bg-accent' : 'bg-line'}`}
    >
      <span
        className={`block w-6 h-6 rounded-full bg-white transition-transform ${
          on ? 'translate-x-6' : ''
        }`}
      />
    </button>
  )
}

export function Settings() {
  const nav = useNavigate()
  const profile = useStore((s) => s.profile)
  const setProfile = useStore((s) => s.setProfile)
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const resetAll = useStore((s) => s.resetAll)
  const loadSample = useStore((s) => s.loadSample)

  const { user, profile: authProfile, signInWithGoogle, signInWithOtp, signOut, deleteAccount } = useAuth()
  const [toast, setToast] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)

  // Feedback modal
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState('')
  const [feedbackContact, setFeedbackContact] = useState('')
  const [sendingFeedback, setSendingFeedback] = useState(false)

  // Zona de pruebas plegada
  const [testsOpen, setTestsOpen] = useState(false)

  const handleSyncNow = async () => {
    if (!user) return
    setSyncing(true)
    try {
      const pushed = await pushLocalEntriesToCloud(user.id)
      await pullCloudEntries(user.id)
      setToast(pushed > 0 ? `Sincronizadas ${pushed} obras con tu cuenta` : 'Tu biblioteca está al día con la nube')
    } catch {
      setToast('No se pudo conectar con el servidor. Reintentar.')
    } finally {
      setSyncing(false)
    }
  }

  const handleTogglePush = async () => {
    if (!isPushSupported()) {
      alert('Tu navegador o dispositivo no soporta notificaciones push directamente.')
      return
    }
    const ok = await subscribeToPush()
    if (ok) {
      setPushEnabled(true)
      setToast('Avisos activados correctamente')
    } else {
      setToast('No se pudo activar las notificaciones')
    }
  }

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedbackMsg.trim() || !supabase) return
    setSendingFeedback(true)
    try {
      await supabase.from('biblio_feedback').insert({
        message: feedbackMsg.trim(),
        contact: feedbackContact.trim() || null,
        user_id: user?.id || null,
        metadata: {
          profileName: profile.name,
          version: ENGINE_VERSION,
        },
      })
      setFeedbackMsg('')
      setFeedbackContact('')
      setFeedbackOpen(false)
      setToast('¡Muchas gracias por tu feedback!')
    } catch {
      setToast('Error enviando feedback. Reintentar.')
    } finally {
      setSendingFeedback(false)
    }
  }

  return (
    <div className="h-full scroll-y pb-12">
      <header className="safe-top px-5 pb-4 flex items-center justify-between min-h-[52px]">
        <button
          onClick={() => nav(-1)}
          className="flex items-center gap-1.5 text-sm font-semibold text-mute hover:text-ink min-h-[44px]"
        >
          <Icon name="back" size={18} />
          Volver
        </button>
        <h1 className="text-lg font-bold">Ajustes</h1>
        <span className="w-12" />
      </header>

      <div className="px-5 space-y-6">
        {/* 1. Cuenta y Nube */}
        <section aria-label="Cuenta y Nube">
          <h2 className="serif text-[20px] font-semibold mb-2.5">Cuenta y Nube</h2>
          <div className="rounded-3xl bg-surface border border-line p-4 space-y-3.5">
            {user ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-sm truncate">{authProfile?.displayName || user.email}</div>
                    <div className="text-xs text-mute truncate">{authProfile?.handle ? `@${authProfile.handle} · ` : ''}{user.email}</div>
                  </div>
                  <span className="text-xs bg-stamp-green/20 text-stamp-green font-medium px-2.5 py-1 rounded-full shrink-0">
                    Conectado
                  </span>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSyncNow}
                    disabled={syncing}
                    className="flex-1 min-h-[44px] rounded-2xl bg-surface2 border border-line text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <Icon name="undo" size={15} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
                  </button>
                  <button
                    onClick={() => signOut()}
                    className="min-h-[44px] px-4 rounded-2xl bg-surface2 border border-line text-xs font-semibold text-mute hover:text-ink active:scale-95 transition-transform"
                  >
                    Cerrar sesión
                  </button>
                </div>

                <div className="pt-2 border-t border-line/60">
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="text-xs text-stamp-red/90 hover:underline min-h-[36px] flex items-center gap-1.5"
                  >
                    <Icon name="trash" size={14} />
                    Borrar mi cuenta y datos en la nube
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-mute leading-relaxed">
                  Tus datos están guardados solo en este móvil. Entra para sincronizar entre dispositivos y conectar con amigos.
                </p>
                <button
                  onClick={() => signInWithGoogle()}
                  className="w-full min-h-[46px] rounded-2xl bg-white text-black text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Entrar con Google
                </button>
                <div className="flex gap-2 pt-1">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="o tu email para enlace mágico"
                    className="flex-1 min-w-0 bg-surface2 border border-line rounded-2xl px-3.5 text-xs focus:outline-none focus:border-accent"
                  />
                  <button
                    onClick={async () => {
                      if (!emailInput.includes('@')) return
                      const { error } = await signInWithOtp(emailInput.trim())
                      if (!error) setEmailSent(true)
                      else setToast('Error enviando enlace')
                    }}
                    disabled={emailSent}
                    className="min-h-[42px] px-3.5 rounded-2xl bg-surface2 border border-line text-xs font-semibold text-accent disabled:opacity-50"
                  >
                    {emailSent ? 'Enviado ✓' : 'Enviar enlace'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Amigos: encontrarte por tu teléfono (solo con cuenta) */}
        {user && (
          <section aria-label="Amigos">
            <h2 className="serif text-[20px] font-semibold mb-2.5">Amigos</h2>
            <PhoneDiscovery onToast={setToast} />
          </section>
        )}

        {/* 2. Importar listas */}
        <section aria-label="Importar listas">
          <h2 className="serif text-[20px] font-semibold mb-2.5">Importar</h2>
          <Link
            to="/importar"
            className="flex items-center gap-3.5 p-4 rounded-3xl bg-surface border border-line hover:border-accent active:bg-surface2 transition-colors"
          >
            <div className="w-10 h-10 rounded-2xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
              <Icon name="sparkle" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-ink">Importar listas externas</div>
              <div className="text-xs text-mute">Trae tus obras de Letterboxd, IMDb, Goodreads o Netflix</div>
            </div>
            <Icon name="chevron" size={16} className="text-mute shrink-0" />
          </Link>
        </section>

        {/* 3. Preferencias */}
        <section aria-label="Preferencias">
          <h2 className="serif text-[20px] font-semibold mb-2.5">Preferencias</h2>
          <div className="rounded-3xl bg-surface border border-line p-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-mute uppercase tracking-wider block mb-2">
                Tus plataformas de streaming
              </label>
              <PlatformPicker
                value={profile.platforms}
                onChange={(platforms) => setProfile({ platforms })}
              />
            </div>

            <div className="pt-2 border-t border-line/60 flex items-center justify-between">
              <div className="pr-3">
                <div className="font-semibold text-sm">Año de nacimiento</div>
                <div className="text-xs text-mute">Para calibrar las recomendaciones del asistente</div>
              </div>
              <input
                type="number"
                min="1930"
                max={new Date().getFullYear() - 6}
                value={profile.birthYear ?? ''}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10)
                  setProfile({ birthYear: Number.isFinite(v) ? v : undefined })
                }}
                placeholder="1995"
                className="w-24 bg-surface2 border border-line rounded-xl p-2 text-center text-sm font-semibold focus:outline-none focus:border-accent"
              />
            </div>

            <div className="pt-2 border-t border-line/60 flex items-center justify-between">
              <div className="pr-3">
                <div className="font-semibold text-sm">Valorar al guardar en Descubrir</div>
                <div className="text-xs text-mute">Abre la hoja de estrellas al marcar como vista</div>
              </div>
              <Toggle
                on={settings.rateOnSwipe ?? true}
                onChange={(rateOnSwipe) => setSettings({ rateOnSwipe })}
                label="Valorar al guardar en Descubrir"
              />
            </div>

            <div className="pt-2 border-t border-line/60 flex items-center justify-between">
              <div className="pr-3">
                <div className="font-semibold text-sm">Pedir comentario al comparar</div>
                <div className="text-xs text-mute">Ofrece escribir una nota breve tras un duelo</div>
              </div>
              <Toggle
                on={settings.commentBoxInPairs}
                onChange={(commentBoxInPairs) => setSettings({ commentBoxInPairs })}
                label="Pedir comentario al comparar"
              />
            </div>
          </div>
        </section>

        {/* 4. Avisos y Notificaciones */}
        <section aria-label="Avisos">
          <h2 className="serif text-[20px] font-semibold mb-2.5">Avisos</h2>
          <div className="rounded-3xl bg-surface border border-line p-4 flex items-center justify-between">
            <div className="pr-3">
              <div className="font-semibold text-sm">Notificaciones de la app</div>
              <div className="text-xs text-mute">Recordatorios para duelos de ranking y sugerencias</div>
            </div>
            <Toggle
              on={pushEnabled}
              onChange={handleTogglePush}
              label="Notificaciones de la app"
            />
          </div>
        </section>

        {/* 5. Ayuda y Feedback */}
        <section aria-label="Ayuda">
          <h2 className="serif text-[20px] font-semibold mb-2.5">Ayuda</h2>
          <div className="rounded-3xl bg-surface border border-line divide-y divide-line/60">
            <button
              onClick={() => nav('/onboarding')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-surface2 transition-colors rounded-t-3xl"
            >
              <div>
                <div className="font-semibold text-sm">Ver tutorial otra vez</div>
                <div className="text-xs text-mute">Repasa los 3 gestos y cómo funciona el ranking</div>
              </div>
              <Icon name="chevron" size={16} className="text-mute" />
            </button>
            <button
              onClick={() => setFeedbackOpen(true)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-surface2 transition-colors rounded-b-3xl"
            >
              <div>
                <div className="font-semibold text-sm">Enviar sugerencia o error</div>
                <div className="text-xs text-mute">Dinos qué te gustaría mejorar o qué ha fallado</div>
              </div>
              <Icon name="message" size={16} className="text-mute" />
            </button>
          </div>
        </section>

        {/* 6. Fuentes y Atribución */}
        <section aria-label="Fuentes y Atribución">
          <h2 className="serif text-[20px] font-semibold mb-2.5">Fuentes y atribución</h2>
          <div className="rounded-3xl bg-surface border border-line p-4 space-y-2 text-xs text-mute leading-relaxed">
            <p>
              El catálogo de Biblioteca se nutre exclusivamente de fuentes abiertas y con licencias de uso legítimas:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li><b className="text-ink">Wikidata</b>: metadatos de cine, series y literatura (CC0).</li>
              <li><b className="text-ink">TVmaze</b>: metadatos y pósteres de series bajo licencia CC BY-SA.</li>
              <li><b className="text-ink">Open Library</b>: catálogo de libros y portadas de dominio público.</li>
              <li><b className="text-ink">MusicBrainz</b>: datos y discografías de artistas.</li>
            </ul>
          </div>
        </section>

        {/* 7. Zona de pruebas (plegada) */}
        <section aria-label="Zona de pruebas">
          <button
            onClick={() => setTestsOpen(!testsOpen)}
            className="w-full py-2 flex items-center justify-between text-xs text-mute font-semibold uppercase tracking-wider"
          >
            <span>Zona de pruebas y demo</span>
            <span className="text-sm">{testsOpen ? '▲' : '▼'}</span>
          </button>

          {testsOpen && (
            <div className="rounded-3xl bg-surface2/60 border border-line p-4 space-y-3 mt-1">
              <button
                onClick={() => {
                  loadSample()
                  setToast('Datos de ejemplo cargados')
                }}
                className="w-full min-h-[44px] rounded-2xl bg-surface border border-line text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Icon name="sparkle" size={15} />
                Cargar obras de ejemplo en todas las estanterías
              </button>

              <button
                onClick={() => nav('/metricas')}
                className="w-full min-h-[44px] rounded-2xl bg-surface border border-line text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                Ver métricas del motor
              </button>

              <button
                onClick={() => setConfirmReset(true)}
                className="w-full min-h-[44px] rounded-2xl bg-surface border border-stamp-red/30 text-stamp-red text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                Reiniciar demo (borrar todo en este dispositivo)
              </button>
            </div>
          )}
        </section>

        <div className="text-center text-[11px] text-mute/60 pt-4">
          {APP_NAME} · Motor {ENGINE_VERSION}
        </div>
      </div>

      {/* Modales y Hojas */}
      {confirmReset && (
        <Confirm
          title="¿Reiniciar toda la app?"
          text="Se borrarán todas tus obras y rankings guardados en este dispositivo. Esta acción no se puede deshacer."
          confirmLabel="Reiniciar"
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            resetAll()
            setConfirmReset(false)
            setToast('Demo reiniciada')
          }}
        />
      )}

      {confirmDelete && (
        <Confirm
          title="¿Borrar tu cuenta definitivamente?"
          text="Se eliminará tu perfil, todos tus guardados en la nube y tus listas. Es una acción irreversible."
          confirmLabel="Borrar cuenta"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            setConfirmDelete(false)
            await deleteAccount()
            setToast('Cuenta eliminada correctamente')
            nav('/', { replace: true })
          }}
        />
      )}

      {feedbackOpen && (
        <Sheet label="Enviar sugerencia" onClose={() => setFeedbackOpen(false)} height="65%">
          <form onSubmit={handleSubmitFeedback} className="space-y-4 pt-1">
            <h3 className="serif text-xl font-bold">Dinos qué piensas</h3>
            <p className="text-xs text-mute">
              ¿Hay algo confuso, alguna obra que no encuentras o alguna mejora que eches de menos?
            </p>
            <textarea
              autoFocus
              required
              rows={4}
              value={feedbackMsg}
              onChange={(e) => setFeedbackMsg(e.target.value)}
              placeholder="Escribe aquí tu mensaje…"
              className="w-full bg-surface2 border border-line rounded-2xl p-3 text-sm focus:outline-none focus:border-accent"
            />
            <input
              type="text"
              value={feedbackContact}
              onChange={(e) => setFeedbackContact(e.target.value)}
              placeholder="Tu email o WhatsApp (opcional, por si quieres respuesta)"
              className="w-full bg-surface2 border border-line rounded-xl p-3 text-xs focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={sendingFeedback || !feedbackMsg.trim()}
              className="w-full min-h-[48px] rounded-2xl bg-accent text-accent-ink font-semibold text-sm active:scale-95 transition-transform disabled:opacity-50"
            >
              {sendingFeedback ? 'Enviando…' : 'Enviar sugerencia'}
            </button>
          </form>
        </Sheet>
      )}

      <AnimatePresence>
        {toast && <Toast key={toast} message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
