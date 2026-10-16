/**
 * Script de vectorización local con embeddings (MOTOR.md §6.1, ENRIQUECIMIENTO.md E7).
 *
 * Utiliza @xenova/transformers para generar embeddings multilingües normalizados
 * de 384 dimensiones a partir del contexto compacto de cada obra.
 *
 * Uso:
 *   node scripts/engine/vectors.mjs [--shelf <shelf>] [--limit <n>] [--refresh]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from '@xenova/transformers'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const CONTEXT_DIR = join(here, '..', 'cache', 'context')
const VECTORS_DIR = join(here, '..', 'cache', 'vectors')

const args = process.argv.slice(2)
const FILTER_SHELF = args.includes('--shelf') ? args[args.indexOf('--shelf') + 1] : null
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : null
const REFRESH = args.includes('--refresh')

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true })
}

async function main() {
  if (!existsSync(SEED_FILE)) {
    console.error('No se encontró seed.json en:', SEED_FILE)
    process.exit(1)
  }

  console.log('--- Iniciando vectorización local (vectors.mjs) ---')
  console.log('Modelo: Xenova/all-MiniLM-L6-v2 (384 dimensiones, L2 normalizado)')

  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const items = seed.items || []

  const itemsToProcess = []
  const countsByShelf = {}

  for (const item of items) {
    if (FILTER_SHELF && item.type !== FILTER_SHELF) continue
    countsByShelf[item.type] = (countsByShelf[item.type] || 0) + 1
    if (LIMIT && countsByShelf[item.type] > LIMIT) continue
    itemsToProcess.push(item)
  }

  console.log(`Procesando ${itemsToProcess.length} obras...`)
  let processed = 0
  let cached = 0

  for (const item of itemsToProcess) {
    const slug = item.id.replace(/^[^:]+:/, '')
    const shelfDir = join(VECTORS_DIR, item.type)
    ensureDir(shelfDir)
    const targetFile = join(shelfDir, `${slug}.json`)

    if (!REFRESH && existsSync(targetFile)) {
      cached++
      continue
    }

    // Buscar contexto
    let textToEmbed = ''
    const contextPath = join(CONTEXT_DIR, item.type, `${slug}.txt`)
    if (existsSync(contextPath)) {
      textToEmbed = readFileSync(contextPath, 'utf8')
    } else {
      // Fallback: construir texto desde los campos del item
      textToEmbed = `ID: ${item.id}\nTÍTULO: ${item.title} (${item.year})\nCREADOR: ${item.creator || ''}\nGÉNEROS: ${(item.genres || []).join(', ')}\nSINOPSIS: ${item.synopsis || ''}`
    }

    // Agregar oneLiner o temas si existen
    if (item.oneLiner) textToEmbed += `\nRESUMEN: ${item.oneLiner}`
    if (item.themes?.length) textToEmbed += `\nTEMAS: ${item.themes.join(', ')}`
    if (item.moments?.length) textToEmbed += `\nMOMENTOS: ${item.moments.join(', ')}`

    const output = await extractor(textToEmbed.slice(0, 1500), { pooling: 'mean', normalize: true })
    const vector = Array.from(output.data)

    writeFileSync(targetFile, JSON.stringify({ id: item.id, vector }), 'utf8')
    processed++

    if (processed % 25 === 0 || processed === itemsToProcess.length - cached) {
      process.stdout.write(`[${processed + cached}/${itemsToProcess.length}] Vectorizado: ${item.title}\n`)
    }
  }

  console.log(`\n--- Vectorización completada ---`)
  console.log(`Total: ${itemsToProcess.length} (Nuevos: ${processed}, En caché: ${cached})`)
}

main().catch((err) => {
  console.error('Error fatal en vectors.mjs:', err)
  process.exit(1)
})
