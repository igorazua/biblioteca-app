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

// 3 Ejemplos fijos de calibración por categoría (MOTOR §5.4, §2c.1)
const CALIBRATION_EXAMPLES = {
  movie: [
    {
      title: 'Toy Story (1995)',
      experience: {
        plot: 'Un muñeco vaquero tradicional ve amenazado su estatus de juguete favorito cuando llega un astronauta moderno. Juntos deben aprender a convivir y escapar de los peligros del mundo exterior para volver con su dueño.',
        feeling: 'Cálida, nostálgica, con ritmo ágil y humor constante para todas las edades. Deja una sensación reconfortante de optimismo y ternura.',
        hook: 'Engancha por la brillante dinámica entre Woody y Buzz, la animación pionera y el retrato universal de la infancia y los celos.',
        notFor: 'Quien busque cine adulto introspectivo, drama oscuro o realismo crudo.',
        similar: ['Monstruos S.A.', 'E.T. el extraterrestre', 'Paddington 2', 'Buscando a Nemo'],
        context: 'Clásico indiscutible de 1995, primer largometraje animado por ordenador de Pixar y un hito generacional.'
      },
      axes: { tono: 1, ritmo: 4, emocion: 3, exigencia: 1, humor: 5, tension: 1, fantasia: 4, violencia: 1, familiar: 5, escala: 2, reconfort: 5 },
      themes: ['amistad', 'infancia', 'rivalidad', 'crecimiento'],
      moments: ['familia', 'reir', 'desconectar', 'para_repetir'],
      oneLiner: 'Nostálgica, divertida y pura calidez sobre el valor de la lealtad infantil.',
      confidence: 'alta',
    },
    {
      title: 'Seven (1995)',
      experience: {
        plot: 'Dos detectives de homicidios, uno veterano y otro impulsivo, persiguen a un asesino en serie que escoge a sus víctimas según los siete pecados capitales. La investigación los arrastra a un juego psicológico letal.',
        feeling: 'Opresiva, sombría, con tensión asfixiante y violencia psicológica extrema. Deja un poso amargo y perturbador.',
        hook: 'Engancha por su atmósfera lluviosa implacable, el duelo intelectual con el asesino y uno de los giros finales más demoledores del cine.',
        notFor: 'Espectadores sensibles a la violencia gráfica, quien busque entretenimiento ligero o evasión familiar.',
        similar: ['Zodiac', 'El silencio de los corderos', 'Prisoners', 'Cure'],
        context: 'Thriller de culto de 1995 dirigido por David Fincher que redefinió el género neo-noir.'
      },
      axes: { tono: 5, ritmo: 3, emocion: 5, exigencia: 4, humor: 1, tension: 5, fantasia: 1, violencia: 5, familiar: 1, escala: 2, reconfort: 1 },
      themes: ['crimen', 'venganza', 'investigacion', 'moralidad'],
      moments: ['noche_tarde', 'pensar', 'pasar_miedo', 'solo'],
      oneLiner: 'Opresiva, implacable y perturbadora: un descenso asfixiante al mal.',
      confidence: 'alta',
    },
    {
      title: 'Amélie (2001)',
      experience: {
        plot: 'Una joven camarera parisina con una imaginación desbordante decide dedicar su vida a ayudar discretamente a quienes la rodean. En el camino, se enamora de un excéntrico coleccionista de fotos de fotomatón.',
        feeling: 'Luminosa, poética, juguetona y visualmente mágica. Deja el corazón lleno de ganas de vivir y una amplia sonrisa.',
        hook: 'Cautiva por su estética colorista, la música de Yann Tiersen y la celebración de los pequeños placeres cotidianos.',
        notFor: 'Quien busque tramas complejas, realismo social o rechace el tono ingenuo y soñador.',
        similar: ['El gran hotel Budapest', 'Medianoche en París', 'Chocolat', 'La La Land'],
        context: 'Fenómeno mundial del cine francés de 2001 que convirtió a Audrey Tautou en icono internacional.'
      },
      axes: { tono: 1, ritmo: 3, emocion: 4, exigencia: 2, humor: 4, tension: 1, fantasia: 3, violencia: 1, familiar: 4, escala: 2, reconfort: 5 },
      themes: ['soledad', 'amor', 'cotidiano', 'fantasia_cotidiana'],
      moments: ['pareja', 'desconectar', 'para_repetir'],
      oneLiner: 'Poética, luminosa y llena de encanto visual y optimismo tierno.',
      confidence: 'alta',
    },
  ],
  series: [
    {
      title: 'Breaking Bad (2008)',
      experience: {
        plot: 'Un profesor de química de instituto diagnosticado de cáncer terminal decide fabricar metanfetamina con un antiguo alumno para asegurar el futuro económico de su familia. Su incursión en el narcotráfico despierta un oscuro ego criminal.',
        feeling: 'Tensa, absorbente, de ritmo implacable y moralmente asfixiante. Provoca una fascinación culpable y una adrenalina constante.',
        hook: 'La evolución psicológica de Walter White a Heisenberg, la precisión milimétrica de sus guiones y la constante sensación de catástrofe inminente.',
        notFor: 'Quien busque historias amables, personajes moralmente puros o ritmo pausado sin sobresaltos.',
        similar: ['Better Call Saul', 'Ozark', 'Los Soprano', 'Fargo'],
        context: 'Obra cumbre de la era dorada de la televisión (2008-2013), aclamada universalmente por crítica y público.'
      },
      axes: { tono: 5, ritmo: 4, emocion: 5, exigencia: 4, humor: 2, tension: 5, fantasia: 1, violencia: 4, familiar: 1, escala: 3, reconfort: 1, enganche: 5, formato: 5 },
      themes: ['crimen', 'corrupcion', 'familia', 'ambicion'],
      moments: ['noche_tarde', 'pensar', 'maraton', 'enganche'],
      oneLiner: 'Tensa, magistral e implacable transformación moral que no te suelta.',
      confidence: 'alta',
    },
  ],
  book: [
    {
      title: 'Cien años de soledad (1967)',
      experience: {
        plot: 'Crónica épica de siete generaciones de la familia Buendía en el pueblo caribeño de Macondo, fundado en mitad de la selva. Sus destinos se entrelazan entre prodigios fantásticos, guerras civiles y una irremediable soledad.',
        feeling: 'Torrencial, poética, envolvente y agridulce. Deja la sensación de haber recorrido un siglo entero en un suspiro.',
        hook: 'El realismo mágico insuperable de García Márquez, donde lo insólito es cotidiano y el lenguaje hipnotiza en cada página.',
        notFor: 'Lectores que busquen tramas lineales sencillas, poca densidad de personajes o realismo estricto.',
        similar: ['Pedro Páramo', 'La casa de los espíritus', 'El amor en los tiempos del cólera', 'Ficciones'],
        context: 'Obra maestra del boom latinoamericano y cumbre del Premio Nobel Gabriel García Márquez (1967).'
      },
      axes: { tono: 3, ritmo: 3, emocion: 5, densidad: 4, humor: 3, tension: 2, fantasia: 4, escala: 5, ideas: 5, reconfort: 3 },
      themes: ['familia', 'memoria', 'soledad', 'tiempo'],
      moments: ['pensar', 'emocionarse', 'absorbente', 'para_subrayar'],
      oneLiner: 'Mítica, torrencial y fascinante epopeya sobre el destino y la memoria.',
      confidence: 'alta',
    },
  ],
  boardgame: [
    {
      title: 'Catan (1995)',
      experience: {
        plot: 'Los jugadores colonizan una isla desierta rica en recursos, construyendo asentamientos, caminos y ciudades mientras negocian materias primas entre sí para alcanzar antes que nadie los diez puntos de victoria.',
        feeling: 'Competitiva pero sociable, con emoción por los dados y constante debate. Muy gratificante cuando fluyen los intercambios.',
        hook: 'La interacción continua en el comercio, la sencillez de reglas y una rejugabilidad enorme gracias a su tablero modular.',
        notFor: 'Jugadores que detesten el factor azar de los dados o las disputas directas por recursos escasos.',
        similar: ['Carcassonne', 'Aventureros al Tren', 'Concordia', '7 Wonders'],
        context: 'Piedra angular de la era moderna de los juegos de mesa de estilo europeo creada por Klaus Teuber en 1995.'
      },
      axes: { peso: 2, interaccion: 4, azar: 3, confrontacion: 2, cooperacion: 1, tema: 3, risas: 3, familiar: 5 },
      themes: ['comercio', 'expansion', 'negociacion'],
      moments: ['amigos', 'familia', 'pique_sano', 'sobremesa'],
      oneLiner: 'Dinámico, accesible y muy social negociando recursos en la mesa.',
      confidence: 'alta',
    },
  ],
  artist: [
    {
      title: 'The Beatles (1960)',
      experience: {
        plot: 'El cuarteto de Liverpool revolucionó la música popular desde sus inicios en el beat y el pop británico hasta la vanguardia psicodélica, la experimentación sonora de estudio y el rock clásico.',
        feeling: 'Infecciosamente melódica, ingeniosa, emotiva y atemporal. Genera euforia, ternura y asombro por su maestría compositiva.',
        hook: 'Armonías vocales irrepetibles, evolución constante en cada disco y un catálogo de canciones que forman parte del ADN cultural del mundo.',
        notFor: 'Oyentes que busquen géneros extremos como metal pesado o música electrónica de club.',
        similar: ['The Beach Boys', 'The Rolling Stones', 'Pink Floyd', 'Paul McCartney'],
        context: 'La banda más influyente y vendedora de la historia de la música popular del siglo XX.'
      },
      axes: { energia: 3, tono: 1, profundidad: 4, ritmo: 3, fondo: 2, complejidad: 3 },
      themes: ['amor', 'psicodelia', 'amistad'],
      moments: ['buen_rollo', 'desconectar', 'para_repetir'],
      oneLiner: 'Melodías universales, ingenio desbordante y emoción imperecedera.',
      confidence: 'alta',
    },
  ],
}

/** Validador estricto según MOTOR §5.5 y §2c.1 */
export function validateEnrichment(shelf, itemId, data) {
  const errors = []
  const axesDef = AXES_BY_SHELF[shelf] || []
  const vocabDef = CONTROLLED_VOCAB[shelf] || { themes: [], moments: [] }

  if (!data || typeof data !== 'object') {
    return { ok: false, errors: ['El objeto de enriquecimiento no es válido'] }
  }

  // 1. Ficha de experiencia (MOTOR §2c.1)
  if (!data.experience || typeof data.experience !== 'object') {
    errors.push('Falta el objeto experience con los 6 apartados obligatorios')
  } else {
    const { plot, feeling, hook, notFor, similar, context } = data.experience
    if (!plot || typeof plot !== 'string' || plot.trim().length < 20) {
      errors.push('experience.plot debe tener al menos 20 caracteres')
    }
    if (!feeling || typeof feeling !== 'string' || feeling.trim().length < 20) {
      errors.push('experience.feeling debe tener al menos 20 caracteres')
    }
    if (!hook || typeof hook !== 'string' || hook.trim().length < 20) {
      errors.push('experience.hook debe tener al menos 20 caracteres')
    }
    if (!notFor || typeof notFor !== 'string' || notFor.trim().length < 20) {
      errors.push('experience.notFor debe tener al menos 20 caracteres')
    }
    if (!Array.isArray(similar) || similar.length < 3 || similar.length > 5) {
      errors.push(`experience.similar debe contener entre 3 y 5 obras comparadas (recibido: ${similar?.length || 0})`)
    } else {
      for (const s of similar) {
        if (!s || typeof s !== 'string' || s.trim().length === 0) {
          errors.push('experience.similar contiene nombres de obras vacíos o no válidos')
        }
      }
    }
    if (!context || typeof context !== 'string' || context.trim().length < 10) {
      errors.push('experience.context debe tener al menos 10 caracteres')
    }

    const totalExpLength = (plot || '').length + (feeling || '').length + (hook || '').length +
      (notFor || '').length + (context || '').length + (similar ? similar.join(', ').length : 0)
    if (totalExpLength > 1200) {
      errors.push(`Ficha de experiencia excede 1.200 caracteres (longitud: ${totalExpLength})`)
    }

    const expText = `${plot} ${feeling} ${hook} ${notFor} ${context}`.toLowerCase()
    if (expText.includes('spoiler') || expText.includes('al final muere') || expText.includes('el asesino es')) {
      errors.push('La ficha de experiencia contiene spoilers explícitos no permitidos')
    }
  }

  // 2. Ejes
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

  // 3. Temas (3 a 8 dentro del vocabulario controlado)
  if (!Array.isArray(data.themes) || data.themes.length < 3 || data.themes.length > 8) {
    errors.push(`Temas debe ser un array de 3 a 8 elementos (recibido: ${data.themes?.length})`)
  } else {
    for (const t of data.themes) {
      if (!vocabDef.themes.includes(t)) {
        errors.push(`Tema fuera de vocabulario: "${t}"`)
      }
    }
  }

  // 4. Momentos (1 a 4)
  if (!Array.isArray(data.moments) || data.moments.length < 1 || data.moments.length > 4) {
    errors.push(`Momentos debe ser un array de 1 a 4 elementos (recibido: ${data.moments?.length})`)
  } else {
    for (const m of data.moments) {
      if (!vocabDef.moments.includes(m)) {
        errors.push(`Momento fuera de vocabulario: "${m}"`)
      }
    }
  }

  // 5. OneLiner (<= 90 caracteres)
  if (!data.oneLiner || typeof data.oneLiner !== 'string' || data.oneLiner.length > 90) {
    errors.push(`oneLiner debe ser texto de <= 90 caracteres (longitud: ${data.oneLiner?.length})`)
  }

  // 6. Confianza
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
      'Para cada obra genera: 1) "experience": objeto con 6 apartados obligatorios (plot, feeling, hook, notFor, similar: [3-5 obras], context) sin spoilers y <= 1200 caracteres en total. 2) "axes": valores enteros 1-5 para cada eje según su definición. 3) "themes": 3 a 8 temas del vocabulario permitido. 4) "moments": 1 a 4 momentos del vocabulario permitido. 5) "oneLiner": resumen <= 90 caracteres. 6) "confidence": "alta", "media" o "baja". NO inventes datos; si el contexto es pobre, pon 3 en los ejes dudosos y confidence: "baja".',
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
        experience: e.experience,
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

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (MODE === 'agent') {
    exportAgentBlock()
  } else if (MODE === 'import') {
    importAgentResults()
  } else {
    console.log(`Modo ${MODE} no reconocido. Usa --mode agent o --mode import`)
  }
}
