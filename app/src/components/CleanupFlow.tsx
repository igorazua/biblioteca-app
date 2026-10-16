import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { getItem, friendHits } from '../data/catalog'
import { useStore } from '../store/useStore'
import { track, useEvents } from '../store/useEvents'
import { SHELF_LABEL, type Item, type ShelfType, type UserEntry } from '../types'
import { SwipeDeck, type DeckHandle, type SwipeDir } from './SwipeDeck'
import { RatingFlow } from './RatingFlow'
import { Icon } from './Icon'
import { Toast } from './ui'
import { cleanupOrder } from '../lib/engine/cleanup'

interface CleanupFlowProps {
  shelf: ShelfType
  onClose: () => void
}

interface CleanupHistory {
  item: Item
  dir: SwipeDir
  prevEntry: UserEntry
}

export function CleanupFlow({ shelf, onClose }: CleanupFlowProps) {
  const nav = useNavigate()
  const entries = useStore((s) => s.entries)
  const settings = useStore((s) => s.settings)
  const setStatus = useStore((s) => s.setStatus)
  const newSession = useEvents((s) => s.newSession)

  const sessionSid = useRef(newSession('clean'))
  const deckRef = useRef<DeckHandle>(null)

  const [ratingItemId, setRatingItemId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [history, setHistory] = useState<CleanupHistory[]>([])
  const [counts, setCounts] = useState({ seen: 0, kept: 0, dismissed: 0 })
  const [showSummary, setShowSummary] = useState(false)

  // Obtener obras pendientes iniciales de esta estantería
  const [pendingItems, setPendingItems] = useState<Item[]>(() => {
    const list = Object.values(entries)
      .filter((e) => e.status === 'pending')
      .map((e) => getItem(e.itemId))
      .filter((it): it is Item => it !== undefined && it.type === shelf)

    const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000
    const now = Date.now()
    const getFriendsRecent = (id: string) => {
      const hits = friendHits(id)
      return hits.some((h) => h.entry.status === 'seen' && (now - (h.entry.at || 0)) < SIXTY_DAYS_MS)
    }

    return cleanupOrder(list, entries, getFriendsRecent, now)
  })

  // Emitir clean_start al iniciar y clean_end al desmontar
  useEffect(() => {
    track('clean_start', { shelf, sid: sessionSid.current })
    const sid = sessionSid.current
    return () => {
      track('clean_end', {
        shelf,
        sid,
        data: counts,
      })
    }
  }, [shelf])

  const label = SHELF_LABEL[shelf]
  const currentItem = pendingItems[0]

  const onSwipe = (item: Item, dir: SwipeDir) => {
    const prevEntry = entries[item.id] || {
      itemId: item.id,
      status: 'pending',
      ranked: false,
      updatedAt: Date.now(),
    }

    // Registrar evento de swipe
    track('clean_swipe', {
      shelf,
      itemId: item.id,
      sid: sessionSid.current,
      data: { dir },
    })

    setHistory((h) => [...h, { item, dir, prevEntry }])
    setPendingItems((list) => list.slice(1))

    if (dir === 'right') {
      // Ya la vi
      setStatus(item.id, 'seen')
      track('entry_status', {
        shelf,
        itemId: item.id,
        sid: sessionSid.current,
        data: { from: 'pending', to: 'seen', via: 'clean' },
      })
      setCounts((c) => ({ ...c, seen: c.seen + 1 }))

      if (settings.rateOnSwipe !== false) {
        setRatingItemId(item.id)
      } else {
        setToast(`${label.actionPast} ✓`)
      }
    } else if (dir === 'up') {
      // Sigue guardada -> actualizar reviewedAt
      const now = Date.now()
      useStore.setState((s) => ({
        entries: {
          ...s.entries,
          [item.id]: {
            ...prevEntry,
            status: 'pending',
            reviewedAt: now,
            updatedAt: now,
          },
        },
      }))
      setCounts((c) => ({ ...c, kept: c.kept + 1 }))
      setToast('Sigue guardada')
    } else if (dir === 'left') {
      // Fuera / descartada
      const now = Date.now()
      useStore.setState((s) => ({
        entries: {
          ...s.entries,
          [item.id]: {
            ...prevEntry,
            status: 'dismissed',
            dismissedAt: now,
            updatedAt: now,
          },
        },
      }))
      track('entry_status', {
        shelf,
        itemId: item.id,
        sid: sessionSid.current,
        data: { from: 'pending', to: 'dismissed', via: 'clean' },
      })
      setCounts((c) => ({ ...c, dismissed: c.dismissed + 1 }))
      setToast('Descartada')
    }

    // Si era la última tarjeta, mostrar resumen
    if (pendingItems.length <= 1) {
      setShowSummary(true)
    }
  }

  const handleUndo = () => {
    if (history.length === 0) return
    const last = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))

    // Restaurar estado previo
    useStore.setState((s) => ({
      entries: {
        ...s.entries,
        [last.item.id]: last.prevEntry,
      },
    }))

    // Restaurar contadores
    if (last.dir === 'right') setCounts((c) => ({ ...c, seen: Math.max(0, c.seen - 1) }))
    else if (last.dir === 'up') setCounts((c) => ({ ...c, kept: Math.max(0, c.kept - 1) }))
    else if (last.dir === 'left') setCounts((c) => ({ ...c, dismissed: Math.max(0, c.dismissed - 1) }))

    // Devolver tarjeta al mazo
    setPendingItems((list) => [last.item, ...list])
    setRatingItemId(null)
  }

  const handleExit = () => {
    const totalSwipes = counts.seen + counts.kept + counts.dismissed
    if (totalSwipes > 0 && !showSummary) {
      setShowSummary(true)
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col">
      {/* Header */}
      <div className="safe-top px-4 pb-2 pt-2 shrink-0 flex items-center justify-between border-b border-line/40">
        <div className="flex items-center gap-2">
          <button
            onClick={handleExit}
            className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-mute active:scale-95 transition-transform"
            aria-label="Cerrar limpieza"
          >
            <Icon name="x" size={20} />
          </button>
          <div>
            <h1 className="font-semibold text-base font-serif">Limpieza de pendientes</h1>
            <div className="text-xs text-mute">{label.plural}</div>
          </div>
        </div>

        <div className="text-xs text-mute tabular-nums">
          {pendingItems.length > 0 ? `${pendingItems.length} restantes` : 'Completado'}
        </div>
      </div>

      {/* Pantalla de Resumen */}
      {showSummary ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-5">
          <div className="text-5xl">✨</div>
          <h2 className="serif text-3xl font-semibold">Limpieza completada</h2>
          <p className="text-mute text-sm">Has repasado tus pendientes de {label.plural.toLowerCase()}.</p>

          <div className="grid grid-cols-3 gap-3 w-full max-w-sm mt-2">
            <div className="rounded-2xl bg-surface border border-line p-3 text-center">
              <div className="serif text-2xl font-bold text-stamp-green tabular-nums">{counts.seen}</div>
              <div className="text-xs text-mute mt-1">{label.seen}</div>
            </div>
            <div className="rounded-2xl bg-surface border border-line p-3 text-center">
              <div className="serif text-2xl font-bold text-stamp-blue tabular-nums">{counts.kept}</div>
              <div className="text-xs text-mute mt-1">Siguen</div>
            </div>
            <div className="rounded-2xl bg-surface border border-line p-3 text-center">
              <div className="serif text-2xl font-bold text-stamp-red tabular-nums">{counts.dismissed}</div>
              <div className="text-xs text-mute mt-1">Fuera</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full max-w-sm min-h-[52px] rounded-2xl bg-accent text-accent-ink font-semibold flex items-center justify-center active:scale-95 transition-transform"
          >
            Volver a Pendientes
          </button>
        </div>
      ) : (
        /* Mazo de tarjetas */
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 px-4 pt-3 relative">
            {pendingItems.length > 0 ? (
              <SwipeDeck
                ref={deckRef}
                deck={pendingItems}
                shelf={shelf}
                onSwipe={onSwipe}
                onOpen={(it) => nav(`/i/${encodeURIComponent(it.id)}`)}
                stamps={{
                  right: label.stamp,
                  left: 'FUERA',
                  up: 'LA GUARDO',
                }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-3">
                <div className="text-4xl">🎉</div>
                <h3 className="serif text-xl font-semibold">¡No quedan más pendientes!</h3>
                <button
                  onClick={onClose}
                  className="mt-2 min-h-[46px] px-6 rounded-2xl bg-accent text-accent-ink font-semibold"
                >
                  Volver a Pendientes
                </button>
              </div>
            )}
          </div>

          {/* Barra de acciones inferior */}
          {pendingItems.length > 0 && (
            <div className="shrink-0 px-4 pt-2 pb-6 flex items-center justify-center gap-5">
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                aria-label="Deshacer"
                className="w-11 h-11 rounded-full bg-surface flex items-center justify-center text-mute disabled:opacity-25 active:scale-90 transition-transform"
              >
                <Icon name="undo" size={20} />
              </button>

              <button
                onClick={() => deckRef.current?.fling('left')}
                aria-label="Fuera (descartar)"
                className="w-14 h-14 rounded-full bg-surface border-2 border-line text-stamp-red flex items-center justify-center active:scale-90 transition-transform"
              >
                <Icon name="x" size={26} strokeWidth={2.6} />
              </button>

              <button
                onClick={() => deckRef.current?.fling('up')}
                aria-label="La guardo (mantener en pendientes)"
                className="w-12 h-12 rounded-full bg-surface border-2 border-line text-stamp-blue flex items-center justify-center active:scale-90 transition-transform"
              >
                <Icon name="bookmark" size={22} strokeWidth={2.4} />
              </button>

              <button
                onClick={() => deckRef.current?.fling('right')}
                aria-label={`¡${label.stamp}! (marcar como ${label.seenPastPart})`}
                className="w-14 h-14 rounded-full bg-surface border-2 border-line text-stamp-green flex items-center justify-center active:scale-90 transition-transform"
              >
                <Icon name="check" size={26} strokeWidth={2.8} />
              </button>

              <span className="w-11" aria-hidden />
            </div>
          )}
        </div>
      )}

      {ratingItemId && (
        <RatingFlow
          key={ratingItemId}
          itemId={ratingItemId}
          withStars
          onDone={(m) => {
            setRatingItemId(null)
            if (m) setToast(m)
          }}
        />
      )}

      <AnimatePresence>
        {toast && <Toast key={toast} message={toast} ms={1400} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
