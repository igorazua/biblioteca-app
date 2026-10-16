import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/useAuth'
import { useFriends } from '../store/useFriends'
import { supabase } from '../lib/supabase'
import { Avatar, Toast } from '../components/ui'
import { Icon } from '../components/Icon'

export function JoinInvite() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { user, signInWithGoogle, signInWithOtp } = useAuth()
  const { acceptInvite } = useFriends()

  const [creatorName, setCreatorName] = useState<string>('Un amigo')
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    if (!code || !supabase) {
      setLoading(false)
      return
    }

    // Buscar información de la invitación
    supabase
      .from('biblio_invites')
      .select('creator_id')
      .eq('code', code.toUpperCase())
      .single()
      .then(async ({ data: invite }) => {
        if (invite) {
          const { data: profile } = await supabase!
            .from('biblio_profiles')
            .select('display_name')
            .eq('id', invite.creator_id)
            .single()

          if (profile?.display_name) {
            setCreatorName(profile.display_name)
          }
        }
        setLoading(false)
      })
  }, [code])

  const handleAccept = async () => {
    if (!code) return
    setJoining(true)
    const res = await acceptInvite(code)
    setJoining(false)

    if (res.success) {
      setToast(`¡Ahora eres amigo de ${res.creatorName}!`)
      setTimeout(() => navigate('/'), 1200)
    } else {
      setToast(res.error || 'Error al aceptar invitación')
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    const { error } = await signInWithOtp(email.trim())
    if (!error) {
      setEmailSent(true)
      setToast('¡Enlace enviado! Revisa tu correo.')
    } else {
      setToast(error.message)
    }
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-bg text-ink text-center">
      <div className="w-full max-w-sm bg-surface border border-line rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex justify-center">
          <Avatar name={creatorName} color="#F5B544" size={72} className="shadow-lg ring-4 ring-accent/20" />
        </div>

        <div>
          <h1 className="serif text-2xl font-bold">{creatorName} te invita a su biblioteca</h1>
          <p className="text-sm text-mute mt-2">
            Descubre qué pelis, series, libros y juegos le han marcado y comparte tus gustos.
          </p>
        </div>

        {loading ? (
          <div className="py-4 text-mute text-sm">Cargando invitación...</div>
        ) : user ? (
          <div className="space-y-3 pt-2">
            <button
              onClick={handleAccept}
              disabled={joining}
              className="w-full min-h-[48px] rounded-2xl bg-accent text-accent-ink font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
            >
              <Icon name="check" size={20} strokeWidth={2.5} />
              {joining ? 'Conectando...' : `Aceptar y conectar con ${creatorName}`}
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full min-h-[44px] text-sm text-mute hover:text-ink transition-colors"
            >
              Ir a mi biblioteca
            </button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-mute/90">
              Para ver sus recomendaciones reales, inicia sesión o crea tu cuenta en 1 clic:
            </p>

            <button
              onClick={() => signInWithGoogle()}
              className="w-full min-h-[48px] rounded-2xl bg-white text-black font-semibold flex items-center justify-center gap-2 shadow hover:bg-white/90 active:scale-95 transition-transform"
            >
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
              Entrar con Google
            </button>

            {emailSent ? (
              <div className="p-3 bg-surface2 border border-line rounded-xl text-xs text-accent">
                Revisa tu email ({email}) y haz clic en el enlace para entrar.
              </div>
            ) : (
              <form onSubmit={handleEmailLogin} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Tu email..."
                  required
                  className="flex-1 min-h-[44px] bg-surface2 border border-line rounded-xl px-3 text-sm focus:outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-3.5 bg-surface2 border border-line rounded-xl text-sm font-medium hover:border-accent flex items-center justify-center"
                >
                  <Icon name="mail" size={16} />
                </button>
              </form>
            )}

            <button
              onClick={() => navigate('/')}
              className="text-xs text-mute hover:underline pt-2 block mx-auto"
            >
              Continuar como invitado sin cuenta
            </button>
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
