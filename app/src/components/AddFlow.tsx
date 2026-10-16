import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { friends, items } from '../data/catalog'
import { nextCards } from '../lib/engine/deck'
import { useStore } from '../store/useStore'
import { SHELVES, SHELF_LABEL, type ShelfType } from '../types'
import { Portal } from './ui'
import { Poster } from './Poster'
import { Icon } from './Icon'
import { RatingFlow } from './RatingFlow'
import { PlaceFlow } from './PlaceFlow'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const STATUS_TXT = { seen: 'Ya está en tu biblioteca', pending: 'Está en tus pendientes', dismissed: 'La marcaste como «no me interesa»' }

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

  const results = useMemo(() => {
    if (!shelf) return []
    const n = norm(q.trim())
    // Sin texto (§14.5, §7.9): sugerencias ordenadas con nextCards sin cupo explore ni aprendizaje
    if (!n) {
      const st = useStore.getState()
      const cards = nextCards({
        shelf,
        items: items.filter((i) => i.type === shelf),
        entries: st.entries,
        rankings: st.rankings,
        profile: st.profile,
        friends,
        affinity: () => null,
        friendPct: () => null,
      }, [], 40)
      return cards.map((c) => c.item)
    }
    return items
      .filter((i) => i.type === shelf && (norm(i.title).includes(n) || norm(i.creator).includes(n)))
      .sort((a, b) => (norm(a.title).startsWith(n) ? 0 : 1) - (norm(b.title).startsWith(n) ? 0 : 1) || b.popularity - a.popularity)
      .slice(0, 40)
  }, [shelf, q])

  // Añadir a mano: hoja de valoración y después duelos de colocación (§13.1). En Descubrir no hay duelos.
  if (placing)
    return <PlaceFlow key={placing} itemId={placing} onDone={(m) => onClose(m)} />
  if (rating)
    return <RatingFlow key={rating} itemId={rating} withStars onDone={() => { setPlacing(rating); setRating(null) }} />

  return (
    <Portal>
      <div className="absolute inset-0 z-40 bg-bg flex flex-col" role="dialog" aria-label="Añadir a mano">
        <div className="safe-top px-3 pb-2 flex items-center gap-1 shrink-0">
          <button onClick={() => onClose()} aria-label="Cerrar" className="w-11 h-11 flex items-center justify-center rounded-full active:bg-surface2"><Icon name="x" /></button>
          <h1 className="text-xl font-semibold flex-1">{shelf ? `Añadir a ${SHELF_LABEL[shelf].plural}` : 'Añadir a mano'}</h1>
        </div>

        {!shelf ? (
          <div className="px-5 pt-2 space-y-3">
            <p className="text-mute text-sm">¿A qué estantería?</p>
            {SHELVES.map((s) => (
              <button key={s} onClick={() => setShelf(s)} className="w-full min-h-[64px] rounded-3xl bg-surface border border-line px-5 text-left text-lg font-semibold flex items-center justify-between">
                {SHELF_LABEL[s].plural}<Icon name="chevron" size={18} className="text-mute" />
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
                            <button onClick={() => { onClose(); nav(`/i/${encodeURIComponent(it.id)}`) }} className="min-h-[44px] px-4 rounded-xl bg-accent text-accent-ink font-semibold text-sm">Abrir ficha</button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => { setStatus(it.id, 'seen'); setRating(it.id) }} className="flex-1 min-h-[46px] rounded-xl bg-accent text-accent-ink font-semibold text-sm">
                              {it.type === 'book' ? 'Lo he leído' : it.type === 'artist' ? 'Lo he escuchado' : it.type === 'boardgame' ? 'Lo he jugado' : 'La he visto'}
                            </button>
                            <button onClick={() => { setStatus(it.id, 'pending'); onClose('Guardada en pendientes ✓') }} className="flex-1 min-h-[46px] rounded-xl bg-surface2 border border-line font-semibold text-sm">Pendiente</button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
              {results.length === 0 && (
                <li className="text-center text-mute py-12">
                  <div className="text-4xl mb-2">🔎</div>
                  No está en nuestro catálogo todavía
                </li>
              )}
            </ul>
          </>
        )}
      </div>
    </Portal>
  )
}
