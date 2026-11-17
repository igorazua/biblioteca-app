import { useEffect, useRef } from 'react'

/** Mapa de atajos: tecla (`e.key` en minúsculas: 'arrowleft', 'z', 'escape'…) → acción. */
export type ShortcutMap = Record<string, () => void>

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  if (!el || !el.tagName) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

/** Hay una hoja o diálogo abierto (`Sheet` es `role="dialog" aria-modal`). */
const dialogOpen = () => !!document.querySelector('[role="dialog"][aria-modal="true"]')

/**
 * Atajos de teclado a nivel de pantalla (DISENO_ESCRITORIO §1.4).
 * Se desactivan con `enabled = false`, con un campo de texto enfocado, con una hoja abierta,
 * con modificadores (Ctrl/Alt/Meta) y en repeticiones por tecla mantenida.
 * Si la tecla está en el mapa se evita su efecto por defecto (p. ej. el scroll de las flechas).
 */
export function useShortcuts(map: ShortcutMap, enabled = true) {
  const ref = useRef(map)
  ref.current = map

  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.defaultPrevented) return
      if (isTyping(e.target) || dialogOpen()) return
      const action = ref.current[e.key.toLowerCase()]
      if (!action) return
      e.preventDefault()
      action()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
