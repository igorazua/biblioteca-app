import type { ReactNode } from 'react'
import type { ShelfType } from '../types'
import { DuelFan, duelTexts, type DuelKind } from './DuelVariants'
import { posterShape } from '../lib/posterShape'

export interface Side {
  key: string
  title: string
  subtitle?: string
  /** fondo a sangre del lado (póster, collage…) */
  bg: ReactNode
  /** estantería de la obra si se conoce */
  type?: ShelfType
}

export const DUEL_LEFT = '#F5B544' // ámbar del acento
export const DUEL_RIGHT = '#9A86FF' // violeta contrastado

type Choose = (w: 'a' | 'b') => void

/**
 * Duelo con diseño 3 (abanico, T19 §4.1). Se usa en Comparar, colocar y Decidir.
 */
export function SwipePair(props: {
  left: Side
  right: Side
  onChoose: Choose
  kind?: DuelKind
  /** hueco entre las cartas y la pista (p. ej. «No conozco ninguna») */
  extra?: ReactNode
  square?: boolean
}) {
  const { kind = 'rank', extra, square, ...rest } = props
  const texts = duelTexts(kind, 'A')
  const isSquare = square ?? (posterShape(rest.left.type) === 'square' && posterShape(rest.right.type) === 'square')

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <DuelFan {...rest} texts={texts} fast={kind === 'rank'} square={isSquare} />
      {extra}
      <p className="text-center text-meta text-mute py-1.5 pointer-events-none select-none shrink-0">
        {/* con ratón no se desliza: se hace clic en la carta */}
        <span className="[@media(hover:hover)_and_(pointer:fine)]:hidden">← Desliza hacia la que prefieras →</span>
        <span className="hidden [@media(hover:hover)_and_(pointer:fine)]:inline">Haz clic en la que prefieras</span>
      </p>
    </div>
  )
}
