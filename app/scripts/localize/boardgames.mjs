/**
 * boardgames.mjs — Identifica títulos alternativos en español para juegos de mesa.
 *
 * Según la regla (docs/TAREA_CATALOGO_IDIOMAS.md §1 y §3):
 *   - Solo el nombre si hay edición española (p. ej. "Aventureros al tren", "Los colonos de Catán").
 *   - Sin carátula nueva: usa la existente (poster: item.posterUrl).
 *   - Fuentes: sitelinks de Wikipedia en español y nombres alternativos de BGG/Wikidata.
 *   - Evita falsos cruces (como cruces parciales con nombres no coincidentes).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const APP_DIR = join(here, '..', '..')
const SEED_FILE = join(APP_DIR, 'src', 'data', 'seed.json')
const CACHE_DIR = join(APP_DIR, 'scripts', 'cache', 'localize', 'boardgame')
mkdirSync(CACHE_DIR, { recursive: true })

const BGG_IDS_FILE = join(APP_DIR, 'scripts', 'cache', 'graph', 'sources', 'bgg', 'ids.json')
const SITELINKS_FILE = join(APP_DIR, 'scripts', 'cache', 'attrs', 'sitelinks-cache.json')
const WIKIDATA_INDEX_FILE = join(APP_DIR, 'scripts', 'cache', 'graph', 'sources', 'bgg', 'wikidata-index.json')

const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
const bggData = JSON.parse(readFileSync(BGG_IDS_FILE, 'utf8')).ids
const sitelinks = JSON.parse(readFileSync(SITELINKS_FILE, 'utf8'))
const wikidataIndex = JSON.parse(readFileSync(WIKIDATA_INDEX_FILE, 'utf8'))

const games = seed.items.filter((it) => it.type === 'boardgame')

const SPANISH_STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'en', 'para', 'por', 'con', 'sin', 'sobre',
  'y', 'e', 'o', 'u',
  'juego', 'aventura', 'aventuras', 'guerra', 'isla', 'castillo', 'castillos', 'mundo',
  'civilizacion', 'historia', 'vida', 'tierra', 'reino', 'camino', 'viaje',
  'tinieblas', 'muerte', 'fauces', 'insurreccion', 'busca', 'colonos',
  'perdidas', 'ruinas', 'misterio', 'secreto', 'ciudad', 'ciudades', 'mar',
  'profundo', 'noveno', 'planeta', 'conquista', 'tren', 'trenes', 'encuentro'
])

function norm(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
}

function hasSpanishMarkers(title) {
  const words = norm(title).split(/\s+/).filter(Boolean)
  return words.some((w) => SPANISH_STOPWORDS.has(w))
}

function cleanTitle(s) {
  return (s || '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Obras dudosas o falsos positivos conocidos
const BLACKLIST = new Set([
  'boardgame:earth-2023', // Mapeado incorrectamente a LOTR
  'boardgame:take-5-1994', // '6 nimmt!' es el título alemán, no español
])

let matched = 0
const doubtful = []
const results = []

for (const game of games) {
  const parts = game.id.split(':')
  const slug = parts[1]
  const cacheFile = join(CACHE_DIR, `${slug}.json`)

  if (BLACKLIST.has(game.id)) {
    const entry = { id: game.id, status: 'blacklisted', title: game.title }
    writeFileSync(cacheFile, JSON.stringify(entry, null, 2))
    continue
  }

  const info = bggData[game.id]
  let esTitle = null
  let qid = info?.wikidata

  if (!qid && info?.bggId && wikidataIndex[info.bggId]) {
    qid = wikidataIndex[info.bggId].q
  }

  // 1. Comprobar sitelink de Wikipedia en español
  if (qid && sitelinks[qid]?.es) {
    const raw = sitelinks[qid].es
    const cleaned = cleanTitle(raw)
    // Descartar si es idéntico o si no parece español
    if (cleaned && norm(cleaned) !== norm(game.title)) {
      // Verificar que no sea un falso cruce
      if (hasSpanishMarkers(cleaned) || cleaned.includes('Agrícola') || cleaned.includes('Catán')) {
        esTitle = cleaned
      }
    }
  }

  // 2. Comprobar nombres alternativos en wikidata-index
  if (!esTitle && info?.bggId && wikidataIndex[info.bggId]?.names) {
    const names = wikidataIndex[info.bggId].names
    for (const n of names) {
      const cleaned = cleanTitle(n)
      if (norm(cleaned) !== norm(game.title) && hasSpanishMarkers(cleaned)) {
        esTitle = cleaned
        break
      }
    }
  }

  if (esTitle) {
    matched++
    const entry = {
      id: game.id,
      status: 'ok',
      shelf: 'boardgame',
      slug,
      title_es: esTitle,
      originalTitle: game.title,
      poster_es: game.posterUrl,
      src: 'bgg',
      updatedAt: new Date().toISOString(),
    }
    results.push(entry)
    writeFileSync(cacheFile, JSON.stringify(entry, null, 2))
  } else {
    const entry = { id: game.id, status: 'no_spanish_edition', title: game.title }
    writeFileSync(cacheFile, JSON.stringify(entry, null, 2))
  }
}

console.log(`=== Juegos de mesa analizados: ${games.length} ===`)
console.log(`Con edición/título en español: ${matched}`)
console.log(`Ejemplos (primeros 20):`)
for (const r of results.slice(0, 20)) {
  console.log(`  - "${r.originalTitle}" -> "${r.title_es}"`)
}
