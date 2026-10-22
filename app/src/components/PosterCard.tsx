import type { Item } from '../types'
import { SHELF_LABEL } from '../types'

export interface PosterCardProps {
  item: Item
  subtitle?: string
  badge?: string
  onClick?: () => void
  className?: string
  showType?: boolean
}

export function PosterCard({
  item,
  subtitle,
  badge,
  onClick,
  className = '',
  showType = false,
}: PosterCardProps) {
  const shelfLabel = SHELF_LABEL[item.type]?.singular || item.type
  const metaText = subtitle || [item.year, item.creator].filter(Boolean).join(' · ')

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer select-none ${className}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Póster 2:3, rounded-[10px], sin borde ni sombra */}
      <div className="relative aspect-[2/3] w-full rounded-[10px] overflow-hidden bg-surface">
        {item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-3 text-center bg-surface2 text-mute text-meta">
            {item.title}
          </div>
        )}

        {/* Badge opcional discreto */}
        {badge && (
          <div className="absolute top-2 right-2 bg-bg/85 px-2 py-0.5 rounded-md text-[11px] font-medium text-ink tabular-nums">
            {badge}
          </div>
        )}
      </div>

      {/* Título debajo (text-item) y metadatos (text-meta) a 8px */}
      <div className="mt-2">
        {showType && (
          <div className="text-label text-mute mb-0.5">
            {shelfLabel}
          </div>
        )}
        <h3 className="text-item text-ink line-clamp-2" lang="es">
          {item.title}
        </h3>
        {metaText && (
          <p className="text-meta line-clamp-1 mt-0.5">
            {metaText}
          </p>
        )}
      </div>
    </div>
  )
}
