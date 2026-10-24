/**
 * cleanTitle.ts — Limpieza y normalización de títulos de canciones para importación y visualización
 */

/** Quita sufijos de versión, remaster, directos, etc. */
export function cleanDisplayTitle(title: string): string {
  if (!title) return ''
  let t = title.toString().trim()
  t = t.replace(/^["'«](.*)["'»]$/, '$1')
  // Quitar paréntesis y corchetes con información de versión, directo, remaster, feat, edit, etc.
  const parenPattern = /[\(\[][^()\]]*(?:feat\.|ft\.|remaster|deluxe|anniversary|live|directo|mix|version|edit|mono|stereo|session|demo|take \d|acoustic|ac[uú]stico|original|full length|bonus track|instrumental)[^()\]]*[\)\]]/gi
  let cleaned = t.replace(parenPattern, '')
  // Quitar coletillas separadas por guión al final: "- Remastered 2011", "- Live", "- Radio Edit", etc.
  const dashPattern = /\s*[-–—]\s*(?:remaster|remastered|live|en directo|directo|radio edit|single edit|single version|album version|full length|deluxe|version|edit|mono|stereo|anniversary|\d{4} remaster|acoustic|ac[uú]stico|original mix|remix|bonus track).*$/i
  cleaned = cleaned.replace(dashPattern, '')
  // Quitar feat. residuales
  cleaned = cleaned.replace(/\s+(?:feat\.|ft\.|con)\s+.*$/i, '')
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  return cleaned.length > 0 ? cleaned : title.toString().trim()
}

/** Detecta si un título corresponde a versiones de DJ, transiciones o ediciones residuales de club */
export function isDjOrGarbageVersion(title: string): boolean {
  if (!title) return false
  const lower = title.toLowerCase()
  if (/\b(bpmlatino|transition|transitions|hype intro|dj edit|club edit|intro outro|mashup)\b/i.test(lower)) {
    return true
  }
  if (/[\(\[][^()\]]*(?:clean\s+extended|extended\s+dance|extended\s+mix|clean\s+version|\bclean\b|\bextended\b)[^()\]]*[\)\]]/i.test(lower)) {
    return true
  }
  if (/[-–—]\s*(?:clean extended|extended mix|extended version|dj edit)\s*$/i.test(lower)) {
    return true
  }
  return false
}
