import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { friends, friendsMean, items } from '../data/catalog'
import { buildDeck } from '../lib/deck'
import { useStore } from '../store/useStore'
import { SHELVES, SHELF_LABEL, type ShelfType } from '../types'
import { SwipeDeck, type DeckHandle, type SwipeDir } from '../components/SwipeDeck'
import { RatingFlow } from '../components/RatingFlow'
import { Chip, Toast } from '../components/ui'
import { Icon } from '../components/Icon'

const readShelf = (): ShelfType => {
  try { const v = sessionStorage.getItem('discover-shelf') as ShelfType; if (v && (SHELVES as readonly string[]).includes(v)) return v } catch { /* sin almacenamiento */ }
  return 'movie'
}

export function Discover() {
  const nav = useNavigate()
  const [shelf, setShelfState] = useState<ShelfType>(readShelf)
  const setShelf = (s: ShelfType) => { setShelfState(s); try { sessionStorage.setItem('discover-shelf', s) } catch { /* ok */ } }
  const entries = useStore((s) => s.entries)
  const profile = useStore((s) => s.profile)
  const swipe = useStore((s) => s.swipe)
  const settings = useStore((s) => s.settings)
  const undoSwipe = useStore((s) => s.undoSwipe)
  const hasHistory = useStore((s) => s.history.length > 0)
  const [rating, setRating] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [first, setFirst] = useState<string | null>(null) // tarjeta recuperada con «deshacer»
  const deckRef = useRef<DeckHandle>(null)

  const deck = useMemo(() => {
    const pool = items.filter((i) => i.type === shelf)
    const all = buildDeck(pool, { friends, entries, birthYear: profile.birthYear, platforms: profile.platforms, reader: profile.reader, quality: friendsMean })
    if (first) {
      const idx = all.findIndex((i) => i.id === first)
      if (idx > 0) return [all[idx], ...all.slice(0, idx), ...all.slice(idx + 1)]
    }
    return all
  }, [shelf, entries, profile.birthYear, profile.platforms, profile.reader, first])

  const onSwipe = (item: (typeof deck)[number], dir: SwipeDir) => {
    setFirst(null)
    swipe(item.id, dir)
    if (dir === 'right') { if (settings.rateOnSwipe === false) setToast('Guardada ✓'); else setRating(item.id) }
    else if (dir === 'up') setToast('Guardada en pendientes ✓')
  }
  const undo = () => { const id = undoSwipe(); if (id) { setFirst(id); setRating(null) } }
  const label = SHELF_LABEL[shelf]
  const blocked = !!rating

  return (
    <div className="h-full flex flex-col relative">
      <div className="safe-top px-4 pb-2 shrink-0">
        <div className="flex gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Estantería">
          {SHELVES.map((s) => <Chip key={s} active={s === shelf} onClick={() => setShelf(s)}>{SHELF_LABEL[s].plural}</Chip>)}
        </div>
      </div>

      <div className="flex-1 min-h-0 px-4 relative">
        {deck.length > 0 ? (
          <SwipeDeck ref={deckRef} deck={deck} shelf={shelf} onSwipe={onSwipe} onOpen={(it) => nav(`/i/${encodeURIComponent(it.id)}`)} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-3">
            <div className="text-5xl">🎉</div>
            <h2 className="serif text-2xl font-semibold">¡Has repasado todo {label.plural}!</h2>
            <p className="text-mute text-sm">Ya no quedan más en esta estantería de la demo.</p>
            <Link to="/comparar" className="mt-2 min-h-[48px] px-6 rounded-2xl bg-accent text-accent-ink font-semibold flex items-center">Ordenar con Comparar</Link>
            <div className="flex gap-2 mt-1">
              {SHELVES.filter((s) => s !== shelf).map((s) => <Chip key={s} onClick={() => setShelf(s)}>{SHELF_LABEL[s].plural}</Chip>)}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 pt-2 pb-3">
        <div className="text-center text-[12px] text-mute/80 mb-2.5 tabular-nums">{deck.length > 0 ? `Te quedan ${deck.length} en ${label.plural}` : ' '}</div>
        <div className="flex items-center justify-center gap-5">
          <button onClick={undo} disabled={!hasHistory || blocked} aria-label="Deshacer" className="w-11 h-11 rounded-full bg-surface flex items-center justify-center text-mute disabled:opacity-25 active:scale-90 transition-transform">
            <Icon name="undo" size={20} />
          </button>
          <ActionBtn label="No me interesa" color="#ef4b4b" size={62} disabled={!deck.length || blocked} onClick={() => deckRef.current?.fling('left')}>
            <Icon name="x" size={28} strokeWidth={2.6} />
          </ActionBtn>
          <ActionBtn label="Pendiente: no la he visto, me interesa" color="#5b9cf5" size={52} disabled={!deck.length || blocked} onClick={() => deckRef.current?.fling('up')}>
            <Icon name="bookmark" size={22} strokeWidth={2.4} />
          </ActionBtn>
          <ActionBtn label={`${label.stamp.replace(/[¡!]/g, '')}: la he ${label.seenFem === 'leído' ? 'leído' : 'visto'}`} color="#3ec878" size={62} disabled={!deck.length || blocked} onClick={() => deckRef.current?.fling('right')}>
            <Icon name="check" size={28} strokeWidth={2.8} />
          </ActionBtn>
          <span className="w-11" aria-hidden />
        </div>
      </div>

      {rating && <RatingFlow key={rating} itemId={rating} withStars onDone={(m) => { setRating(null); if (m) setToast(m) }} />}
      <AnimatePresence>{toast && <Toast key={toast} message={toast} ms={1500} onDone={() => setToast(null)} />}</AnimatePresence>
    </div>
  )
}

/** Botón de gesto: relleno tintado del color del sello, con aro y pulsación física. */
function ActionBtn({ label, color, size, disabled, onClick, children }: { label: string; color: string; size: number; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-full flex items-center justify-center disabled:opacity-25 active:scale-90 transition-transform duration-150"
      style={{ width: size, height: size, color, background: `color-mix(in srgb, ${color} 14%, #161513)`, boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, ${color} 55%, transparent), 0 10px 24px -12px ${color}` }}
    >
      {children}
    </button>
  )
}
