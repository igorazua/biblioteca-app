/**
 * enrich-movies-cast.mjs — Enriquecimiento de reparto principal (Wikidata P161) para películas (MOTOR v2 §2b.2, T13).
 *
 * Consulta SPARQL de Wikidata por lotes de 100 películas (propiedad P161 = miembro del reparto)
 * con fallback a la sinopsis para las obras que no tengan QID.
 *
 * Uso:
 *   node scripts/engine/enrich-movies-cast.mjs [--apply]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const CACHE_DIR = join(here, '..', 'cache', 'cast')

const args = process.argv.slice(2)
const DO_APPLY = args.includes('--apply')

function ensureDirs() {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const USER_AGENT = 'BibliotecaApp/1.0 ( movie-cast-enricher; mailto:contact@biblioteca.app )'

async function fetchSparql(query) {
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/sparql-results+json',
      },
    })
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    return null
  }
}

async function fetchCastBatch(qids) {
  if (!qids.length) return new Map()
  const values = qids.map((q) => `wd:${q}`).join(' ')
  const sparql = `
SELECT ?movie ?actorLabel WHERE {
  VALUES ?movie { ${values} }
  ?movie wdt:P161 ?actor .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}
`
  const data = await fetchSparql(sparql)
  const map = new Map()

  if (data?.results?.bindings) {
    for (const row of data.results.bindings) {
      const qid = row.movie.value.split('/').pop()
      const actor = row.actorLabel.value
      if (qid && actor && !actor.startsWith('Q')) {
        const list = map.get(qid) || []
        if (!list.includes(actor)) list.push(actor)
        map.set(qid, list)
      }
    }
  }

  return map
}

function extractCastFromSynopsis(synopsis) {
  if (!synopsis) return []
  const match = synopsis.match(/(?:protagonizada por|protagonizado por|protagonistas son|reparto principal|actuaciones de|protagonizan|reparto cuenta con)\s+([^.]+)/i)
  if (!match) return []
  const rawList = match[1]
    .replace(/\s+y\s+/g, ', ')
    .replace(/\s+e\s+/g, ', ')
    .replace(/\s+entre otros/gi, '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length >= 3 && s.length <= 40 && /^[A-ZÁÉÍÓÚÑ]/.test(s))
  return rawList.slice(0, 5)
}

async function main() {
  ensureDirs()
  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const movies = seed.items.filter((i) => i.type === 'movie')
  console.log(`\n=== ENRIQUECEDOR DE REPARTO DE PELÍCULAS (P161 / T13) ===`)
  console.log(`Total películas en catálogo: ${movies.length}`)

  // Agrupar películas con wikidataId
  const withWiki = movies.filter((m) => m.wikidataId && /^Q\d+$/.test(m.wikidataId))
  console.log(`Películas con Wikidata QID válido: ${withWiki.length}/${movies.length}`)

  const castMap = new Map()
  const BATCH_SIZE = 80

  for (let i = 0; i < withWiki.length; i += BATCH_SIZE) {
    const batch = withWiki.slice(i, i + BATCH_SIZE)
    const qids = batch.map((m) => m.wikidataId)
    console.log(`Consultando lote Wikidata ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(withWiki.length / BATCH_SIZE)} (${qids.length} películas)...`)
    const res = await fetchCastBatch(qids)
    for (const [qid, actors] of res.entries()) {
      castMap.set(qid, actors.slice(0, 7)) // Los 7 principales
    }
    await sleep(600)
  }

  let filledCount = 0
  for (const m of movies) {
    let cast = m.wikidataId ? castMap.get(m.wikidataId) : null
    let src = 'wikidata'
    if (!cast || cast.length === 0) {
      cast = extractCastFromSynopsis(m.synopsis)
      src = 'synopsis'
    }

    if (cast && cast.length > 0) {
      m.cast = cast
      m.src = m.src || {}
      m.src.cast = src
      filledCount++
    }
  }

  console.log(`\nResultados:`)
  console.log(`  - Películas con reparto principal asignado : ${filledCount}/${movies.length} (${((filledCount / movies.length) * 100).toFixed(1)}%)`)

  if (DO_APPLY) {
    writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2), 'utf8')
    console.log(`✓ seed.json actualizado con cast en ${filledCount} películas`)
  }
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
