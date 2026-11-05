import type { Item } from '@biblioteca/core'
import { displayPoster, displayTitle } from '@biblioteca/core/src/lib/locale'
import { boardgameDeckLayout, posterShape } from '@biblioteca/core/src/lib/posterShape'
import { userLang } from '@biblioteca/core/src/lib/userLang'

/** Título y portada en el idioma del usuario (hoy 'es'). */
export const titleOf = (it: Item): string => displayTitle(it, userLang())
export const posterOf = (it: Item): string | null => displayPoster(it, userLang())

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b)

/** Proporción ancho/alto del hueco de la portada: `posterBox` de la PWA (boardgame con posterRatio acotado a 0.5-2, música 1, resto 2:3). */
export function posterAspect(it: Pick<Item, 'type' | 'posterRatio'>): number {
  if (it.type === 'boardgame' && it.posterRatio != null) return clamp(it.posterRatio, 0.5, 2)
  return posterShape(it.type) === 'square' ? 1 : 2 / 3
}

export { boardgameDeckLayout, posterShape }
