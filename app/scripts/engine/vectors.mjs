/**
 * Script de vectorización local con embeddings (MOTOR.md §6.1, ENRIQUECIMIENTO.md E7).
 *
 * Utiliza @xenova/transformers para generar embeddings multilingües normalizados
 * de 384 dimensiones a partir del contexto compacto de cada obra.
 *
 * Uso:
 *   node scripts/engine/vectors.mjs [--shelf <shelf>] [--limit <n>] [--refresh] [--model <hf-id>] [--out <subcarpeta>]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from '@xenova/transformers'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const CONTEXT_DIR = join(here, '..', 'cache', 'context')
const ENRICHED_DIR = join(here, '..', 'cache', 'llm', 'enriched')
const VECTORS_DIR = join(here, '..', 'cache', 'vectors')
const CONTENT_VECTORS_DIR = join(VECTORS_DIR, 'content')
const DEFAULT_MODEL = 'Xenova/all-MiniLM-L6-v2'

const args = process.argv.slice(2)
const FILTER_SHELF = args.includes('--shelf') ? args[args.indexOf('--shelf') + 1] : null
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : null
const REFRESH = args.includes('--refresh')
const MODEL = args.includes('--model') ? args[args.indexOf('--model') + 1] : DEFAULT_MODEL
// --out <subcarpeta de cache/vectors>: escribe solo ahí (sin tocar content/ ni el legado).
const OUT = args.includes('--out')
  ? args[args.indexOf('--out') + 1].replace(/^cache[\/]vectors[\/]/, '').replace(/[\/]+$/, '')
  : null
const OUT_VECTORS_DIR = OUT ? join(VECTORS_DIR, OUT) : null
// Los modelos e5 esperan el prefijo "passage: " en los textos a indexar.
const PASSAGE_PREFIX = MODEL.toLowerCase().includes('e5') ? 'passage: ' : ''

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true })
}

async function main() {
  if (!existsSync(SEED_FILE)) {
    console.error('No se encontró seed.json en:', SEED_FILE)
    process.exit(1)
  }

  console.log('--- Iniciando vectorización local (vectors.mjs) ---')
  console.log(`Modelo: ${MODEL} (L2 normalizado)`)
  if (OUT) console.log(`Salida: cache/vectors/${OUT}/<shelf>/`)

  const extractor = await pipeline('feature-extraction', MODEL)

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
  const BATCH_SIZE = 32
  const pendingItems = []

  async function processBatch(batch) {
    const texts = batch.map((b) => b.text)
    const output = await extractor(texts, { pooling: 'mean', normalize: true })
    const list = output.tolist()
    for (let i = 0; i < batch.length; i++) {
      const { item, targetFile, legacyFile } = batch[i]
      const vector = list[i]
      const payload = JSON.stringify({ id: item.id, vector })
      writeFileSync(targetFile, payload, 'utf8')
      if (legacyFile) writeFileSync(legacyFile, payload, 'utf8') // Compatibilidad
      processed++
    }
    process.stdout.write(`[${processed + cached}/${itemsToProcess.length}] Vectorizados hasta: ${batch[batch.length - 1].item.title}\n`)
  }

  for (const item of itemsToProcess) {
    const slug = item.id.replace(/^[^:]+:/, '')
    const contentShelfDir = join(OUT_VECTORS_DIR || CONTENT_VECTORS_DIR, item.type)
    ensureDir(contentShelfDir)
    const targetFile = join(contentShelfDir, `${slug}.json`)
    let legacyFile = null
    if (!OUT) {
      const shelfDir = join(VECTORS_DIR, item.type)
      ensureDir(shelfDir)
      legacyFile = join(shelfDir, `${slug}.json`)
    }

    if (!REFRESH && existsSync(targetFile)) {
      cached++
      continue
    }

    // Buscar enriquecimiento LLM (T5.5: ficha de experiencia + temas + momentos)
    let textToEmbed = ''
    const enrichedPath = join(ENRICHED_DIR, item.type, `${slug}.json`)

    if (existsSync(enrichedPath)) {
      try {
        const enriched = JSON.parse(readFileSync(enrichedPath, 'utf8'))
        const exp = enriched.experience || {}
        const parts = [
          `TÍTULO: ${item.title} (${item.year || ''})`,
          enriched.oneLiner ? `RESUMEN: ${enriched.oneLiner}` : '',
          exp.plot ? `DE QUÉ VA: ${exp.plot}` : '',
          exp.feeling ? `CÓMO SE SIENTE: ${exp.feeling}` : '',
          exp.hook ? `POR QUÉ ENGANCHA: ${exp.hook}` : '',
          exp.notFor ? `A QUIÉN NO LE GUSTARÁ: ${exp.notFor}` : '',
          exp.similar?.length ? `SIMILARES: ${exp.similar.join(', ')}` : '',
          exp.context ? `CONTEXTO: ${exp.context}` : '',
          enriched.themes?.length ? `TEMAS: ${enriched.themes.join(', ')}` : '',
          enriched.moments?.length ? `MOMENTOS: ${enriched.moments.join(', ')}` : '',
        ].filter(Boolean)
        textToEmbed = parts.join('\n')
      } catch (err) {
        console.warn(`Error leyendo enriquecimiento de ${item.id}:`, err.message)
      }
    }

    if (!textToEmbed) {
      // Fallback a contexto compacto E5
      const contextPath = join(CONTEXT_DIR, item.type, `${slug}.txt`)
      if (existsSync(contextPath)) {
        textToEmbed = readFileSync(contextPath, 'utf8')
      } else {
        // Fallback: construir texto desde los campos del item
        textToEmbed = `ID: ${item.id}\nTÍTULO: ${item.title} (${item.year})\nCREADOR: ${item.creator || ''}\nGÉNEROS: ${(item.genres || []).join(', ')}\nSINOPSIS: ${item.synopsis || ''}`
      }
      if (item.oneLiner) textToEmbed += `\nRESUMEN: ${item.oneLiner}`
      if (item.themes?.length) textToEmbed += `\nTEMAS: ${item.themes.join(', ')}`
      if (item.moments?.length) textToEmbed += `\nMOMENTOS: ${item.moments.join(', ')}`
    }

    pendingItems.push({ item, slug, targetFile, legacyFile, text: (PASSAGE_PREFIX + textToEmbed).slice(0, 1500) })

    if (pendingItems.length >= BATCH_SIZE) {
      await processBatch(pendingItems)
      pendingItems.length = 0
    }
  }

  if (pendingItems.length > 0) {
    await processBatch(pendingItems)
    pendingItems.length = 0
  }

  console.log(`\n--- Vectorización completada ---`)
  console.log(`Total: ${itemsToProcess.length} (Nuevos: ${processed}, En caché: ${cached})`)
}

main().catch((err) => {
  console.error('Error fatal en vectors.mjs:', err)
  process.exit(1)
})
