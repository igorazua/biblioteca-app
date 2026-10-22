// Conectar: traer tu historial desde otras plataformas (docs/CONECTAR.md).
// Cada servicio acaba devolviendo ImportRow[]; el emparejado, la revisión y la aplicación son los de lib/import.
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader, Sheet, Tag, Toast } from '../components/ui'
import { Group } from '../components/Group'
import { ImportFlowView } from '../components/ImportFlowView'
import { track } from '../store/useEvents'
import { useImportFlow } from '../lib/import/useImportFlow'
import { parseLetterboxd } from '../lib/import/letterboxd'
import { parseImdb } from '../lib/import/imdb'
import { parseGoodreads } from '../lib/import/goodreads'
import { parseNetflix } from '../lib/import/netflix'
import { parseStoryGraph } from '../lib/import/storygraph'
import { GROUPS, METHOD_LABEL, SERVICES, type Service } from '../lib/connect/services'
import { ConnectorUnavailable, ConnectorUserError } from '../lib/connect/types'
import { loadSpotifyTokens, spotifyEnabled, startSpotifyAuth } from '../lib/connect/spotify'
import type { ImportRow } from '../lib/import/types'

const TRUST = 'Solo leemos lo que nos dejes. Puedes desconectarlo cuando quieras.'

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
  }
}

function ServiceIcon({ s }: { s: Service }) {
  return (
    <span
      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-semibold text-lg serif"
      style={{ background: s.color }}
      aria-hidden
    >
      {s.name[0]}
    </span>
  )
}

function ActionButton({ children, onClick, quiet, disabled }: { children: string; onClick?: () => void; quiet?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[40px] px-4 rounded-full text-sm font-semibold shrink-0 border transition-colors ${
        quiet ? 'bg-transparent border-line text-mute active:bg-surface2' : 'bg-surface2 border-line text-ink active:bg-line'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      {children}
    </button>
  )
}

type SheetState = { kind: 'username' | 'file' | 'oauth'; service: Service } | null

export function Connect() {
  const nav = useNavigate()
  const flow = useImportFlow()
  const [sheet, setSheet] = useState<SheetState>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [asked, setAsked] = useState<Set<string>>(new Set())
  const spotifyConnected = Boolean(loadSpotifyTokens()) && spotifyEnabled

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

  const inFlow = flow.step !== 'idle'

  return (
    <div className="h-full flex flex-col bg-bg text-ink scroll-y">
      <ScreenHeader title="Conectar" onBack={() => (inFlow ? flow.reset() : nav(-1))} />

      {inFlow ? (
        <ImportFlowView flow={flow} />
      ) : (
        <div className="px-5 pb-12 pt-2 w-full max-w-md mx-auto space-y-8">
          <p className="text-sm text-mute leading-relaxed">
            Trae lo que ya has visto, leído o escuchado desde otras plataformas. Nunca te pedimos tu contraseña.
          </p>

          <Group title="Tus conexiones">
            {spotifyConnected ? (
              <div className="min-h-[64px] px-4 py-3 flex items-center gap-3">
                <ServiceIcon s={SERVICES.find((s) => s.id === 'spotify')!} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">Spotify</div>
                  <div className="text-xs text-mute">Conectada con tu cuenta</div>
                </div>
              </div>
            ) : (
              <div className="px-4 py-5 text-sm text-mute leading-relaxed">
                Aún no has conectado nada. Elige una plataforma de abajo y empieza por la que más uses.
              </div>
            )}
          </Group>

          {GROUPS.map((g) => (
            <Group key={g.id} title={g.title}>
              {SERVICES.filter((s) => s.group === g.id).map((s) => {
                const soon = s.method === 'soon'
                const offSpotify = s.method === 'oauth' && !spotifyEnabled
                return (
                  <div key={s.id} className="min-h-[72px] px-4 py-3 flex items-center gap-3">
                    <ServiceIcon s={s} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{s.name}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {s.brings.map((b) => <Tag key={b} variant="subtle">{b}</Tag>)}
                        <Tag variant={soon || offSpotify ? 'subtle' : 'accent'}>{METHOD_LABEL[s.method]}</Tag>
                      </div>
                    </div>
                    {offSpotify ? (
                      <ActionButton quiet disabled>Muy pronto</ActionButton>
                    ) : soon ? (
                      <ActionButton quiet onClick={asked.has(s.id) ? undefined : () => tapService(s)}>
                        {asked.has(s.id) ? 'Anotado' : 'Avísame'}
                      </ActionButton>
                    ) : (
                      <ActionButton onClick={() => tapService(s)}>{s.method === 'file' ? 'Subir' : 'Conectar'}</ActionButton>
                    )}
                  </div>
                )
              })}
            </Group>
          ))}
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
        <FileSheet service={sheet.service} onClose={() => setSheet(null)} onRows={(rows) => startRows(rows, sheet.service.id)} />
      )}
      {sheet?.kind === 'oauth' && <OAuthSheet service={sheet.service} onClose={() => setSheet(null)} />}

      {toast && <Toast message={toast} onDone={() => setToast(null)} ms={2600} />}
    </div>
  )
}

function SheetHead({ service, children }: { service: Service; children: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <ServiceIcon s={service} />
      <div className="min-w-0">
        <h2 className="serif text-xl font-semibold leading-tight">{service.name}</h2>
        <p className="text-xs text-mute">{children}</p>
      </div>
    </div>
  )
}

function UsernameSheet({ service, onClose, onRows, onFile }: { service: Service; onClose: () => void; onRows: (r: ImportRow[]) => void; onFile: () => void }) {
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
      if (rows.length === 0) setMsg({ text: 'No hemos encontrado nada en esa cuenta. Comprueba que el perfil es público.' })
      else onRows(rows)
    } catch (e) {
      if (e instanceof ConnectorUnavailable) setMsg({ text: 'Disponible muy pronto', soon: true })
      else if (e instanceof ConnectorUserError) setMsg({ text: e.message })
      else setMsg({ text: 'No hemos podido conectar ahora mismo. Inténtalo en un rato.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet onClose={onClose} label={`Conectar ${service.name}`} height="62%">
      <SheetHead service={service}>Con tu usuario</SheetHead>
      <p className="text-sm text-ink/80 leading-relaxed">{service.blurb}</p>
      <label className="block mt-5">
        <span className="label-caps text-mute">{u.label}</span>
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
        className="mt-5 w-full min-h-[52px] rounded-2xl bg-accent text-accent-ink font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform"
      >
        {busy ? 'Buscando…' : 'Conectar'}
      </button>
      {service.file && (
        <button onClick={onFile} className="mt-2 w-full min-h-[44px] text-sm text-mute underline underline-offset-4">
          Prefiero subir un archivo
        </button>
      )}
      <p className="text-[11px] text-mute text-center mt-3">{TRUST}</p>
    </Sheet>
  )
}

function FileSheet({ service, onClose, onRows }: { service: Service; onClose: () => void; onRows: (r: ImportRow[]) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const f = service.file!

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    try {
      const rows = await rowsFromFile(service, file)
      if (rows.length === 0) setError('No hemos encontrado registros válidos en ese archivo.')
      else onRows(rows)
    } catch {
      setError('No hemos podido leer el archivo. Comprueba que es el correcto.')
    }
  }

  return (
    <Sheet onClose={onClose} label={`Subir archivo de ${service.name}`} height="62%">
      <SheetHead service={service}>Con un archivo</SheetHead>
      <p className="text-sm text-ink/80 leading-relaxed">{service.blurb}</p>
      <ol className="mt-4 space-y-3">
        {f.steps.map((st, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <span className="w-6 h-6 rounded-full bg-surface2 border border-line text-xs font-semibold text-mute flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
            <span className="flex-1 leading-snug text-ink/90">{st}</span>
          </li>
        ))}
      </ol>
      {f.url && (
        <a href={f.url} target="_blank" rel="noopener noreferrer" className="mt-3 text-sm text-accent underline underline-offset-4 self-start">
          {f.urlLabel} ↗
        </a>
      )}
      {error && <p className="text-sm mt-3 text-stamp-red" role="status">{error}</p>}
      <input ref={input} type="file" accept={f.extensions} onChange={onFile} className="hidden" />
      <button
        onClick={() => input.current?.click()}
        className="mt-5 w-full min-h-[52px] rounded-2xl bg-accent text-accent-ink font-semibold active:scale-[0.98] transition-transform"
      >
        Subir archivo
      </button>
      <p className="text-[11px] text-mute text-center mt-3">El archivo se lee solo en tu móvil. {TRUST}</p>
    </Sheet>
  )
}

function OAuthSheet({ service, onClose }: { service: Service; onClose: () => void }) {
  return (
    <Sheet onClose={onClose} label={`Conectar ${service.name}`} height="44%">
      <SheetHead service={service}>Con tu cuenta</SheetHead>
      <p className="text-sm text-ink/80 leading-relaxed">{service.blurb}</p>
      <button
        onClick={() => startSpotifyAuth()}
        className="mt-6 w-full min-h-[52px] rounded-2xl bg-accent text-accent-ink font-semibold active:scale-[0.98] transition-transform"
      >
        Conectar con {service.name}
      </button>
      <p className="text-[11px] text-mute text-center mt-3">{TRUST}</p>
    </Sheet>
  )
}
