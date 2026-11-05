import { starBand, insertAt } from '../ranking'
import type { ImportRow } from './types'
import type { ShelfType, UserEntry } from '../../types'

export interface ApplyImportResult {
  entries: Record<string, UserEntry>
  rankings: Record<ShelfType, string[]>
  createdCount: number
  updatedCount: number
  skippedCount: number
}

/**
 * Aplica una lista de filas casadas respetando la regla «no pisar»:
 * - No pisa una entrada que ya exista, SALVO que la existente no tenga estrellas y el import sí.
 * - Con estrellas -> ranked: true, provisional: true (colocada en el límite inferior de su franja).
 * - Sin estrellas -> ranked: false.
 * - Asigna origin: 'import:<source>'
 */
export function applyImportRows(
  existingEntries: Record<string, UserEntry>,
  existingRankings: Record<ShelfType, string[]>,
  matchedRows: { row: ImportRow; itemId: string }[],
  source: string
): ApplyImportResult {
  const newEntries = { ...existingEntries }
  const newRankings: Record<ShelfType, string[]> = {
    movie: [...(existingRankings.movie ?? [])],
    series: [...(existingRankings.series ?? [])],
    book: [...(existingRankings.book ?? [])],
    artist: [...(existingRankings.artist ?? [])],
    boardgame: [...(existingRankings.boardgame ?? [])],
    song: [...(existingRankings.song ?? [])],
  }

  let createdCount = 0
  let updatedCount = 0
  let skippedCount = 0

  const origin = `import:${source}`

  for (const { row, itemId } of matchedRows) {
    const existing = newEntries[itemId]
    const shelf = row.type

    if (existing) {
      // Regla «no pisar»: salvo que no tenga estrellas y el import sí
      if (!existing.stars && row.stars && existing.status === 'seen') {
        newEntries[itemId] = {
          ...existing,
          stars: row.stars,
          ranked: true,
          provisional: true,
          updatedAt: Date.now(),
        }

        // Colocar provisional en ranking
        const base = (newRankings[shelf] ?? []).filter((id) => id !== itemId)
        const [, hi] = starBand(base, (id) => newEntries[id]?.stars, row.stars)
        newRankings[shelf] = insertAt(base, itemId, hi)

        updatedCount++
      } else {
        skippedCount++
      }
    } else {
      // Entrada nueva
      const hasStars = Boolean(row.stars)
      const isSeen = row.status === 'seen'
      const ranked = Boolean(hasStars && isSeen)
      const provisional = Boolean(hasStars && isSeen)

      newEntries[itemId] = {
        itemId,
        shelf,
        status: row.status,
        stars: row.stars,
        ranked,
        provisional,
        origin,
        updatedAt: row.at ?? Date.now(),
      }

      if (ranked && row.stars) {
        const base = newRankings[shelf] ?? []
        const [, hi] = starBand(base, (id) => newEntries[id]?.stars, row.stars)
        newRankings[shelf] = insertAt(base, itemId, hi)
      }

      createdCount++
    }
  }

  return {
    entries: newEntries,
    rankings: newRankings,
    createdCount,
    updatedCount,
    skippedCount,
  }
}
