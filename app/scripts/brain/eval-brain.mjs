/**
 * eval-brain.mjs — Evaluación offline del Cerebro y cálculo de línea base (MOTOR v2 §2c.6 / TAREAS_MOTOR_V2.md T4).
 *
 * Mide:
 *   - Hit@10 y Hit@20
 *   - NDCG@20
 *   - Diversidad (distancia coseno media en el top 20)
 *   - Sorpresa / Serendipia (% de aciertos con popPct < 90)
 *
 * Guarda el resultado en docs/EVAL_BRAIN_BASELINE.md
 *
 * Uso:
 *   node scripts/brain/eval-brain.mjs
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const ENGINE_DIR = join(ROOT, 'src', 'data', 'engine')
const TEST_USERS_FILE = join(here, '..', 'cache', 'eval', 'test-users.jsonl')
const BASELINE_MD = join(ROOT, '..', 'docs', 'EVAL_BRAIN_BASELINE.md')
const HISTORICO_MD = join(here, '..', 'cache', 'eval', 'historico.md')

function dot(a, b) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

function norm(a) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * a[i]
  return Math.sqrt(s) || 1
}

function cosine(a, b) {
  return dot(a, b) / (norm(a) * norm(b))
}

function normalizeVec(v) {
  const n = norm(v)
  return v.map((x) => x / n)
}

function loadEngineVectors() {
  const vectors = new Map()
  const shelves = ['movie', 'series', 'book', 'boardgame', 'artist']
  const dim = 48

  for (const shelf of shelves) {
    const file = join(ENGINE_DIR, `${shelf}.json`)
    if (existsSync(file)) {
      try {
        const data = JSON.parse(readFileSync(file, 'utf8'))
        const ids = data.ids || []
        if (data.vec && typeof data.vec === 'string') {
          const buf = Buffer.from(data.vec, 'base64')
          const int8 = new Int8Array(buf.buffer, buf.byteOffset, buf.byteLength)
          for (let i = 0; i < ids.length; i++) {
            const v = Array.from(int8.subarray(i * dim, (i + 1) * dim))
            vectors.set(ids[i], v)
          }
        }
      } catch (err) {
        console.error(`Error al cargar ${file}:`, err.message)
      }
    }
  }

  return vectors
}

function computeUserVector(trainEntries, vectors) {
  const dim = 48
  const u = new Array(dim).fill(0)
  let totalW = 0

  for (const entry of trainEntries) {
    const v = vectors.get(entry.itemId)
    if (!v) continue

    // Peso según nota: 10 = 2.0, 7 = 1.0, 5 = 0.5
    const score = entry.score || 7
    const w = Math.max(0.2, (score - 4) / 4)

    for (let d = 0; d < dim; d++) {
      u[d] += (v[d] || 0) * w
    }
    totalW += w
  }

  if (totalW === 0) return null
  return normalizeVec(u)
}

function dcg(relevances) {
  let score = 0
  for (let i = 0; i < relevances.length; i++) {
    const rel = relevances[i]
    score += (Math.pow(2, rel) - 1) / Math.log2(i + 2)
  }
  return score
}

async function main() {
  console.log('--- Evaluación Offline del Cerebro (eval-brain.mjs) ---')

  if (!existsSync(TEST_USERS_FILE)) {
    console.error(`Error: No existe el archivo de usuarios de prueba: ${TEST_USERS_FILE}`)
    console.log('Ejecuta primero: node scripts/brain/test-users.mjs')
    process.exit(1)
  }

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const itemMap = new Map(seed.items.map((i) => [i.id, i]))
  const vectors = loadEngineVectors()

  console.log(`Cargadas ${seed.items.length} obras y ${vectors.size} vectores de engine.`)

  const userLines = readFileSync(TEST_USERS_FILE, 'utf8').split('\n').filter(Boolean)
  const users = userLines.map((l) => JSON.parse(l))

  console.log(`Evaluando con ${users.length} usuarios de prueba...`)

  const resultsByPlatform = {
    letterboxd: { hit10: 0, hit20: 0, ndcg20: [], div: [], surprise: [], count: 0 },
    goodreads: { hit10: 0, hit20: 0, ndcg20: [], div: [], surprise: [], count: 0 },
  }

  for (const user of users) {
    const entries = user.entries.filter((e) => vectors.has(e.itemId))
    if (entries.length < 20) continue

    const splitIdx = Math.floor(entries.length * 0.8)
    const train = entries.slice(0, splitIdx)
    const test = entries.slice(splitIdx)

    const uVec = computeUserVector(train, vectors)
    if (!uVec) continue

    const trainIds = new Set(train.map((e) => e.itemId))
    const testIdMap = new Map(test.map((e) => [e.itemId, e]))

    // Puntuar candidatos del catálogo (misma estantería dominante)
    const shelf = user.platform === 'letterboxd' ? 'movie' : 'book'
    const candidateItems = seed.items.filter((i) => (shelf === 'movie' ? i.type === 'movie' || i.type === 'series' : i.type === shelf))

    const scored = []
    for (const item of candidateItems) {
      if (trainIds.has(item.id)) continue
      const v = vectors.get(item.id)
      if (!v) continue
      const sim = cosine(uVec, v)
      scored.push({ item, sim })
    }

    scored.sort((a, b) => b.sim - a.sim)
    const top20 = scored.slice(0, 20)
    const top10 = top20.slice(0, 10)

    const targetStats = resultsByPlatform[user.platform]
    targetStats.count++

    // 1. Hit@10 y Hit@20
    const hit10 = top10.some((c) => testIdMap.has(c.item.id))
    const hit20 = top20.some((c) => testIdMap.has(c.item.id))
    if (hit10) targetStats.hit10++
    if (hit20) targetStats.hit20++

    // 2. NDCG@20
    const rels = top20.map((c) => {
      const match = testIdMap.get(c.item.id)
      if (!match) return 0
      return match.score >= 8 ? 3 : match.score >= 6 ? 2 : 1
    })

    const actualDcg = dcg(rels)
    const idealRels = Array.from(testIdMap.values())
      .map((e) => (e.score >= 8 ? 3 : e.score >= 6 ? 2 : 1))
      .sort((a, b) => b - a)
      .slice(0, 20)
    const idealDcg = dcg(idealRels) || 1
    targetStats.ndcg20.push(actualDcg / idealDcg)

    // 3. Diversidad (distancia coseno media en el top 20)
    let distSum = 0
    let pairCount = 0
    for (let a = 0; a < top20.length; a++) {
      for (let b = a + 1; b < top20.length; b++) {
        const vA = vectors.get(top20[a].item.id)
        const vB = vectors.get(top20[b].item.id)
        distSum += 1 - cosine(vA, vB)
        pairCount++
      }
    }
    if (pairCount > 0) targetStats.div.push(distSum / pairCount)

    // 4. Sorpresa / Serendipia (% de hits con popPct < 90)
    const hits = top20.filter((c) => testIdMap.has(c.item.id))
    if (hits.length > 0) {
      const nonBlockbusters = hits.filter((h) => (h.item.popPct || 50) < 90).length
      targetStats.surprise.push(nonBlockbusters / hits.length)
    }
  }

  // Generar reporte
  console.log('\n📊 RESULTADOS DE LA EVALUACIÓN OFFLINE\n')
  console.log('| Plataforma | Usuarios evaluados | Hit@10 | Hit@20 | NDCG@20 | Diversidad | Sorpresa/Serendipia |')
  console.log('|---|---|---|---|---|---|---|')

  const reportRows = []
  for (const [platform, s] of Object.entries(resultsByPlatform)) {
    if (s.count === 0) continue
    const h10Pct = ((s.hit10 / s.count) * 100).toFixed(1) + '%'
    const h20Pct = ((s.hit20 / s.count) * 100).toFixed(1) + '%'
    const meanNdcg = (s.ndcg20.reduce((a, b) => a + b, 0) / s.ndcg20.length).toFixed(3)
    const meanDiv = (s.div.reduce((a, b) => a + b, 0) / s.div.length).toFixed(3)
    const meanSurprise = s.surprise.length
      ? ((s.surprise.reduce((a, b) => a + b, 0) / s.surprise.length) * 100).toFixed(1) + '%'
      : '0.0%'

    console.log(`| **${platform}** | ${s.count} | ${h10Pct} | ${h20Pct} | ${meanNdcg} | ${meanDiv} | ${meanSurprise} |`)
    reportRows.push({ platform, count: s.count, h10Pct, h20Pct, meanNdcg, meanDiv, meanSurprise })
  }

  // Guardar línea base en docs/EVAL_BRAIN_BASELINE.md
  const mdContent = `# Línea Base de Evaluación del Cerebro (T4)

Fecha de medición: ${new Date().toISOString().slice(0, 10)}
Versión de catálogo: ${seed.items.length} obras (${vectors.size} vectores iniciales)

> **Nota:** Esta medición representa la línea base inicial antes de aplicar la ficha de experiencia LLM (T5), el grafo de co-consumo (T6) y la fusión de espacios vectoriales (T7).

## Métricas Offline (Línea Base)

| Plataforma | Usuarios evaluados | Hit@10 | Hit@20 | NDCG@20 | Diversidad | Sorpresa / Serendipia |
|---|---|---|---|---|---|---|
${reportRows.map((r) => `| **${r.platform}** | ${r.count} | ${r.h10Pct} | ${r.h20Pct} | ${r.meanNdcg} | ${r.meanDiv} | ${r.meanSurprise} |`).join('\n')}

### Criterios y Definiciones
- **Hit@K**: Porcentaje de usuarios en los que al menos una obra oculta del conjunto de prueba (20% más reciente) aparece en el top K recomendado.
- **NDCG@20**: Calidad del ordenamiento dando más peso a las obras con valoración alta (≥ 4★).
- **Diversidad**: Distancia coseno media ($1 - \\cos$) entre todas las parejas del top 20.
- **Sorpresa / Serendipia**: Porcentaje de aciertos que no pertenecen al top 10% de popularidad (\`popPct < 90\`).
`

  writeFileSync(BASELINE_MD, mdContent, 'utf8')
  console.log(`\n✓ Línea base guardada en docs/EVAL_BRAIN_BASELINE.md`)

  // Añadir al histórico cronológico (MOTOR §2c.6 / T4.2)
  const historyEntry = `\n## Evaluación ${new Date().toISOString().slice(0, 19).replace('T', ' ')} (v: m1.1)
${reportRows.map((r) => `- **${r.platform}**: Hit@10=${r.h10Pct}, Hit@20=${r.h20Pct}, NDCG@20=${r.meanNdcg}, Diversidad=${r.meanDiv}, Serendipia=${r.meanSurprise}`).join('\n')}
`
  if (!existsSync(HISTORICO_MD)) {
    writeFileSync(HISTORICO_MD, '# Histórico de Evaluaciones del Cerebro (MOTOR §2c.6)\n' + historyEntry, 'utf8')
  } else {
    writeFileSync(HISTORICO_MD, readFileSync(HISTORICO_MD, 'utf8') + historyEntry, 'utf8')
  }
  console.log(`✓ Entrada añadida a ${HISTORICO_MD}`)
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
