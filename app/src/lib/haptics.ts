/**
 * Vibración breve como respuesta táctil (Android/Chrome; en iOS Safari `navigator.vibrate` no existe y no hace nada).
 * - tap: toque normal (elegir, cambiar de estado)
 * - tick: cruzar un umbral mientras arrastras (la tarjeta «ya cuenta» si sueltas)
 * - success: algo confirmado (swipe hecho, duelo elegido, valoración guardada)
 */
const PATTERNS = {
  tap: 10,
  tick: 6,
  success: [12, 40, 16],
} satisfies Record<string, number | number[]>

export type HapticKind = keyof typeof PATTERNS

export function haptic(kind: HapticKind = 'tap') {
  try {
    navigator.vibrate?.(PATTERNS[kind])
  } catch {
    // algunos navegadores lanzan si la página no ha tenido interacción todavía
  }
}
