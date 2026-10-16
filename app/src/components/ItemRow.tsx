import { Link } from 'react-router-dom'
import type { Item } from '../types'
import { Poster } from './Poster'
import { Icon } from './Icon'

/**
 * Portada con su puesto (filas horizontales de la biblioteca, D25). Con `rank`, un número grande y hueco asoma por detrás
 * a la izquierda (el orden es lo que dice qué te marcó más). `faded` = aún sin ordenar.
 */
export function PosterTile({ item, size = 104, rank, faded }: { item: Item; size?: number; rank?: number; faded?: boolean }) {
  const numW = rank === undefined ? 0 : rank >= 10 ? 58 : 34
  return (
    <Link
      to={`/i/${encodeURIComponent(item.id)}`}
      className="relative shrink-0 block active:scale-[0.97] transition-transform duration-200"
      style={{ width: size + numW, paddingLeft: numW }}
      aria-label={`${rank ? `Nº ${rank}: ` : ''}${item.title}`}
    >
      {rank !== undefined && <span className="rank-num absolute left-0 bottom-0 text-[86px] select-none" aria-hidden>{rank}</span>}
      <div className={`relative ${faded ? 'opacity-55 saturate-50' : ''}`}>
        <Poster item={item} className="w-full aspect-[2/3] rounded-[18px] shadow-[0_10px_30px_-12px_rgb(0_0_0/0.9)] ring-1 ring-white/[0.06]" />
      </div>
    </Link>
  )
}

interface RowProps {
  item: Item
  rank?: number
  note?: string
  highlight?: boolean
  /** modo selección (compartir): la fila se marca en vez de abrir la ficha */
  selecting?: boolean
  selected?: boolean
  onToggle?: () => void
}

export function ItemRow({ item, rank, note, highlight, selecting, selected, onToggle }: RowProps) {
  const cls = `flex items-center gap-3 p-2.5 rounded-2xl border w-full text-left ${selected ? 'bg-accent/10 border-accent' : highlight ? 'bg-surface border-accent/40' : 'bg-surface/60 border-line'}`
  const body = (
    <>
      {selecting && (
        <span className={`w-6 h-6 rounded-md border-2 shrink-0 flex items-center justify-center ${selected ? 'bg-accent border-accent text-accent-ink' : 'border-mute/60'}`}>
          {selected && <Icon name="check" size={16} strokeWidth={3} />}
        </span>
      )}
      {rank !== undefined && !selecting && <span className={`w-7 text-center serif text-xl font-semibold ${highlight ? 'text-accent' : 'text-mute'}`}>{rank}</span>}
      <Poster item={item} className="w-12 h-[72px] rounded-xl shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="serif font-semibold leading-tight line-clamp-2">{item.title}</div>
        <div className="text-xs text-mute mt-0.5 truncate">{item.year} · {item.creator}</div>
        {note && <div className="text-xs text-accent/90 mt-0.5 truncate">{note}</div>}
      </div>
    </>
  )
  if (selecting)
    return <button type="button" role="checkbox" aria-checked={!!selected} onClick={onToggle} className={cls}>{body}</button>
  return <Link to={`/i/${encodeURIComponent(item.id)}`} className={cls}>{body}</Link>
}
