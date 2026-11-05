import { parseCsv } from './csv'
import type { ImportRow } from './types'

export function parseKindle(csvText: string): ImportRow[] {
  const rows = parseCsv(csvText)
  const map = new Map<string, ImportRow>()

  for (const r of rows) {
    const rawTitle = (
      r.Title ||
      r.title ||
      r['Item Name'] ||
      r['Product Name'] ||
      r['Book Title'] ||
      ''
    ).trim()

    if (!rawTitle) continue

    // Limpiar sufijos típicos de Amazon como "(Edición en español)", "(Spanish Edition)", "[Kindle Edition]"
    const cleanTitle = rawTitle
      .replace(/\s*[\(\[](?:Edición[^)\]]*|Edition[^)\]]*|Spanish Edition|Kindle Edition|Versión Kindle)[\)\]]/gi, '')
      .replace(/\s*:\s*(?:A Novel|Una novela)\b/gi, '')
      .trim()

    const author = (
      r.Author ||
      r.author ||
      r.Authors ||
      r.authors ||
      r.Creator ||
      r.creator ||
      ''
    ).trim()

    const dateStr =
      r['Purchase Date'] ||
      r['purchase date'] ||
      r['Order Date'] ||
      r['order date'] ||
      r.Date ||
      r.date

    let at: number | undefined
    if (dateStr) {
      const parsed = new Date(dateStr).getTime()
      if (!isNaN(parsed)) at = parsed
    }

    const key = cleanTitle.toLowerCase()
    const existing = map.get(key)
    if (!existing) {
      map.set(key, {
        type: 'book',
        title: cleanTitle,
        creator: author || undefined,
        status: 'seen',
        at,
      })
    } else if (at && (!existing.at || at > existing.at)) {
      existing.at = at
    }
  }

  return Array.from(map.values())
}
