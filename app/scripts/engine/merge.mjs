/**
 * Script de fusión del motor y exportación de artefactos optimizados (MOTOR.md §6.2-§6.3, ENRIQUECIMIENTO.md E9).
 *
 * Combina:
 *   - Vectores locales (384d reducidos a 48d Int8)
 *   - Ejes de sensación (Uint8Array base64)
 *   - Aristas del grafo explícito (edges.jsonl)
 *   - Selecciones y motivos del LLM (picks.jsonl)
 *
 * Genera:
 *   - src/data/engine/<shelf>.json (ShelfEngine compacto para navegador, ~200 KB)
 *   - src/data/engine/cross.json (recomendaciones entre categorías con motivos)
 *
 * Uso:
 *   node scripts/engine/merge.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AXES_BY_SHELF } from './axes.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const VECTORS_DIR = join(here, '..', 'cache', 'vectors')
const GRAPH_DIR = join(here, '..', 'cache', 'graph')
const EDGES_FILE = join(GRAPH_DIR, 'edges.jsonl')
const PICKS_FILE = join(GRAPH_DIR, 'picks.jsonl')
const LLM_ENRICHED_DIR = join(here, '..', 'cache', 'llm', 'enriched')
const ENGINE_OUT_DIR = join(ROOT, 'src', 'data', 'engine')

const ENGINE_VERSION = 'm1.1'
const TARGET_VEC_DIM = 48

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true })
}

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

/**
 * Reduce un vector de 384d a 48d promediando ventanas de 8 dimensiones y cuantiza a Int8 [-127..127]
 */
function projectAndQuantize(vec384) {
  const result = new Int8Array(TARGET_VEC_DIM)
  const chunkSize = Math.floor(vec384.length / TARGET_VEC_DIM)

  for (let i = 0; i < TARGET_VEC_DIM; i++) {
    let sum = 0
    for (let j = 0; j < chunkSize; j++) {
      sum += vec384[i * chunkSize + j] || 0
    }
    const avg = sum / chunkSize
    // Escalar a rango Int8 [-127, 127]
    const clamped = Math.max(-1, Math.min(1, avg * 3))
    result[i] = Math.round(clamped * 127)
  }
  return result
}

function uint8ToBase64(u8) {
  return Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength).toString('base64')
}

function int8ToBase64(i8) {
  return Buffer.from(i8.buffer, i8.byteOffset, i8.byteLength).toString('base64')
}

/** K-means simple determinista para macro (k=8) y micro (k=24) */
function kMeans(points, k, iterations = 6) {
  const n = points.length
  if (n <= k) return points.map((_, i) => i)

  // Inicialización equidistante
  const centers = []
  const step = Math.floor(n / k)
  for (let i = 0; i < k; i++) {
    centers.push([...points[i * step]])
  }

  let assignments = new Array(n).fill(0)

  for (let it = 0; it < iterations; it++) {
    // Asignar al centroide más cercano
    for (let i = 0; i < n; i++) {
      let bestDist = Infinity
      let bestC = 0
      for (let c = 0; c < k; c++) {
        let d = 0
        for (let dim = 0; dim < points[i].length; dim++) {
          const diff = points[i][dim] - centers[c][dim]
          d += diff * diff
        }
        if (d < bestDist) {
          bestDist = d
          bestC = c
        }
      }
      assignments[i] = bestC
    }

    // Recalcular centroides
    const counts = new Array(k).fill(0)
    const newCenters = Array.from({ length: k }, () => new Array(points[0].length).fill(0))

    for (let i = 0; i < n; i++) {
      const c = assignments[i]
      counts[c]++
      for (let dim = 0; dim < points[i].length; dim++) {
        newCenters[c][dim] += points[i][dim]
      }
    }

    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        for (let dim = 0; dim < points[0].length; dim++) {
          centers[c][dim] = newCenters[c][dim] / counts[c]
        }
      }
    }
  }

  return assignments
}

async function main() {
  if (!existsSync(SEED_FILE)) {
    console.error('No se encontró seed.json en:', SEED_FILE)
    process.exit(1)
  }

  console.log('--- Iniciando fusión y empaquetado del motor (merge.mjs) ---')
  console.log(`Versión del motor: ${ENGINE_VERSION}`)

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const items = seed.items || []
  const itemsById = new Map(items.map((i) => [i.id, i]))

  // Cargar aristas de grafos explícitos (E4)
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

  // Cargar picks (E8)
  const picksMap = new Map()
  const crossMap = {}

  if (existsSync(PICKS_FILE)) {
    const lines = readFileSync(PICKS_FILE, 'utf8').trim().split('\n').filter(Boolean)
    for (const l of lines) {
      try {
        const p = JSON.parse(l)
        picksMap.set(`${p.a}|${p.b}`, p)
        picksMap.set(`${p.b}|${p.a}`, p)

        const itemA = itemsById.get(p.a)
        const itemB = itemsById.get(p.b)
        if (itemA && itemB && itemA.type !== itemB.type) {
          crossMap[p.a] = crossMap[p.a] || []
          if (crossMap[p.a].length < 5) {
            crossMap[p.a].push({ id: p.b, kind: p.kind, w: p.w, reason: p.reason })
          }
        }
      } catch {}
    }
  }

  // Cargar vectores (prioriza embContent enriquecidos de MOTOR §2c.1)
  const rawVectors = new Map()
  for (const it of items) {
    const slug = it.id.replace(/^[^:]+:/, '')
    const vContent = join(VECTORS_DIR, 'content', it.type, `${slug}.json`)
    const vLegacy = join(VECTORS_DIR, it.type, `${slug}.json`)
    const vFile = existsSync(vContent) ? vContent : vLegacy
    if (existsSync(vFile)) {
      try {
        const d = JSON.parse(readFileSync(vFile, 'utf8'))
        if (d.vector) rawVectors.set(it.id, d.vector)
      } catch {}
    }
  }
  console.log(`Vectores cargados: ${rawVectors.size}/${items.length}`)

  // Cargar enriquecimiento LLM (E6)
  const llmEnrich = new Map()
  for (const it of items) {
    const slug = it.id.replace(/^[^:]+:/, '')
    const eFile = join(LLM_ENRICHED_DIR, it.type, `${slug}.json`)
    if (existsSync(eFile)) {
      try {
        llmEnrich.set(it.id, JSON.parse(readFileSync(eFile, 'utf8')))
      } catch {}
    }
  }

  // Agrupar por estantería
  const byShelf = {}
  for (const it of items) {
    byShelf[it.type] = byShelf[it.type] || []
    byShelf[it.type].push(it)
  }

  ensureDir(ENGINE_OUT_DIR)

  for (const [shelf, shelfItems] of Object.entries(byShelf)) {
    console.log(`\nProcesando estantería '${shelf}' (${shelfItems.length} obras)...`)
    const axisDefs = AXES_BY_SHELF[shelf] || []
    const axisIds = axisDefs.map((a) => a.id)
    const nAxes = axisIds.length
    const n = shelfItems.length

    const ids = shelfItems.map((it) => it.id)
    const axesArray = new Uint8Array(n * nAxes)
    const quantizedVecs = new Int8Array(n * TARGET_VEC_DIM)
    const pointsForKMeans = []
    const meta = {}

    // Rellenar matrices de ejes, vectores y metadatos
    shelfItems.forEach((it, idx) => {
      const enrich = llmEnrich.get(it.id) || it.enrich || {}
      const itAxes = it.axes || enrich.axes || {}

      axisIds.forEach((axisId, aIdx) => {
        const val = itAxes[axisId] != null ? Math.max(1, Math.min(5, itAxes[axisId])) : 3
        axesArray[idx * nAxes + aIdx] = val
      })

      // Vector combinado
      const rawV = rawVectors.get(it.id) || new Array(384).fill(0)
      const qVec = projectAndQuantize(rawV)
      quantizedVecs.set(qVec, idx * TARGET_VEC_DIM)

      // Punto para KMeans: vector cuantizado normalizado + ejes
      const pt = Array.from(qVec).map((v) => v / 127)
      axisIds.forEach((axisId) => {
        pt.push(((itAxes[axisId] || 3) - 1) / 4)
      })
      pointsForKMeans.push(pt)

      meta[it.id] = {
        themes: enrich.themes || it.themes || (it.genres || []).slice(0, 3).map((g) => g.toLowerCase()),
        moments: enrich.moments || it.moments || ['desconectar', 'pensar'],
        conf: enrich.confidence === 'alta' ? 2 : enrich.confidence === 'media' ? 1 : 0,
      }
    })

    // Calcular vecinos más cercanos con la fórmula combinada E9
    console.log(`Calculando similitud combinada y 20 vecinos por obra para ${shelf}...`)
    const nn = []

    for (let i = 0; i < n; i++) {
      const itemA = shelfItems[i]
      const vecA = rawVectors.get(itemA.id)
      const kwA = new Set([
        ...(itemA.genres || []).map((g) => g.toLowerCase()),
        ...(itemA.keywords || []),
        ...(meta[itemA.id]?.themes || []),
      ])

      const scores = []

      for (let j = 0; j < n; j++) {
        if (i === j) continue
        const itemB = shelfItems[j]

        // 1. Coseno de vectores (0.35)
        let cosSim = 0
        const vecB = rawVectors.get(itemB.id)
        if (vecA && vecB) {
          cosSim = Math.max(0, dot(vecA, vecB))
        }

        // 2. Similitud de ejes normalizados (0.20)
        let axesDistSq = 0
        for (let aIdx = 0; aIdx < nAxes; aIdx++) {
          const diff = (axesArray[i * nAxes + aIdx] - axesArray[j * nAxes + aIdx]) / 4
          axesDistSq += diff * diff
        }
        const maxDist = Math.sqrt(nAxes)
        const axesSim = Math.max(0, 1 - Math.sqrt(axesDistSq) / (maxDist || 1))

        // 3. Jaccard temas + keywords (0.10)
        const kwB = new Set([
          ...(itemB.genres || []).map((g) => g.toLowerCase()),
          ...(itemB.keywords || []),
          ...(meta[itemB.id]?.themes || []),
        ])
        const jaccSim = jaccard(kwA, kwB)

        // 4. Aristas explícitas de E4 (0.20)
        let graphSim = 0
        const edge = explicitEdges.get(`${itemA.id}|${itemB.id}`)
        if (edge) {
          if (edge.kind === 'saga') graphSim = 0.5 // Tratada aparte
          else if (edge.kind === 'creator') graphSim = 0.4
          else if (edge.kind === 'adapt') graphSim = 0.9
          else graphSim = edge.w || 0.3
        }

        // 5. Aristas 'pick' del LLM (0.15)
        let pickSim = 0
        const pick = picksMap.get(`${itemA.id}|${itemB.id}`)
        if (pick) {
          pickSim = pick.w || 0.5
        }

        // Fórmula final ENRIQUECIMIENTO E9
        const sim = 0.35 * cosSim + 0.2 * axesSim + 0.1 * jaccSim + 0.2 * graphSim + 0.15 * pickSim
        scores.push({ idx: j, sim })
      }

      scores.sort((a, b) => b.sim - a.sim)
      nn.push(scores.slice(0, 20).map((s) => s.idx))
    }

    // Clústeres k-means
    console.log(`Calculando clústeres macro (k=8) y micro (k=24)...`)
    const macro = kMeans(pointsForKMeans, 8, 5)
    const micro = kMeans(pointsForKMeans, 24, 5)

    const shelfEngine = {
      v: ENGINE_VERSION,
      axisIds,
      ids,
      axes: uint8ToBase64(axesArray),
      vec: int8ToBase64(quantizedVecs),
      nn,
      macro,
      micro,
      clusterNames: {
        macro: Array.from({ length: 8 }, (_, i) => `Macro ${i + 1}`),
        micro: Array.from({ length: 24 }, (_, i) => `Micro ${i + 1}`),
      },
      meta,
    }

    const shelfEnginePath = join(ENGINE_OUT_DIR, `${shelf}.json`)
    writeFileSync(shelfEnginePath, JSON.stringify(shelfEngine), 'utf8')
    const sizeKb = Math.round(readFileSync(shelfEnginePath).byteLength / 1024)
    console.log(`✓ Archivo generado: ${shelfEnginePath} (${sizeKb} KB)`)
  }

  // Guardar cross.json
  const crossPath = join(ENGINE_OUT_DIR, 'cross.json')
  writeFileSync(crossPath, JSON.stringify(crossMap, null, 2), 'utf8')
  console.log(`✓ Archivo cross-shelf generado: ${crossPath}`)
}

main().catch((err) => {
  console.error('Error fatal en merge.mjs:', err)
  process.exit(1)
})
