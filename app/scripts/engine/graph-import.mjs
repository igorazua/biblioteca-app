/**
 * Script de importación de relaciones del grafo con procedencia (ENRIQUECIMIENTO.md E4).
 *
 * Lee las relaciones existentes entre las obras del catálogo (sagas, adaptaciones,
 * influencias y creador común) y genera scripts/cache/graph/edges.jsonl.
 *
 * Uso:
 *   node scripts/engine/graph-import.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const GRAPH_DIR = join(here, '..', 'cache', 'graph')
const EDGES_FILE = join(GRAPH_DIR, 'edges.jsonl')
const OUTSIDE_FILE = join(GRAPH_DIR, 'outside.json')

if (!existsSync(SEED_FILE)) {
  console.error('No se encontró seed.json en:', SEED_FILE)
  process.exit(1)
}

const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
const items = seed.items || []
const itemsById = new Map(items.map((i) => [i.id, i]))
const itemsByWikidata = new Map()

for (const it of items) {
  if (it.wikidataId) {
    itemsByWikidata.set(it.wikidataId, it)
  }
}

console.log('--- Construyendo grafo de relaciones explícitas (graph-import.mjs) ---')

const edges = []
const outside = []
const seenEdges = new Set()

function addEdge(aId, bId, kind, src, w) {
  if (aId === bId) return
  const key = aId < bId ? `${aId}|${bId}|${kind}` : `${bId}|${aId}|${kind}`
  if (seenEdges.has(key)) return
  seenEdges.add(key)
  edges.push({ a: aId, b: bId, kind, src, w })
}

// 1. Sagas / Colecciones (P179, collection, etc.) -> w: 1.0
const byCollection = new Map()
for (const it of items) {
  if (it.collection) {
    const arr = byCollection.get(it.collection) || []
    arr.push(it.id)
    byCollection.set(it.collection, arr)
  }
}

for (const [col, memberIds] of byCollection.entries()) {
  for (let i = 0; i < memberIds.length; i++) {
    for (let j = i + 1; j < memberIds.length; j++) {
      addEdge(memberIds[i], memberIds[j], 'saga', 'wikidata', 1.0)
    }
  }
}

// 2. Adaptaciones entre categorías (P144 «basada en») -> w: 0.9
for (const it of items) {
  if (it.basedOn) {
    const target = itemsByWikidata.get(it.basedOn)
    if (target) {
      addEdge(it.id, target.id, 'adapt', 'wikidata', 0.9)
    } else {
      outside.push({ sourceId: it.id, targetQid: it.basedOn, kind: 'basedOn' })
    }
  }
}

// 3. Mismo creador / director / autor (dentro y entre categorías) -> w: 0.4
const byCreator = new Map()
for (const it of items) {
  if (it.creator) {
    const clean = it.creator.trim().toLowerCase()
    const arr = byCreator.get(clean) || []
    arr.push(it.id)
    byCreator.set(clean, arr)
  }
}

for (const [creator, creatorIds] of byCreator.entries()) {
  // Limitar creadores con muchas obras para no saturar el grafo con conexiones triviales
  if (creatorIds.length >= 2 && creatorIds.length <= 15) {
    for (let i = 0; i < creatorIds.length; i++) {
      for (let j = i + 1; j < creatorIds.length; j++) {
        addEdge(creatorIds[i], creatorIds[j], 'creator', 'wikidata', 0.4)
      }
    }
  }
}

if (!existsSync(GRAPH_DIR)) mkdirSync(GRAPH_DIR, { recursive: true })

const lines = edges.map((e) => JSON.stringify(e)).join('\n')
writeFileSync(EDGES_FILE, lines ? lines + '\n' : '', 'utf8')
writeFileSync(OUTSIDE_FILE, JSON.stringify(outside, null, 2), 'utf8')

console.log(`✓ Grafo exportado en ${EDGES_FILE}`)
console.log(`  - Total aristas: ${edges.length}`)
console.log(`  - Sagas (w=1.0): ${edges.filter((e) => e.kind === 'saga').length}`)
console.log(`  - Adaptaciones (w=0.9): ${edges.filter((e) => e.kind === 'adapt').length}`)
console.log(`  - Mismo creador (w=0.4): ${edges.filter((e) => e.kind === 'creator').length}`)
console.log(`  - Referencias fuera del catálogo: ${outside.length} (guardadas en outside.json)`)
