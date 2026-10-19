/**
 * Script de carga inicial de la semilla a biblio_catalog (SISTEMA_BETA.md §F-B1)
 *
 * Sube las 4.276 obras de seed.json con source='seed' y enriched_at=now() si están en data/engine/<shelf>.json.
 * Completa identificadores faltantes consultando la caché o fuentes, y lista en scripts/cache/catalog-sin-id.json las que queden sin id.
 * Idempotente: upsert por id.
 *
 * Uso:
 *   node --env-file-if-exists=.env.local scripts/catalog-upload.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const ENGINE_DIR = join(ROOT, 'src', 'data', 'engine')
const CACHE_DIR = join(here, 'cache')
const SIN_ID_FILE = join(CACHE_DIR, 'catalog-sin-id.json')
const SOURCES_CACHE = join(here, 'cache', 'sources')

if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true })
}

const seed = JSON.parse(readFileSync(SEED_FILE, 'utf-8'))
const items = seed.items || []

// 1. Cargar sets de obras enriquecidas por estantería
const enrichedIds = new Set()
const shelves = ['movie', 'series', 'book', 'boardgame', 'artist']
for (const shelf of shelves) {
  const shelfFile = join(ENGINE_DIR, `${shelf}.json`)
  if (existsSync(shelfFile)) {
    try {
      const data = JSON.parse(readFileSync(shelfFile, 'utf-8'))
      const list = Array.isArray(data) ? data : data.items || Object.keys(data.items || {})
      for (const entry of list) {
        const id = typeof entry === 'string' ? entry : entry.id
        if (id) enrichedIds.add(id)
      }
    } catch {
      // ignore
    }
  }
}

// 2. Intentar completar IDs que faltan a partir de sources cache
let completedFromSources = 0
for (const item of items) {
  if (item.type === 'movie' || item.type === 'series') {
    if (!item.tmdbId) {
      // Buscar en scripts/cache/sources/movie o series
      const slug = item.id.replace(`${item.type}:`, '')
      const sourcePath = join(SOURCES_CACHE, item.type, `${slug}.json`)
      if (existsSync(sourcePath)) {
        try {
          const s = JSON.parse(readFileSync(sourcePath, 'utf-8'))
          if (s.tmdbId) {
            item.tmdbId = s.tmdbId
            completedFromSources++
          }
          if (s.imdbId && !item.imdbId) {
            item.imdbId = s.imdbId
          }
          if (s.wikidataId && !item.wikidataId) {
            item.wikidataId = s.wikidataId
          }
        } catch {
          // ignore
        }
      }
    }
  }
}

console.log(`Completados ${completedFromSources} IDs desde la caché de fuentes.`)

// 3. Revisar obras que siguen sin identificador externo
const sinId = []
for (const item of items) {
  const hasExtId =
    (item.type === 'movie' && (item.tmdbId || item.imdbId)) ||
    (item.type === 'series' && (item.tmdbId || item.imdbId)) ||
    (item.type === 'book' && (item.olid || item.wikidataId)) ||
    (item.type === 'artist' && (item.mbid || item.wikidataId)) ||
    (item.type === 'boardgame' && item.wikidataId)

  if (!hasExtId) {
    sinId.push({
      id: item.id,
      type: item.type,
      title: item.title,
      year: item.year,
      creator: item.creator,
    })
  }
}

writeFileSync(SIN_ID_FILE, JSON.stringify(sinId, null, 2))
console.log(`Obras sin id externo registradas en ${SIN_ID_FILE}: ${sinId.length}`)

// 4. Preparar filas para biblio_catalog
const nowIso = new Date().toISOString()
// Gemelas (misma obra en español y en inglés): los índices únicos (type, wikidata_id) y (type, tmdb_id) solo admiten una.
// Se queda los ids la primera en el orden del seed (la del título en español), igual que la migración 0005.
const seenExt = new Set()
const rows = items.map((it) => {
  const isEnriched = enrichedIds.has(it.id)
  const extKey = it.wikidataId ? `${it.type}|${it.wikidataId}` : null
  const twin = extKey !== null && seenExt.has(extKey)
  if (extKey) seenExt.add(extKey)
  return {
    id: it.id,
    type: it.type,
    tmdb_id: twin ? null : it.tmdbId || null,
    imdb_id: twin ? null : it.imdbId || null,
    ol_work: it.olid || null,
    isbn13: null,
    mbid: it.mbid || null,
    wikidata_id: twin ? null : it.wikidataId || null,
    data: it,
    source: 'seed',
    enriched_at: isEnriched ? nowIso : null,
    updated_at: nowIso,
  }
})

console.log(`Filas preparadas para catálogo: ${rows.length}`)

// 5. Subida a Supabase si existe SUPABASE_SERVICE_ROLE_KEY
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.log('\n[AVISO] No se detectó SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  console.log('Para subir las filas a Supabase:')
  console.log('1. Añade SUPABASE_SERVICE_ROLE_KEY a app/.env.local')
  console.log('2. Ejecuta: npm run catalog:upload')
  process.exit(0)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

console.log('Subiendo filas a public.biblio_catalog en lotes de 100...')
const BATCH_SIZE = 100
let uploaded = 0

for (let i = 0; i < rows.length; i += BATCH_SIZE) {
  const batch = rows.slice(i, i + BATCH_SIZE)
  const { error } = await supabase.from('biblio_catalog').upsert(batch, { onConflict: 'id' })
  if (error) {
    console.error(`Error en lote ${i / BATCH_SIZE + 1}:`, error.message)
    process.exit(1)
  }
  uploaded += batch.length
  process.stdout.write(`\r  Subidas ${uploaded} / ${rows.length} obras...`)
}

console.log('\n¡Catálogo semilla subido con éxito a Supabase!')
