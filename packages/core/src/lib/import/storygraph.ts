import { parseCsv } from './csv'
import type { ImportRow } from './types'
import type { Stars } from '../../types'

/** Primera cabecera presente entre las posibles (StoryGraph ha cambiado nombres entre versiones). */
function pick(r: Record<string, string>, names: string[]): string {
  const keys = Object.keys(r)
  for (const n of names) {
    const k = keys.find((k) => k.trim().toLowerCase() === n.toLowerCase())
    if (k && r[k]) return r[k]
  }
  return ''
}

function cleanIsbn(raw: string): string | undefined {
  const d = raw.replace(/[^0-9X]/gi, '')
  return d.length === 13 || d.length === 10 ? d : undefined
}

/** CSV de exportación de The StoryGraph (Title, Authors, Read Status, Star Rating, Last Date Read…). */
export function parseStoryGraph(csvText: string): ImportRow[] {
  const out: ImportRow[] = []
  for (const r of parseCsv(csvText)) {
    const title = pick(r, ['Title', 'Book Title'])
    if (!title) continue
    const status = pick(r, ['Read Status', 'Status']).toLowerCase()
    // «did-not-finish» y «currently-reading»: ni visto ni pendiente
    if (status.includes('did-not-finish') || status.includes('did not finish') || status === 'dnf') continue
    if (status.includes('currently')) continue
    const pending = status.includes('to-read') || status.includes('to read') || status.includes('want')

    const rating = parseFloat(pick(r, ['Star Rating', 'Rating']).replace(',', '.'))
    const stars: Stars | undefined = !pending && rating >= 0.5 ? (Math.min(5, Math.max(1, Math.round(rating))) as Stars) : undefined

    const dateStr = pick(r, ['Last Date Read', 'Date Read', 'Dates Read', 'Date Added'])
    // «Dates Read» puede traer rangos «2023/01/02-2023/01/10»: se toma la última fecha
    const lastDate = dateStr.split(/,|-(?=\d{4}\/)/).map((s) => s.trim()).filter(Boolean).pop() ?? ''
    const at = lastDate ? Date.parse(lastDate.replace(/\//g, '-')) : NaN

    out.push({
      type: 'book',
      title,
      creator: pick(r, ['Authors', 'Author', 'Contributors']).split(',')[0]?.trim() || undefined,
      isbn13: cleanIsbn(pick(r, ['ISBN/UID', 'ISBN13', 'ISBN'])),
      status: pending ? 'pending' : 'seen',
      stars,
      at: Number.isNaN(at) ? undefined : at,
    })
  }
  return out
}
