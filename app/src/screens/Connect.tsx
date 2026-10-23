// Conectar: traer tu historial desde otras plataformas (docs/CONECTAR.md).
// Cada servicio acaba devolviendo ImportRow[]; el emparejado, la revisión y la aplicación son los de lib/import.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sheet, Toast } from '../components/ui'
import { Group } from '../components/Group'
import { ImportFlowView } from '../components/ImportFlowView'
import { ScreenTitle } from '../components/ScreenTitle'
import { BrandLogo } from '../components/BrandLogo'
import { track } from '../store/useEvents'
import { useImportFlow } from '../lib/import/useImportFlow'
import { parseLetterboxd } from '../lib/import/letterboxd'
import { parseImdb } from '../lib/import/imdb'
import { parseGoodreads } from '../lib/import/goodreads'
import { parseNetflix } from '../lib/import/netflix'
import { parseStoryGraph } from '../lib/import/storygraph'
import { parseSpotifyHistory } from '../lib/import/spotify-history'
import { parseYouTubeMusic } from '../lib/import/youtube-music'
import { parseAppleMusic } from '../lib/import/apple-music'
import { parsePrimeVideo } from '../lib/import/prime-video'
import { parseKindle } from '../lib/import/kindle'
import { GROUPS, SERVICES, type Service } from '../lib/connect/services'
import { ConnectorUnavailable, ConnectorUserError } from '../lib/connect/types'
import { disconnectSpotify, loadSpotifyTokens, spotifyEnabled, startSpotifyAuth } from '../lib/connect/spotify'
import type { ImportRow } from '../lib/import/types'

async function rowsFromFile(service: Service, file: File): Promise<ImportRow[]> {
  const kind = service.file!.kind
  if (file.name.toLowerCase().endsWith('.zip')) return parseLetterboxd(new Uint8Array(await file.arrayBuffer()))
  const text = await file.text()
  switch (kind) {
    case 'letterboxd': return parseLetterboxd(text, file.name)
    case 'imdb': return parseImdb(text)
    case 'goodreads': return parseGoodreads(text)
    case 'storygraph': return parseStoryGraph(text)
    case 'netflix': return parseNetflix(text)
    case 'spotify': return parseSpotifyHistory(text)
    case 'ytmusic': return parseYouTubeMusic(text)
    case 'applemusic': return parseAppleMusic(text)
    case 'prime': return parsePrimeVideo(text)
    case 'kindle': return parseKindle(text)
  }
}

type SheetState = { kind: 'username' | 'file' | 'oauth'; service: Service } | null

export function Connect() {
  const nav = useNavigate()
  const flow = useImportFlow()
  const [sheet, setSheet] = useState<SheetState>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [asked, setAsked] = useState<Set<string>>(new Set())
  const [spotifyConnected, setSpotifyConnected] = useState<boolean>(() => Boolean(loadSpotifyTokens()) && spotifyEnabled)

  const startRows = async (rows: ImportRow[], serviceId: string) => {
    setSheet(null)
    try {
      track('import_started', { data: { source: serviceId } })
      await flow.run(rows, serviceId)
    } catch {
      setToast('No hemos podido leer esa lista. Inténtalo de nuevo.')
    }
  }

  const tapService = (s: Service) => {
    if (s.method === 'soon') {
      track('connect_interest', { data: { service: s.id } })
      setAsked((prev) => new Set(prev).add(s.id))
      setToast('Anotado. Te avisaremos cuando esté listo.')
    } else if (s.method === 'file') setSheet({ kind: 'file', service: s })
    else if (s.method === 'username') setSheet({ kind: 'username', service: s })
    else if (spotifyEnabled) setSheet({ kind: 'oauth', service: s })
  }

  const handleDisconnectSpotify = () => {
    disconnectSpotify()
    setSpotifyConnected(false)
    setToast('Desconectado de Spotify.')
  }

  const inFlow = flow.step !== 'idle'

  return (
    <div className="h-full flex flex-col bg-bg text-ink scroll-y">
      <ScreenTitle
        label="CONECTAR"
        title="Conectar"
        onBack={() => (inFlow ? flow.reset() : nav(-1))}
      />

      {inFlow ? (
        <ImportFlowView flow={flow} />
      ) : (
        <div className="px-5 pb-16 pt-2 w-full max-w-md mx-auto space-y-7">
          <p className="text-sm text-mute leading-relaxed">
            Trae lo que ya has visto, leído o escuchado desde tus plataformas de siempre. Sin notas numéricas vacías y sin pedirte nunca tu contraseña.
          </p>

          <Group title="Tus conexiones">
            {spotifyConnected ? (
              <div className="min-h-[64px] px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <BrandLogo id="spotify" size={40} />
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-ink leading-tight">Spotify</div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-mute">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span>Conectada con tu cuenta</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnectSpotify}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-mute hover:text-ink transition-colors active:scale-95"
                >
                  Desconectar
                </button>
              </div>
            ) : (
              <div className="px-4 py-4 text-xs text-mute leading-relaxed">
                Aún no has conectado ninguna cuenta. Elige tu plataforma habitual para empezar.
              </div>
            )}
          </Group>

          {GROUPS.map((g) => {
            const list = SERVICES.filter((s) => s.group === g.id)
            if (list.length === 0) return null
            return (
              <Group key={g.id} title={g.title}>
                {list.map((s) => {
                  const soon = s.method === 'soon'
                  const offSpotify = s.method === 'oauth' && !spotifyEnabled
                  const isAsked = asked.has(s.id)
                  const actionLabel =
                    offSpotify ? 'Pronto'
                    : soon ? (isAsked ? 'Anotado' : 'Avísame')
                    : s.method === 'file' ? 'Importar'
                    : 'Conectar'

                  return (
                    <div
                      key={s.id}
                      className="min-h-[68px] px-4 py-3 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <BrandLogo id={s.id} size={40} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[15px] font-semibold text-ink leading-tight truncate">
                            {s.name}
                          </div>
                          <div className="text-xs text-mute mt-0.5 leading-snug truncate">
                            {s.subtitle || s.blurb}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={
                          offSpotify || (soon && isAsked)
                            ? undefined
                            : () => tapService(s)
                        }
                        disabled={offSpotify || (soon && isAsked)}
                        className={`min-h-[34px] px-3.5 rounded-full text-xs font-semibold shrink-0 transition-all active:scale-95 ${
                          soon || offSpotify
                            ? isAsked
                              ? 'bg-transparent text-accent font-medium border border-accent/40'
                              : 'bg-transparent text-mute hover:text-ink border border-line/60'
                            : 'bg-surface2 border border-line text-ink hover:border-accent shadow-sm'
                        }`}
                      >
                        {actionLabel}
                      </button>
                    </div>
                  )
                })}
              </Group>
            )
          })}
        </div>
      )}

      {sheet?.kind === 'username' && (
        <UsernameSheet
          service={sheet.service}
          onClose={() => setSheet(null)}
          onRows={(rows) => startRows(rows, sheet.service.id)}
          onFile={() => setSheet({ kind: 'file', service: sheet.service })}
        />
      )}
      {sheet?.kind === 'file' && (
        <FileSheet
          service={sheet.service}
          onClose={() => setSheet(null)}
          onRows={(rows) => startRows(rows, sheet.service.id)}
        />
      )}
      {sheet?.kind === 'oauth' && (
        <OAuthSheet service={sheet.service} onClose={() => setSheet(null)} />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} ms={2600} />}
    </div>
  )
}

function SheetHead({ service, children }: { service: Service; children: string }) {
  return (
    <div className="flex items-center gap-3.5 mb-4">
      <BrandLogo id={service.id} size={44} />
      <div className="min-w-0">
        <h2 className="serif text-xl font-semibold leading-tight text-ink">{service.name}</h2>
        <p className="text-xs text-mute mt-0.5">{children}</p>
      </div>
    </div>
  )
}

function UsernameSheet({
  service,
  onClose,
  onRows,
  onFile,
}: {
  service: Service
  onClose: () => void
  onRows: (r: ImportRow[]) => void
  onFile: () => void
}) {
  const [handle, setHandle] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; soon?: boolean } | null>(null)
  const u = service.username!

  const submit = async () => {
    if (busy || !handle.trim()) return
    setBusy(true)
    setMsg(null)
    try {
      const rows = await service.connector!.fetchRows({ service: service.id, handle })
      if (rows.length === 0) setMsg({ text: 'No hemos encontrado obras en esa cuenta. Comprueba que el perfil sea público.' })
      else onRows(rows)
    } catch (e) {
      if (e instanceof ConnectorUnavailable) setMsg({ text: 'Disponible muy pronto', soon: true })
      else if (e instanceof ConnectorUserError) setMsg({ text: e.message })
      else setMsg({ text: 'No hemos podido conectar ahora mismo. Inténtalo de nuevo en unos minutos.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet onClose={onClose} label={`Conectar ${service.name}`} height="65%">
      <SheetHead service={service}>Con tu usuario</SheetHead>
      <p className="text-sm text-ink/80 leading-relaxed">{service.blurb}</p>
      <label className="block mt-5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">{u.label}</span>
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={u.placeholder}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="mt-2 w-full min-h-[50px] rounded-2xl bg-surface2 border border-line px-4 text-sm text-ink placeholder:text-mute/60 outline-none focus:border-accent"
        />
      </label>
      <p className="text-xs text-mute mt-2 leading-snug">{u.hint}</p>
      {msg && (
        <p className={`text-sm mt-3 ${msg.soon ? 'text-ink' : 'text-stamp-red'}`} role="status">
          {msg.text}
          {msg.soon && service.file && <span className="text-mute"> Mientras tanto, puedes subir tu archivo.</span>}
        </p>
      )}
      <button
        onClick={submit}
        disabled={busy || !handle.trim()}
        className="mt-5 w-full min-h-[52px] rounded-2xl bg-accent text-accent-ink font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform shadow-md"
      >
        {busy ? 'Buscando…' : 'Conectar'}
      </button>

      {service.file && (
        <button
          onClick={onFile}
          className="mt-3 w-full py-2 text-xs font-medium text-mute hover:text-ink text-center transition-colors"
        >
          ¿Prefieres subir el archivo completo? Toca aquí
        </button>
      )}
    </Sheet>
  )
}

function FileSheet({
  service,
  onClose,
  onRows,
}: {
  service: Service
  onClose: () => void
  onRows: (r: ImportRow[]) => void
}) {
  const f = service.file!
  const [reading, setReading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setReading(true)
    setErr(null)
    try {
      const rows = await rowsFromFile(service, file)
      if (rows.length === 0) setErr('No hemos encontrado ninguna obra en ese archivo.')
      else onRows(rows)
    } catch {
      setErr('No hemos podido leer ese archivo. Comprueba que sea la exportación correcta.')
    } finally {
      setReading(false)
    }
  }

  return (
    <Sheet onClose={onClose} label={`Subir archivo de ${service.name}`} height="70%">
      <SheetHead service={service}>Con tu archivo de exportación</SheetHead>
      <p className="text-sm text-ink/80 leading-relaxed">{service.blurb}</p>

      <div className="mt-4 rounded-2xl bg-surface2 border border-line p-4 space-y-2.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-mute">Cómo descargarlo</div>
        <ol className="list-decimal list-inside text-xs text-ink/80 space-y-1.5 leading-relaxed">
          {f.steps.map((st, i) => (
            <li key={i}>{st}</li>
          ))}
        </ol>
        {f.url && (
          <a
            href={f.url}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-1 text-xs font-semibold text-accent underline underline-offset-2"
          >
            {f.urlLabel || 'Abrir la página de exportación'} ↗
          </a>
        )}
      </div>

      <label className="mt-5 block">
        <input
          type="file"
          accept={f.extensions}
          onChange={onFilePicked}
          disabled={reading}
          className="hidden"
          id="connect-file-input"
        />
        <span
          className={`w-full min-h-[52px] rounded-2xl bg-accent text-accent-ink font-semibold flex items-center justify-center cursor-pointer active:scale-[0.98] transition-transform shadow-md ${
            reading ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          {reading ? 'Leyendo archivo…' : 'Elegir archivo descargado'}
        </span>
      </label>

      {err && <p className="text-xs text-stamp-red mt-3 text-center">{err}</p>}
    </Sheet>
  )
}

function OAuthSheet({ service, onClose }: { service: Service; onClose: () => void }) {
  const [starting, setStarting] = useState(false)
  const nav = useNavigate()

  const launch = async () => {
    setStarting(true)
    try {
      if (service.id === 'spotify') {
        await startSpotifyAuth()
      }
    } catch {
      setStarting(false)
      nav('/conectar/spotify?error=start_failed')
    }
  }

  return (
    <Sheet onClose={onClose} label={`Conectar ${service.name}`} height="55%">
      <SheetHead service={service}>Conexión directa</SheetHead>
      <p className="text-sm text-ink/80 leading-relaxed">{service.blurb}</p>
      <div className="mt-4 p-4 rounded-2xl bg-surface2 border border-line text-xs text-mute space-y-1">
        <p>Solo leemos lo que nos autorices: tus artistas y música guardada.</p>
        <p>Puedes revocar el acceso en cualquier momento desde tu cuenta o desde aquí.</p>
      </div>
      <button
        type="button"
        onClick={launch}
        disabled={starting}
        className="mt-6 w-full min-h-[52px] rounded-2xl bg-accent text-accent-ink font-semibold active:scale-[0.98] transition-transform shadow-md disabled:opacity-50"
      >
        {starting ? 'Abriendo…' : `Continuar a ${service.name}`}
      </button>
    </Sheet>
  )
}
