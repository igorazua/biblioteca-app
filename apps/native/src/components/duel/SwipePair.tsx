import type { ReactNode } from 'react'
import { View } from 'react-native'
import { posterShape } from '@biblioteca/core/src/lib/posterShape'
import { tx } from '../../theme'
import { AppText } from '../AppText'
import { DuelFan, type Side } from '../DuelFan'

export type { Side }

/**
 * Duelo con diseño 3 (abanico, T19 §4.1). Se usa en ¡Duelos!, colocar y Decidir (SwipePair.tsx). Tamaño `area` (D4).
 * `kind` solo cambia la espera tras elegir en la PWA: `rank` es el modo rápido.
 */
export function SwipePair({
  left,
  right,
  onChoose,
  onPick,
  kind = 'rank',
  extra,
  square,
}: {
  left: Side
  right: Side
  onChoose: (w: 'a' | 'b') => void
  /** al elegir, antes de la pausa de confirmación */
  onPick?: (w: 'a' | 'b') => void
  kind?: 'rank' | 'decide'
  /** hueco entre las cartas y la pista (p. ej. «Pasar») */
  extra?: ReactNode
  square?: boolean
}) {
  const isSquare = square ?? (posterShape(left.type) === 'square' && posterShape(right.type) === 'square')
  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <DuelFan left={left} right={right} onChoose={onChoose} onPick={onPick} fast={kind === 'rank'} square={isSquare} />
      {extra}
      <AppText pointerEvents="none" style={[tx('meta'), { textAlign: 'center', paddingVertical: 6 }]}>
        ← Desliza hacia la que prefieras →
      </AppText>
    </View>
  )
}
