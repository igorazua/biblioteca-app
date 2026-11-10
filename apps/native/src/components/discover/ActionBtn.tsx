import { Icon, type IconName } from '../Icon'
import { Press } from '../Press'
import { colors } from '../../theme'

/** Botón de gesto (ActionBtn de Discover.tsx:792 y el de deshacer, :580): redondo, fondo surface y borde line. `filled` es el de deshacer. */
export function ActionBtn({ size, color, icon, iconSize, stroke, onPress, disabled, filled, label }: { size: number; color: string; icon: IconName; iconSize: number; stroke: number; onPress: () => void; disabled?: boolean; filled?: boolean; label: string }) {
  const on = filled && !disabled
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      dim={disabled ? (filled ? 0.4 : 0.25) : 1}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: on ? colors.accent : colors.surface,
        borderWidth: filled ? 0 : 1,
        borderColor: colors.line,
      }}
    >
      <Icon name={icon} size={iconSize} strokeWidth={stroke} color={on ? colors.accentInk : filled ? colors.mute : color} />
    </Press>
  )
}
