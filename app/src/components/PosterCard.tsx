import type { Item } from '../types'
import { SHELF_LABEL } from '../types'
import { posterAspectClass, posterRadius, posterShape } from '../lib/posterShape'

export interface PosterCardProps {
  item: Item
  subtitle?: string
  badge?: string
  onClick?: () => void
  className?: string
  showType?: boolean
  /** Si true, mantiene el hueco vertical 2:3 para no descuadrar la rejilla mixta (T27 §27.3 regla 2) */
  mixed?: boolean
}

export function PosterCard({
  item,
  subtitle,
  badge,
  onClick,
  className = '',
  showType = false,
  mixed = false,
}: PosterCardProps) {
  const shelfLabel = SHELF_LABEL[item.type]?.singular || item.type
  const metaText = subtitle || [item.year, item.creator].filter(Boolean).join(' · ')
  const isSquareMixed = mixed && posterShape(item.type) === 'square'

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer select-none ${className}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {isSquareMixed ? (
        // Hueco vertical 2:3 fijo para no descuadrar la rejilla mixta (T27 §27.3 regla 2)
        <div className="relative aspect-[2/3] w-full rounded-[10px] overflow-hidden bg-surface flex flex-col" style={{ borderRadius: posterRadius(item.type, 10) }}>
          <div className="w-full aspect-square overflow-hidden shrink-0">
            {item.posterUrl ? (
              <img
                src={item.posterUrl}
                alt={item.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-2 text-center bg-surface2 text-mute text-meta">
                {item.title}
              </div>
            )}
          </div>
          <div className="flex-1 p-2 flex flex-col justify-center min-w-0 bg-surface">
            {showType && <div className="text-[10px] text-mute uppercase tracking-wide truncate">{shelfLabel}</div>}
            <div className="serif text-xs font-semibold text-ink line-clamp-2 leading-tight">{item.title}</div>
            <div className="text-[11px] text-mute truncate mt-0.5">{item.creator}</div>
          </div>
          {badge && (
            <div className="absolute top-2 right-2 bg-bg/85 px-2 py-0.5 rounded-md text-[11px] font-medium text-ink tabular-nums">
              {badge}
            </div>
          )}
        </div>
      ) : (
        <div className={`relative ${posterAspectClass(item.type)} w-full rounded-[10px] overflow-hidden bg-surface`} style={{ borderRadius: posterRadius(item.type, 10) }}>
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
      )}

      {/* Título debajo (text-item) y metadatos (text-meta) a 8px si no va dentro del hueco 2:3 */}
      {!isSquareMixed && (
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
      )}
    </div>
  )
}
