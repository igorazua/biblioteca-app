import { unzipSync } from 'fflate'
import { parseCsv } from './csv'
import type { ImportRow } from './types'
import type { Stars } from '../../types'

interface LetterboxdSources {
  watchedCsv?: string
  ratingsCsv?: string
  watchlistCsv?: string
}

function parseRating(r: string | undefined): Stars | undefined {
  if (!r) return undefined
  const val = parseFloat(r)
  if (isNaN(val) || val <= 0) return undefined
  // Redondeo de rating (0.5 a 5) a 1..5 estrellas
  const rounded = Math.min(5, Math.max(1, Math.round(val)))
  return rounded as Stars
}

function parseCsvHeader(csvText: string): string[] {
  const firstLine = (csvText.charCodeAt(0) === 0xfeff ? csvText.slice(1) : csvText).split(/\r?\n/, 1)[0]
  return firstLine.split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase())
}

/** Qué export de Letterboxd es un CSV suelto: por el nombre del archivo o, si no, por sus columnas. */
export function letterboxdKind(csvText: string, fileName = ''): keyof LetterboxdSources {
  const name = fileName.toLowerCase()
  if (name.includes('watchlist')) return 'watchlistCsv'
  if (name.includes('ratings') || name.includes('diary') || name.includes('reviews')) return 'ratingsCsv'
  if (name.includes('watched')) return 'watchedCsv'
  const header = parseCsvHeader(csvText)
  return header.includes('rating') ? 'ratingsCsv' : 'watchedCsv'
}

export function parseLetterboxd(input: string | Uint8Array | LetterboxdSources, fileName = ''): ImportRow[] {
  let sources: LetterboxdSources = {}

  if (input instanceof Uint8Array) {
    const unzipped = unzipSync(input)
    const decoder = new TextDecoder()
    for (const [path, data] of Object.entries(unzipped)) {
      // Solo los CSV de la raíz del export: las carpetas deleted/, orphaned/, likes/… traen otros «films.csv» o «ratings.csv»
      const parts = path.toLowerCase().split('/').filter(Boolean)
      if (parts.length > 2 || (parts.length === 2 && ['deleted', 'orphaned', 'likes', 'lists'].includes(parts[0]))) continue
      const base = parts[parts.length - 1]
      if (base === 'ratings.csv') sources.ratingsCsv = decoder.decode(data)
      else if (base === 'watched.csv') sources.watchedCsv = decoder.decode(data)
      else if (base === 'watchlist.csv') sources.watchlistCsv = decoder.decode(data)
    }
  } else if (typeof input === 'string') {
    sources[letterboxdKind(input, fileName)] = input
  } else {
    sources = input
  }

  const itemsMap = new Map<string, ImportRow>()

  // 1. Procesar ratings (vistas con estrellas)
  if (sources.ratingsCsv) {
    const rows = parseCsv(sources.ratingsCsv)
    for (const r of rows) {
      const name = r.Name || r.name || r.Title || r.title
      if (!name) continue
      const year = parseInt(r.Year || r.year || '', 10) || undefined
      const key = `${name.toLowerCase()}::${year ?? ''}`
      const stars = parseRating(r.Rating || r.rating)
      const at = r.Date || r.date ? new Date(r.Date || r.date).getTime() : undefined

      itemsMap.set(key, {
        type: 'movie',
        title: name,
        year,
        status: 'seen',
        stars,
        at: isNaN(at as number) ? undefined : at,
      })
    }
  }

  // 2. Procesar watched (vistas sin estrellas o complementando ratings)
  if (sources.watchedCsv) {
    const rows = parseCsv(sources.watchedCsv)
    for (const r of rows) {
      const name = r.Name || r.name || r.Title || r.title
      if (!name) continue
      const year = parseInt(r.Year || r.year || '', 10) || undefined
      const key = `${name.toLowerCase()}::${year ?? ''}`
      const existing = itemsMap.get(key)
      const at = r.Date || r.date ? new Date(r.Date || r.date).getTime() : undefined

      if (!existing) {
        itemsMap.set(key, {
          type: 'movie',
          title: name,
          year,
          status: 'seen',
          stars: undefined,
          at: isNaN(at as number) ? undefined : at,
        })
      } else if (!existing.at && at && !isNaN(at)) {
        existing.at = at
      }
    }
  }

  // 3. Procesar watchlist (pendientes)
  if (sources.watchlistCsv) {
    const rows = parseCsv(sources.watchlistCsv)
    for (const r of rows) {
      const name = r.Name || r.name || r.Title || r.title
      if (!name) continue
      const year = parseInt(r.Year || r.year || '', 10) || undefined
      const key = `${name.toLowerCase()}::${year ?? ''}`
      const existing = itemsMap.get(key)
      const at = r.Date || r.date ? new Date(r.Date || r.date).getTime() : undefined

      // Solo si no está ya como vista o valorada
      if (!existing) {
        itemsMap.set(key, {
          type: 'movie',
          title: name,
          year,
          status: 'pending',
          stars: undefined,
          at: isNaN(at as number) ? undefined : at,
        })
      }
    }
  }

  return Array.from(itemsMap.values())
}
