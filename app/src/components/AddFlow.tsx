import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { friends, itemsOfType } from '../data/catalog'
import { nextCards } from '../lib/engine/deck'
import { useStore } from '../store/useStore'
import { useCatalog } from '../store/useCatalog'
import { supabase } from '../lib/supabase'
import { ACTIVE_SHELVES, SHELVES, SHELF_LABEL, type Item, type ShelfType } from '../types'
import { Portal } from './ui'
import { Poster } from './Poster'
import { Icon } from './Icon'
import { RatingFlow } from './RatingFlow'
import { PlaceFlow } from './PlaceFlow'

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const STATUS_TXT = {
  seen: 'Ya está en tu biblioteca',
  pending: 'Está en tus pendientes',
  dismissed: 'La marcaste como «no me interesa»',
}

interface RemoteSearchResult {
  ref: { source: 'wikidata' | 'openlibrary' | 'musicbrainz' | 'tvmaze'; id: string }
  title: string
  year: number | null
  creator: string | null
  posterUrl: string | null
  catalogId: string | null
}

/** Añadir a mano (§12.1): buscador del catálogo de una estantería. Sin `shelf`, primero se elige la estantería. */
export function AddFlow({ shelf: initial, onClose }: { shelf?: ShelfType; onClose: (msg?: string) => void }) {
  const nav = useNavigate()
  const entries = useStore((s) => s.entries)
  const setStatus = useStore((s) => s.setStatus)
  const [shelf, setShelf] = useState<ShelfType | undefined>(initial)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [rating, setRating] = useState<string | null>(null)
  const [placing, setPlacing] = useState<string | null>(null)

  const [remoteResults, setRemoteResults] = useState<RemoteSearchResult[]>([])
  const [searchingRemote, setSearchingRemote] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [searchRetryKey, setSearchRetryKey] = useState(0)
  const [resolvingRef, setResolvingRef] = useState<string | null>(null)

  const catalogVersion = useCatalog((s) => s.version)

  const results = useMemo(() => {
    if (!shelf) return []
    const n = norm(q.trim())
    const allItems = itemsOfType(shelf)
    // Sin texto (§14.5, §7.9): sugerencias ordenadas con nextCards sin cupo explore ni aprendizaje
    if (!n) {
      const st = useStore.getState()
      const cards = nextCards(
        {
          shelf,
          items: allItems,
          entries: st.entries,
          rankings: st.rankings,
          profile: st.profile,
          friends,
          affinity: () => null,
          friendPct: () => null,
        },
        [],
        40
      )
      return cards.map((c) => c.item)
    }
    return allItems
      .filter((i) => i.type === shelf && (norm(i.title).includes(n) || norm(i.originalTitle ?? '').includes(n) || norm(i.creator).includes(n)))
      .sort((a, b) => (norm(a.title).startsWith(n) ? 0 : 1) - (norm(b.title).startsWith(n) ? 0 : 1) || b.popularity - a.popularity)
      .slice(0, 40)
  }, [shelf, q, catalogVersion])

  // Búsqueda en catálogo vivo (Wikidata / TVmaze / OL / MB) con debounce de 300 ms y mínimo 2 letras
  useEffect(() => {
    const trimmed = q.trim()
    const client = supabase
    if (!shelf || shelf === 'boardgame' || trimmed.length < 2 || !client) {
      setRemoteResults([])
      setSearchingRemote(false)
      setSearchError(false)
      return
    }

    const controller = new AbortController()
    setSearchingRemote(true)
    setSearchError(false)

    const timer = setTimeout(async () => {
      try {
        const { data, error } = await client.functions.invoke('biblio-catalog', {
          body: { action: 'search', type: shelf, q: trimmed, lang: 'es' },
        })
        if (!controller.signal.aborted) {
          if (!error && data?.results) {
            const localTitles = new Set(results.flatMap((r) => [norm(r.title), norm(r.originalTitle ?? '')]))
            const filtered = (data.results as RemoteSearchResult[]).filter(
              (r) => !r.catalogId && !localTitles.has(norm(r.title))
            )
            setRemoteResults(filtered)
            setSearchError(false)
          } else if (error) {
            setSearchError(true)
            setRemoteResults([])
          } else {
            setRemoteResults([])
          }
          setSearchingRemote(false)
        }
      } catch {
        if (!controller.signal.aborted) {
          setRemoteResults([])
          setSearchError(true)
          setSearchingRemote(false)
        }
      }
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [shelf, q, results, searchRetryKey])

  const handleSelectRemote = async (hit: RemoteSearchResult) => {
    const client = supabase
    if (!shelf || !client || resolvingRef) return
    setResolvingRef(hit.ref.id)
    try {
      const { data, error } = await client.functions.invoke('biblio-catalog', {
        body: {
          action: 'resolve',
          refs: [{ type: shelf, source: hit.ref.source, id: hit.ref.id }],
        },
      })
      if (!error && data?.items?.[0]) {
        const item: Item = data.items[0]
        useCatalog.getState().addItems([item])
        setOpen(item.id)
        // Quitar de los resultados remotos para que se vea en locales
        setRemoteResults((prev) => prev.filter((r) => r.ref.id !== hit.ref.id))
      }
    } catch (e) {
      console.warn('Error resolviendo obra del catálogo:', e)
    } finally {
      setResolvingRef(null)
    }
  }

  // Añadir a mano: hoja de valoración y después duelos de colocación (§13.1). En Descubrir no hay duelos.
  if (placing) return <PlaceFlow key={placing} itemId={placing} onDone={(m) => onClose(m)} />
  if (rating)
    return <RatingFlow key={rating} itemId={rating} withStars onDone={() => { setPlacing(rating); setRating(null) }} />

  return (
    <Portal>
      <div className="absolute inset-0 z-40 bg-bg flex flex-col" role="dialog" aria-label="Añadir a mano">
        <div className="safe-top px-3 pb-2 flex items-center gap-1 shrink-0">
          <button onClick={() => onClose()} aria-label="Cerrar" className="w-11 h-11 flex items-center justify-center rounded-full active:bg-surface2">
            <Icon name="x" />
          </button>
          <h1 className="text-xl font-semibold flex-1">{shelf ? `Añadir a ${SHELF_LABEL[shelf].plural}` : 'Añadir a mano'}</h1>
        </div>

        {!shelf ? (
          <div className="px-5 pt-2 space-y-3">
            <button
              onClick={() => {
                onClose()
                nav('/importar')
              }}
              className="w-full p-4 rounded-3xl bg-accent/10 border border-accent/40 text-left flex items-center gap-3.5 active:scale-[0.99] transition-transform"
            >
              <div className="w-10 h-10 rounded-2xl bg-accent text-accent-ink flex items-center justify-center shrink-0">
                <Icon name="sparkle" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-ink">Importar listas externas</div>
                <div className="text-xs text-mute">Letterboxd, IMDb, Goodreads o Netflix con tutoriales</div>
              </div>
              <Icon name="chevron" size={16} className="text-accent shrink-0" />
            </button>
            <p className="text-mute text-sm pt-1">O añade una a una por estantería:</p>
            {ACTIVE_SHELVES.map((s) => (
              <button
                key={s}
                onClick={() => setShelf(s)}
                className="w-full min-h-[64px] rounded-3xl bg-surface border border-line px-5 text-left text-lg font-semibold flex items-center justify-between"
              >
                {SHELF_LABEL[s].plural}
                <Icon name="chevron" size={18} className="text-mute" />
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="px-4 pb-2 relative shrink-0">
              <Icon name="search" size={18} className="absolute left-7 top-1/2 -translate-y-[60%] text-mute" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Buscar en ${SHELF_LABEL[shelf].plural.toLowerCase()}…`}
                aria-label="Buscar en el catálogo"
                className="w-full bg-surface border border-line rounded-2xl pl-10 pr-4 min-h-[50px] focus:outline-none focus:border-accent"
              />
            </div>
            <ul className="flex-1 min-h-0 scroll-y px-4 pb-6 space-y-2">
              {results.map((it) => {
                const st = entries[it.id]?.status
                const isOpen = open === it.id
                return (
                  <li key={it.id} className="rounded-2xl bg-surface/70 border border-line">
                    <button onClick={() => setOpen(isOpen ? null : it.id)} aria-expanded={isOpen} className="w-full flex items-center gap-3 p-2.5 text-left">
                      <Poster item={it} className="w-11 h-[66px] rounded-lg shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block serif font-semibold leading-tight line-clamp-2">{it.title}</span>
                        <span className="block text-xs text-mute truncate">{it.year} · {it.creator}</span>
                      </span>
                      {st && <Icon name={st === 'seen' ? 'check' : 'bookmark'} size={18} className="text-accent shrink-0" />}
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3 pt-1">
                        {st ? (
                          <div className="flex items-center gap-2">
                            <span className="flex-1 text-sm text-mute">{STATUS_TXT[st]}</span>
                            <button
                              onClick={() => {
                                onClose()
                                nav(`/i/${encodeURIComponent(it.id)}`)
                              }}
                              className="min-h-[44px] px-4 rounded-xl bg-accent text-accent-ink font-semibold text-sm"
                            >
                              Abrir ficha
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setStatus(it.id, 'seen')
                                setRating(it.id)
                              }}
                              className="flex-1 min-h-[46px] rounded-xl bg-accent text-accent-ink font-semibold text-sm"
                            >
                              {it.type === 'book' ? 'Lo he leído' : it.type === 'artist' ? 'Lo he escuchado' : it.type === 'boardgame' ? 'Lo he jugado' : 'La he visto'}
                            </button>
                            <button
                              onClick={() => {
                                setStatus(it.id, 'pending')
                                onClose('Guardada en pendientes ✓')
                              }}
                              className="flex-1 min-h-[46px] rounded-xl bg-surface2 border border-line font-semibold text-sm"
                            >
                              Pendiente
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}

              {/* Sección «Más en el catálogo» */}
              {(remoteResults.length > 0 || searchingRemote) && (
                <div className="pt-4 pb-2">
                  <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-mute">
                      Más en el catálogo
                    </span>
                    {searchingRemote && (
                      <span className="text-xs text-mute/80 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block" />
                        Buscando…
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {searchingRemote && remoteResults.length === 0 &&
                      [0, 1, 2].map((i) => (
                        <li key={`sk${i}`} aria-hidden="true" className="rounded-2xl bg-surface/50 border border-line/60 flex items-center gap-3 p-2.5">
                          <span className="skeleton w-11 h-[66px] rounded-lg shrink-0" />
                          <span className="flex-1 space-y-2">
                            <span className="skeleton block h-4 rounded w-2/3" />
                            <span className="skeleton block h-3 rounded w-1/3" />
                          </span>
                        </li>
                      ))}
                    {remoteResults.map((hit) => {
                      const isResolving = resolvingRef === hit.ref.id
                      return (
                        <li key={hit.ref.id} className="rounded-2xl bg-surface/50 border border-line/60">
                          <button
                            onClick={() => handleSelectRemote(hit)}
                            disabled={isResolving}
                            className="w-full flex items-center gap-3 p-2.5 text-left disabled:opacity-60"
                          >
                            {hit.posterUrl ? (
                              <img
                                src={hit.posterUrl}
                                alt={`Portada de ${hit.title}`}
                                className="skeleton w-11 h-[66px] rounded-lg object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-11 h-[66px] rounded-lg bg-surface2/80 flex items-center justify-center shrink-0 text-mute">
                                <Icon name="search" size={16} />
                              </div>
                            )}
                            <span className="flex-1 min-w-0">
                              <span className="block serif font-semibold leading-tight line-clamp-2">
                                {hit.title}
                              </span>
                              <span className="block text-xs text-mute truncate">
                                {hit.year || '—'} {hit.creator ? `· ${hit.creator}` : ''}
                              </span>
                            </span>
                            {isResolving ? (
                              <span className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />
                            ) : (
                              <span className="text-xs text-accent font-semibold px-2 py-1 bg-accent/10 rounded-lg shrink-0">
                                Añadir
                              </span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </div>
                </div>
              )}

              {results.length === 0 && !searchingRemote && remoteResults.length === 0 && (
                searchError ? (
                  <li className="text-center text-mute py-12 px-4 space-y-3">
                    <div className="w-10 h-10 rounded-full bg-surface2 border border-line flex items-center justify-center mx-auto text-mute">
                      <Icon name="search" size={20} />
                    </div>
                    <div className="text-sm font-semibold text-ink">No he podido conectar con el catálogo</div>
                    <p className="text-xs text-mute max-w-xs mx-auto">Comprueba tu conexión a internet o vuelve a intentarlo.</p>
                    <button
                      onClick={() => setSearchRetryKey((k) => k + 1)}
                      className="px-4 py-2 rounded-xl bg-surface border border-line text-xs font-semibold text-accent active:scale-95 transition-transform"
                    >
                      Reintentar
                    </button>
                  </li>
                ) : (
                  <li className="text-center text-mute py-12">
                    <div className="w-10 h-10 rounded-full bg-surface2 border border-line flex items-center justify-center mx-auto text-mute mb-2">
                      <Icon name="search" size={20} />
                    </div>
                    No está en nuestro catálogo todavía
                  </li>
                )
              )}
            </ul>
          </>
        )}
      </div>
    </Portal>
  )
}
