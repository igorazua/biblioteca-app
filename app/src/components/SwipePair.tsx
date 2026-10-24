import type { ReactNode } from 'react'
import { DuelFan, duelTexts, type DuelKind } from './DuelVariants'

export interface Side {
  key: string
  title: string
  subtitle?: string
  /** fondo a sangre del lado (póster, collage…) */
  bg: ReactNode
}

export const DUEL_LEFT = '#F5B544' // ámbar del acento
export const DUEL_RIGHT = '#9A86FF' // violeta contrastado

type Choose = (w: 'a' | 'b') => void

/**
 * Duelo con diseño 3 (abanico, T19 §4.1). Se usa en Comparar, colocar y Decidir.
 */
export function SwipePair(props: { left: Side; right: Side; onChoose: Choose; kind?: DuelKind; /** hueco entre las cartas y la pista (p. ej. «No conozco ninguna») */ extra?: ReactNode }) {
  const { kind = 'rank', extra, ...rest } = props
  const texts = duelTexts(kind, 'A')

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <DuelFan {...rest} texts={texts} fast={kind === 'rank'} />
      {extra}
      <p className="text-center text-meta text-mute py-1.5 pointer-events-none select-none shrink-0">
        {/* con ratón no se desliza: se hace clic en la carta */}
        <span className="[@media(hover:hover)_and_(pointer:fine)]:hidden">← Desliza hacia la que prefieras →</span>
        <span className="hidden [@media(hover:hover)_and_(pointer:fine)]:inline">Haz clic en la que prefieras</span>
      </p>
    </div>
  )
}
