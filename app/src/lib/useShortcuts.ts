import { useEffect, useRef, type RefObject } from 'react'

/** Mapa de atajos: tecla (`e.key` en minúsculas: 'arrowleft', 'z', 'escape'…) → acción. */
export type ShortcutMap = Record<string, () => void>

/** ¿El foco está en algo donde se escribe? Entonces las teclas de los atajos no se tocan. */
export const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  if (!el || !el.tagName) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

/** Hay un diálogo u hoja abierto que no contiene `within` (la pantalla dueña de los atajos, p. ej. un duelo dentro de su flujo). */
const dialogOpen = (within?: Element | null) =>
  Array.from(document.querySelectorAll('[role="dialog"]')).some((d) => !within || !d.contains(within))

/** Contador compartido de usos del teclado: la leyenda de teclas se oculta a los 10 (Descubrir y duelos, misma regla que D3). */
const KB_USES_KEY = 'biblio_kb_uses'
export const KB_LEGEND_UNTIL = 10
export const readKbUses = (): number => {
  try {
    return Number(localStorage.getItem(KB_USES_KEY)) || 0
  } catch {
    return 0
  }
}
export const kbLegendVisible = () => readKbUses() < KB_LEGEND_UNTIL
/** Suma un uso del teclado y devuelve el total. */
export function noteKbUse(): number {
  const n = readKbUses() + 1
  try {
    localStorage.setItem(KB_USES_KEY, String(n))
  } catch {
    /* ok */
  }
  return n
}

/**
 * Atajos de teclado a nivel de pantalla (DISENO_ESCRITORIO §1.4).
 * Se desactivan con `enabled = false`, con un campo de texto enfocado, con un diálogo u hoja abierto,
 * con modificadores (Ctrl/Alt/Meta) y en repeticiones por tecla mantenida.
 * Con `within`, un diálogo que contiene ese elemento no bloquea (el duelo vive dentro de su propio flujo).
 * Si la tecla está en el mapa se evita su efecto por defecto (p. ej. el scroll de las flechas).
 */
export function useShortcuts(map: ShortcutMap, enabled = true, within?: RefObject<Element | null>) {
  const ref = useRef(map)
  ref.current = map

  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.repeat || e.defaultPrevented) return
      if (isTyping(e.target) || isTyping(document.activeElement) || dialogOpen(within?.current)) return
      const action = ref.current[e.key.toLowerCase()]
      if (!action) return
      e.preventDefault()
      action()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, within])
}
