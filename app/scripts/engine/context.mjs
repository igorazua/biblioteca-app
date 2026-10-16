/**
 * Generador de archivos de contexto compacto para el LLM y vectores (ENRIQUECIMIENTO.md E5).
 *
 * Crea un archivo de texto por obra (<= 2.500 caracteres) en scripts/cache/context/<shelf>/<slug>.txt
 * que sirve de entrada para el enriquecimiento en modo agente (E6) y la vectorización (E7).
 *
 * Uso:
 *   node scripts/engine/context.mjs [--shelf <shelf>]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const EDGES_FILE = join(here, '..', 'cache', 'graph', 'edges.jsonl')
const CONTEXT_DIR = join(here, '..', 'cache', 'context')

const args = process.argv.slice(2)
const FILTER_SHELF = args.includes('--shelf') ? args[args.indexOf('--shelf') + 1] : null

if (!existsSync(SEED_FILE)) {
  console.error('No se encontró seed.json en:', SEED_FILE)
  process.exit(1)
}

const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
const items = seed.items || []
const itemsById = new Map(items.map((i) => [i.id, i]))

// Cargar aristas de E4 si existen para sacar títulos relacionados
const relatedMap = new Map()
if (existsSync(EDGES_FILE)) {
  const lines = readFileSync(EDGES_FILE, 'utf8').trim().split('\n').filter(Boolean)
  for (const l of lines) {
    try {
      const e = JSON.parse(l)
      const arrA = relatedMap.get(e.a) || []
      arrA.push(e.b)
      relatedMap.set(e.a, arrA)

      const arrB = relatedMap.get(e.b) || []
      arrB.push(e.a)
      relatedMap.set(e.b, arrB)
    } catch {}
  }
}

console.log('--- Generando contextos compactos para LLM (context.mjs) ---')

let written = 0

for (const it of items) {
  if (FILTER_SHELF && it.type !== FILTER_SHELF) continue

  const shelfDir = join(CONTEXT_DIR, it.type)
  if (!existsSync(shelfDir)) mkdirSync(shelfDir, { recursive: true })

  const slug = it.id.replace(/^[^:]+:/, '')
  const targetFile = join(shelfDir, `${slug}.txt`)

  // Construir bloque compacto
  const lines = []
  lines.push(`ID: ${it.id}`)
  lines.push(`TÍTULO: ${it.title} (${it.year})`)
  if (it.creator) lines.push(`CREADOR/AUTOR: ${it.creator}`)
  if (it.type) lines.push(`TIPO: ${it.type}`)

  // Datos específicos de formato
  if (it.durationMin) lines.push(`DURACIÓN: ${it.durationMin} min`)
  if (it.seasons) lines.push(`TEMPORADAS: ${it.seasons}`)
  if (it.pages) lines.push(`PÁGINAS: ${it.pages}`)
  if (it.players) lines.push(`JUGADORES: ${it.players}`)

  // Géneros y palabras clave
  const genres = it.genres || []
  if (genres.length) lines.push(`GÉNEROS: ${genres.join(', ')}`)
  const kw = (it.keywords || []).slice(0, 20)
  if (kw.length) lines.push(`PALABRAS CLAVE: ${kw.join(', ')}`)

  // Sagas y relaciones
  if (it.collection) lines.push(`COLECCIÓN/SAGA: ${it.collection}`)
  if (it.basedOn) lines.push(`BASADA EN: ${it.basedOn}`)
  if (it.awards?.length) lines.push(`PREMIOS: ${it.awards.slice(0, 5).join(', ')}`)

  // Obras relacionadas del catálogo (hasta 5)
  const relIds = relatedMap.get(it.id) || []
  const relTitles = relIds
    .map((id) => itemsById.get(id)?.title)
    .filter(Boolean)
    .slice(0, 5)
  if (relTitles.length) lines.push(`OBRAS RELACIONADAS EN CATÁLOGO: ${relTitles.join(' | ')}`)

  // Sinopsis limpia (truncada a 800 caracteres para asegurar límite global de 2.500)
  if (it.synopsis) {
    const cleanSynopsis = it.synopsis.slice(0, 800).replace(/\s+/g, ' ').trim()
    lines.push(`SINOPSIS: ${cleanSynopsis}`)
  }

  const content = lines.join('\n')
  const hash = createHash('sha1').update(content).digest('hex')
  const finalFileContent = `# HASH: ${hash}\n${content}\n`

  writeFileSync(targetFile, finalFileContent, 'utf8')
  written++
}

console.log(`✓ Contextos generados: ${written} archivos en ${CONTEXT_DIR}\n`)
