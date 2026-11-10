import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { Chip } from './Chip'

// PlatformPicker de ui.tsx de la PWA. La PWA leía PLATFORMS de config: aquí la lista llega por props.
export interface PlatformPickerProps {
  /** Plataformas elegidas. */
  value: string[]
  onChange: (platforms: string[]) => void
  /** Todas las plataformas posibles (PLATFORMS en la PWA). */
  options: readonly string[]
  style?: StyleProp<ViewStyle>
}

export function PlatformPicker({ value, onChange, options, style }: PlatformPickerProps) {
  const allSelected = options.length > 0 && options.every((p) => value.includes(p))

  const toggleAll = () => onChange(allSelected ? [] : [...options])
  const toggle = (p: string) => onChange(value.includes(p) ? value.filter((x) => x !== p) : [...value, p])

  return (
    <View style={[styles.wrap, style]}>
      <Chip active={allSelected} onPress={toggleAll}>
        Todas
      </Chip>
      {options.map((p) => (
        <Chip key={p} active={value.includes(p)} onPress={() => toggle(p)}>
          {p}
        </Chip>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
})
