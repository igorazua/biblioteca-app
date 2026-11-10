import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { Icon } from '../Icon'
import { Press } from '../Press'
import { haptic } from '../../lib/haptics'

// StarRating de ui.tsx de la PWA: cinco estrellas. Tocar la misma baja a cero, como en la PWA.
const GOLD = '#F5B544'
const EMPTY = '#5b5b63'

export interface StarRatingProps {
  /** 0 a 5. Sin valor equivale a 0. */
  value?: number
  onChange?: (value: number) => void
  /** 40 por defecto (ui.tsx). */
  size?: number
  readOnly?: boolean
  style?: StyleProp<ViewStyle>
}

export function StarRating({ value = 0, onChange, size = 40, readOnly = false, style }: StarRatingProps) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Estrellas" style={[styles.row, style]}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = value >= n
        return (
          <Press
            key={n}
            disabled={readOnly}
            accessibilityRole="radio"
            accessibilityLabel={`${n} estrella${n > 1 ? 's' : ''}`}
            accessibilityState={{ checked: value === n, disabled: readOnly }}
            onPress={() => {
              haptic('tap')
              onChange?.(value === n ? 0 : n)
            }}
            hitSlop={readOnly ? undefined : 4}
            style={[styles.star, readOnly ? null : styles.touch]}
          >
            <Icon name="star" size={size} color={on ? GOLD : EMPTY} fill={on ? GOLD : 'none'} strokeWidth={1.6} />
          </Press>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  star: { padding: 4 },
  // Área de toque mínima de 44 pt, como en la PWA (minWidth/minHeight 44).
  touch: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
})
