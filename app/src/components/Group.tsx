// app/src/components/Group.tsx
// Listas agrupadas al estilo de los ajustes de iOS/Android: un título pequeño, una tarjeta y filas separadas por líneas.
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icon'

type IconName = Parameters<typeof Icon>[0]['name']

export function Group({ title, footer, children }: { title?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title}>
      {title && <h2 className="label-caps text-mute px-1 mb-2">{title}</h2>}
      <div className="rounded-3xl bg-surface border border-line divide-y divide-line/60 overflow-hidden">{children}</div>
      {footer && <p className="text-[11px] text-mute leading-relaxed px-1 mt-2">{footer}</p>}
    </section>
  )
}

/** Fila de una lista: icono, título y subtítulo, y a la derecha un control, un valor o un chevrón si navega. */
export function Row({
  icon,
  title,
  sub,
  right,
  to,
  onClick,
  danger,
  tint,
}: {
  icon?: IconName
  /** color del cuadradito del icono (Ajustes) */
  tint?: string
  title: ReactNode
  sub?: ReactNode
  right?: ReactNode
  to?: string
  onClick?: () => void
  danger?: boolean
}) {
  const body = (
    <>
      {icon && (
        <span
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-stamp-red/15 text-stamp-red' : tint ? '' : 'bg-surface2 text-ink/80'}`}
          style={tint && !danger ? { background: tint, color: '#fff' } : undefined}
        >
          <Icon name={icon} size={18} />
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold ${danger ? 'text-stamp-red' : ''}`}>{title}</div>
        {sub && <div className="text-xs text-mute mt-0.5 leading-snug">{sub}</div>}
      </div>
      {right}
      {(to || onClick) && !right && <Icon name="chevron" size={16} className="text-mute shrink-0" />}
    </>
  )
  const cls = 'w-full min-h-[56px] px-4 py-3 flex items-center gap-3 text-left'
  if (to) return <Link to={to} className={`${cls} active:bg-surface2 transition-colors`}>{body}</Link>
  if (onClick) return <button onClick={onClick} className={`${cls} active:bg-surface2 transition-colors`}>{body}</button>
  return <div className={cls}>{body}</div>
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`w-14 h-8 rounded-full p-1 transition-colors shrink-0 ${on ? 'bg-accent' : 'bg-line'}`}
    >
      <span className={`block w-6 h-6 rounded-full bg-white transition-transform ${on ? 'translate-x-6' : ''}`} />
    </button>
  )
}
