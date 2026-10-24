/**
 * dedupe.mjs — Normalización y deduplicación de grabaciones musicales (T28 §28.3)
 *
 * Junta versiones de la misma canción (remaster, directo, recopilatorio, feat, etc.)
 * manteniendo versiones de distintos artistas separadas (covers como NIN vs Johnny Cash).
 */

/** Convierte a slug simple */
export function slugify(text) {
  if (!text) return ''
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’"”«»]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Limpia y normaliza el título de una canción para emparejar variantes */
export function normalizeTitle(title) {
  if (!title) return ''
  let t = title.toString().trim()

  // Quitar comillas externas
  t = t.replace(/^["'«](.*)["'»]$/, '$1')

  // Quitar anotaciones de feat. fuera de paréntesis
  t = t.replace(/\s+(?:feat\.|ft\.|con)\s+[^(\[-]+/i, '')

  // Quitar paréntesis y corchetes con información de versión, directo, remaster, feat, etc.
  const parenPattern = /[\(\[][^()\]]*(?:feat\.|ft\.|remaster|deluxe|anniversary|live|directo|mix|version|edit|mono|stereo|session|demo|take \d|acoustic|ac[uú]stico)[^()\]]*[\)\]]/gi
  t = t.replace(parenPattern, '')

  // Quitar coletillas separadas por guión al final: "- Remastered 2011", "- Live", "- Radio Edit", "- Remix", etc.
  const dashPattern = /\s*[-–—]\s*(?:remaster|remastered|live|en directo|directo|radio edit|single edit|single version|deluxe|version|edit|mono|stereo|anniversary|\d{4} remaster|acoustic|ac[uú]stico|original mix|remix|bonus track).*$/i
  t = t.replace(dashPattern, '')

  // Normalizar acentos y pasar a minúsculas
  t = t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’"”«».,;:!?¿¡_#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return t
}

/** Normaliza el nombre del artista para comparación */
export function normalizeArtist(artist) {
  if (!artist) return ''
  let a = artist.toString().trim()
  // Quitar artistas invitados secundarios para encontrar el artista principal si están combinados
  a = a.replace(/\s+(?:feat\.|ft\.|con)\s+.*$/i, '')
  return a
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^(?:the|el|la|los|las)\s+/, '')
    .replace(/['’"”«».,;:!?¿¡_#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Detecta si una grabación parece ser en directo, demo, remix o versión no de estudio */
export function isLiveOrAlternate(candidate) {
  const text = `${candidate.title || ''} ${candidate.disambiguation || ''} ${candidate.releaseName || ''}`.toLowerCase()
  return (
    /\b(live|en directo|directo|demo|rehearsal|karaoke|instrumental|remix|club mix|extended mix|bootleg|tribute)\b/i.test(text)
  )
}

/**
 * Deduplica un conjunto de grabaciones agrupándolas por artista y obra/isrc/título normalizado.
 * Devuelve un array de grupos: cada grupo es una lista de grabaciones fusionadas.
 */
export function deduplicateRecordings(recordings) {
  // Primero agrupamos por artista canónico. Artistas distintos NUNCA se fusionan (ej. Hurt NIN vs Johnny Cash).
  const byArtist = new Map()

  for (const rec of recordings) {
    const artistKey = rec.artistId || rec.artistMbid || normalizeArtist(rec.artist)
    if (!byArtist.has(artistKey)) {
      byArtist.set(artistKey, [])
    }
    byArtist.get(artistKey).push(rec)
  }

  const allGroups = []

  for (const [, artistRecs] of byArtist) {
    // Dentro del artista, agrupamos con prioridad:
    // 1. workId (MusicBrainz Work ID)
    // 2. isrc
    // 3. normalizedTitle
    const groups = [] // array de { workIds: Set, isrcs: Set, normTitles: Set, recordings: [] }

    for (const rec of artistRecs) {
      const normTitle = normalizeTitle(rec.title)
      const workId = rec.workId || rec.workMbid
      const isrc = rec.isrc

      // Buscar si encaja en un grupo existente
      let matchedGroup = null

      for (const g of groups) {
        if (workId && g.workIds.has(workId)) {
          matchedGroup = g
          break
        }
        if (isrc && g.isrcs.has(isrc)) {
          matchedGroup = g
          break
        }
        if (normTitle && g.normTitles.has(normTitle)) {
          matchedGroup = g
          break
        }
      }

      if (matchedGroup) {
        matchedGroup.recordings.push(rec)
        if (workId) matchedGroup.workIds.add(workId)
        if (isrc) matchedGroup.isrcs.add(isrc)
        if (normTitle) matchedGroup.normTitles.add(normTitle)
      } else {
        const newGroup = {
          workIds: new Set(workId ? [workId] : []),
          isrcs: new Set(isrc ? [isrc] : []),
          normTitles: new Set(normTitle ? [normTitle] : []),
          recordings: [rec],
        }
        groups.push(newGroup)
      }
    }

    for (const g of groups) {
      allGroups.push(g.recordings)
    }
  }

  return allGroups
}

/**
 * Elige la grabación canónica de un grupo (priorizando estudio original, año más antiguo, carátula)
 * y genera el objeto Song final.
 */
export function pickCanonicalSong(group) {
  if (!group || group.length === 0) return null

  // Ordenar candidatos:
  // 1. Estudio antes que live/demo/remix
  // 2. Año más antiguo (>= 1900)
  // 3. Con carátula disponible antes que sin carátula
  // 4. Mayor popularidad / escuchas
  const sorted = [...group].sort((a, b) => {
    const aAlt = isLiveOrAlternate(a) ? 1 : 0
    const bAlt = isLiveOrAlternate(b) ? 1 : 0
    if (aAlt !== bAlt) return aAlt - bAlt

    const aYear = a.year || (a.firstReleaseDate ? parseInt(a.firstReleaseDate.slice(0, 4), 10) : 9999)
    const bYear = b.year || (b.firstReleaseDate ? parseInt(b.firstReleaseDate.slice(0, 4), 10) : 9999)
    if (aYear !== bYear && aYear >= 1900 && bYear >= 1900) return aYear - bYear

    const aHasCover = Boolean(a.posterUrl || a.caaReleaseMbid || a.caaId) ? 1 : 0
    const bHasCover = Boolean(b.posterUrl || b.caaReleaseMbid || b.caaId) ? 1 : 0
    if (aHasCover !== bHasCover) return bHasCover - aHasCover

    const aPop = a.popularity || a.totalListenCount || 0
    const bPop = b.popularity || b.totalListenCount || 0
    return bPop - aPop
  })

  const canonical = sorted[0]

  // Encontrar el año más antiguo fiable de todo el grupo
  let earliestYear = 9999
  for (const item of group) {
    const y = item.year || (item.firstReleaseDate ? parseInt(item.firstReleaseDate.slice(0, 4), 10) : null)
    if (y && y >= 1900 && y < earliestYear) {
      earliestYear = y
    }
  }
  if (earliestYear === 9999) {
    earliestYear = canonical.year || new Date().getFullYear()
  }

  // Título limpio para mostrar
  let displayTitle = canonical.title
  // Quitar sufijos obvios de remaster si quedaron en el canónico
  displayTitle = displayTitle
    .replace(/\s*[-–—]\s*(?:remaster|remastered|\d{4} remaster).*$/i, '')
    .replace(/\s*\((?:remaster|remastered|\d{4} remaster)\)$/i, '')
    .trim()

  const artistName = canonical.artist || canonical.creator || 'Desconocido'
  const titleSlug = slugify(displayTitle)
  const artistSlug = slugify(artistName)
  const songId = `song:${titleSlug}-${artistSlug}-${earliestYear}`

  // Carátula si existe en cualquiera del grupo
  const coverCandidate = group.find((g) => g.posterUrl || g.caaReleaseMbid || g.caaId) || canonical

  return {
    id: songId,
    type: 'song',
    title: displayTitle,
    creator: artistName,
    year: earliestYear,
    artistId: canonical.artistId || null,
    album: canonical.album || canonical.releaseName || null,
    isrc: canonical.isrc || group.find((g) => g.isrc)?.isrc || null,
    durationSec: canonical.durationSec || (canonical.length ? Math.round(canonical.length / 1000) : null),
    mbid: canonical.mbid || canonical.recordingMbid || null,
    popularity: canonical.popularity || canonical.totalListenCount || 0,
    posterUrl: coverCandidate.posterUrl || null,
    caaReleaseMbid: coverCandidate.caaReleaseMbid || null,
    caaId: coverCandidate.caaId || null,
    groupSize: group.length,
    src: {
      recording: canonical.mbid ? 'musicbrainz' : 'listenbrainz',
      popularity: 'listenbrainz',
      ...(coverCandidate.posterUrl ? { posterUrl: 'coverartarchive' } : {}),
    },
  }
}
