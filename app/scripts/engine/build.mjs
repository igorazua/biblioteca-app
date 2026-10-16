/**
 * Script de consolidación del catálogo (MOTOR.md §4.5).
 * Fusiona los metadatos descargados en scripts/cache/sources/ dentro de seed.json.
 *
 * Uso:
 *   node scripts/engine/build.mjs
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const CACHE_DIR = join(here, '..', 'cache', 'sources')

async function main() {
  if (!existsSync(SEED_FILE)) {
    console.error('No se encontró seed.json en:', SEED_FILE)
    process.exit(1)
  }

  console.log('--- Consolidando metadatos de fuentes en seed.json (build.mjs) ---')

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const items = seed.items || []

  let enrichedCount = 0

  for (const item of items) {
    const slug = item.id.replace(/^[^:]+:/, '')
    const cacheFile = join(CACHE_DIR, item.type, `${slug}.json`)

    if (existsSync(cacheFile)) {
      try {
        const raw = JSON.parse(readFileSync(cacheFile, 'utf8'))
        if (raw && !raw.error) {
          if (raw.wikidataId) item.wikidataId = raw.wikidataId
          if (raw.tmdbId) item.tmdbId = raw.tmdbId
          if (raw.olid) item.olid = raw.olid
          if (raw.mbid) item.mbid = raw.mbid
          if (raw.readers) item.readers = raw.readers
          if (raw.voteAvg != null) item.voteAvg = raw.voteAvg
          if (raw.voteCount != null) item.voteCount = raw.voteCount
          if (raw.wikiLangs != null) item.wikiLangs = raw.wikiLangs
          if (raw.originCountry?.length) item.originCountry = raw.originCountry
          if (raw.originalLanguage) item.originalLanguage = raw.originalLanguage
          if (raw.collection) item.collection = raw.collection
          if (raw.ongoing != null) item.ongoing = raw.ongoing
          if (raw.keywords?.length) item.keywords = raw.keywords
          else if (raw.subjects?.length) item.keywords = raw.subjects
          else if (raw.tags?.length) item.keywords = raw.tags

          enrichedCount++
        }
      } catch (err) {
        console.warn(`Error leyendo caché de ${item.id}:`, err.message)
      }
    }
  }

  writeFileSync(SEED_FILE, JSON.stringify(seed))
  console.log(`✓ seed.json actualizado: ${enrichedCount}/${items.length} obras enriquecidas con metadatos oficiales.`)
}

main().catch((err) => {
  console.error('Error fatal en build.mjs:', err)
  process.exit(1)
})
