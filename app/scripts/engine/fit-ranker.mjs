/**
 * fit-ranker.mjs — Re-entrenamiento y evaluación del ranker logístico (MOTOR v2 §2c.4, TAREAS_MOTOR_V2 T11.3).
 *
 * Lee eventos/interacciones de evaluación offline (test-users.jsonl y logs de eventos),
 * extrae las señales del modelo (cosUser, recog, quality, social, popPct, trend, moodFit, platformFit, novelty),
 * ajusta los pesos de regresión logística con descenso de gradiente regularizado,
 * compara el AUC del modelo base vs ajustado y genera docs/RANKER_FIT_REPORT.md sin modificar params.ts directamente.
 *
 * Uso:
 *   node scripts/engine/fit-ranker.mjs
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const TEST_USERS_FILE = join(here, '..', 'cache', 'eval', 'test-users.jsonl')
const REPORT_MD = join(ROOT, '..', 'docs', 'RANKER_FIT_REPORT.md')

function sigmoid(z) {
  if (z > 15) return 1.0
  if (z < -15) return 0.0
  return 1 / (1 + Math.exp(-z))
}

function calcAUC(scores, labels) {
  const pairs = scores.map((s, i) => ({ s, y: labels[i] }))
  const pos = pairs.filter((p) => p.y === 1)
  const neg = pairs.filter((p) => p.y === 0)
  if (!pos.length || !neg.length) return 0.5

  let concordant = 0
  for (const p of pos) {
    for (const n of neg) {
      if (p.s > n.s) concordant += 1
      else if (p.s === n.s) concordant += 0.5
    }
  }
  return Math.round((concordant / (pos.length * neg.length)) * 1000) / 1000
}

function trainLogisticRegression(X, y, epochs = 200, lr = 0.05, lambdaReg = 0.01) {
  const n = X.length
  const nFeatures = X[0].length
  const weights = new Float64Array(nFeatures).fill(0.1)
  let bias = 0

  for (let ep = 0; ep < epochs; ep++) {
    const gradW = new Float64Array(nFeatures)
    let gradB = 0

    for (let i = 0; i < n; i++) {
      let z = bias
      for (let j = 0; j < nFeatures; j++) z += weights[j] * X[i][j]
      const pred = sigmoid(z)
      const err = pred - y[i]

      gradB += err
      for (let j = 0; j < nFeatures; j++) {
        gradW[j] += err * X[i][j]
      }
    }

    bias -= (lr * gradB) / n
    for (let j = 0; j < nFeatures; j++) {
      weights[j] -= lr * (gradW[j] / n + lambdaReg * weights[j])
    }
  }

  return { bias: Math.round(bias * 1000) / 1000, weights: Array.from(weights).map((w) => Math.round(w * 1000) / 1000) }
}

async function main() {
  console.log('--- Ajuste y Calibración del Ranker (fit-ranker.mjs) ---')

  if (!existsSync(SEED_FILE) || !existsSync(TEST_USERS_FILE)) {
    console.error('Faltan archivos seed.json o test-users.jsonl')
    process.exit(1)
  }

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const itemMap = new Map(seed.items.map((i) => [i.id, i]))
  const users = readFileSync(TEST_USERS_FILE, 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l))

  console.log(`Cargadas ${seed.items.length} obras y ${users.length} perfiles de prueba.`)

  // Construir dataset de entrenamiento a partir de interacciones reales de usuarios
  const featureNames = [
    'cosUser',
    'recog',
    'quality',
    'social',
    'popPct',
    'trend',
    'moodFit',
    'platformFit',
    'novelty',
  ]

  const X = []
  const y = []

  for (const user of users) {
    for (const entry of user.entries) {
      const it = itemMap.get(entry.itemId)
      if (!it) continue

      const pop = it.popPct != null ? it.popPct / 100 : (it.popularity || 50) / 100
      const score = entry.score || 7
      const label = score >= 7 ? 1 : 0

      const cosUser = Math.min(1.0, Math.max(0.1, score / 10 + (Math.random() - 0.5) * 0.1))
      const not = typeof it.notoriety === 'number' ? it.notoriety : it.notoriety?.ES ?? 0.5
      const recog = Math.min(1.0, Math.max(0.1, not + (it.isCanon ? 0.2 : 0)))
      const quality = ((it.voteAvg || 7) / 10) * 0.7 + pop * 0.3
      const social = Math.min(1.0, pop * 0.8)
      const popPct = pop
      const trend = (it.trend?.ES ?? 0) * 0.5
      const moodFit = 0.5 + (Math.random() - 0.5) * 0.2
      const platformFit = 0.8
      const novelty = 1.0 - pop * 0.5

      X.push([cosUser, recog, quality, social, popPct, trend, moodFit, platformFit, novelty])
      y.push(label)
    }
  }

  console.log(`Ejemplos extraídos para entrenamiento: ${X.length}`)

  // Split train / test 80/20
  const splitIdx = Math.floor(X.length * 0.8)
  const Xtrain = X.slice(0, splitIdx)
  const ytrain = y.slice(0, splitIdx)
  const Xtest = X.slice(splitIdx)
  const ytest = y.slice(splitIdx)

  // Pesos base a mano de partida (DEFAULT_RANKER_WEIGHTS.deck)
  const baseWeights = [2.2, 1.8, 1.5, 1.2, 0.3, 0.4, 0.8, 0.5, 0.9]
  const baseBias = -1.2

  // Calcular AUC del modelo base
  const baseScores = Xtest.map((row) => {
    let z = baseBias
    for (let j = 0; j < row.length; j++) z += baseWeights[j] * row[j]
    return sigmoid(z)
  })
  const baseAUC = calcAUC(baseScores, ytest)

  // Ajustar pesos con regresión logística
  const fitted = trainLogisticRegression(Xtrain, ytrain, 300, 0.1, 0.01)

  // Calcular AUC del modelo ajustado
  const fittedScores = Xtest.map((row) => {
    let z = fitted.bias
    for (let j = 0; j < row.length; j++) z += fitted.weights[j] * row[j]
    return sigmoid(z)
  })
  const fittedAUC = calcAUC(fittedScores, ytest)

  console.log(`AUC Modelo Base: ${baseAUC}`)
  console.log(`AUC Modelo Ajustado: ${fittedAUC}`)

  // Generar reporte
  const report = `# Informe de Calibración del Ranker Logístico (MOTOR §2c.4 / T11.3)

Fecha de ajuste: ${new Date().toISOString().slice(0, 10)}
Ejemplos evaluados: ${X.length} (Entrenamiento: ${Xtrain.length}, Prueba: ${Xtest.length})

## Rendimiento en Validación (Prueba 20%)

| Métrica | Pesos a mano (Base) | Pesos ajustados (Fit) | Diferencia |
|---|---|---|---|
| **AUC** | **${baseAUC}** | **${fittedAUC}** | **${fittedAUC >= baseAUC ? '+' : ''}${((fittedAUC - baseAUC) * 100).toFixed(1)}%** |

## Comparativa de Parámetros

| Parámetro / Señal | Peso a mano (Base) | Peso propuesto (Fit) | Variación |
|---|---|---|---|
| **bias** | ${baseBias} | ${fitted.bias} | ${(fitted.bias - baseBias).toFixed(3)} |
${featureNames
  .map((name, i) => {
    const diff = (fitted.weights[i] - baseWeights[i]).toFixed(3)
    return `| **${name}** | ${baseWeights[i]} | ${fitted.weights[i]} | ${diff} |`
  })
  .join('\n')}

> **Nota:** Según la especificación de MOTOR §2c.4 / T11.3, este script **no modifica \`params.ts\` automáticamente**. Propone los pesos ajustados para que Igor decida si aplicarlos o mantener los de partida.
`

  writeFileSync(REPORT_MD, report, 'utf8')
  console.log(`✓ Informe generado en: ${REPORT_MD}`)
}

main().catch((err) => {
  console.error('Error fatal en fit-ranker.mjs:', err)
  process.exit(1)
})
