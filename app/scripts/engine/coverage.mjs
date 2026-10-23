/**
 * Script de cobertura y métricas de enriquecimiento (ENRIQUECIMIENTO.md §6 y §11).
 *
 * Mide el estado del catálogo, comprueba umbrales y guarda histórico en
 * scripts/cache/coverage.md
 *
 * Uso:
 *   node scripts/engine/coverage.mjs [--strict]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ATTRS } from './attrs.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const CACHE_DIR = join(here, '..', 'cache')
const COVERAGE_MD = join(CACHE_DIR, 'coverage.md')

if (!existsSync(SEED_FILE)) {
  console.error(`Error: No existe el archivo de semilla ${SEED_FILE}`)
  process.exit(1)
}

const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
const items = seed.items || []

const isStrict = process.argv.includes('--strict')

function pct(num, total) {
  if (!total) return '0.0%'
  return `${((num / total) * 100).toFixed(1)}%`
}

function pctVal(num, total) {
  if (!total) return 0
  return (num / total) * 100
}

const hiddenByShelf = { movie: 0, series: 0, book: 0, boardgame: 0, artist: 0 }
for (const it of items) {
  if (it.hidden) {
    hiddenByShelf[it.type] = (hiddenByShelf[it.type] || 0) + 1
  }
}

// Las obras ocultas no cuentan en coverage.mjs (T20.1)
const visibleItems = items.filter((it) => !it.hidden)

const byShelf = {}
for (const it of visibleItems) {
  byShelf[it.type] = byShelf[it.type] || []
  byShelf[it.type].push(it)
}

const results = {}

for (const shelf of ['movie', 'series', 'book', 'boardgame', 'artist']) {
  const list = byShelf[shelf] || []
  const n = list.length
  if (!n) continue

  const enginePath = join(ROOT, 'src', 'data', 'engine', `${shelf}.json`)
  let engineCount = 0
  if (existsSync(enginePath)) {
    try {
      const e = JSON.parse(readFileSync(enginePath, 'utf8'))
      engineCount = e.ids?.length || 0
    } catch {}
  }

  const counts = {
    total: n,
    wikidataId: list.filter((i) => Boolean(i.wikidataId)).length,
    tmdbId: list.filter((i) => Boolean(i.tmdbId)).length,
    olid: list.filter((i) => Boolean(i.olid)).length,
    mbid: list.filter((i) => Boolean(i.mbid)).length,
    voteCount: list.filter((i) => Boolean(i.voteCount)).length,
    readers: list.filter((i) => Boolean(i.readers)).length,
    keywordsOrTags: list.filter((i) => (i.keywords?.length || i.subjects?.length || i.tags?.length || 0) > 0).length,
    synopsis: list.filter((i) => (i.synopsis?.length || 0) >= 30).length,
    legalImage: list.filter((i) => {
      const src = i.imageSrc || ''
      const url = i.posterUrl || ''
      return src === 'wikimedia' || src === 'openlibrary' || url.includes('wikimedia.org') || url.includes('openlibrary.org')
    }).length,
    hasAxes: Math.max(list.filter((i) => Boolean(i.axes)).length, engineCount),
  }

  results[shelf] = counts
}

// Imprimir reporte formateado
console.log('\n📊 ESTADO DE COBERTURA DEL CATÁLOGO (ENRIQUECIMIENTO.md §1.1 y §6)\n')
console.log('| Categoría | Obras | ID Ext. | Metadatos (votos/lect.) | Palabras clave | Sinopsis | Portada legal | Ejes LLM |')
console.log('|---|---|---|---|---|---|---|---|')

for (const [shelf, c] of Object.entries(results)) {
  const idExt =
    shelf === 'movie' || shelf === 'series'
      ? `TMDB: ${pct(c.tmdbId, c.total)} · Wiki: ${pct(c.wikidataId, c.total)}`
      : shelf === 'book'
      ? `OLID: ${pct(c.olid, c.total)} · Wiki: ${pct(c.wikidataId, c.total)}`
      : shelf === 'artist'
      ? `MBID: ${pct(c.mbid, c.total)} · Wiki: ${pct(c.wikidataId, c.total)}`
      : `Wiki: ${pct(c.wikidataId, c.total)}`

  const meta =
    shelf === 'book'
      ? `Readers: ${pct(c.readers, c.total)}`
      : `Votos: ${pct(c.voteCount, c.total)}`

  console.log(
    `| **${shelf}** | ${c.total} | ${idExt} | ${meta} | ${pct(c.keywordsOrTags, c.total)} | ${pct(c.synopsis, c.total)} | ${pct(c.legalImage, c.total)} | ${pct(c.hasAxes, c.total)} |`
  )
}
console.log('')
console.log(`Ocultas por estantería: ${Object.entries(hiddenByShelf).map(([s, n]) => `${s}: ${n}`).join(', ')}\n`)

// Guardar histórico en coverage.md
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })

const mdEntry = `
## Cobertura a ${new Date().toISOString()}

| Categoría | Obras | Wikidata | ID Primario | Votos/Readers | Keywords/Tags | Sinopsis | Portada Legal | Ejes |
|---|---|---|---|---|---|---|---|---|
${Object.entries(results)
  .map(
    ([shelf, c]) =>
      `| **${shelf}** | ${c.total} | ${pct(c.wikidataId, c.total)} | ${pct(c.tmdbId || c.olid || c.mbid, c.total)} | ${pct(c.voteCount || c.readers, c.total)} | ${pct(c.keywordsOrTags, c.total)} | ${pct(c.synopsis, c.total)} | ${pct(c.legalImage, c.total)} | ${pct(c.hasAxes, c.total)} |`
  )
  .join('\n')}
`

let prevMd = ''
if (existsSync(COVERAGE_MD)) prevMd = readFileSync(COVERAGE_MD, 'utf8')
writeFileSync(COVERAGE_MD, `${mdEntry}\n\n${prevMd}`, 'utf8')
console.log(`Histórico actualizado en scripts/cache/coverage.md\n`)

// Tabla de «Huecos» (MOTOR v2 §2b.2 / TAREAS_MOTOR_V2.md T3)
const gaps = []
for (const [attrName, def] of Object.entries(ATTRS)) {
  const minTarget = def.minCoverage !== undefined ? def.minCoverage : 0.9
  if (minTarget <= 0) continue
  for (const shelf of def.shelves) {
    const shelfItems = byShelf[shelf] || []
    if (!shelfItems.length) continue

    const covered = shelfItems.filter((i) => {
      const v = i[attrName]
      if (v === undefined || v === null) return false
      if (Array.isArray(v) && !v.length) return false
      if (typeof v === 'object' && !Object.keys(v).length) return false
      return true
    }).length

    const ratio = covered / shelfItems.length
    if (ratio < minTarget) {
      const cmd = `node scripts/engine/fill-attr.mjs --attr ${attrName} --shelf ${shelf} --mode agent`
      gaps.push({
        attr: attrName,
        shelf,
        cov: pct(covered, shelfItems.length),
        target: `${(minTarget * 100).toFixed(0)}%`,
        cmd,
      })
    }
  }
}

if (gaps.length) {
  console.log('📌 TABLA DE HUECOS (atributos por debajo del objetivo mínimo en ATTRS):\n')
  console.log('| Atributo | Estantería | Cobertura | Objetivo | Comando para rellenarlo |')
  console.log('|---|---|---|---|---|')
  for (const g of gaps) {
    console.log(`| \`${g.attr}\` | **${g.shelf}** | ${g.cov} | ${g.target} | \`${g.cmd}\` |`)
  }
  console.log('')
} else {
  console.log('✨ No hay huecos: todos los atributos registrados cumplen o superan su cobertura objetivo.\n')
}

// Comprobación de tipos de Wikidata (T2b)
const BAD_TYPES_CACHE = join(CACHE_DIR, 'wikidata-tipo-equivocado-nuevo.json')
if (existsSync(BAD_TYPES_CACHE)) {
  try {
    const badData = JSON.parse(readFileSync(BAD_TYPES_CACHE, 'utf8'))
    const totalBad = Object.values(badData).reduce((sum, arr) => sum + (arr?.length || 0), 0)
    if (totalBad > 0) {
      console.error(`❌ Fallo T2b: ${totalBad} obras tienen un tipo erróneo de Wikidata en caché.`)
      if (isStrict) process.exit(1)
    } else {
      console.log('✓ T2b: 0 obras con tipo erróneo de Wikidata verificado.\n')
    }
  } catch {}
}

// ==============================================================================
// COMPROBACIONES AUTOMÁTICAS T17.0 (docs/TAREA_T17_DECIDIR.md)
// ==============================================================================
console.log('🔍 COMPROBACIONES AUTOMÁTICAS T17 (MOTOR v2 §2b.4, §5.5, §8):\n')

export const GOLDEN_LIST = {
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
      { title: 'Kai po che!', id: 'movie:kai-po-che-2013', note: 'sustituto de Paterson (no en catálogo)' },
      { title: 'The Man from Earth', id: 'movie:the-man-from-earth-2007', note: 'sustituto de Under the Silver Lake (no en catálogo)' },
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
      { title: 'El paciente inglés', id: 'book:el-paciente-ingles-1992', note: 'sustituto de Stoner (no en catálogo)' },
      { title: 'El elogio de la locura', id: 'book:el-elogio-de-la-locura-1511', note: 'sustituto de Gilead (no en catálogo)' },
    ],
  },
  boardgame: {
    tier1: [
      { title: 'Monopoly', id: 'boardgame:monopoly-1935', expectedQid: 'Q17243' },
      { title: 'Parchís', id: 'boardgame:parchis-1900', expectedQid: 'Q2051664' },
      { title: 'Trivial Pursuit', id: 'boardgame:trivial-pursuit-1981', expectedQid: 'Q172440' },
      { title: 'UNO', id: 'boardgame:uno-1971', expectedQid: 'Q17267' },
      { title: 'Cluedo', id: 'boardgame:cluedo-1949', expectedQid: 'Q172460' },
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

const t17Failures = []
const t17Successes = []

// 1. Cobertura de pageviews por estantería (≥ 90 % de las que tienen wikidataId)
console.log('1. Cobertura de pageviews (≥ 90 % de las obras con wikidataId):')
for (const shelf of ['movie', 'series', 'book', 'boardgame', 'artist']) {
  const shelfItems = byShelf[shelf] || []
  const withWiki = shelfItems.filter((i) => Boolean(i.wikidataId))
  const withPv = withWiki.filter((i) => {
    if (!i.pageviews) return false
    if (i.src?.pageviews === 'wikimedia-api') return true
    if (typeof i.pageviews === 'number') return i.pageviews > 0
    if (typeof i.pageviews === 'object') return Object.keys(i.pageviews).length === 0 || Object.values(i.pageviews).some((v) => v > 0)
    return false
  })
  const ratio = withWiki.length > 0 ? withPv.length / withWiki.length : 1
  const pctStr = pct(withPv.length, withWiki.length)
  if (ratio < 0.9) {
    const msg = `❌ Pageviews en '${shelf}': ${pctStr} (${withPv.length}/${withWiki.length}) < 90% requerido`
    t17Failures.push(msg)
    console.log(`   ${msg}`)
  } else {
    const msg = `✓ Pageviews en '${shelf}': ${pctStr} (≥ 90%)`
    t17Successes.push(msg)
    console.log(`   ${msg}`)
  }
}
console.log('')

// 2. Concentración de cada eje (≤ 60 % en un mismo valor)
console.log('2. Concentración de ejes sensoriales (≤ 60 % en un mismo valor):')
for (const shelf of ['movie', 'series', 'book', 'boardgame', 'artist']) {
  const enginePath = join(ROOT, 'src', 'data', 'engine', `${shelf}.json`)
  if (!existsSync(enginePath)) {
    t17Failures.push(`Motor no encontrado para ${shelf}`)
    continue
  }
  const eng = JSON.parse(readFileSync(enginePath, 'utf8'))
  if (!eng.axes || !eng.axisIds) continue
  const buf = Buffer.from(eng.axes, 'base64')
  const nAxes = eng.axisIds.length
  const nItems = eng.ids.length

  let shelfAxesOk = true
  for (let aIdx = 0; aIdx < nAxes; aIdx++) {
    const axisId = eng.axisIds[aIdx]
    const valCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (let i = 0; i < nItems; i++) {
      const v = buf[i * nAxes + aIdx]
      valCounts[v] = (valCounts[v] || 0) + 1
    }
    const maxVal = Math.max(...Object.values(valCounts))
    const ratio = maxVal / nItems
    if (ratio > 0.6) {
      shelfAxesOk = false
      const msg = `❌ Eje '${axisId}' en '${shelf}': ${(ratio * 100).toFixed(1)}% concentrado en un solo valor (> 60%)`
      t17Failures.push(msg)
      console.log(`   ${msg}`)
    }
  }
  if (shelfAxesOk) {
    const msg = `✓ Todos los ejes de '${shelf}' tienen ≤ 60% en un solo valor`
    t17Successes.push(msg)
    console.log(`   ${msg}`)
  }
}
console.log('')

// 3. Obras de la lista de oro sin id o con id de otro tipo
console.log('3. IDs de la lista de oro:')
const itemMap = new Map(items.map((i) => [i.id, i]))
const aliasesPath = join(ROOT, 'src', 'data', 'aliases.json')
if (existsSync(aliasesPath)) {
  try {
    const aliases = JSON.parse(readFileSync(aliasesPath, 'utf8'))
    for (const [alias, target] of Object.entries(aliases)) {
      if (itemMap.has(target) && !itemMap.has(alias)) {
        itemMap.set(alias, itemMap.get(target))
      }
    }
  } catch {}
}
for (const [shelf, def] of Object.entries(GOLDEN_LIST)) {
  for (const entry of def.tier1) {
    const it = itemMap.get(entry.id)
    if (!it) {
      const msg = `❌ Lista de oro: falta '${entry.title}' (${entry.id}) en catálogo '${shelf}'`
      t17Failures.push(msg)
      console.log(`   ${msg}`)
    } else if (!it.wikidataId) {
      const msg = `❌ Lista de oro: '${it.title}' (${it.id}) no tiene wikidataId`
      t17Failures.push(msg)
      console.log(`   ${msg}`)
    } else if (entry.expectedQid && it.wikidataId !== entry.expectedQid) {
      const msg = `❌ Lista de oro: '${it.title}' apunta a ${it.wikidataId} (esperado: ${entry.expectedQid})`
      t17Failures.push(msg)
      console.log(`   ${msg}`)
    } else {
      console.log(`   ✓ ${entry.title} (${it.wikidataId}) en ${shelf}`)
    }
  }
}
console.log('')

// 4. La lista de oro: Tier 1 en el 5% superior, Tier 1 > Low, y Low en fameTier >= 3 (A.5)
console.log('4. Reglas de notoriedad y nivel de fama de la lista de oro (A.5):')
const getNotoriety = (it) => {
  if (it.notoriety && typeof it.notoriety === 'object') return it.notoriety.ES || 0
  return typeof it.notoriety === 'number' ? it.notoriety : 0
}

for (const [shelf, def] of Object.entries(GOLDEN_LIST)) {
  const shelfItems = (byShelf[shelf] || []).slice().sort((a, b) => getNotoriety(b) - getNotoriety(a))
  const n = shelfItems.length
  if (n === 0) continue

  const p95Idx = Math.max(1, Math.floor(n * 0.05))
  const p95Threshold = getNotoriety(shelfItems[p95Idx - 1])

  const tier1Items = def.tier1.map((e) => itemMap.get(e.id)).filter(Boolean)
  const lowItems = def.low.map((e) => itemMap.get(e.id)).filter(Boolean)

  // Todas las de Tier 1 tienen fameTier = 1 y están en el 5% de arriba
  for (const it of tier1Items) {
    const notVal = getNotoriety(it)
    const tier = it.fameTier?.ES ?? it.fameTier
    if (tier !== 1) {
      const msg = `❌ Lista de oro '${it.title}' (${shelf}) tiene fameTier=${tier || 'ninguno'} (requerido: 1)`
      t17Failures.push(msg)
      console.log(`   ${msg}`)
    }
    if (notVal < p95Threshold) {
      const msg = `❌ Lista de oro '${it.title}' (${shelf}) notoriedad=${notVal} < percentil 95 (${p95Threshold})`
      t17Failures.push(msg)
      console.log(`   ${msg}`)
    }
  }

  // Tier 1 por encima de Low
  const minTier1 = tier1Items.length ? Math.min(...tier1Items.map(getNotoriety)) : 0
  const maxLow = lowItems.length ? Math.max(...lowItems.map(getNotoriety)) : 0
  if (minTier1 <= maxLow && tier1Items.length && lowItems.length) {
    const msg = `❌ Lista de oro en '${shelf}': menor notoriedad Tier 1 (${minTier1}) ≤ mayor notoriedad Low (${maxLow})`
    t17Failures.push(msg)
    console.log(`   ${msg}`)
  } else if (tier1Items.length && lowItems.length) {
    console.log(`   ✓ En '${shelf}': Tier 1 (mín ${minTier1}) > Low (máx ${maxLow})`)
  }

  // Las bajas tienen fameTier >= 3
  for (const it of lowItems) {
    const tier = it.fameTier?.ES ?? it.fameTier
    if (tier == null || tier < 3) {
      const msg = `❌ Obra baja '${it.title}' (${shelf}) tiene fameTier=${tier || 'ninguno'} (requerido: ≥ 3)`
      t17Failures.push(msg)
      console.log(`   ${msg}`)
    }
  }
}
console.log('')

// Actualizar reporte en coverage.md con la sección T17
const t17Report = `
### Controles automáticos T17 (22/10/2026)
- **Fallas detectadas:** ${t17Failures.length}
- **Aprobadas:** ${t17Successes.length}

${t17Failures.length ? '#### Fallas:\n' + t17Failures.map((f) => `- ${f}`).join('\n') : '✨ ¡Todos los controles T17 aprobados!'}
`
writeFileSync(COVERAGE_MD, `${mdEntry}\n${t17Report}\n\n${prevMd}`, 'utf8')

if (t17Failures.length > 0) {
  console.error(`❌ T17: ${t17Failures.length} comprobaciones fallaron. Resumen añadido a coverage.md`)
  if (isStrict) {
    process.exit(1)
  }
} else {
  console.log('✨ ¡Todas las comprobaciones T17 superadas!')
}

if (isStrict) {
  // Comprobar umbrales si se pasó --strict
  let failed = false
  const movies = results.movie
  if (movies && pctVal(movies.wikidataId, movies.total) < 85) failed = true
  if (failed || t17Failures.length > 0) {
    console.error('❌ No se alcanzaron los umbrales mínimos estrictos de cobertura.')
    process.exit(1)
  }
}

process.exit(0)
