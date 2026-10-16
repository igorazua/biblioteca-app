/**
 * Script de enriquecimiento con LLM y validador estricto (MOTOR.md §5, ENRIQUECIMIENTO.md E6 y §5b).
 *
 * Soporta modo agente (--mode agent) para trabajar sin API externa, respetando:
 *   1. Contexto obligatorio de E5 (nunca de memoria).
 *   2. Mismo formato y validador de esquema.
 *   3. Ejemplos fijos de calibración contra la deriva.
 *   4. Control de calidad y coherencia.
 *
 * Uso:
 *   node scripts/engine/llm.mjs --mode agent --shelf <shelf> [--block <n>] [--sample <n>]
 *   node scripts/engine/llm.mjs --mode import
 *   node scripts/engine/llm.mjs --mode qa
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AXES_BY_SHELF } from './axes.mjs'
import { CONTROLLED_VOCAB } from './vocab.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const CACHE_DIR = join(here, '..', 'cache', 'llm')
const CONTEXT_DIR = join(here, '..', 'cache', 'context')
const ENRICHED_DIR = join(CACHE_DIR, 'enriched')
const AGENT_IN_DIR = join(CACHE_DIR, 'agent-in')
const AGENT_OUT_DIR = join(CACHE_DIR, 'agent-out')

const args = process.argv.slice(2)
const MODE = args.includes('--mode') ? args[args.indexOf('--mode') + 1] : 'agent'
const SHELF = args.includes('--shelf') ? args[args.indexOf('--shelf') + 1] : null
const BLOCK_SIZE = 40
const BLOCK_NUM = args.includes('--block') ? parseInt(args[args.indexOf('--block') + 1], 10) : 1
const SAMPLE = args.includes('--sample') ? parseInt(args[args.indexOf('--sample') + 1], 10) : null

// 3 Ejemplos fijos de calibración por categoría (MOTOR §5.4)
const CALIBRATION_EXAMPLES = {
  movie: [
    {
      title: 'Toy Story (1995)',
      axes: { tono: 1, ritmo: 4, emocion: 3, exigencia: 1, humor: 5, tension: 1, fantasia: 4, violencia: 1, familiar: 5, escala: 2, reconfort: 5 },
      themes: ['amistad', 'infancia', 'celos'],
      moments: ['familia', 'reir', 'desconectar'],
      oneLiner: 'Nostálgica, divertida y pura calidez sobre el valor de la lealtad infantil.',
      confidence: 'alta',
    },
    {
      title: 'Seven (1995)',
      axes: { tono: 5, ritmo: 3, emocion: 5, exigencia: 4, humor: 1, tension: 5, fantasia: 1, violencia: 5, familiar: 1, escala: 2, reconfort: 1 },
      themes: ['crimen', 'venganza', 'corrupcion'],
      moments: ['noche_tarde', 'pensar', 'pasar_miedo'],
      oneLiner: 'Opresiva, implacable y perturbadora: un descenso asfixiante al mal.',
      confidence: 'alta',
    },
    {
      title: 'Amélie (2001)',
      axes: { tono: 1, ritmo: 3, emocion: 4, exigencia: 2, humor: 4, tension: 1, fantasia: 3, violencia: 1, familiar: 4, escala: 2, reconfort: 5 },
      themes: ['soledad', 'amor', 'cotidiano'],
      moments: ['pareja', 'desconectar', 'para_repetir'],
      oneLiner: 'Poética, luminosa y llena de encanto visual y optimismo tierno.',
      confidence: 'alta',
    },
  ],
  series: [
    {
      title: 'Breaking Bad (2008)',
      axes: { tono: 5, ritmo: 4, emocion: 5, exigencia: 4, humor: 2, tension: 5, fantasia: 1, violencia: 4, familiar: 1, escala: 3, reconfort: 1, enganche: 5, formato: 5 },
      themes: ['crimen', 'corrupcion', 'familia', 'ambicion'],
      moments: ['noche_tarde', 'pensar'],
      oneLiner: 'Tensa, magistral e implacable transformación moral que no te suelta.',
      confidence: 'alta',
    },
  ],
  book: [
    {
      title: 'Cien años de soledad (1967)',
      axes: { tono: 3, ritmo: 3, emocion: 5, densidad: 4, humor: 3, tension: 2, fantasia: 4, escala: 5, ideas: 5, reconfort: 3 },
      themes: ['familia', 'memoria', 'soledad', 'tiempo'],
      moments: ['pensar', 'emocionarse'],
      oneLiner: 'Mítica, torrencial y fascinante epopeya sobre el destino y la memoria.',
      confidence: 'alta',
    },
  ],
  boardgame: [
    {
      title: 'Catan (1995)',
      axes: { peso: 2, interaccion: 4, azar: 3, confrontacion: 2, cooperacion: 1, tema: 3, risas: 3, familiar: 5 },
      themes: ['comercio', 'expansion', 'negociacion'],
      moments: ['amigos', 'familia'],
      oneLiner: 'Dinámico, accesible y muy social negociando recursos en la mesa.',
      confidence: 'alta',
    },
  ],
  artist: [
    {
      title: 'The Beatles (1960)',
      axes: { energia: 3, tono: 1, profundidad: 4, ritmo: 3, fondo: 2, complejidad: 3 },
      themes: ['amor', 'psicodelia', 'amistad'],
      moments: ['buen_rollo', 'desconectar', 'para_repetir'],
      oneLiner: 'Melodías universales, ingenio desbordante y emoción imperecedera.',
      confidence: 'alta',
    },
  ],
}

/** Validador estricto según MOTOR §5.5 */
export function validateEnrichment(shelf, itemId, data) {
  const errors = []
  const axesDef = AXES_BY_SHELF[shelf] || []
  const vocabDef = CONTROLLED_VOCAB[shelf] || { themes: [], moments: [] }

  if (!data || typeof data !== 'object') {
    return { ok: false, errors: ['El objeto de enriquecimiento no es válido'] }
  }

  // 1. Ejes
  if (!data.axes || typeof data.axes !== 'object') {
    errors.push('Falta el objeto axes')
  } else {
    for (const axis of axesDef) {
      const val = data.axes[axis.id]
      if (val === undefined || !Number.isInteger(val) || val < 1 || val > 5) {
        errors.push(`Eje ${axis.id} debe ser entero entre 1 y 5 (recibido: ${val})`)
      }
    }
  }

  // 2. Temas (3 a 8 dentro del vocabulario controlado)
  if (!Array.isArray(data.themes) || data.themes.length < 1 || data.themes.length > 8) {
    errors.push(`Temas debe ser un array de 1 a 8 elementos (recibido: ${data.themes?.length})`)
  } else {
    for (const t of data.themes) {
      if (!vocabDef.themes.includes(t)) {
        errors.push(`Tema fuera de vocabulario: "${t}"`)
      }
    }
  }

  // 3. Momentos (1 a 4)
  if (!Array.isArray(data.moments) || data.moments.length < 1 || data.moments.length > 4) {
    errors.push(`Momentos debe ser un array de 1 a 4 elementos (recibido: ${data.moments?.length})`)
  } else {
    for (const m of data.moments) {
      if (!vocabDef.moments.includes(m)) {
        errors.push(`Momento fuera de vocabulario: "${m}"`)
      }
    }
  }

  // 4. OneLiner (<= 90 caracteres)
  if (!data.oneLiner || typeof data.oneLiner !== 'string' || data.oneLiner.length > 90) {
    errors.push(`oneLiner debe ser texto de <= 90 caracteres (longitud: ${data.oneLiner?.length})`)
  }

  // 5. Confianza
  if (!['alta', 'media', 'baja'].includes(data.confidence)) {
    errors.push(`confidence debe ser 'alta', 'media' o 'baja'`)
  }

  // Avisos de coherencia (MOTOR §5.5)
  const warnings = []
  if (data.axes) {
    if (data.axes.familiar >= 4 && data.axes.violencia >= 4) {
      warnings.push('Aviso: familiar >= 4 con violencia >= 4')
    }
    if (data.axes.densidad === 1 && data.pages > 800) {
      warnings.push('Aviso: libro de densidad 1 con más de 800 páginas')
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}

async function exportAgentBlock() {
  if (!SHELF) {
    console.error('Debes especificar --shelf <movie|series|book|boardgame|artist>')
    process.exit(1)
  }

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const items = seed.items.filter((i) => i.type === SHELF)

  mkdirSync(AGENT_IN_DIR, { recursive: true })
  mkdirSync(AGENT_OUT_DIR, { recursive: true })

  const startIdx = SAMPLE ? 0 : (BLOCK_NUM - 1) * BLOCK_SIZE
  const count = SAMPLE || BLOCK_SIZE
  const batch = items.slice(startIdx, startIdx + count)

  if (batch.length === 0) {
    console.log(`No hay más obras para el bloque ${BLOCK_NUM} de ${SHELF}.`)
    return
  }

  const taskData = {
    shelf: SHELF,
    block: BLOCK_NUM,
    instructions:
      'Puntúa cada obra según el contexto proporcionado. NO inventes datos. Usa solo los temas y momentos del vocabulario permitido. Si los datos son escasos, pon 3 en los ejes dudosos y confidence: "baja".',
    calibrationExamples: CALIBRATION_EXAMPLES[SHELF] || [],
    allowedThemes: CONTROLLED_VOCAB[SHELF]?.themes || [],
    allowedMoments: CONTROLLED_VOCAB[SHELF]?.moments || [],
    requiredAxes: (AXES_BY_SHELF[SHELF] || []).map((a) => `${a.id} (1: ${a.min} ... 5: ${a.max})`),
    items: batch.map((it) => {
      const slug = it.id.replace(/^[^:]+:/, '')
      const ctxFile = join(CONTEXT_DIR, it.type, `${slug}.txt`)
      const context = existsSync(ctxFile) ? readFileSync(ctxFile, 'utf8') : `ID: ${it.id}\nTÍTULO: ${it.title}`
      return {
        id: it.id,
        title: it.title,
        context,
      }
    }),
  }

  const outFile = join(AGENT_IN_DIR, `${SHELF}_block_${BLOCK_NUM}.json`)
  writeFileSync(outFile, JSON.stringify(taskData, null, 2), 'utf8')

  console.log(`\n📋 Tarea exportada para modo agente en: ${outFile}`)
  console.log(`   - Estantería: ${SHELF}`)
  console.log(`   - Obras en el bloque: ${batch.length} (${startIdx + 1} a ${startIdx + batch.length})`)
  console.log(`   - Escribe los resultados en: ${join(AGENT_OUT_DIR, `${SHELF}_block_${BLOCK_NUM}.json`)}\n`)
}

async function importAgentResults() {
  if (!existsSync(AGENT_OUT_DIR)) {
    console.log('No existe la carpeta agent-out.')
    return
  }

  mkdirSync(ENRICHED_DIR, { recursive: true })

  const files = readdirSync(AGENT_OUT_DIR).filter((f) => f.endsWith('.json'))
  let totalImported = 0
  let totalErrors = 0

  for (const f of files) {
    const raw = JSON.parse(readFileSync(join(AGENT_OUT_DIR, f), 'utf8'))
    const shelf = raw.shelf
    const entries = Array.isArray(raw.items) ? raw.items : Object.entries(raw).map(([id, d]) => ({ id, ...d }))

    const shelfDir = join(ENRICHED_DIR, shelf)
    mkdirSync(shelfDir, { recursive: true })

    for (const e of entries) {
      const val = validateEnrichment(shelf, e.id, e)
      if (!val.ok) {
        console.error(`❌ Error validando ${e.id}:`, val.errors.join('; '))
        totalErrors++
        continue
      }

      const slug = e.id.replace(/^[^:]+:/, '')
      const dest = join(shelfDir, `${slug}.json`)
      const record = {
        id: e.id,
        axes: e.axes,
        themes: e.themes,
        moments: e.moments,
        oneLiner: e.oneLiner,
        confidence: e.confidence,
        src: 'llm-agent',
      }
      writeFileSync(dest, JSON.stringify(record, null, 2), 'utf8')
      totalImported++
    }
  }

  console.log(`\n✅ Importación completada:`)
  console.log(`   - Obras enriquecidas y validadas: ${totalImported}`)
  console.log(`   - Errores de validación: ${totalErrors}\n`)
}

if (MODE === 'agent') {
  exportAgentBlock()
} else if (MODE === 'import') {
  importAgentResults()
} else {
  console.log(`Modo ${MODE} no reconocido. Usa --mode agent o --mode import`)
}
