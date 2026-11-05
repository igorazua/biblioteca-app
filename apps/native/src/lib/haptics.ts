import * as Haptics from 'expo-haptics'

/**
 * Vibración (D22). Ligera al confirmar un swipe (`tap`), de selección al elegir en un duelo o al cruzar el umbral del
 * mazo (`tick`), de éxito al terminar una sesión (`success`). Con reducir movimiento sigue vibrando.
 * Se llama desde worklets con `scheduleOnRN(haptic, 'tap')`.
 */
export type HapticKind = 'tap' | 'tick' | 'success'

export function haptic(kind: HapticKind = 'tap'): void {
  try {
    if (kind === 'tap') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    else if (kind === 'tick') void Haptics.selectionAsync()
    else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  } catch {
    // sin motor háptico: no pasa nada
  }
}
