/**
 * apply.mjs — Consolida la localización de todas las estanterías en el catálogo.
 *
 * 1. Lee la caché de scripts/cache/localize/{movie,series,book,boardgame}/*.json.
 * 2. Aplica local.es y originalTitle en src/data/seed.json.
 * 3. Registra en scripts/cache/attrs/local.jsonl y originalTitle.jsonl.
 * 4. Regenera el catálogo partido ejecutando split-catalog.mjs.
 * 5. Genera el informe de cobertura, ejemplos y obras dudosas.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const APP_DIR = join(here, '..', '..')
const SEED_FILE = join(APP_DIR, 'src', 'data', 'seed.json')
const CACHE_BASE = join(APP_DIR, 'scripts', 'cache', 'localize')
const ATTRS_DIR = join(APP_DIR, 'scripts', 'cache', 'attrs')
mkdirSync(ATTRS_DIR, { recursive: true })

const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
const itemsMap = new Map(seed.items.map((it) => [it.id, it]))

const SHELVES = ['movie', 'series', 'book', 'boardgame']

const stats = {
  movie: { total: 0, ok: 0, notFound: 0, other: 0, examples: [], doubtful: [] },
  series: { total: 0, ok: 0, notFound: 0, other: 0, examples: [], doubtful: [] },
  book: { total: 0, ok: 0, notFound: 0, other: 0, examples: [], doubtful: [] },
  boardgame: { total: 0, ok: 0, notFound: 0, other: 0, examples: [], doubtful: [] },
}

const localLines = []
const origTitleLines = []

// Regla de España (Claude, 28/10/2026): JustWatch ES saca los títulos de TMDB en español, que mezclan España y
// Latinoamérica («Pulp Fiction: Tiempos violentos», «Otro día para matar», «Bajo escucha»), y algunos cruces son de otra
// obra (Regreso al futuro → la II, Top Gun: Maverick → la de 1986) porque nuestro tmdbId estaba mal. Nuestro `title`
// sale de Wikidata en español y acierta con el uso de España: la versión local solo se acepta si su título coincide
// con él. Así nos quedamos con la carátula española buena y nunca con un título de otro país u otra obra.
// Los juegos de mesa son la excepción: lo que se localiza es precisamente el nombre (y la caja es la misma).
const normTitle = (t) =>
  (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)/g, '').replace(/[^a-z0-9ñ]+/g, ' ').trim()
const acceptLocal = (shelf, item, entry) => shelf === 'boardgame' || normTitle(entry.title_es) === normTitle(item.title)
const rejected = { movie: [], series: [], book: [], boardgame: [] }

for (const shelf of SHELVES) {
  const shelfItems = seed.items.filter((it) => it.type === shelf)
  stats[shelf].total = shelfItems.length

  const dir =
    shelf === 'movie' || shelf === 'series'
      ? join(CACHE_BASE, 'justwatch', shelf)
      : join(CACHE_BASE, shelf)

  if (!existsSync(dir)) continue

  const files = readdirSync(dir).filter((f) => f.endsWith('.json'))

  for (const f of files) {
    const entry = JSON.parse(readFileSync(join(dir, f), 'utf8'))
    const item = itemsMap.get(entry.id)
    if (!item) continue

    if (entry.status === 'ok' && !acceptLocal(shelf, item, entry)) {
      rejected[shelf].push(`${item.title} → ${entry.title_es}`)
      if (item.local?.es) delete item.local.es
      if (item.local && !Object.keys(item.local).length) delete item.local
      continue
    }

    if (entry.status === 'ok') {
      stats[shelf].ok++

      // Actualizar item en memoria
      item.local = item.local || {}
      item.local.es = {
        title: entry.title_es,
        poster: entry.poster_es,
        src: entry.src,
      }

      if (entry.originalTitle && !item.originalTitle) {
        item.originalTitle = entry.originalTitle
      }

      // Registro para attrs/*.jsonl
      localLines.push(
        JSON.stringify({
          id: item.id,
          value: item.local,
          src: entry.src,
          conf: 0.95,
        })
      )

      if (item.originalTitle) {
        origTitleLines.push(
          JSON.stringify({
            id: item.id,
            value: item.originalTitle,
            src: entry.src,
            conf: 0.95,
          })
        )
      }

      // Guardar ejemplos
      if (stats[shelf].examples.length < 20) {
        stats[shelf].examples.push({
          id: item.id,
          title_before: item.title,
          title_after: entry.title_es,
          originalTitle: item.originalTitle || item.title,
          poster_orig: item.posterUrl,
          poster_es: entry.poster_es,
          src: entry.src,
        })
      }

      // Detectar casos potencialmente dudosos (gran discrepancia en título)
      if (entry.title_es && item.title) {
        const t1 = entry.title_es.toLowerCase()
        const t2 = item.title.toLowerCase()
        if (
          !t1.includes(t2) &&
          !t2.includes(t1) &&
          entry.src !== 'original-es' &&
          entry.src !== 'bgg'
        ) {
          stats[shelf].doubtful.push({
            id: item.id,
            title_before: item.title,
            title_es: entry.title_es,
            src: entry.src,
            matchType: entry.matchType,
          })
        }
      }
    } else {
      if (entry.status === 'not_found' || entry.status === 'no_spanish_edition') {
        stats[shelf].notFound++
      } else {
        stats[shelf].other++
      }
    }
  }
}

// Guardar seed.json actualizado
writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2))
console.log('✓ seed.json actualizado con local.es y originalTitle')

// Guardar attrs jsonl
writeFileSync(join(ATTRS_DIR, 'local.jsonl'), localLines.join('\n') + '\n')
writeFileSync(join(ATTRS_DIR, 'originalTitle.jsonl'), origTitleLines.join('\n') + '\n')
console.log('✓ Atributos registrados en scripts/cache/attrs/{local,originalTitle}.jsonl')

// Ejecutar catalog:split
console.log('Ejecutando split-catalog.mjs...')
execSync('node scripts/split-catalog.mjs', { cwd: APP_DIR, stdio: 'inherit' })

// Resumen de cobertura
console.log('\n========================================')
console.log('          INFORME DE COBERTURA          ')
console.log('========================================')
for (const shelf of SHELVES) {
  const s = stats[shelf]
  const pct = s.total > 0 ? ((s.ok / s.total) * 100).toFixed(1) : '0.0'
  console.log(`${shelf.toUpperCase()}: ${s.ok} / ${s.total} (${pct} %) [no encontrados: ${s.notFound}, otros: ${s.other}]`)
}

for (const shelf of SHELVES) console.log(`${shelf.toUpperCase()}: descartadas por la regla de España ${rejected[shelf].length}`)

// Guardar informe detallado en un JSON para el informe final
writeFileSync(join(here, 'localization-report.json'), JSON.stringify({ ...stats, rejected }, null, 2))
console.log('✓ Informe completo guardado en scripts/localize/localization-report.json')
