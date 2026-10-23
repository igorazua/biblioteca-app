import type { ReactNode } from 'react'
import { Icon } from './Icon'

export interface ScreenTitleProps {
  label?: string
  step?: { current: number; total: number }
  title?: string
  subtitle?: string
  action?: ReactNode
  /** botones alineados con el título grande, a su derecha (no con la flecha de volver) */
  titleAction?: ReactNode
  onBack?: () => void
  className?: string
}

export function ScreenTitle({
  label,
  step,
  title,
  subtitle,
  action,
  titleAction,
  onBack,
  className = '',
}: ScreenTitleProps) {
  return (
    <header className={`px-5 pt-[max(env(safe-area-inset-top),22px)] pb-6 ${className}`}>
      {/* Fila superior: etiqueta / volver + contador / acción */}
      <div className="flex items-center justify-between min-h-[24px] mb-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 -ml-1 text-ink active:opacity-60 transition-opacity"
              aria-label="Volver"
            >
              <Icon name="back" size={20} />
            </button>
          )}
          {label && <span className="text-label">{label}</span>}
        </div>
        <div className="flex items-center gap-3">
          {step && (
            <span className="text-meta tabular-nums">
              {step.current} de {step.total}
            </span>
          )}
          {action}
        </div>
      </div>

      {/* Barra de progreso de 2 px en acento si hay pasos */}
      {step && (
        <div className="w-full h-[2px] bg-line mb-4 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, (step.current / step.total) * 100))}%` }}
          />
        </div>
      )}

      {/* Título display principal (máx 2 líneas, alineado a la izquierda) */}
      {title && (titleAction ? (
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-display text-ink text-balance min-w-0">{title}</h1>
          <div className="shrink-0 flex items-center gap-2">{titleAction}</div>
        </div>
      ) : (
        <h1 className="text-display text-ink text-balance">{title}</h1>
      ))}

      {/* Subtítulo opcional */}
      {subtitle && <p className="text-meta mt-1.5 text-balance">{subtitle}</p>}
    </header>
  )
}
