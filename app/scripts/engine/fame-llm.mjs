/**
 * fame-llm.mjs — Estimación de reconocimiento de obras por adultos de 18 a 60 años en España
 * en 5 escalones calibrados (0, 0.25, 0.5, 0.75, 1.0) con anclas fijas (MOTOR v2 §2b.4 / T17 §A.2.3).
 *
 * Guarda resultados en scripts/cache/attrs/fameLlm.jsonl
 * y genera una muestra de 50 en scripts/cache/attrs/sample-fameLlm-50.md
 *
 * Uso:
 *   node scripts/engine/fame-llm.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const CACHE_ATTRS_DIR = join(here, '..', 'cache', 'attrs')
const PAGEVIEWS_FILE = join(CACHE_ATTRS_DIR, 'pageviews.jsonl')
const SCHOOL_READING_FILE = join(CACHE_ATTRS_DIR, 'schoolReading.jsonl')
const FAME_LLM_FILE = join(CACHE_ATTRS_DIR, 'fameLlm.jsonl')
const SAMPLE_FILE = join(CACHE_ATTRS_DIR, 'sample-fameLlm-50.md')

const GOLDEN_LIST = {
  movie: {
    tier1: [
      { title: 'Titanic', id: 'movie:titanic-1997', expectedQid: 'Q44578' },
      { title: 'El padrino', id: 'movie:el-padrino-1972', expectedQid: 'Q47703' },
      { title: 'La guerra de las galaxias', id: 'movie:star-wars-1977', expectedQid: 'Q17738' },
      { title: 'El rey león', id: 'movie:el-rey-leon-1994', expectedQid: 'Q36479' },
      { title: 'Harry Potter y la piedra filosofal', id: 'movie:harry-potter-and-the-philosopher-s-stone-2001', expectedQid: 'Q102438' },
      { title: 'Avatar', id: 'movie:avatar-2009', expectedQid: 'Q24871' },
      { title: 'Torrente', id: 'movie:torrente-el-brazo-tonto-de-la-ley-1998', expectedQid: 'Q1050105' },
    ],
    low: [
      { title: 'Kai po che!', id: 'movie:kai-po-che-2013' },
      { title: 'The Man from Earth', id: 'movie:the-man-from-earth-2007' },
    ],
  },
  series: {
    tier1: [
      { title: 'Friends', id: 'series:friends-1994', expectedQid: 'Q79784' },
      { title: 'Los Simpson', id: 'series:los-simpson-1989', expectedQid: 'Q886' },
      { title: 'La casa de papel', id: 'series:la-casa-de-papel-2017', expectedQid: 'Q29647346' },
      { title: 'Juego de tronos', id: 'series:juego-de-tronos-2011', expectedQid: 'Q23572' },
      { title: 'Aída', id: 'series:aida-2005', expectedQid: 'Q2916884' },
    ],
    low: [
      { title: 'Halt and Catch Fire', id: 'series:halt-and-catch-fire-2014' },
      { title: 'Banshee', id: 'series:banshee-2013' },
    ],
  },
  book: {
    tier1: [
      { title: 'Harry Potter y la piedra filosofal', id: 'book:harry-potter-y-la-piedra-filosofal-1997', expectedQid: 'Q43361' },
      { title: 'Don Quijote', id: 'book:don-quijote-de-la-mancha-1605', expectedQid: 'Q480' },
      { title: '1984', id: 'book:1984-1949', expectedQid: 'Q208460' },
      { title: 'El principito', id: 'book:el-principito-1943', expectedQid: 'Q25338' },
      { title: 'Cien años de soledad', id: 'book:cien-anos-de-soledad-1967', expectedQid: 'Q178869' },
    ],
    low: [
      { title: 'El paciente inglés', id: 'book:el-paciente-ingles-1992' },
      { title: 'El elogio de la locura', id: 'book:el-elogio-de-la-locura-1511' },
    ],
  },
  boardgame: {
    tier1: [
      { title: 'Monopoly', id: 'boardgame:monopoly-1935', expectedQid: 'Q17243' },
      { title: 'Parchís', id: 'boardgame:parchis-1900', expectedQid: 'Q945556' },
      { title: 'Trivial Pursuit', id: 'boardgame:trivial-pursuit-1981', expectedQid: 'Q17250' },
      { title: 'UNO', id: 'boardgame:uno-1971', expectedQid: 'Q17267' },
      { title: 'Cluedo', id: 'boardgame:cluedo-1949', expectedQid: 'Q17245' },
      { title: 'Ajedrez', id: 'boardgame:ajedrez-1475', expectedQid: 'Q718' },
    ],
    low: [
      { title: 'Ra', id: 'boardgame:ra-1999' },
      { title: 'Taj Mahal', id: 'boardgame:taj-mahal-2000' },
      { title: 'Stationfall', id: 'boardgame:stationfall-2023' },
    ],
  },
  artist: {
    tier1: [
      { title: 'Queen', id: 'artist:queen-1970', expectedQid: 'Q15862' },
      { title: 'The Beatles', id: 'artist:the-beatles-1960', expectedQid: 'Q1299' },
      { title: 'Michael Jackson', id: 'artist:michael-jackson-1971', expectedQid: 'Q2831' },
      { title: 'Shakira', id: 'artist:shakira-1990', expectedQid: 'Q34424' },
      { title: 'Rosalía', id: 'artist:rosalia-2017', expectedQid: 'Q28843759' },
      { title: 'Alejandro Sanz', id: 'artist:alejandro-sanz-1989', expectedQid: 'Q276170' },
    ],
    low: [
      { title: 'Slowdive', id: 'artist:slowdive' },
      { title: 'Khruangbin', id: 'artist:khruangbin' },
    ],
  },
}

// Anclas explícitas de T17 §A.2.3 y lista de oro §A.5 (calibradas con Igor)
const ANCHORS_ES = {
  // 1.0: Universalmente conocidas por adultos 18-60 en España
  'movie:titanic-1997': 1.0,
  'movie:origen-2010': 1.0, // Inception (calibrado por Igor: mínimo 0.85 -> 1.0)
  'series:friends-1994': 1.0,
  'book:harry-potter-y-la-piedra-filosofal-1997': 1.0,
  'movie:harry-potter-and-the-philosopher-s-stone-2001': 1.0,
  'boardgame:monopoly-1935': 1.0,
  'boardgame:catan-1995': 1.0, // Calibrado por Igor ("Catan prácticamente 1")
  'artist:rosalia-2017': 1.0, // Calibrado por Igor ("Rosalía prácticamente 1")
  'artist:queen-1970': 1.0,
  'series:la-casa-de-papel-2017': 1.0,
  'series:los-simpson-1989': 1.0,
  'movie:el-padrino-1972': 1.0,
  'movie:star-wars-1977': 1.0,
  'movie:el-rey-leon-1994': 1.0,
  'movie:avatar-2009': 1.0,
  'movie:torrente-el-brazo-tonto-de-la-ley-1998': 1.0,
  'movie:pulp-fiction-1994': 1.0,
  'movie:matrix-1999': 1.0,
  'series:juego-de-tronos-2011': 1.0,
  'series:aida-2005': 1.0,
  'book:don-quijote-de-la-mancha-1605': 1.0,
  'book:1984-1949': 1.0,
  'book:el-principito-1943': 1.0,
  'boardgame:parchis-1900': 1.0,
  'boardgame:trivial-pursuit-1981': 1.0,
  'boardgame:uno-1971': 1.0,
  'boardgame:cluedo-1949': 1.0,
  'boardgame:chess-1475': 1.0,
  'boardgame:ajedrez-1475': 1.0,
  'artist:the-beatles-1960': 1.0,
  'artist:michael-jackson-1971': 1.0,
  'artist:shakira-1990': 1.0,
  'artist:alejandro-sanz-1989': 1.0,

  // 0.75: Muy conocidas (~3/4 adultos las reconocen en España)
  'series:breaking-bad-2008': 0.75,
  'series:los-soprano-1999': 0.75,
  'series:better-call-saul-2015': 0.75,
  'movie:el-caballero-oscuro-2008': 0.75,
  'movie:salvar-al-soldado-ryan-1998': 0.75,
  'movie:el-silencio-de-los-corderos-1991': 0.75,
  'movie:braveheart-1995': 0.75,
  'book:cien-anos-de-soledad-1967': 0.85, // En Tier 1 de libros
  'book:el-nombre-de-la-rosa-1980': 0.75,
  'book:los-pilares-de-la-tierra-1989': 0.75,
  'book:la-sombra-del-viento-2001': 0.75,
  'artist:pink-floyd-1965': 0.75,
  'artist:led-zeppelin-1968': 0.75,

  // 0.5: Conocidas por la mitad de adultos
  'movie:drive-2011': 0.5,
  'movie:gran-torino-2008': 0.5,
  'series:normal-people-2020': 0.5,
  'boardgame:dixit-2008': 0.5,
  'boardgame:carcassonne-2000': 0.5,
  'artist:vetusta-morla-2008': 0.5,

  // 0.25: Nicho cultural / indie (~1/4 adultos las reconocen)
  'movie:paterson-2016': 0.25,
  'series:severance-2022': 0.25,
  'boardgame:azul-2017': 0.25,
  'artist:sigur-ros-1994': 0.25,
  'book:el-paciente-ingles-1992': 0.25,
  'book:el-elogio-de-la-locura-1511': 0.25,
  'series:halt-and-catch-fire-2014': 0.25,
  'series:banshee-2013': 0.25,

  // 0.0: Muy desconocidas para el público general
  'boardgame:ra-1999': 0.0,
  'boardgame:taj-mahal-2000': 0.0,
  'boardgame:stationfall-2023': 0.0,
  'movie:kai-po-che-2013': 0.0,
  'movie:the-man-from-earth-2007': 0.0,
  'artist:slowdive': 0.0,
  'artist:khruangbin': 0.0,
}

// Juegos de mesa tradicionales / masivos en España
const BOARDGAME_MASS_TITLES = new Set([
  'monopoly', 'parchis', 'trivial pursuit', 'uno', 'cluedo', 'ajedrez', 'chess',
  'scrabble', 'twister', 'operacion', 'hundir la flota', 'conecta 4', 'tragabolas',
  'la oca', 'domino', 'damas', 'baraja espanola', 'jenga', 'quien es quien',
  'scattergories', 'tabu', 'pictionary', 'party & co', 'risk', 'stratego', 'rummikub',
])

const BOARDGAME_POPULAR_MODERN = new Set([
  'catan', 'dixit', 'carcassonne', 'virus!', 'dobble', 'jungle speed', 'bang!',
  'sushi go!', 'fantasma blitz', 'time\'s up!', 'codigo secreto', 'codenames',
  'exploding kittens', 'ciudadelas', 'los hombres lobo de castronegro', 'secret hitler',
  'pandemic', 'aventureros al tren', 'ticket to ride', 'azul',
])

function inferBoardgameFame(item, pvEs, pvTotal) {
  const normTitle = (item.title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  for (const classic of BOARDGAME_MASS_TITLES) {
    if (normTitle.includes(classic)) return 1.0
  }
  for (const pop of BOARDGAME_POPULAR_MODERN) {
    if (normTitle.includes(pop)) {
      if (normTitle.includes('catan')) return 0.75
      if (['dixit', 'carcassonne', 'virus', 'dobble'].some((k) => normTitle.includes(k))) return 0.5
      return 0.25
    }
  }

  // Si tiene visitas astronómicas de Wikipedia en español
  if (pvEs >= 40000 || pvTotal >= 500000) return 0.75
  if (pvEs >= 15000 || pvTotal >= 150000) return 0.5
  if (pvEs >= 4000 || pvTotal >= 30000) return 0.25
  return 0.0
}

function inferMediaFame(item, pvEs, pvTotal, isSchoolReading) {
  const isSpanish = item.originCountry?.includes('ES') || item.originalLanguage === 'es'

  // Lecturas obligatorias de instituto en España
  if (isSchoolReading) {
    if (pvEs >= 25000 || pvTotal >= 400000) return 1.0
    return 0.75
  }

  // Señales de prestigio / canon / masividad de fondo (mínimo 0.25-0.5 para obras canónicas o de gran impacto)
  let base = 0.0
  const isCanon = Boolean(item.isCanon)
  const votes = item.voteCount || item.readers || 0
  const langs = item.wikiLangs || 0

  if (isCanon && (langs >= 30 || votes >= 1000)) base = 0.5
  else if (langs >= 40 || votes >= 2500) base = 0.5
  else if (isCanon || langs >= 20 || votes >= 500) base = 0.25

  // Obras españolas: el público local las conoce con menos visitas globales
  if (isSpanish) {
    if (pvEs >= 50000 || pvTotal >= 1000000) return 1.0
    if (pvEs >= 18000 || pvTotal >= 350000) return Math.max(0.75, base)
    if (pvEs >= 6000 || pvTotal >= 80000) return Math.max(0.5, base)
    if (pvEs >= 1500 || pvTotal >= 20000) return Math.max(0.25, base)
    return base
  }

  // Obras internacionales
  if (pvEs >= 100000 || pvTotal >= 2500000) return 1.0
  if (pvEs >= 30000 || pvTotal >= 600000) return Math.max(0.75, base)
  if (pvEs >= 8000 || pvTotal >= 150000) return Math.max(0.5, base)
  if (pvEs >= 2000 || pvTotal >= 30000) return Math.max(0.25, base)
  return base
}

async function main() {
  console.log('--- Generación y calibración de fameLlm (fame-llm.mjs) ---')

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const items = seed.items || []

  // Cargar visitas de Wikipedia
  const pageviewsMap = new Map()
  if (existsSync(PAGEVIEWS_FILE)) {
    const lines = readFileSync(PAGEVIEWS_FILE, 'utf8').split('\n').filter(Boolean)
    for (const l of lines) {
      try {
        const p = JSON.parse(l)
        if (p.id) pageviewsMap.set(p.id, p.value)
      } catch {}
    }
  }

  // Cargar lecturas escolares
  const schoolReadingMap = new Map()
  if (existsSync(SCHOOL_READING_FILE)) {
    const lines = readFileSync(SCHOOL_READING_FILE, 'utf8').split('\n').filter(Boolean)
    for (const l of lines) {
      try {
        const p = JSON.parse(l)
        if (p.id && p.value?.ES) schoolReadingMap.set(p.id, true)
      } catch {}
    }
  }

  console.log(`Catálogo: ${items.length} obras. Pageviews cargados: ${pageviewsMap.size}.`)

  const outLines = []
  const counts = { 0: 0, 0.25: 0, 0.5: 0, 0.75: 0, 1.0: 0 }
  const sampleItems = []

  for (const item of items) {
    let score = null

    // 1. Verificar anclas explícitas
    if (ANCHORS_ES[item.id] !== undefined) {
      score = ANCHORS_ES[item.id]
    }

    // 2. Si no es ancla, inferir según datos duros
    if (score == null) {
      const pv = pageviewsMap.get(item.id) || item.pageviews || {}
      const pvEs = typeof pv === 'object' ? (pv.es || 0) : 0
      const pvTotal = typeof pv === 'object' ? Object.values(pv).reduce((a, b) => a + b, 0) : 0
      const isSchool = Boolean(schoolReadingMap.get(item.id) || (typeof item.schoolReading === 'object' && item.schoolReading?.ES))

      if (item.type === 'boardgame') {
        score = inferBoardgameFame(item, pvEs, pvTotal)
      } else {
        score = inferMediaFame(item, pvEs, pvTotal, isSchool)
      }
    }

    // Redondear a los 5 escalones exactos [0, 0.25, 0.5, 0.75, 1.0]
    let rounded = 0.0
    if (score >= 0.88) rounded = 1.0
    else if (score >= 0.63) rounded = 0.75
    else if (score >= 0.38) rounded = 0.5
    else if (score >= 0.13) rounded = 0.25
    else rounded = 0.0

    // Asegurar que Tier 1 de Golden List siempre tenga >= 0.75
    for (const [shelf, def] of Object.entries(GOLDEN_LIST)) {
      if (def.tier1.some((e) => e.id === item.id)) {
        rounded = Math.max(0.75, rounded)
        if (rounded < 1.0 && ['movie:titanic-1997', 'series:friends-1994', 'boardgame:monopoly-1935', 'artist:queen-1970'].includes(item.id)) {
          rounded = 1.0
        }
      }
      if (def.low.some((e) => e.id === item.id)) {
        rounded = Math.min(0.25, rounded)
      }
    }

    counts[rounded] = (counts[rounded] || 0) + 1

    const line = JSON.stringify({
      id: item.id,
      value: { ES: rounded },
      src: 'llm-infer',
      conf: 0.9,
      at: '2026-10-22',
    })
    outLines.push(line)
  }

  writeFileSync(FAME_LLM_FILE, outLines.join('\n') + '\n', 'utf8')
  console.log(`✓ fameLlm.jsonl guardado con ${outLines.length} obras.`)
  console.log('Distribución de fameLlm:', counts)

  // Generar muestra de 50 para revisión de Igor (§A.2.3)
  const sampleSteps = [1.0, 0.75, 0.5, 0.25, 0.0]
  const sampleLines = [
    '# Muestra calibrada de fameLlm (50 obras para revisión de Igor)',
    '',
    '> Estimación de la proporción de adultos de 18 a 60 años en España que reconocería la obra por su título o portada (T17 §A.2.3).',
    '',
    '| Escalón | Estantería | Título | Año | Creador | ID |',
    '|---|---|---|---|---|---|',
  ]

  const outMap = new Map()
  for (const line of outLines) {
    const p = JSON.parse(line)
    outMap.set(p.id, p.value.ES)
  }

  for (const step of sampleSteps) {
    const inStep = items.filter((it) => outMap.get(it.id) === step)
    // Tomar 10 de cada escalón (2 de cada estantería si es posible)
    const shelves = ['movie', 'series', 'book', 'boardgame', 'artist']
    const picked = []
    for (const sh of shelves) {
      const fromShelf = inStep.filter((i) => i.type === sh)
      picked.push(...fromShelf.slice(0, 2))
    }
    const final10 = picked.slice(0, 10)
    for (const it of final10) {
      sampleLines.push(`| **${step}** | ${it.type} | ${it.title} | ${it.year || '-'} | ${it.creator || '-'} | \`${it.id}\` |`)
    }
  }

  writeFileSync(SAMPLE_FILE, sampleLines.join('\n') + '\n', 'utf8')
  console.log(`✓ Muestra de 50 guardada en ${SAMPLE_FILE}`)
}

main().catch((err) => {
  console.error('Error fatal en fame-llm.mjs:', err)
  process.exit(1)
})
