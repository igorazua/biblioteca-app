import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getItem } from '../data/catalog'
import { useStore } from '../store/useStore'
import { ACTIVE_SHELVES, SHELF_LABEL, type ShelfType } from '../types'
import { useCompareOverview } from '../lib/compareOverview'
import { ItemRow } from '../components/ItemRow'
import { Poster } from '../components/Poster'
import { posterBox, posterRadius, posterShape } from '../lib/posterShape'
import { Toast } from '../components/ui'
import { AddFlow } from '../components/AddFlow'
import { CleanupFlow } from '../components/CleanupFlow'
import { Icon } from '../components/Icon'
import { Button } from '../components/Button'
import { AnimatePresence } from 'framer-motion'
import { WIZARD_PATH } from '../config'
import { pctColor } from './CompareHome'
import type { IconName } from '../components/Icon'

const SHELF_COLOR: Record<ShelfType, string> = { movie: '#f2b04a', series: '#ff6b5b', book: '#e37d8c', artist: '#9d8cff', boardgame: '#4fd1a5', song: '#c084fc' }
const SHELF_ICON: Record<ShelfType, IconName> = { movie: 'film', series: 'tv', book: 'bookOpen', artist: 'music', boardgame: 'dice', song: 'disc' }

type Seg = 'ord' | 'pend'

export function Shelf() {
  const { type } = useParams()
  const nav = useNavigate()
  const overview = useCompareOverview()
  const entries = useStore((s) => s.entries)
  const ranking = useStore((s) => (type && (ACTIVE_SHELVES as readonly string[]).includes(type) ? (s.rankings[type as ShelfType] ?? []) : []))
  const [params] = useSearchParams()
  const [seg, setSeg] = useState<Seg>(params.get('seg') === 'pend' ? 'pend' : 'ord')
  const [adding, setAdding] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [sel, setSel] = useState<string[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const profileName = useStore((s) => s.profile.name)
  const t = type as ShelfType
  const all = useMemo(() => Object.values(entries).filter((e) => getItem(e.itemId)?.type === t), [entries, t])
  if (!type || !(ACTIVE_SHELVES as readonly string[]).includes(t)) return <Navigate to="/" replace />
  const label = SHELF_LABEL[t]

  // Fuente de verdad: el array de ranking (T19 §3)
  const seenEntries = all.filter((e) => e.status === 'seen')
  const unrankedIds = seenEntries
    .filter((e) => !ranking.includes(e.itemId) || Boolean(e.provisional))
    .map((e) => e.itemId)
  const totalSeen = seenEntries.length
  const shelfOverview = overview.shelves[t]
  const ordenadoPct = shelfOverview?.ordenado ?? 0

  const pend = all.filter((e) => e.status === 'pending')
  const visibleIds = seg === 'ord' ? [...ranking, ...unrankedIds] : pend.map((e) => e.itemId)
  // el carrete: primero las mejor puestas, luego las nuevas y las pendientes
  const stripIds = [...ranking, ...unrankedIds, ...pend.map((e) => e.itemId)].slice(0, 12)
  const toggle = (id: string) => setSel((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))
  const createList = () => nav(`/lista/nueva?title=${encodeURIComponent(`Mis ${label.plural.toLowerCase()} favoritas de ${profileName}`)}&ids=${sel.join(',')}`)

  return (
    <div className="h-full flex flex-col bg-bg relative">
      {/* Todo hace scroll, cabecera incluida (Igor, 26/10) */}
      <div className="flex-1 min-h-0 scroll-y">
      {/* Cabecera a sangre (Igor, 26/10): un carrete de fotos inclinado con las obras de la estantería o, si hay
          pocas, con su icono repetido; encima, el nombre y cuánto está ordenado. Sin tarjeta y sin botón de Duelos. */}
      <header className="relative overflow-hidden" style={{ background: `linear-gradient(160deg, ${SHELF_COLOR[t]}40 0%, var(--color-bg) 75%)` }}>
        <FilmStrip ids={stripIds} shelf={t} />
        <div className="absolute inset-0 bg-gradient-to-b from-bg/30 via-bg/40 to-bg pointer-events-none" aria-hidden />
        <div className="relative px-5 pt-[max(env(safe-area-inset-top),18px)] pb-4">
          <div className="flex items-center justify-between">
            <button onClick={() => (selecting ? setSelecting(false) : nav('/'))} aria-label="Volver" className="w-10 h-10 -ml-1 rounded-full bg-bg/60 backdrop-blur border border-line/60 flex items-center justify-center text-ink active:scale-95 transition-transform">
              <Icon name="back" size={20} />
            </button>
            {!selecting && (
              <div className="flex items-center gap-2">
                <button onClick={() => { setSelecting(true); setSel([]) }} aria-label="Compartir" className="w-10 h-10 rounded-full bg-bg/60 backdrop-blur border border-line/60 flex items-center justify-center text-ink active:scale-95 transition-transform">
                  <Icon name="share" size={18} />
                </button>
                <button onClick={() => setAdding(true)} aria-label={`Añadir a ${label.plural}`} className="w-10 h-10 rounded-full bg-accent text-accent-ink flex items-center justify-center active:scale-95 transition-transform">
                  <Icon name="plus" size={18} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
          <div className="mt-24">
            <div className="text-label flex items-center gap-1.5" style={{ color: SHELF_COLOR[t] }}>
              <Icon name={SHELF_ICON[t]} size={14} strokeWidth={2.2} /> ESTANTERÍA
            </div>
            <h1 className="text-display text-ink mt-1 truncate">{label.plural}</h1>
            <p className="text-meta text-ink/75 mt-1">
              {seg === 'ord' ? <>{totalSeen} obras · <span className="font-semibold" style={{ color: pctColor(ordenadoPct) }}>{ordenadoPct} % ordenado</span></> : `${pend.length} pendientes`}
            </p>
          </div>
        </div>
      </header>
      {/* Pestañas de texto con subrayado, en lugar de las dos píldoras */}
      <div className="mx-5 mb-4 flex gap-6 border-b border-line" role="tablist">
        {(['ord', 'pend'] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={seg === k}
            onClick={() => setSeg(k)}
            className={`relative pb-2.5 text-[15px] font-semibold transition-colors ${seg === k ? 'text-ink' : 'text-mute'}`}
          >
            {k === 'ord' ? `Mis ${label.plural.toLowerCase()}` : 'Pendientes'}{' '}
            <span className="font-normal text-mute tabular-nums">{k === 'ord' ? totalSeen : pend.length}</span>
            {seg === k && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-accent" />}
          </button>
        ))}
      </div>
      {selecting && (
        <div className="px-5 pb-3 flex items-center gap-2">
          <button onClick={() => setSel(sel.length === visibleIds.length ? [] : visibleIds)} className="min-h-[36px] px-3.5 rounded-full bg-surface border border-line text-xs font-medium">{sel.length === visibleIds.length && visibleIds.length > 0 ? 'Quitar todas' : 'Seleccionar todas'}</button>
          <span className="text-meta text-mute">{sel.length} seleccionada{sel.length === 1 ? '' : 's'}</span>
        </div>
      )}
      <div className="px-5 pb-28">
        {seg === 'ord' && (
          totalSeen ? (
            <div className="space-y-6">
              {/* Obras numeradas en el ranking */}
              {ranking.length > 0 && (
                <div className="rounded-2xl bg-surface border border-line divide-y divide-line overflow-hidden">
                  {ranking.map((id, i) => {
                    const it = getItem(id)
                    return it ? <ItemRow key={id} item={it} rank={i + 1} highlight={i === 0 && !selecting} selecting={selecting} selected={sel.includes(id)} onToggle={() => toggle(id)} /> : null
                  })}
                </div>
              )}

              {/* Obras sin ordenar (T19 §4.3) */}
              {unrankedIds.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-label text-mute">NUEVAS · {unrankedIds.length}</span>
                  </div>
                  <div className="rounded-2xl bg-surface border border-line divide-y divide-line overflow-hidden">
                    {unrankedIds.map((id) => {
                      const it = getItem(id)
                      if (!it) return null
                      const isSel = sel.includes(id)
                      const cls = `flex items-center gap-3 px-4 py-2.5 min-h-[56px] w-full text-left transition-colors ${
                        isSel ? 'bg-accent/15' : 'hover:bg-surface2/60 active:bg-surface2'
                      }`
                      const rowBody = (
                        <>
                          {selecting ? (
                            <span
                              className={`w-5 h-5 rounded-md border shrink-0 flex items-center justify-center transition-colors ${
                                isSel ? 'bg-accent border-accent text-accent-ink' : 'border-line bg-surface'
                              }`}
                            >
                              {isSel && <Icon name="check" size={13} strokeWidth={3} />}
                            </span>
                          ) : (
                            <span className="w-6 shrink-0" aria-hidden />
                          )}
                          <Poster item={it} style={{ borderRadius: posterRadius(it.type, 6), ...posterBox(it).style }} className={`w-9 ${posterBox(it).className} rounded-[6px] shrink-0 self-center object-cover`} />
                          <div className="flex-1 min-w-0">
                            <div className="serif text-item text-ink leading-tight line-clamp-1">{it.title}</div>
                            <div className="text-meta text-mute mt-0.5 truncate">{it.year} · {it.creator}</div>
                            <div className="text-meta text-mute mt-0.5 truncate">nueva</div>
                          </div>
                        </>
                      )
                      if (selecting) {
                        return (
                          <button
                            key={id}
                            type="button"
                            role="checkbox"
                            aria-checked={isSel}
                            onClick={() => toggle(id)}
                            className={cls}
                          >
                            {rowBody}
                          </button>
                        )
                      }
                      return (
                        <Link key={id} to={`/i/${encodeURIComponent(id)}`} className={cls}>
                          {rowBody}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Empty
              text="Todavía no hay nada aquí."
              action={
                <div className="flex flex-col gap-2.5 w-full max-w-xs">
                  <Button variant="primary" onClick={() => nav('/descubrir')}>Ir a Descubrir</Button>
                  <Button variant="secondary" onClick={() => nav('/importar')}>Importar tus obras</Button>
                </div>
              }
            />
          )
        )}
        {seg === 'pend' && (
          pend.length ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                {pend.length >= 3 && (
                  <Button
                    variant="secondary"
                    onClick={() => setCleaning(true)}
                    className="flex-1"
                    icon={<Icon name="sparkle" size={16} />}
                  >
                    Limpieza ({pend.length})
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={() => nav(`${WIZARD_PATH}?t=${t}`)}
                  className="flex-1"
                >
                  {t === 'book' ? '¿Qué leo?' : t === 'boardgame' ? '¿A qué jugamos?' : t === 'artist' ? '¿Qué escucho?' : '¿Qué vemos?'}
                </Button>
              </div>
              <div className="rounded-2xl bg-surface border border-line divide-y divide-line overflow-hidden">
                {pend.map((e) => {
                  const it = getItem(e.itemId)
                  return it ? <ItemRow key={e.itemId} item={it} note={e.origin ? `De ${e.origin}` : undefined} selecting={selecting} selected={sel.includes(e.itemId)} onToggle={() => toggle(e.itemId)} /> : null
                })}
              </div>
            </div>
          ) : (
            <Empty
              text="No tienes pendientes. Desliza hacia arriba en Descubrir para guardar."
              action={
                <Button variant="secondary" onClick={() => nav('/importar')}>Importar tus listas</Button>
              }
            />
          )
        )}
      </div>
      </div>
      {/* Botón flotante para ordenar con duelos (Igor, 26/10): siempre a mano aunque la lista tenga 200 obras */}
      {!selecting && seg === 'ord' && totalSeen >= 2 && (
        <Link
          to={`/comparar/${t}`}
          className="absolute right-5 z-20 inline-flex items-center gap-2 min-h-[52px] pl-4 pr-5 rounded-full bg-accent text-accent-ink text-[15px] font-semibold shadow-xl shadow-black/40 active:scale-95 transition-transform"
          style={{ bottom: 'max(env(safe-area-inset-bottom), 20px)' }}
        >
          <Icon name="scale" size={18} strokeWidth={2.2} /> Ordenar
          {unrankedIds.length > 0 && (
            <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-accent-ink text-accent text-[12px] font-bold flex items-center justify-center tabular-nums" aria-label={`${unrankedIds.length} nuevas`}>
              {unrankedIds.length}
            </span>
          )}
        </Link>
      )}
      {selecting && (
        <div className="shrink-0 p-4 border-t border-line bg-surface flex gap-3">
          <Button variant="secondary" onClick={() => setSelecting(false)}>Cancelar</Button>
          <Button variant="primary" disabled={!sel.length} onClick={createList} className="flex-1">
            Crear lista con {sel.length}
          </Button>
        </div>
      )}
      {adding && <AddFlow shelf={t} onClose={(m) => { setAdding(false); if (m) setToast(m) }} />}
      {cleaning && <CleanupFlow shelf={t} onClose={() => setCleaning(false)} />}
      <AnimatePresence>{toast && <Toast key={toast} message={toast} onDone={() => setToast(null)} />}</AnimatePresence>
    </div>
  )
}

function Empty({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="py-14 text-center text-mute flex flex-col items-center gap-4">
      <p className="max-w-[240px] text-body">{text}</p>
      {action}
    </div>
  )
}

/** Carrete de fotos inclinado de fondo: portadas reales y, para completar, el icono de la estantería en su color. */
function FilmStrip({ ids, shelf }: { ids: string[]; shelf: ShelfType }) {
  const items = ids.map((id) => getItem(id)).filter((it): it is NonNullable<typeof it> => Boolean(it))
  const frames = Array.from({ length: Math.max(10, items.length) }, (_, i) => items[i] ?? null)
  const holes = Array.from({ length: frames.length * 3 })
  const perforations = (
    <div className="flex gap-2.5 px-2 overflow-hidden">{holes.map((_, i) => <span key={i} className="w-2.5 h-2 rounded-[2px] bg-bg/80 shrink-0" />)}</div>
  )
  return (
    <div className="absolute left-[-15%] right-[-15%] top-[38%] -translate-y-1/2 -rotate-6 bg-black/55 py-2 flex flex-col gap-2 pointer-events-none select-none" aria-hidden>
      {perforations}
      <div className="flex gap-2 px-2 items-center h-[96px] overflow-hidden">
        {frames.map((it, i) =>
          it ? (
            <Poster key={it.id} item={it} showTitle={false} className="h-full shrink-0 rounded-[4px] opacity-80" style={{ aspectRatio: frameRatio(it) }} />
          ) : (
            <span key={'icono-' + i} className="h-full aspect-[2/3] shrink-0 rounded-[4px] flex items-center justify-center" style={{ background: `${SHELF_COLOR[shelf]}26`, color: SHELF_COLOR[shelf] }}>
              <Icon name={SHELF_ICON[shelf]} size={26} strokeWidth={1.8} />
            </span>
          ),
        )}
      </div>
      {perforations}
    </div>
  )
}

/** Forma de cada foto del carrete: la de su portada (juegos de mesa), cuadrada (música) o vertical. */
function frameRatio(it: { type: ShelfType; posterRatio?: number }): number {
  if (it.type === 'boardgame' && it.posterRatio) return Math.min(2, Math.max(0.5, it.posterRatio))
  return posterShape(it.type) === 'square' ? 1 : 2 / 3
}
