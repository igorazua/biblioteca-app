/**
 * Script de purga por fuente de datos (ENRIQUECIMIENTO.md §2.3).
 *
 * Borra campos, metadatos y aristas asociados a una fuente concreta si sus
 * condiciones de licencia cambian o no sirven para uso comercial.
 *
 * Uso:
 *   node scripts/engine/purge-source.mjs <fuente>
 *
 * Ejemplo:
 *   node scripts/engine/purge-source.mjs tmdb
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const EDGES_FILE = join(here, '..', 'cache', 'graph', 'edges.jsonl')

const source = process.argv[2]
if (!source) {
  console.error('Uso: node scripts/engine/purge-source.mjs <fuente>')
  console.error('Fuentes posibles: tmdb, wikidata, wikipedia, openlibrary, musicbrainz, deezer, imdb, bgg')
  process.exit(1)
}

console.log(`\n🧹 Purgando datos de la fuente: "${source}"...`)

// 1. Purgar campos en seed.json
if (existsSync(SEED_FILE)) {
  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  let purgedItemsCount = 0

  for (const it of seed.items || []) {
    let modified = false

    // Si tiene mapa de procedencia src
    if (it.src) {
      for (const [field, srcName] of Object.entries(it.src)) {
        if (srcName.toLowerCase() === source.toLowerCase()) {
          delete it[field]
          delete it.src[field]
          modified = true
        }
      }
    }

    // Reglas fijas por fuente
    if (source.toLowerCase() === 'tmdb') {
      if (it.tmdbId) { delete it.tmdbId; modified = true }
      if (it.providers) { delete it.providers; modified = true }
    } else if (source.toLowerCase() === 'wikidata') {
      if (it.wikidataId) { delete it.wikidataId; modified = true }
    } else if (source.toLowerCase() === 'openlibrary') {
      if (it.olid) { delete it.olid; modified = true }
    } else if (source.toLowerCase() === 'musicbrainz') {
      if (it.mbid) { delete it.mbid; modified = true }
    }

    if (it.imageSrc && it.imageSrc.toLowerCase() === source.toLowerCase()) {
      it.posterUrl = ''
      delete it.imageSrc
      delete it.imageCredit
      modified = true
    }

    if (modified) purgedItemsCount++
  }

  writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2), 'utf8')
  console.log(`✓ Campos purgados en seed.json: ${purgedItemsCount} obras modificadas`)
}

// 2. Purgar aristas en graph/edges.jsonl
if (existsSync(EDGES_FILE)) {
  const lines = readFileSync(EDGES_FILE, 'utf8').trim().split('\n').filter(Boolean)
  let purgedEdges = 0
  const remaining = []

  for (const line of lines) {
    try {
      const edge = JSON.parse(line)
      if (edge.src && edge.src.toLowerCase() === source.toLowerCase()) {
        purgedEdges++
      } else {
        remaining.push(line)
      }
    } catch {
      remaining.push(line)
    }
  }

  writeFileSync(EDGES_FILE, remaining.join('\n') + (remaining.length ? '\n' : ''), 'utf8')
  console.log(`✓ Aristas purgadas en edges.jsonl: ${purgedEdges} aristas eliminadas`)
}

console.log(`\nPurga de "${source}" completada con éxito.\n`)
