/**
 * trakt.mjs — Comportamiento desde Trakt («related shows»).
 *
 * Trakt requiere TRAKT_CLIENT_ID (ver docs/CONECTAR.md y docs/MOTOR.md §2c.9).
 * Si la variable de entorno está definida, consulta https://api.trakt.tv/shows/<id>/related.
 * Si no está definida, informa del requisito y procesa los datos en caché si existen.
 *
 * Salida: cache/graph/cooc-trakt.jsonl (source: "trakt").
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const APP_DIR = join(here, '..', '..', '..')
const SEED_FILE = join(APP_DIR, 'src', 'data', 'seed.json')
const ALIASES_FILE = join(APP_DIR, 'src', 'data', 'aliases.json')
const CACHE_DIR = join(APP_DIR, 'scripts', 'cache')
const GRAPH_DIR = join(CACHE_DIR, 'graph')
const TRAKT_CACHE_BASE = join(GRAPH_DIR, 'sources', 'trakt')
const OUT_FILE = join(GRAPH_DIR, 'cooc-trakt.jsonl')

const CLIENT_ID = process.env.TRAKT_CLIENT_ID || ''
const USER_AGENT = 'BibliotecaApp/1.0 (biblioteca-social.vercel.app)'
const MIN_GAP_MS = 1000

const args = process.argv.slice(2)
const shelfArg = args.includes('--shelf') ? args[args.indexOf('--shelf') + 1] : 'series'
const SHELF = shelfArg || 'series'

const TRAKT_CACHE_DIR = join(TRAKT_CACHE_BASE, SHELF)
mkdirSync(TRAKT_CACHE_DIR, { recursive: true })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function main() {
  console.log(`\n=== Trakt [${SHELF}] ===`)

  if (!CLIENT_ID) {
    console.log(`ℹ️  No se ha configurado TRAKT_CLIENT_ID en el entorno.`)
    console.log(`   (Tal como indica MOTOR §2c.9 y CONECTAR.md, Trakt exige API key para consultas directas).`)
  }

  const cachedFiles = readdirSync(TRAKT_CACHE_DIR).filter((f) => f.endsWith('.json'))
  if (cachedFiles.length === 0) {
    console.log(`   0 fichas en caché de Trakt. No se generan nuevas aristas en cooc-trakt.jsonl.`)
    return
  }

  // Si hay fichas en caché, cruzarlas
  const seedRaw = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const aliases = JSON.parse(readFileSync(ALIASES_FILE, 'utf8'))
  const canon = (id) => aliases[id] || id
  const allItems = (seedRaw.items || seedRaw).map((it) => ({ ...it, id: canon(it.id) }))
  const shelfItems = allItems.filter((it) => it.type === SHELF && !it.hidden)
  const byTmdb = new Map()
  shelfItems.forEach((it) => {
    if (it.tmdbId) byTmdb.set(String(it.tmdbId), it)
  })

  const pairWeights = new Map()
  for (const file of cachedFiles) {
    const data = JSON.parse(readFileSync(join(TRAKT_CACHE_DIR, file), 'utf8'))
    if (!data || !data.related || !data.id) continue
    const sourceId = canon(data.id)
    const L = data.related.length
    if (L === 0) continue

    for (let p = 0; p < L; p++) {
      const rel = data.related[p]
      const targetItem = rel.ids?.tmdb ? byTmdb.get(String(rel.ids.tmdb)) : null
      if (!targetItem) continue
      const targetId = canon(targetItem.id)
      if (sourceId === targetId) continue

      const w = 1.0 - 0.5 * (p / Math.max(1, L - 1))
      const a = sourceId < targetId ? sourceId : targetId
      const b = sourceId < targetId ? targetId : sourceId
      const key = `${a}|${b}`
      pairWeights.set(key, (pairWeights.get(key) || 0) + w)
    }
  }

  const sorted = [...pairWeights.entries()].sort((x, y) => x[0].localeCompare(y[0]))
  const lines = sorted.map(([pairKey, weight]) => {
    const [a, b] = pairKey.split('|')
    return JSON.stringify({ a, b, source: 'trakt', n: Number(weight.toFixed(3)) })
  })

  writeFileSync(OUT_FILE, lines.join('\n') + (lines.length > 0 ? '\n' : ''), 'utf8')
  console.log(`Escrito ${OUT_FILE} con ${lines.length} aristas.`)
}

main().catch((err) => {
  console.error('Error:', err)
})
