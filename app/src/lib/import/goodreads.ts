import { parseCsv } from './csv'
import type { ImportRow } from './types'
import type { Stars } from '../../types'

function cleanIsbn(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  // Viene a menudo como ="9780140328721" o "=""978..."""
  const digits = raw.replace(/[^0-9X]/gi, '')
  if (digits.length === 10 || digits.length === 13) return digits
  return undefined
}

export function parseGoodreads(csvText: string): ImportRow[] {
  const rows = parseCsv(csvText)
  const results: ImportRow[] = []

  for (const r of rows) {
    const title = r.Title || r.title
    if (!title) continue

    const author = r.Author || r.author || r['Author l-f'] || undefined
    const rawIsbn13 = r.ISBN13 || r.isbn13 || r.ISBN || r.isbn
    const isbn13 = cleanIsbn(rawIsbn13)

    const shelf = (r['Exclusive Shelf'] || r['exclusive shelf'] || r.Bookshelves || '').toLowerCase()
    let status: 'seen' | 'pending' = 'seen'
    if (shelf === 'to-read' || shelf === 'currently-reading' || shelf.includes('wishlist')) {
      status = 'pending'
    } else if (shelf === 'read') {
      status = 'seen'
    }

    const ratingNum = parseInt(r['My Rating'] || r['my rating'] || '0', 10)
    const stars: Stars | undefined = ratingNum >= 1 && ratingNum <= 5 ? (ratingNum as Stars) : undefined

    const yearStr = r['Year Published'] || r['Original Publication Year'] || ''
    const year = parseInt(yearStr, 10) || undefined

    const dateStr = r['Date Read'] || r['date read'] || r['Date Added'] || r['date added']
    const at = dateStr ? new Date(dateStr).getTime() : undefined

    results.push({
      type: 'book',
      title,
      creator: author,
      year,
      isbn13,
      status,
      stars,
      at: isNaN(at as number) ? undefined : at,
    })
  }

  return results
}
