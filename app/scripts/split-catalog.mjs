import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const SHELVES_DIR = join(ROOT, 'src', 'data', 'shelves')
const INDEX_FILE = join(ROOT, 'src', 'data', 'catalog-index.json')

const SEED_DROP = new Set([
  'src',
  'conf',
  'measured',
  'computed',
  'localized',
  'titles',
  'wikiLangs',
  'imageCredit',
  'imageSrc',
  'pageviews',
  'fameLlm',
])

const COVER_BASE = 'https://pvewnpemlwmvaduzhjso.supabase.co/storage/v1/object/public/biblio-covers'

// Versiones locales para el índice: la carátula, relativa a COVER_BASE como las demás (catalog.ts la restaura).
function localForIndex(local) {
  if (!local) return 0
  const out = {}
  for (const [lang, v] of Object.entries(local)) {
    if (!v) continue
    const o = { ...v }
    if (o.poster && o.poster.startsWith(COVER_BASE + '/')) o.poster = o.poster.slice(COVER_BASE.length + 1)
    out[lang] = o
  }
  return Object.keys(out).length ? out : 0
}

export function splitCatalog() {
  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const items = seed.items || []
  const friends = seed.friends || []

  mkdirSync(SHELVES_DIR, { recursive: true })

  const SHELVES = ['movie', 'series', 'book', 'boardgame', 'artist']

  // 1. Generate per-shelf files with SEED_DROP removed
  for (const shelf of SHELVES) {
    const shelfItems = items
      .filter((it) => it.type === shelf)
      .map((it) => {
        const out = { ...it }
        for (const k of SEED_DROP) delete out[k]
        return out
      })

    const shelfPath = join(SHELVES_DIR, `${shelf}.json`)
    writeFileSync(shelfPath, JSON.stringify(shelfItems))
    console.log(`Wrote ${shelfPath} (${shelfItems.length} items)`)
  }

  // 2. Generate compact base index
  const baseItems = items.map((it) => {
    const [shelf, slug] = it.id.split(':')
    const std = `${COVER_BASE}/${shelf}/${slug}.webp?v=2`
    let p = ''
    if (it.posterUrl === null) p = null
    else if (it.posterUrl === std) p = ''
    else if (it.posterUrl && it.posterUrl.startsWith(COVER_BASE + '/')) p = it.posterUrl.slice(COVER_BASE.length + 1)
    else p = it.posterUrl || ''

    return [
      it.id,
      it.title,
      it.year,
      it.creator,
      it.popularity,
      p,
      it.posterRatio || 0,
      it.popPct || 0,
      it.notoriety || 0,
      it.fameTier || 0,
      it.isCanon ? 1 : 0,
      it.durationMin || 0,
      it.seasons || 0,
      it.pages || 0,
      it.players || '',
      it.depth || '',
      it.originalTitle || '',
      it.genres || [],
      it.cooperative === true ? 1 : it.cooperative === false ? -1 : 0,
      it.mechanics || [],
      it.weight || 0,
      it.minAge || 0,
      localForIndex(it.local),
    ]
  })

  const indexData = {
    items: baseItems,
    friends,
  }

  writeFileSync(INDEX_FILE, JSON.stringify(indexData))
  console.log(`Wrote ${INDEX_FILE} (${baseItems.length} items, ${friends.length} friends)`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  splitCatalog()
}
