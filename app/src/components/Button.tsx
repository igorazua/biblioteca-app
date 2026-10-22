import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'text'
  children: ReactNode
  icon?: ReactNode
  iconRight?: ReactNode
  loading?: boolean
}

export function Button({
  variant = 'primary',
  children,
  icon,
  iconRight,
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const base =
    'relative inline-flex items-center justify-center font-medium transition-colors select-none text-body outline-none cursor-pointer'

  const variants = {
    primary:
      'h-12 px-6 rounded-2xl bg-accent text-accent-ink hover:brightness-105 active:brightness-95 disabled:opacity-40 disabled:pointer-events-none',
    secondary:
      'h-12 px-5 rounded-2xl bg-surface2 border border-line text-ink hover:bg-surface2/80 active:bg-surface2/60 disabled:opacity-40 disabled:pointer-events-none',
    text:
      'h-auto px-1 py-1 text-ink hover:underline active:opacity-75 disabled:opacity-40 disabled:pointer-events-none',
  }

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon && <span className="mr-2 inline-flex items-center">{icon}</span>}
          <span>{children}</span>
          {iconRight && <span className="ml-2 inline-flex items-center">{iconRight}</span>}
        </>
      )}
    </button>
  )
}
