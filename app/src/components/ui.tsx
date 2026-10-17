import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { animate, motion, useMotionValue } from 'framer-motion'
import { friendHits, getItem, type FriendHit } from '../data/catalog'
import { Icon } from './Icon'
import { friendRanks } from '../lib/rank'
import { PLATFORMS } from '../config'
import { SHELF_LABEL, type ShelfType } from '../types'

/** Pinta superposiciones (hojas, diálogos) sobre todo el marco de móvil, barra de pestañas incluida. */
export function Portal({ children }: { children: ReactNode }) {
  const host = typeof document !== 'undefined' ? (document.querySelector('.frame') as HTMLElement | null) : null
  return host ? createPortal(children, host) : <>{children}</>
}

export function Avatar({
  name,
  color,
  url,
  size = 32,
  className = '',
}: {
  name: string
  color: string
  url?: string | null
  size?: number
  className?: string
}) {
  const [imgError, setImgError] = useState(false)
  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'

  if (url && !imgError) {
    return (
      <img
        src={url}
        alt={name}
        loading="lazy"
        onError={() => setImgError(true)}
        className={`inline-block rounded-full object-cover shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold text-black/80 shrink-0 ${className}`}
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
      aria-label={name}
    >
      {initials}
    </span>
  )
}

/** Puesto en un ranking (D25): «nº 3». Sustituye a la antigua nota 0-10. */
export function RankBadge({ pos, className = '' }: { pos: number; className?: string }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full bg-accent text-accent-ink font-bold px-1.5 py-[1px] text-[10px] tabular-nums ${className}`}>nº {pos}</span>
}

export function Chip({ active, onClick, children, className = '' }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[40px] px-4 rounded-full text-sm font-medium border transition-colors whitespace-nowrap ${active ? 'bg-accent text-accent-ink border-accent' : 'bg-white/[0.05] backdrop-blur-md border-white/10 text-ink/80 active:bg-white/10'} ${className}`}
    >
      {children}
    </button>
  )
}

export function PlatformPicker({
  value,
  onChange,
  className = '',
}: {
  value: string[]
  onChange: (platforms: string[]) => void
  className?: string
}) {
  const allSelected = PLATFORMS.length > 0 && PLATFORMS.every((p) => value.includes(p))

  const toggleAll = () => {
    if (allSelected) {
      onChange([])
    } else {
      onChange([...PLATFORMS])
    }
  }

  const togglePlatform = (p: string) => {
    if (value.includes(p)) {
      onChange(value.filter((x) => x !== p))
    } else {
      onChange([...value, p])
    }
  }

  return (
    <div className={`flex flex-wrap gap-2.5 ${className}`}>
      <Chip active={allSelected} onClick={toggleAll}>
        Todas
      </Chip>
      {PLATFORMS.map((p) => (
        <Chip key={p} active={value.includes(p)} onClick={() => togglePlatform(p)}>
          {p}
        </Chip>
      ))}
    </div>
  )
}

/** Burbujas de amigos sobre la tarjeta: hasta 4 avatares solapados + «+N», con la nota de cada uno (🔖 si lo tiene pendiente, 💬 si tiene comentario). */
export function FriendBubbles({ itemId, shelf, max = 4 }: { itemId: string; shelf?: ShelfType; max?: number }) {
  const hits = friendHits(itemId)
  if (!hits.length) return null
  const item = getItem(itemId)
  const category: ShelfType = shelf ?? item?.type ?? (itemId.startsWith('boardgame:') ? 'boardgame' : itemId.startsWith('book:') ? 'book' : itemId.startsWith('artist:') ? 'artist' : itemId.startsWith('series:') ? 'series' : 'movie')
  const terms = SHELF_LABEL[category]

  // Orden (§7.8): primero las que tienen comentario, luego por puesto
  const sortedHits = [...hits].sort((a, b) => {
    const aComment = Boolean(a.entry.comment)
    const bComment = Boolean(b.entry.comment)
    if (aComment !== bComment) return aComment ? -1 : 1
    const aRank = friendRanks(a.friend, getItem)[itemId]?.pos ?? 9999
    const bRank = friendRanks(b.friend, getItem)[itemId]?.pos ?? 9999
    return aRank - bRank
  })

  const shown = sortedHits.slice(0, max)
  const extra = sortedHits.length - shown.length
  const seen = sortedHits.filter((h) => h.entry.status === 'seen')
  const names = seen.slice(0, 1).map((h) => h.friend.name)
  const label = seen.length
    ? `${names[0]}${seen.length > 1 ? ` y ${seen.length - 1} más` : ''} ${seen.length > 1 ? terms.verbPerfPlural : terms.verbPerfSingular}`
    : `${sortedHits[0].friend.name}${sortedHits.length > 1 ? ` y ${sortedHits.length - 1} más` : ''} ${sortedHits.length > 1 ? terms.pendingPlural : terms.pendingSingular}`

  const [activeFriend, setActiveFriend] = useState<FriendHit | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const handlePointerDown = (h: FriendHit, e: React.PointerEvent) => {
    e.stopPropagation()
    clearTimer()
    timerRef.current = setTimeout(() => {
      setActiveFriend(h)
      navigator.vibrate?.(10)
    }, 350)
  }

  const handlePointerUpOrCancel = (e: React.PointerEvent) => {
    e.stopPropagation()
    clearTimer()
    setActiveFriend(null)
  }

  return (
    <div className="flex flex-col items-end gap-1 relative" aria-label={label}>
      <div className="flex items-center">
        {shown.map((h, i) => {
          const rank = friendRanks(h.friend, getItem)[itemId]
          const hasComment = Boolean(h.entry.comment)
          return (
            <span
              key={h.friend.id}
              className="relative cursor-pointer select-none"
              style={{ marginLeft: i ? 2 : 0, zIndex: 10 - i }}
              onPointerDown={(e) => handlePointerDown(h, e)}
              onPointerUp={handlePointerUpOrCancel}
              onPointerLeave={handlePointerUpOrCancel}
              onPointerCancel={handlePointerUpOrCancel}
            >
              <Avatar name={h.friend.name} color={h.friend.avatarColor} url={h.friend.avatarUrl} size={34} className="ring-2 ring-black/70" />
              {h.entry.status === 'seen' && rank ? (
                <RankBadge pos={rank.pos} className="absolute -bottom-2 left-1/2 -translate-x-1/2 ring-1 ring-black/60" />
              ) : (
                <span className="absolute -bottom-1.5 -right-1 bg-stamp-blue rounded-full p-[3px] ring-1 ring-black/60" title="Lo tiene pendiente">
                  <Icon name="bookmark" size={9} fill="white" strokeWidth={2.5} />
                </span>
              )}
              {hasComment && (
                <span
                  className="absolute -bottom-1 -right-1 bg-[#161513] rounded-full w-[14px] h-[14px] ring-1 ring-black/70 flex items-center justify-center text-white"
                  title="Tiene comentario"
                >
                  <Icon name="message" size={8} fill="white" strokeWidth={1} />
                </span>
              )}
            </span>
          )
        })}
        {extra > 0 && (
          <span className="ml-[2px] z-0 w-[34px] h-[34px] rounded-full bg-black/70 ring-2 ring-black/70 text-xs font-semibold flex items-center justify-center">+{extra}</span>
        )}
      </div>
      <span className="mt-2 text-[11px] text-white/85 bg-black/55 rounded-full px-2 py-[2px] backdrop-blur-sm">{label}</span>

      {/* Globo con primera línea del comentario y puesto al mantener pulsado (§7.8) */}
      {activeFriend && (
        <div
          className="absolute top-12 right-0 z-50 bg-[#181715] text-white border border-line rounded-2xl p-3 shadow-2xl min-w-[190px] max-w-[240px] text-left pointer-events-none"
          role="tooltip"
        >
          <div className="flex items-center gap-2 mb-1.5 font-semibold text-xs">
            <span>{activeFriend.friend.name}</span>
            {friendRanks(activeFriend.friend, getItem)[itemId] ? (
              <RankBadge pos={friendRanks(activeFriend.friend, getItem)[itemId].pos} />
            ) : activeFriend.entry.status === 'pending' ? (
              <span className="text-[10px] bg-stamp-blue/20 text-stamp-blue px-1.5 py-0.5 rounded font-medium">Pendiente</span>
            ) : null}
          </div>
          {activeFriend.entry.comment ? (
            <p className="italic text-white/90 serif text-[13px] leading-snug">
              «{activeFriend.entry.comment.split('\n')[0].slice(0, 80)}{activeFriend.entry.comment.length > 80 ? '…' : ''}»
            </p>
          ) : (
            <p className="text-white/60 text-[11px]">
              {activeFriend.entry.status === 'seen' ? terms.verbPerfSingular : terms.pendingSingular}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function StarRating({ value, onChange, size = 40, readOnly }: { value?: number; onChange?: (v: number) => void; size?: number; readOnly?: boolean }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Estrellas">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
          onClick={() => onChange?.(value === n ? 0 : n)}
          className="p-1 transition-transform active:scale-90 disabled:cursor-default"
          style={{ minWidth: readOnly ? undefined : 44, minHeight: readOnly ? undefined : 44 }}
        >
          <Icon name="star" size={size} fill={(value ?? 0) >= n ? '#F5B544' : 'none'} style={{ color: (value ?? 0) >= n ? '#F5B544' : '#5b5b63' }} strokeWidth={1.6} />
        </button>
      ))}
    </div>
  )
}

/** Hoja inferior con muelle. Cerrarla (fondo, arrastrar hacia abajo) llama siempre a `onClose`. */
export function Sheet({ children, onClose, height = '48%', label }: { children: ReactNode; onClose: () => void; height?: string; label: string }) {
  const y = useMotionValue(0)
  const closing = useRef(false)
  const close = () => {
    if (closing.current) return
    closing.current = true
    animate(y, 520, { duration: 0.2, ease: 'easeIn' }).then(onClose)
  }
  return (
    <Portal><div className="absolute inset-0 z-40" role="dialog" aria-modal="true" aria-label={label}>
      <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={close} />
      <motion.div
        className="absolute bottom-0 inset-x-0 bg-surface/90 backdrop-blur-2xl rounded-t-[28px] border-t border-white/10 shadow-2xl flex flex-col"
        style={{ y, minHeight: height, maxHeight: '88%', touchAction: 'none' }}
        initial={{ y: 600 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => { if (info.offset.y > 90 || info.velocity.y > 500) close(); else animate(y, 0, { type: 'spring', stiffness: 400, damping: 30 }) }}
      >
        <div className="mx-auto mt-3 mb-2 h-1.5 w-11 rounded-full bg-line shrink-0" />
        <div className="px-5 pb-5 pt-2 flex-1 flex flex-col" style={{ touchAction: 'pan-y' }} onPointerDownCapture={(e) => { if ((e.target as HTMLElement).closest('textarea,input')) e.stopPropagation() }}>
          {children}
        </div>
      </motion.div>
    </div></Portal>
  )
}

export function Toast({ message, onDone, ms = 1800 }: { message: string; onDone: () => void; ms?: number }) {
  useEffect(() => { const t = setTimeout(onDone, ms); return () => clearTimeout(t) }, [message, onDone, ms])
  return (
    <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute left-4 right-4 bottom-24 z-50 bg-ink text-bg rounded-2xl px-4 py-3 text-sm font-medium text-center shadow-xl" role="status">
      {message}
    </motion.div>
  )
}

export function ScreenHeader({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="safe-top px-3 pb-2 flex items-center gap-1 shrink-0">
      {onBack && (
        <button onClick={onBack} aria-label="Volver" className="w-11 h-11 flex items-center justify-center rounded-full active:bg-surface2">
          <Icon name="back" />
        </button>
      )}
      <h1 className={`text-xl font-semibold flex-1 truncate ${onBack ? '' : 'pl-2'}`}>{title}</h1>
      {right}
    </div>
  )
}

export function Confirm({ title, text, confirmLabel, onConfirm, onCancel }: { title: string; text: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Portal><div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/70" role="alertdialog" aria-label={title}>
      <div className="bg-surface border border-line rounded-3xl p-5 w-full">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-mute text-sm mt-1.5">{text}</p>
        <div className="flex gap-2 mt-5">
          <button onClick={onCancel} className="flex-1 min-h-[46px] rounded-2xl bg-surface2 font-medium">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 min-h-[46px] rounded-2xl bg-stamp-red text-white font-semibold">{confirmLabel}</button>
        </div>
      </div>
    </div></Portal>
  )
}
