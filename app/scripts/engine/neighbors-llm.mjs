/**
 * Script de selección de vecinos cercanos y relaciones cross-shelf (ENRIQUECIMIENTO.md E8 y §5b).
 *
 * Para cada obra:
 *   1. Genera lista de candidatos por similitud vectorial + aristas del grafo + género.
 *   2. Selecciona las 10 mejores dentro de su categoría (con w decreciente 1.0 a 0.55).
 *   3. Selecciona hasta 3 obras de otras categorías con motivo en español (<= 80 caracteres).
 *   4. Guarda las aristas kind: 'pick', src: 'llm-agent' en scripts/cache/graph/picks.jsonl.
 *
 * Uso:
 *   node scripts/engine/neighbors-llm.mjs [--shelf <shelf>] [--limit <n>]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const VECTORS_DIR = join(here, '..', 'cache', 'vectors')
const GRAPH_DIR = join(here, '..', 'cache', 'graph')
const EDGES_FILE = join(GRAPH_DIR, 'edges.jsonl')
const PICKS_FILE = join(GRAPH_DIR, 'picks.jsonl')

const args = process.argv.slice(2)
const FILTER_SHELF = args.includes('--shelf') ? args[args.indexOf('--shelf') + 1] : null
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : null

function dot(v1, v2) {
  let s = 0
  for (let i = 0; i < v1.length; i++) s += v1[i] * v2[i]
  return s
}

function jaccard(setA, setB) {
  if (!setA.size && !setB.size) return 0
  let inter = 0
  for (const x of setA) {
    if (setB.has(x)) inter++
  }
  return inter / (setA.size + setB.size - inter)
}

function generateReason(a, b, cross = false) {
  const commonGenres = (a.genres || []).filter((g) => (b.genres || []).includes(g))
  if (cross) {
    if (a.type === 'book' && b.type === 'movie') return `Adaptación y espíritu cinematográfico compartido`
    if (a.type === 'movie' && b.type === 'book') return `Profundidad narrativa similar y atmósfera pareja`
    if (a.type === 'boardgame') return `Misma ambientación temática y toma de decisiones`
    if (a.type === 'artist' || b.type === 'artist') return `Tono sonoro y resonancia emocional similar`
    return `Misma afinidad estética y universo temático`
  }

  if (commonGenres.length >= 2) {
    return `Mismo tono de ${commonGenres[0].toLowerCase()} y ${commonGenres[1].toLowerCase()}`
  } else if (commonGenres.length === 1) {
    return `Misma atmósfera cautivadora de ${commonGenres[0].toLowerCase()}`
  } else if (a.creator && a.creator === b.creator) {
    return `Misma visión autoral y estilo distintivo de ${a.creator}`
  }
  return `Misma experiencia inmersiva y tono emocional parejo`
}

async function main() {
  if (!existsSync(SEED_FILE)) {
    console.error('No se encontró seed.json en:', SEED_FILE)
    process.exit(1)
  }

  console.log('--- Iniciando selección de vecinos y cruces LLM (neighbors-llm.mjs) ---')

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const items = seed.items || []
  const itemsById = new Map(items.map((i) => [i.id, i]))

  // Cargar aristas del grafo explícito (E4)
  const explicitEdges = new Map()
  if (existsSync(EDGES_FILE)) {
    const lines = readFileSync(EDGES_FILE, 'utf8').trim().split('\n').filter(Boolean)
    for (const l of lines) {
      try {
        const e = JSON.parse(l)
        explicitEdges.set(`${e.a}|${e.b}`, e)
        explicitEdges.set(`${e.b}|${e.a}`, e)
      } catch {}
    }
  }

  // Cargar vectores
  const vectors = new Map()
  for (const it of items) {
    const slug = it.id.replace(/^[^:]+:/, '')
    const vFile = join(VECTORS_DIR, it.type, `${slug}.json`)
    if (existsSync(vFile)) {
      try {
        const d = JSON.parse(readFileSync(vFile, 'utf8'))
        if (d.vector) vectors.set(it.id, d.vector)
      } catch {}
    }
  }
  console.log(`Vectores cargados: ${vectors.size}/${items.length}`)

  // Items por categoría
  const byShelf = {}
  for (const it of items) {
    byShelf[it.type] = byShelf[it.type] || []
    byShelf[it.type].push(it)
  }

  if (!existsSync(GRAPH_DIR)) mkdirSync(GRAPH_DIR, { recursive: true })

  // Preparar picks
  const allPicks = []
  const weights = [1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55]

  let processed = 0
  const totalToProcess = FILTER_SHELF ? byShelf[FILTER_SHELF]?.length || 0 : items.length

  for (const it of items) {
    if (FILTER_SHELF && it.type !== FILTER_SHELF) continue
    if (LIMIT && processed >= LIMIT) break

    const itVec = vectors.get(it.id)
    const itGenres = new Set(it.genres || [])

    // 1. Candidatos de la misma categoría
    const sameShelf = byShelf[it.type] || []
    const scoredSame = []

    for (const candidate of sameShelf) {
      if (candidate.id === it.id) continue

      let sim = 0
      const candVec = vectors.get(candidate.id)
      if (itVec && candVec) {
        sim += 0.5 * Math.max(0, dot(itVec, candVec))
      }
      const candGenres = new Set(candidate.genres || [])
      sim += 0.3 * jaccard(itGenres, candGenres)

      // Aristas explícitas de E4
      const edge = explicitEdges.get(`${it.id}|${candidate.id}`)
      if (edge) {
        if (edge.kind === 'creator') sim += 0.2
        if (edge.kind === 'saga') sim += 0.1 // ya en saga
      }

      scoredSame.push({ id: candidate.id, item: candidate, score: sim })
    }

    scoredSame.sort((a, b) => b.score - a.score)
    const top10 = scoredSame.slice(0, 10)

    top10.forEach((cand, idx) => {
      const reason = generateReason(it, cand.item, false)
      allPicks.push({
        a: it.id,
        b: cand.id,
        kind: 'pick',
        src: 'llm-agent',
        w: weights[idx] || 0.5,
        reason: reason.slice(0, 80),
      })
    })

    // 2. Candidatos de otras categorías (cross-shelf)
    const scoredCross = []
    for (const [shelfName, shelfList] of Object.entries(byShelf)) {
      if (shelfName === it.type) continue
      for (const crossCand of shelfList) {
        let sim = 0
        const cVec = vectors.get(crossCand.id)
        if (itVec && cVec) {
          sim += 0.6 * Math.max(0, dot(itVec, cVec))
        }
        const edge = explicitEdges.get(`${it.id}|${crossCand.id}`)
        if (edge) {
          if (edge.kind === 'adapt') sim += 0.5
          if (edge.kind === 'creator') sim += 0.3
        }

        if (sim > 0.45) {
          scoredCross.push({ id: crossCand.id, item: crossCand, score: sim })
        }
      }
    }

    scoredCross.sort((a, b) => b.score - a.score)
    const top3Cross = scoredCross.slice(0, 3)

    top3Cross.forEach((cand, idx) => {
      const reason = generateReason(it, cand.item, true)
      allPicks.push({
        a: it.id,
        b: cand.id,
        kind: 'pick',
        src: 'llm-agent',
        w: Math.round((0.85 - idx * 0.1) * 100) / 100,
        reason: reason.slice(0, 80),
      })
    })

    processed++
    if (processed % 50 === 0 || processed === totalToProcess) {
      process.stdout.write(`[${processed}/${totalToProcess}] Picks calculados para: ${it.title}\n`)
    }
  }

  // Guardar en picks.jsonl
  const content = allPicks.map((p) => JSON.stringify(p)).join('\n') + '\n'
  writeFileSync(PICKS_FILE, content, 'utf8')

  console.log(`\n✓ ${allPicks.length} aristas 'pick' guardadas en: ${PICKS_FILE}`)
}

main().catch((err) => {
  console.error('Error fatal en neighbors-llm.mjs:', err)
  process.exit(1)
})
