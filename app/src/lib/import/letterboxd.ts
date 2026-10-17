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

export function parseLetterboxd(
  input: string | Uint8Array | LetterboxdSources,
  defaultStatus: 'seen' | 'pending' = 'seen'
): ImportRow[] {
  let sources: LetterboxdSources = {}

  if (input instanceof Uint8Array) {
    const unzipped = unzipSync(input)
    const decoder = new TextDecoder()
    for (const [path, data] of Object.entries(unzipped)) {
      const lower = path.toLowerCase()
      if (lower.endsWith('ratings.csv')) sources.ratingsCsv = decoder.decode(data)
      else if (lower.endsWith('watched.csv')) sources.watchedCsv = decoder.decode(data)
      else if (lower.endsWith('watchlist.csv')) sources.watchlistCsv = decoder.decode(data)
    }
  } else if (typeof input === 'string') {
    // Si es un CSV directo, verificar columnas para determinar tipo
    if (input.includes('Rating') || input.includes('rating')) {
      sources.ratingsCsv = input
    } else if (defaultStatus === 'pending') {
      sources.watchlistCsv = input
    } else {
      sources.watchedCsv = input
    }
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
