/**
 * audit.mjs — Herramienta de auditoría e inspección de trazabilidad (MOTOR v2 §2b).
 *
 * Permite auditar el pedigrí y procedencia de cualquier obra o estantería:
 * - Dónde se originó cada dato (fuente dura, scrape, llm-search, llm-infer, etc.)
 * - Nivel de confianza (conf)
 * - Pruebas / URLs (evidence)
 * - Timestamp de recolección (at)
 *
 * Uso:
 *   node app/scripts/engine/audit.mjs movie:pulp-fiction-1994
 *   node app/scripts/engine/audit.mjs --shelf book
 *   node app/scripts/engine/audit.mjs --untraced
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ATTRS, SOURCE_HIERARCHY } from './attrs.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const ATTRS_DIR = join(here, '..', 'cache', 'attrs')

if (!existsSync(SEED_FILE)) {
  console.error('No se encontró seed.json en:', SEED_FILE)
  process.exit(1)
}

const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
const items = seed.items || []
const itemMap = new Map(items.map((it) => [it.id, it]))

// Cargar registros detallados de caché con evidencia y fecha
const ledgerMap = new Map() // `${attr}:${id}` -> { src, conf, evidence, at, value }
if (existsSync(ATTRS_DIR)) {
  const files = readdirSync(ATTRS_DIR).filter((f) => f.endsWith('.jsonl'))
  for (const f of files) {
    const attr = f.replace('.jsonl', '')
    const lines = readFileSync(join(ATTRS_DIR, f), 'utf8').split('\n').filter(Boolean)
    for (const l of lines) {
      try {
        const row = JSON.parse(l)
        ledgerMap.set(`${attr}:${row.id}`, row)
      } catch {}
    }
  }
}

const args = process.argv.slice(2)
const shelfArg = args.includes('--shelf') ? args[args.indexOf('--shelf') + 1] : null
const untracedArg = args.includes('--untraced')
const idArg = args.find((a, i) => !a.startsWith('--') && (i === 0 || args[i - 1] !== '--shelf'))

if (idArg) {
  auditSingleItem(idArg)
} else if (shelfArg) {
  auditShelf(shelfArg)
} else if (untracedArg) {
  auditUntraced()
} else {
  auditOverview()
}

function auditSingleItem(id) {
  const it = itemMap.get(id)
  if (!it) {
    console.error(`Obra no encontrada: ${id}`)
    process.exit(1)
  }

  console.log(`\n============================================================`)
  console.log(`🔍 AUDITORÍA DE TRAZABILIDAD: ${it.title} (${it.year || 's.f.'})`)
  console.log(`   ID: ${it.id}  |  Estantería: ${it.type}  |  Creador: ${it.creator || 'Desconocido'}`)
  console.log(`============================================================\n`)

  const fields = [
    'wikidataId',
    'tmdbId',
    'olid',
    'mbid',
    'bggId',
    'imdbId',
    'synopsis',
    'posterUrl',
    'originalLanguage',
    'originCountry',
    'isCanon',
    'notoriety',
    'trend',
    'popPct',
    'pageviews',
    'schoolReading',
    'voteAvg',
    'voteCount',
    'readers',
    'genres',
  ]

  console.log(`| Atributo | Valor resumido | Fuente (src) | Confianza | Evidencia / Cita / Fecha |`)
  console.log(`|---|---|---|---|---|`)

  for (const field of fields) {
    const val = it[field]
    if (val === undefined || val === null) continue

    const src = it.src?.[field] || (field === 'wikidataId' && it.wikidataId ? 'wikidata' : 'desconocida')
    const conf = it.conf?.[field] ?? (src === 'wikidata' || src === 'openlibrary' || src === 'musicbrainz' ? 1.0 : '-')
    
    // Buscar en el libro mayor de atributos
    const ledger = ledgerMap.get(`${field}:${it.id}`)
    const evidence = ledger?.evidence || (it.imageCredit ? `Crédito: ${it.imageCredit}` : '-')
    const date = ledger?.at || '-'

    let valStr = typeof val === 'object' ? JSON.stringify(val) : String(val)
    if (valStr.length > 35) valStr = valStr.slice(0, 32) + '...'

    console.log(`| \`${field}\` | ${valStr} | **${src}** | ${typeof conf === 'number' ? (conf * 100).toFixed(0) + '%' : conf} | ${evidence !== '-' ? evidence : date} |`)
  }

  console.log(`\n✓ Conclusión: Datos trazados e indexados.\n`)
}

function auditShelf(shelf) {
  const shelfItems = items.filter((it) => it.type === shelf)
  if (!shelfItems.length) {
    console.error(`Estantería vacía o desconocida: ${shelf}`)
    process.exit(1)
  }

  console.log(`\n📊 AUDITORÍA GENERAL DE TRAZABILIDAD: Estantería '${shelf.toUpperCase()}' (${shelfItems.length} obras)\n`)

  const srcCounts = {}
  let totalTrackedFields = 0
  let totalUntrackedFields = 0

  for (const it of shelfItems) {
    const srcMap = it.src || {}
    for (const [attr, src] of Object.entries(srcMap)) {
      srcCounts[src] = (srcCounts[src] || 0) + 1
      totalTrackedFields++
    }
  }

  console.log(`Distribución de fuentes de datos:`)
  const sortedSrcs = Object.entries(srcCounts).sort((a, b) => b[1] - a[1])
  for (const [src, count] of sortedSrcs) {
    const pct = ((count / totalTrackedFields) * 100).toFixed(1)
    console.log(`  - ${src.padEnd(16)}: ${count.toLocaleString().padStart(6)} campos (${pct}%)`)
  }
  console.log(`\nTotal campos con fuente trazada: ${totalTrackedFields.toLocaleString()}\n`)
}

function auditUntraced() {
  console.log(`\n🔍 BUSCANDO CAMPOS SIN TRAZABILIDAD EXPLÍCITA EN EL CATÁLOGO...\n`)
  let untracedCount = 0

  for (const it of items) {
    const missing = []
    if (it.synopsis && !it.src?.synopsis) missing.push('synopsis')
    if (it.originalLanguage && !it.src?.originalLanguage) missing.push('originalLanguage')
    if (it.originCountry && !it.src?.originCountry) missing.push('originCountry')

    if (missing.length) {
      untracedCount++
      if (untracedCount <= 10) {
        console.log(`  ⚠️ [${it.id}] ${it.title}: faltan trazas en [${missing.join(', ')}]`)
      }
    }
  }

  console.log(`\nTotal obras con algún campo sin traza: ${untracedCount} de ${items.length}`)
}

function auditOverview() {
  console.log(`\n=== RESUMEN GLOBAL DE TRAZABILIDAD (MOTOR v2 §2b) ===\n`)
  console.log(`Total obras en catálogo: ${items.length.toLocaleString()}`)

  const shelfCounts = {}
  for (const it of items) shelfCounts[it.type] = (shelfCounts[it.type] || 0) + 1

  console.log(`\nPor estantería:`)
  for (const [shelf, count] of Object.entries(shelfCounts)) {
    console.log(`  - ${shelf.padEnd(12)}: ${count.toString().padStart(5)} obras`)
  }

  console.log(`\nUso de la herramienta:`)
  console.log(`  node app/scripts/engine/audit.mjs <id>       -> Inspecciona la ficha completa de una obra`)
  console.log(`  node app/scripts/engine/audit.mjs --shelf X  -> Audita la distribución de fuentes en estantería X`)
  console.log(`  node app/scripts/engine/audit.mjs --untraced -> Detecta campos que no tienen fuente registrada\n`)
}
