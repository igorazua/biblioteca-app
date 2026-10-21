/**
 * Script de cobertura y métricas de enriquecimiento (ENRIQUECIMIENTO.md §6 y §11).
 *
 * Mide el estado del catálogo, comprueba umbrales y guarda histórico en
 * scripts/cache/coverage.md
 *
 * Uso:
 *   node scripts/engine/coverage.mjs [--strict]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ATTRS } from './attrs.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const CACHE_DIR = join(here, '..', 'cache')
const COVERAGE_MD = join(CACHE_DIR, 'coverage.md')

if (!existsSync(SEED_FILE)) {
  console.error(`Error: No existe el archivo de semilla ${SEED_FILE}`)
  process.exit(1)
}

const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
const items = seed.items || []

const isStrict = process.argv.includes('--strict')

function pct(num, total) {
  if (!total) return '0.0%'
  return `${((num / total) * 100).toFixed(1)}%`
}

function pctVal(num, total) {
  if (!total) return 0
  return (num / total) * 100
}

const byShelf = {}
for (const it of items) {
  byShelf[it.type] = byShelf[it.type] || []
  byShelf[it.type].push(it)
}

const results = {}

for (const shelf of ['movie', 'series', 'book', 'boardgame', 'artist']) {
  const list = byShelf[shelf] || []
  const n = list.length
  if (!n) continue

  const enginePath = join(ROOT, 'src', 'data', 'engine', `${shelf}.json`)
  let engineCount = 0
  if (existsSync(enginePath)) {
    try {
      const e = JSON.parse(readFileSync(enginePath, 'utf8'))
      engineCount = e.ids?.length || 0
    } catch {}
  }

  const counts = {
    total: n,
    wikidataId: list.filter((i) => Boolean(i.wikidataId)).length,
    tmdbId: list.filter((i) => Boolean(i.tmdbId)).length,
    olid: list.filter((i) => Boolean(i.olid)).length,
    mbid: list.filter((i) => Boolean(i.mbid)).length,
    voteCount: list.filter((i) => Boolean(i.voteCount)).length,
    readers: list.filter((i) => Boolean(i.readers)).length,
    keywordsOrTags: list.filter((i) => (i.keywords?.length || i.subjects?.length || i.tags?.length || 0) > 0).length,
    synopsis: list.filter((i) => (i.synopsis?.length || 0) >= 30).length,
    legalImage: list.filter((i) => {
      const src = i.imageSrc || ''
      const url = i.posterUrl || ''
      return src === 'wikimedia' || src === 'openlibrary' || url.includes('wikimedia.org') || url.includes('openlibrary.org')
    }).length,
    hasAxes: Math.max(list.filter((i) => Boolean(i.axes)).length, engineCount),
  }

  results[shelf] = counts
}

// Imprimir reporte formateado
console.log('\n📊 ESTADO DE COBERTURA DEL CATÁLOGO (ENRIQUECIMIENTO.md §1.1 y §6)\n')
console.log('| Categoría | Obras | ID Ext. | Metadatos (votos/lect.) | Palabras clave | Sinopsis | Portada legal | Ejes LLM |')
console.log('|---|---|---|---|---|---|---|---|')

for (const [shelf, c] of Object.entries(results)) {
  const idExt =
    shelf === 'movie' || shelf === 'series'
      ? `TMDB: ${pct(c.tmdbId, c.total)} · Wiki: ${pct(c.wikidataId, c.total)}`
      : shelf === 'book'
      ? `OLID: ${pct(c.olid, c.total)} · Wiki: ${pct(c.wikidataId, c.total)}`
      : shelf === 'artist'
      ? `MBID: ${pct(c.mbid, c.total)} · Wiki: ${pct(c.wikidataId, c.total)}`
      : `Wiki: ${pct(c.wikidataId, c.total)}`

  const meta =
    shelf === 'book'
      ? `Readers: ${pct(c.readers, c.total)}`
      : `Votos: ${pct(c.voteCount, c.total)}`

  console.log(
    `| **${shelf}** | ${c.total} | ${idExt} | ${meta} | ${pct(c.keywordsOrTags, c.total)} | ${pct(c.synopsis, c.total)} | ${pct(c.legalImage, c.total)} | ${pct(c.hasAxes, c.total)} |`
  )
}
console.log('')

// Guardar histórico en coverage.md
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })

const mdEntry = `
## Cobertura a ${new Date().toISOString()}

| Categoría | Obras | Wikidata | ID Primario | Votos/Readers | Keywords/Tags | Sinopsis | Portada Legal | Ejes |
|---|---|---|---|---|---|---|---|---|
${Object.entries(results)
  .map(
    ([shelf, c]) =>
      `| **${shelf}** | ${c.total} | ${pct(c.wikidataId, c.total)} | ${pct(c.tmdbId || c.olid || c.mbid, c.total)} | ${pct(c.voteCount || c.readers, c.total)} | ${pct(c.keywordsOrTags, c.total)} | ${pct(c.synopsis, c.total)} | ${pct(c.legalImage, c.total)} | ${pct(c.hasAxes, c.total)} |`
  )
  .join('\n')}
`

let prevMd = ''
if (existsSync(COVERAGE_MD)) prevMd = readFileSync(COVERAGE_MD, 'utf8')
writeFileSync(COVERAGE_MD, `${mdEntry}\n\n${prevMd}`, 'utf8')
console.log(`Histórico actualizado en scripts/cache/coverage.md\n`)

// Tabla de «Huecos» (MOTOR v2 §2b.2 / TAREAS_MOTOR_V2.md T3)
const gaps = []
for (const [attrName, def] of Object.entries(ATTRS)) {
  const minTarget = def.minCoverage || 0.9
  for (const shelf of def.shelves) {
    const shelfItems = byShelf[shelf] || []
    if (!shelfItems.length) continue

    const covered = shelfItems.filter((i) => {
      const v = i[attrName]
      if (v === undefined || v === null) return false
      if (Array.isArray(v) && !v.length) return false
      if (typeof v === 'object' && !Object.keys(v).length) return false
      return true
    }).length

    const ratio = covered / shelfItems.length
    if (ratio < minTarget) {
      const cmd = `node scripts/engine/fill-attr.mjs --attr ${attrName} --shelf ${shelf} --mode agent`
      gaps.push({
        attr: attrName,
        shelf,
        cov: pct(covered, shelfItems.length),
        target: `${(minTarget * 100).toFixed(0)}%`,
        cmd,
      })
    }
  }
}

if (gaps.length) {
  console.log('📌 TABLA DE HUECOS (atributos por debajo del objetivo mínimo en ATTRS):\n')
  console.log('| Atributo | Estantería | Cobertura | Objetivo | Comando para rellenarlo |')
  console.log('|---|---|---|---|---|')
  for (const g of gaps) {
    console.log(`| \`${g.attr}\` | **${g.shelf}** | ${g.cov} | ${g.target} | \`${g.cmd}\` |`)
  }
  console.log('')
} else {
  console.log('✨ No hay huecos: todos los atributos registrados cumplen o superan su cobertura objetivo.\n')
}

if (isStrict) {
  // Comprobar umbrales si se pasó --strict
  let failed = false
  const movies = results.movie
  if (movies && pctVal(movies.wikidataId, movies.total) < 85) failed = true
  if (failed) {
    console.error('❌ No se alcanzaron los umbrales mínimos estrictos de cobertura.')
    process.exit(1)
  }
}

process.exit(0)
