import { userLang } from '../lib/userLang'
import { displayTitle } from '../lib/locale'
import { Link } from 'react-router-dom'
import type { Item } from '../types'
import { Poster, posterLayoutId } from './Poster'
import { Icon } from './Icon'
import { posterAspectClass, posterBox, posterRadius } from '../lib/posterShape'

/**
 * Portada con su puesto (filas horizontales de la biblioteca, D25). Con `rank`, un número grande y hueco asoma por detrás
 * a la izquierda (el orden es lo que dice qué te marcó más). `faded` = aún sin ordenar.
 */
export function PosterTile({ item, size = 104, rank, faded }: { item?: Item | null; size?: number; rank?: number; faded?: boolean }) {
  const numW = rank === undefined ? 0 : rank >= 10 ? 58 : 34
  if (!item) {
    return (
      <div
        className="relative shrink-0 block"
        style={{ width: size + numW, paddingLeft: numW }}
        aria-hidden="true"
      >
        {rank !== undefined && <span className="rank-num absolute left-0 bottom-0 text-[86px] select-none text-mute/30" aria-hidden>{rank}</span>}
        <div className={`skeleton w-full ${posterAspectClass()} rounded-[10px] border border-line`} style={{ borderRadius: posterRadius(undefined, 10) }} />
      </div>
    )
  }
  return (
    <Link
      to={`/i/${encodeURIComponent(item.id)}`}
      className="relative shrink-0 block active:scale-[0.97] transition-transform duration-200"
      style={{ width: size + numW, paddingLeft: numW }}
      aria-label={`${rank ? `Nº ${rank}: ` : ''}${displayTitle(item, userLang())}`}
    >
      {rank !== undefined && <span className="rank-num absolute left-0 bottom-0 text-[86px] select-none" aria-hidden>{rank}</span>}
      <div className={`relative ${faded ? 'opacity-55 saturate-50' : ''}`}>
        <Poster item={item} layoutId={posterLayoutId(item.id)} style={{ borderRadius: posterRadius(item.type, 10), ...posterBox(item).style }} className={`w-full ${posterBox(item).className} rounded-[10px]`} />
      </div>
    </Link>
  )
}

interface RowProps {
  item?: Item | null
  rank?: number
  note?: string
  highlight?: boolean
  /** modo selección (compartir): la fila se marca en vez de abrir la ficha */
  selecting?: boolean
  selected?: boolean
  onToggle?: () => void
}

export function ItemRow({ item, rank, note, highlight, selecting, selected, onToggle }: RowProps) {
  if (!item) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 min-h-[56px] w-full" aria-hidden="true">
        {rank !== undefined && <span className="w-6 text-center tabular-nums text-xs font-medium text-mute/40">{rank}</span>}
        <div className={`skeleton w-8 ${posterAspectClass()} rounded-[6px] shrink-0`} style={{ borderRadius: posterRadius(undefined, 6) }} />
        <div className="flex-1 space-y-1.5 py-1">
          <div className="skeleton h-3.5 rounded w-3/4" />
          <div className="skeleton h-3 rounded w-1/2" />
        </div>
      </div>
    )
  }
  const cls = `flex items-center gap-3 px-4 py-2.5 min-h-[56px] w-full text-left transition-colors ${selected ? 'bg-accent/15' : 'hover:bg-surface2/60 active:bg-surface2'}`
  const body = (
    <>
      {selecting && (
        <span className={`w-5 h-5 rounded-md border shrink-0 flex items-center justify-center transition-colors ${selected ? 'bg-accent border-accent text-accent-ink' : 'border-line bg-surface'}`}>
          {selected && <Icon name="check" size={13} strokeWidth={3} />}
        </span>
      )}
      {rank !== undefined && !selecting && (
        <span className={`w-6 text-center tabular-nums text-xs font-semibold shrink-0 ${highlight ? 'text-accent' : 'text-mute'}`}>
          {rank}
        </span>
      )}
      <Poster item={item} style={{ borderRadius: posterRadius(item.type, 6), ...posterBox(item).style }} className={`w-9 ${posterBox(item).className} rounded-[6px] shrink-0 self-center object-cover`} />
      <div className="flex-1 min-w-0">
        <div className="serif text-item text-ink leading-tight line-clamp-1">{displayTitle(item, userLang())}</div>
        <div className="text-meta text-mute mt-0.5 truncate">{item.year} · {item.creator}</div>
        {note && <div className="text-label text-accent mt-0.5 truncate">{note}</div>}
      </div>
    </>
  )
  if (selecting)
    return <button type="button" role="checkbox" aria-checked={!!selected} onClick={onToggle} className={cls}>{body}</button>
  return <Link to={`/i/${encodeURIComponent(item.id)}`} className={cls}>{body}</Link>
}
