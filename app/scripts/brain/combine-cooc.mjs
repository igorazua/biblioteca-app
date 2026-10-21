/**
 * combine-cooc.mjs — Combinador de fuentes de co-consumo (MOTOR v2 §2c.2, TAREAS_MOTOR_V2 T6.3).
 *
 * Agrega y normaliza las aristas de comportamiento prestado procedentes de:
 *   - Wikipedia Clickstream (eswiki + enwiki con PPMI)
 *   - Futuros raspadores agregados (Letterboxd, Goodreads, BGG, Last.fm)
 *
 * Salida:
 *   cache/graph/cooc.jsonl con formato { a, b, w, sources: [...] }
 *
 * Uso:
 *   node scripts/brain/combine-cooc.mjs
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const GRAPH_DIR = join(here, '..', 'cache', 'graph')
const OUT_FILE = join(GRAPH_DIR, 'cooc.jsonl')

console.log('--- Combinando aristas de co-consumo (combine-cooc.mjs) ---')

if (!existsSync(GRAPH_DIR)) {
  console.error('No existe el directorio:', GRAPH_DIR)
  process.exit(1)
}

const files = readdirSync(GRAPH_DIR).filter((f) => f.startsWith('cooc-') && f.endsWith('.jsonl'))
console.log(`Fuentes encontradas: ${files.length} (${files.join(', ')})`)

const pairMap = new Map()

for (const file of files) {
  const filePath = join(GRAPH_DIR, file)
  const lines = readFileSync(filePath, 'utf8').trim().split('\n').filter(Boolean)
  console.log(`Leyendo ${lines.length} aristas de ${file}...`)

  for (const line of lines) {
    try {
      const e = JSON.parse(line)
      if (!e.a || !e.b || e.a === e.b) continue

      // Orden determinista para par no dirigido
      const [u, v] = e.a < e.b ? [e.a, e.b] : [e.b, e.a]
      const key = `${u}|${v}`

      // Calcular peso normalizado w en [0.1, 1.0]
      let edgeWeight = 0.5
      if (e.ppmi != null) {
        // PPMI suele oscilar entre 0 y ~15; normalizamos sigmoide/lineal suave
        edgeWeight = Math.min(1.0, Math.max(0.1, Math.round((e.ppmi / 6.0) * 1000) / 1000))
      } else if (e.w != null) {
        edgeWeight = Math.min(1.0, Math.max(0.1, e.w))
      }

      const existing = pairMap.get(key)
      if (!existing) {
        pairMap.set(key, {
          a: u,
          b: v,
          w: edgeWeight,
          sources: [e.source || file.replace(/^cooc-/, '').replace(/\.jsonl$/, '')],
          count: e.n || 1,
        })
      } else {
        // Combinación de pesos multi-fuente
        existing.w = Math.min(1.0, existing.w + edgeWeight * 0.3)
        const srcName = e.source || file.replace(/^cooc-/, '').replace(/\.jsonl$/, '')
        if (!existing.sources.includes(srcName)) existing.sources.push(srcName)
        existing.count += e.n || 1
      }
    } catch {}
  }
}

const outLines = []
for (const entry of pairMap.values()) {
  outLines.push(JSON.stringify(entry))
}

writeFileSync(OUT_FILE, outLines.join('\n') + '\n', 'utf8')
console.log(`✓ Generado ${OUT_FILE} con ${pairMap.size} aristas únicas de co-consumo.`)
