// app/src/screens/Settings.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { APP_NAME } from '../config'
import { ENGINE_VERSION } from '../lib/engine/params'
import { useStore } from '../store/useStore'
import { useAuth } from '../store/useAuth'
import { Avatar, Confirm, Sheet, Toast } from '../components/ui'
import { Group, Row, Toggle } from '../components/Group'
import { Icon } from '../components/Icon'
import { ScreenTitle } from '../components/ScreenTitle'
import { pushLocalEntriesToCloud, pullCloudEntries } from '../lib/sync'
import { subscribeToPush, isPushSupported } from '../lib/push'
import { supabase } from '../lib/supabase'
import { PhoneDiscovery } from '../components/PhoneDiscovery'

export function Settings() {
  const nav = useNavigate()
  const profile = useStore((s) => s.profile)
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
    <div className="h-full scroll-y pb-12 bg-bg">
      <ScreenTitle
        label="AJUSTES"
        title="Ajustes"
        onBack={() => nav(-1)}
      />

      <div className="px-5 space-y-7">
        {/* Quién eres: tarjeta propia arriba, separada de los ajustes (Igor, 23/10) */}
        {user ? (
          <button
            onClick={() => nav('/perfil/editar')}
            className="w-full rounded-3xl bg-surface border border-line p-4 flex items-center gap-3.5 text-left active:bg-surface2 transition-colors"
          >
            <Avatar name={profile.name} color={profile.avatarColor} url={profile.avatarUrl} size={52} />
            <span className="flex-1 min-w-0">
              <span className="block text-body font-semibold truncate">{authProfile?.displayName || profile.name}</span>
              <span className="block text-meta truncate">{authProfile?.handle ? `@${authProfile.handle} · ` : ''}{user.email ?? ''}</span>
              <span className="inline-flex items-center gap-1.5 mt-1 text-[11px] text-stamp-green font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-stamp-green" /> Cuenta conectada
              </span>
            </span>
            <Icon name="chevron" size={16} className="text-mute shrink-0" />
          </button>
        ) : (
          <Group footer="Sin cuenta, tus datos están solo en este móvil. Entra para guardarlos en la nube, usarlos en otro dispositivo y conectar con amigos.">
            <div className="p-4 space-y-3">
              <p className="text-body font-semibold">Guarda tu biblioteca en la nube</p>
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
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="o tu email para un enlace de acceso"
                  className="flex-1 min-w-0 bg-surface2 border border-line rounded-2xl px-3.5 text-xs focus:outline-none focus:border-accent"
                />
                <button
                  onClick={async () => {
                    if (!emailInput.includes('@')) return
                    const { error } = await signInWithOtp(emailInput.trim())
                    if (!error) setEmailSent(true)
                    else setToast('Error enviando el enlace')
                  }}
                  disabled={emailSent}
                  className="min-h-[42px] px-3.5 rounded-2xl bg-surface2 border border-line text-xs font-semibold text-accent disabled:opacity-50"
                >
                  {emailSent ? 'Enviado ✓' : 'Enviar'}
                </button>
              </div>
            </div>
          </Group>
        )}

        <Group title="Tu perfil">
          <Row icon="edit" title="Tus datos" sub={`Foto, nombre, ${user ? '@usuario, ' : ''}país, año y plataformas`} to="/perfil/editar" />
        </Group>

        {/* Privacidad (solo con cuenta) */}
        {user && (
          <Group title="Privacidad">
            <div className="p-4">
              <PhoneDiscovery onToast={setToast} />
            </div>
          </Group>
        )}

        {/* Tus listas */}
        <Group title="Tus listas">
          <Row icon="sparkle" title="Conectar" sub="Letterboxd, Goodreads, Spotify, Netflix y más" to="/conectar" />
        </Group>

        {/* Uso de la app */}
        <Group title="Uso de la app">
          <Row
            icon="star"
            title="Valorar al marcar como vista"
            sub="Abre las estrellas al deslizar a la derecha en Descubrir"
            right={<Toggle on={settings.rateOnSwipe ?? true} onChange={(rateOnSwipe) => setSettings({ rateOnSwipe })} label="Valorar al marcar como vista" />}
          />
          <Row
            icon="message"
            title="Comentario al comparar"
            sub="Ofrece escribir una nota breve tras cada duelo"
            right={<Toggle on={settings.commentBoxInPairs} onChange={(commentBoxInPairs) => setSettings({ commentBoxInPairs })} label="Comentario al comparar" />}
          />
        </Group>

        {/* Avisos */}
        <Group title="Avisos">
          <Row
            icon="clock"
            title="Notificaciones"
            sub="Cuando un amigo valora algo que tienes pendiente, y recordatorios"
            right={<Toggle on={pushEnabled} onChange={handleTogglePush} label="Notificaciones" />}
          />
        </Group>

        {/* Ayuda */}
        <Group title="Ayuda">
          <Row icon="cards" title="Ver el tutorial otra vez" sub="Los 3 gestos y cómo funciona el ranking" onClick={() => nav('/onboarding')} />
          <Row icon="mail" title="Enviar una sugerencia o un error" onClick={() => setFeedbackOpen(true)} />
        </Group>

        {/* Acerca de */}
        <Group title="Acerca de" footer={`${APP_NAME} · Motor ${ENGINE_VERSION}`}>
          <div className="p-4 text-xs text-mute leading-relaxed space-y-1.5">
            <p>Los datos del catálogo salen de fuentes públicas, entre otras:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><b className="text-ink">Wikidata</b> (CC0) y <b className="text-ink">Wikipedia</b>.</li>
              <li><b className="text-ink">TVmaze</b>: series (CC BY-SA).</li>
              <li><b className="text-ink">Open Library</b>: libros y portadas.</li>
              <li><b className="text-ink">MusicBrainz</b>: artistas.</li>
            </ul>
          </div>
        </Group>

        {/* Sesión: sincronizar, salir y borrar (abajo del todo, como en cualquier app) */}
        {user && (
          <Group title="Sesión">
            <Row
              icon="rotateCcw"
              title={syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
              sub="Sube lo de este móvil y baja lo de la nube"
              onClick={syncing ? undefined : handleSyncNow}
            />
            <Row icon="back" title="Cerrar sesión" onClick={() => signOut()} />
            <Row icon="trash" title="Borrar mi cuenta" sub="Elimina tu perfil y todo lo guardado en la nube" onClick={() => setConfirmDelete(true)} danger />
          </Group>
        )}

        {/* Zona de pruebas (plegada) */}
        <section aria-label="Zona de pruebas">
          <button
            onClick={() => setTestsOpen(!testsOpen)}
            className="w-full py-2 flex items-center justify-between text-xs text-mute font-semibold uppercase tracking-wider"
          >
            <span>Zona de pruebas</span>
            <span className="text-sm">{testsOpen ? '▲' : '▼'}</span>
          </button>
          {testsOpen && (
            <div className="rounded-3xl bg-surface2/60 border border-line divide-y divide-line/60 overflow-hidden mt-1">
              <Row
                icon="sparkle"
                title="Cargar obras de ejemplo"
                onClick={() => {
                  loadSample()
                  setToast('Datos de ejemplo cargados')
                }}
              />
              <Row icon="scale" title="Métricas del motor" onClick={() => nav('/metricas')} />
              <Row icon="trash" title="Reiniciar (borra todo en este móvil)" onClick={() => setConfirmReset(true)} danger />
            </div>
          )}
        </section>
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
