/**
 * Script de consolidación del catálogo y cómputo de métricas base (MOTOR.md §2b, §4.5).
 *
 * 1. Fusiona metadatos descargados en scripts/cache/sources/
 * 2. Fusiona atributos registrados en scripts/cache/attrs/*.jsonl respetando orden de fuentes
 * 3. Calcula percentil relativo por estantería: popPct (0-100)
 * 4. Calcula notoriedad por mercado (notoriety.ES) y tendencias (trend.ES)
 * 5. Recorta los mapas al mercado activo (ES)
 *
 * Uso:
 *   node scripts/engine/build.mjs
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isMoreAuthoritative } from './attrs.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const SOURCES_DIR = join(here, '..', 'cache', 'sources')
const ATTRS_DIR = join(here, '..', 'cache', 'attrs')

async function main() {
  if (!existsSync(SEED_FILE)) {
    console.error('No se encontró seed.json en:', SEED_FILE)
    process.exit(1)
  }

  console.log('--- Consolidando metadatos y calculando métricas base (build.mjs) ---')

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const items = seed.items || []

  let sourcesCount = 0

  // 1. Fusionar fuentes duras desde cache/sources/
  for (const item of items) {
    item.src = item.src || {}
    item.conf = item.conf || {}

    const slug = item.id.replace(/^[^:]+:/, '')
    const cacheFile = join(SOURCES_DIR, item.type, `${slug}.json`)

    if (existsSync(cacheFile)) {
      try {
        const raw = JSON.parse(readFileSync(cacheFile, 'utf8'))
        if (raw && !raw.error) {
          if (raw.wikidataId) { item.wikidataId = raw.wikidataId; item.src.wikidataId = 'wikidata' }
          if (raw.tmdbId) { item.tmdbId = raw.tmdbId; item.src.tmdbId = 'tmdb' }
          if (raw.olid) { item.olid = raw.olid; item.src.olid = 'openlibrary' }
          if (raw.mbid) { item.mbid = raw.mbid; item.src.mbid = 'musicbrainz' }
          if (raw.bggId) { item.bggId = raw.bggId; item.src.bggId = 'bgg' }
          if (raw.readers) { item.readers = raw.readers; item.src.readers = 'openlibrary' }
          if (raw.voteAvg != null) { item.voteAvg = raw.voteAvg; item.src.voteAvg = raw.source || 'wikidata' }
          if (raw.voteCount != null) { item.voteCount = raw.voteCount; item.src.voteCount = raw.source || 'wikidata' }
          if (raw.wikiLangs != null) { item.wikiLangs = raw.wikiLangs; item.src.wikiLangs = 'wikidata' }
          if (raw.originCountry?.length) { item.originCountry = raw.originCountry; item.src.originCountry = raw.source || 'wikidata' }
          if (raw.originalLanguage) { item.originalLanguage = raw.originalLanguage; item.src.originalLanguage = raw.source || 'wikidata' }
          if (raw.collection) item.collection = raw.collection
          if (raw.basedOn) item.basedOn = raw.basedOn
          if (raw.awards?.length) item.awards = raw.awards
          if (raw.ongoing != null) item.ongoing = raw.ongoing
          if (raw.synopsis && raw.synopsis.length > (item.synopsis?.length || 0)) {
            item.synopsis = raw.synopsis
            item.src.synopsis = raw.source || 'wikipedia'
          }
          if (raw.keywords?.length) item.keywords = raw.keywords
          else if (raw.subjects?.length) item.keywords = raw.subjects
          else if (raw.tags?.length) item.keywords = raw.tags

          if (raw.posterUrl && !item.posterUrl?.includes('/biblio-covers/')) {
            if (raw.imageSrc === 'wikimedia' || raw.imageSrc === 'openlibrary') {
              item.posterUrl = raw.posterUrl
              item.imageSrc = raw.imageSrc
              item.imageCredit = raw.imageCredit
            }
          }

          sourcesCount++
        }
      } catch (err) {
        console.warn(`Error leyendo caché de ${item.id}:`, err.message)
      }
    }
  }

  // 2. Fusionar atributos de scripts/cache/attrs/*.jsonl respetando la jerarquía de fuentes
  const itemMap = new Map(items.map((i) => [i.id, i]))
  let attrsApplied = 0

  if (existsSync(ATTRS_DIR)) {
    const jsonlFiles = readdirSync(ATTRS_DIR).filter((f) => f.endsWith('.jsonl'))
    for (const f of jsonlFiles) {
      const attrName = f.replace('.jsonl', '')
      const lines = readFileSync(join(ATTRS_DIR, f), 'utf8').split('\n').filter(Boolean)

      for (const line of lines) {
        try {
          const entry = JSON.parse(line)
          const target = itemMap.get(entry.id)
          if (!target) continue

          const existingSrc = target.src?.[attrName]
          const newSrc = entry.src || 'manual'

          // Si ya existe un valor con fuente más autoritativa, no pisarlo
          if (existingSrc && !isMoreAuthoritative(newSrc, existingSrc)) {
            continue
          }

          target[attrName] = entry.value
          target.src[attrName] = newSrc
          if (entry.conf != null) target.conf[attrName] = entry.conf
          attrsApplied++
        } catch {}
      }
    }
  }

  // 3. Calcular percentil relativo por estantería: popPct (0-100)
  const byShelf = {}
  for (const it of items) {
    byShelf[it.type] = byShelf[it.type] || []
    byShelf[it.type].push(it)
  }

  for (const [shelf, shelfItems] of Object.entries(byShelf)) {
    const scored = shelfItems.map((it) => {
      const votes = it.voteCount || it.readers || 0
      const langs = it.wikiLangs || 0
      const pv = typeof it.pageviews === 'object' && it.pageviews !== null
        ? Object.values(it.pageviews).reduce((a, b) => a + b, 0)
        : (typeof it.pageviews === 'number' ? it.pageviews : 0)

      // Mezcla logarítmica de señales duras de notoriedad abierta
      const score =
        Math.log10(votes + 1) * 2.2 +
        Math.log10(langs + 1) * 3.5 +
        Math.log10(pv + 1) * 1.8 +
        (it.popularity || 50) * 0.04

      return { item: it, score }
    })

    scored.sort((a, b) => a.score - b.score)
    const n = scored.length

    for (let i = 0; i < n; i++) {
      const pct = n > 1 ? (i / (n - 1)) * 100 : 50
      scored[i].item.popPct = Math.round(pct * 10) / 10
      scored[i].item.src.popPct = 'computed'
    }
  }

  // 4. Calcular notoriedad de mercado (notoriety.ES) y tendencia (trend.ES)
  for (const it of items) {
    const vis = (it.popPct || 50) / 100
    const local = it.originCountry?.includes('ES')
      ? 1.0
      : it.originalLanguage === 'es'
      ? 0.6
      : 0.0

    const isCanon = Boolean(it.isCanon || it.awards?.length)
    const lista = isCanon ? 0.9 : 0.0
    const popFactor = (it.popularity || 50) / 100

    // notoriety[ES] = 0.45*vis + 0.25*local + 0.15*lista + 0.15*pop
    const rawNotoriety = 0.45 * vis + 0.25 * local + 0.15 * lista + 0.15 * popFactor
    const clampedNotoriety = Math.min(1.0, Math.max(0.05, Math.round(rawNotoriety * 100) / 100))

    // Recortado a número para el mercado activo (ES)
    it.notoriety = clampedNotoriety
    it.src.notoriety = 'computed'

    if (it.trend == null) {
      it.trend = 0.0
      it.src.trend = 'computed'
    }
  }

  writeFileSync(SEED_FILE, JSON.stringify(seed))
  console.log(`✓ Consolidación finalizada: ${sourcesCount} fuentes integradas, ${attrsApplied} atributos aplicados.`)
  console.log(`✓ popPct, notoriety y trend calculados para las ${items.length} obras.`)
}

main().catch((err) => {
  console.error('Error fatal en build.mjs:', err)
  process.exit(1)
})
