import type { Item } from '../types'

/**
 * Versión local de una obra para un idioma. Título y carátula van siempre juntos: si falta uno, no hay versión local
 * y se enseña la original (`item.title` + `item.posterUrl`). Función pura: el idioma llega por parámetro.
 */
export function localVersion(item: Pick<Item, 'local'>, lang: string | undefined): { title: string; poster: string } | null {
  if (!lang) return null
  const v = item.local?.[lang]
  return v?.title && v.poster ? { title: v.title, poster: v.poster } : null
}

/** Título que se enseña: el de la versión local del idioma, o el original de España. */
export function displayTitle(item: Pick<Item, 'title' | 'local'>, lang: string | undefined): string {
  return localVersion(item, lang)?.title ?? item.title
}

/** Carátula que se enseña: la de la versión local del idioma, o la original. */
export function displayPoster(item: Pick<Item, 'posterUrl' | 'local'>, lang: string | undefined): string | null {
  return localVersion(item, lang)?.poster ?? item.posterUrl
}

/** Todos los títulos por los que se puede encontrar una obra (para buscadores). Nunca quita ninguno. */
export function searchTitles(item: Pick<Item, 'title' | 'originalTitle' | 'local'>): string[] {
  const titles = [item.title, item.originalTitle]
  for (const v of Object.values(item.local ?? {})) if (v?.title) titles.push(v.title)
  return titles.filter((t): t is string => Boolean(t))
}
