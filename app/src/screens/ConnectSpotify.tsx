// /conectar/spotify: Spotify vuelve aquí con ?code=… tras dar permiso. Cambia el código por el token y trae los artistas.
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ScreenHeader } from '../components/ui'
import { ImportFlowView } from '../components/ImportFlowView'
import { useImportFlow } from '../lib/import/useImportFlow'
import { fetchSpotifyArtists, finishSpotifyAuth, spotifyEnabled } from '../lib/connect/spotify'
import { track } from '../store/useEvents'

export function ConnectSpotify() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const flow = useImportFlow()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const code = params.get('code')
    if (!spotifyEnabled) return setError('Spotify estará disponible muy pronto.')
    if (params.get('error') || !code) return setError('No has dado permiso a Spotify, así que no hemos traído nada.')
    ;(async () => {
      try {
        if (!(await finishSpotifyAuth(code, params.get('state')))) return setError('La conexión con Spotify ha caducado. Vuelve a intentarlo.')
        const rows = await fetchSpotifyArtists()
        if (rows.length === 0) return setError('No hemos encontrado artistas en tu cuenta de Spotify.')
        track('import_started', { data: { source: 'spotify' } })
        await flow.run(rows, 'spotify')
      } catch {
        setError('No hemos podido leer tu cuenta de Spotify. Inténtalo de nuevo más tarde.')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="h-full flex flex-col bg-bg text-ink scroll-y">
      <ScreenHeader title="Spotify" onBack={() => nav('/conectar', { replace: true })} />
      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
          <p className="text-sm text-mute max-w-xs leading-relaxed">{error}</p>
          <button onClick={() => nav('/conectar', { replace: true })} className="px-6 min-h-[48px] rounded-2xl bg-surface2 border border-line font-semibold">
            Volver a Conectar
          </button>
        </div>
      ) : flow.step === 'idle' ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
          <div className="w-10 h-10 border-[3px] border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-mute">Trayendo tus artistas de Spotify…</p>
        </div>
      ) : (
        <ImportFlowView flow={flow} />
      )}
    </div>
  )
}
