import { Link } from 'react-router-dom'
import type { Item } from '../types'
import { Poster, posterLayoutId } from './Poster'
import { Icon } from './Icon'

/**
 * Portada con su puesto (filas horizontales de la biblioteca, D25). Con `rank`, un círculo naranja con el número en la
 * esquina superior izquierda (el orden es lo que dice qué te marcó más). `faded` = aún sin ordenar.
 */
export function PosterTile({ item, size = 104, rank, faded }: { item?: Item | null; size?: number; rank?: number; faded?: boolean }) {
  if (!item) {
    return (
      <div className="relative shrink-0 block" style={{ width: size }} aria-hidden="true">
        <div className="skeleton w-full aspect-[2/3] rounded-[10px] border border-line" />
      </div>
    )
  }
  return (
    <Link
      to={`/i/${encodeURIComponent(item.id)}`}
      className="relative shrink-0 block active:scale-[0.97] transition-transform duration-200"
      style={{ width: size }}
      aria-label={`${rank ? `Nº ${rank}: ` : ''}${item.title}`}
    >
      <div className={`relative ${faded ? 'opacity-55 saturate-50' : ''}`}>
        <Poster item={item} layoutId={posterLayoutId(item.id)} style={{ borderRadius: 10 }} className="w-full aspect-[2/3] rounded-[10px]" />
      </div>
      {rank !== undefined && (
        <span
          className="absolute top-1.5 left-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-accent text-accent-ink text-[12px] font-bold tabular-nums flex items-center justify-center shadow-[0_2px_6px_rgb(0_0_0/0.45)]"
          aria-hidden
        >
          {rank}
        </span>
      )}
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
        <div className="skeleton w-8 aspect-[2/3] rounded-[6px] shrink-0" />
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
      <Poster item={item} className="w-9 aspect-[2/3] rounded-[6px] shrink-0 object-cover" />
      <div className="flex-1 min-w-0">
        <div className="serif text-item text-ink leading-tight line-clamp-1">{item.title}</div>
        <div className="text-meta text-mute mt-0.5 truncate">{item.year} · {item.creator}</div>
        {note && <div className="text-label text-accent mt-0.5 truncate">{note}</div>}
      </div>
    </>
  )
  if (selecting)
    return <button type="button" role="checkbox" aria-checked={!!selected} onClick={onToggle} className={cls}>{body}</button>
  return <Link to={`/i/${encodeURIComponent(item.id)}`} className={cls}>{body}</Link>
}
