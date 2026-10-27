/**
 * justwatch.mjs — Comportamiento REAL de espectadores en España a partir de JustWatch España.
 *
 * Para cada serie (o película) del catálogo:
 *   1. Obtiene su ficha en JustWatch España (vía slug directo o búsqueda GraphQL).
 *   2. Extrae el bloque «A las personas a las que les gustó {título} también les gustó» (similarTitles).
 *   3. Cruza los similares con el catálogo por slug, tmdbId y título normalizado.
 *   4. Genera pares no ordenados con peso decreciente según la posición en la lista.
 *   5. Escribe cache/graph/cooc-justwatch.jsonl (source: "justwatch-es").
 *
 * Respeta rigurosamente:
 *   - ≤ 1 petición/s por dominio (throttling estricto de 1.000 ms).
 *   - User-Agent: BibliotecaApp/1.0 (biblioteca-social.vercel.app)
 *   - Reintentos con espera exponencial ante 429/503.
 *   - Caché por obra en cache/graph/sources/justwatch/<shelf>/<id>.json (reanudable).
 *   - IDs canónicos según aliases.json.
 *   - Sin tocar app/src ni hacer commits.
 *
 * Uso:
 *   node scripts/brain/sources/justwatch.mjs                     # series por defecto
 *   node scripts/brain/sources/justwatch.mjs --retry-not-found  # reintenta solo las no encontradas
 *   node scripts/brain/sources/justwatch.mjs --shelf movie       # películas
 *   node scripts/brain/sources/justwatch.mjs --build-only        # solo compila jsonl desde caché
 *   node scripts/brain/sources/justwatch.mjs --limit 20          # prueba con 20 obras
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const APP_DIR = join(here, '..', '..', '..')
const SEED_FILE = join(APP_DIR, 'src', 'data', 'seed.json')
const ALIASES_FILE = join(APP_DIR, 'src', 'data', 'aliases.json')
const CACHE_DIR = join(APP_DIR, 'scripts', 'cache')
const GRAPH_DIR = join(CACHE_DIR, 'graph')
const JW_CACHE_BASE = join(GRAPH_DIR, 'sources', 'justwatch')
const OUT_FILE = join(GRAPH_DIR, 'cooc-justwatch.jsonl')

const USER_AGENT = 'BibliotecaApp/1.0 (biblioteca-social.vercel.app)'
const MIN_GAP_MS = 1000 // Máximo 1 req/s
const RETRY_DELAYS = [5000, 15000, 45000] // Reintentos ante 429/5xx

// Argumentos CLI
const args = process.argv.slice(2)
const shelfArg = args.includes('--shelf') ? args[args.indexOf('--shelf') + 1] : 'series'
const limitArg = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity
const buildOnly = args.includes('--build-only')
const retryNotFound = args.includes('--retry-not-found')

const SHELF = shelfArg || 'series'
const JW_TYPE_PREFIX = SHELF === 'movie' ? 'pelicula' : 'serie'
const JW_GRAPHQL_TYPE = SHELF === 'movie' ? 'MOVIE' : 'SHOW'

const JW_CACHE_DIR = join(JW_CACHE_BASE, SHELF)
mkdirSync(JW_CACHE_DIR, { recursive: true })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function norm(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function cleanTitle(title) {
  return String(title || '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*:\s*.*/, '')
    .trim()
}

// Throttling global de red
let lastReqTime = 0
async function waitForTurn() {
  const waitTime = lastReqTime + MIN_GAP_MS - Date.now()
  if (waitTime > 0) await sleep(waitTime)
  lastReqTime = Date.now()
}

async function fetchWithRetry(url, options = {}, maxRetries = RETRY_DELAYS.length) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await waitForTurn()
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': USER_AGENT,
          ...(options.headers || {}),
        },
      })

      if (res.status === 429 || res.status >= 500) {
        if (attempt < maxRetries) {
          const delay = RETRY_DELAYS[attempt] || 45000
          console.warn(`    [HTTP ${res.status}] Reintento ${attempt + 1}/${maxRetries} en ${delay / 1000}s...`)
          await sleep(delay)
          continue
        }
      }

      return res
    } catch (err) {
      if (attempt < maxRetries) {
        const delay = RETRY_DELAYS[attempt] || 45000
        console.warn(`    [Error red: ${err.message}] Reintento ${attempt + 1} en ${delay / 1000}s...`)
        await sleep(delay)
        continue
      }
      throw err
    }
  }
}

// Carga de catálogo y alias
const seedRaw = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
const aliases = JSON.parse(readFileSync(ALIASES_FILE, 'utf8'))
const canon = (id) => aliases[id] || id

const allItems = (seedRaw.items || seedRaw).map((it) => ({
  ...it,
  id: canon(it.id),
}))

const shelfItems = allItems.filter((it) => it.type === SHELF && !it.hidden)
console.log(`\n=== JustWatch España [${SHELF}] ===`)
console.log(`Catálogo activo: ${shelfItems.length} obras`)

// Construir índice para cruce rápido
const byExactSlug = new Map()
const byNormTitle = new Map()
const byTmdb = new Map()
const byId = new Map()

for (const it of shelfItems) {
  byId.set(it.id, it)
  if (it.tmdbId) byTmdb.set(String(it.tmdbId), it)

  const registerSlug = (s) => {
    if (!s) return
    const sl = slugify(s)
    if (!byExactSlug.has(sl)) byExactSlug.set(sl, it)
  }
  const registerTitle = (t) => {
    if (!t) return
    const nt = norm(t)
    if (!byNormTitle.has(nt)) byNormTitle.set(nt, [])
    if (!byNormTitle.get(nt).includes(it)) byNormTitle.get(nt).push(it)
  }

  // Slugs derivados del ID
  const idSlugFull = it.id.replace(/^(?:series|movie):/, '')
  const idSlugNoYear = idSlugFull.replace(/-\d{4}$/, '')
  registerSlug(idSlugFull)
  registerSlug(idSlugNoYear)

  // Despojando modificadores regionales (-ee-uu-, -us-, -uk-)
  const idClean = idSlugFull.replace(/-(?:ee-uu|us|uk)(?:-|$)/, '-').replace(/-$/, '')
  registerSlug(idClean)
  registerSlug(idClean.replace(/-\d{4}$/, ''))

  // Título y título limpio
  registerSlug(it.title)
  if (it.year) registerSlug(`${it.title}-${it.year}`)
  const ct = cleanTitle(it.title)
  registerSlug(ct)
  if (it.year) registerSlug(`${ct}-${it.year}`)

  registerTitle(it.title)
  registerTitle(ct)

  // Títulos alternativos / localizados
  for (const alt of Object.values(it.titles || {})) {
    registerSlug(alt)
    if (it.year) registerSlug(`${alt}-${it.year}`)
    registerTitle(alt)
  }
}

function matchSimilarToCatalog(sim) {
  // 1. Cruce por slug de JustWatch (ej. /es/serie/better-call-saul -> better-call-saul)
  const slug = sim.url.replace(/^\/es\/(?:serie|pelicula)\//, '').replace(/\/$/, '')
  if (byExactSlug.has(slug)) return byExactSlug.get(slug)

  // Con o sin año al final
  const slugNoYear = slug.replace(/-\d{4}$/, '')
  if (byExactSlug.has(slugNoYear)) return byExactSlug.get(slugNoYear)

  // 2. Cruce por título normalizado
  const nt = norm(sim.title)
  const candidates = byNormTitle.get(nt)
  if (candidates && candidates.length > 0) {
    if (candidates.length === 1) return candidates[0]
    // Si hay varios (ej. remakes con distinto año), extraer posible año del slug
    const mYear = slug.match(/-(\d{4})$/)
    if (mYear) {
      const year = Number(mYear[1])
      const exactYear = candidates.find((c) => c.year === year)
      if (exactYear) return exactYear
    }
    // Si no, tomar el de mayor notoriedad/popularidad
    return candidates.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))[0]
  }

  // 3. Cruce por título limpio normalizado
  const ntClean = norm(cleanTitle(sim.title))
  const cleanCandidates = byNormTitle.get(ntClean)
  if (cleanCandidates && cleanCandidates.length === 1) {
    return cleanCandidates[0]
  }

  return null
}

function parseSimilarsFromHtml(html) {
  // Localizar la sección de similares
  let startIdx = html.indexOf('A las personas a las que les gustó')
  if (startIdx === -1) startIdx = html.indexOf('también les gustó')
  if (startIdx === -1) startIdx = html.indexOf('horizontal-title-list')
  if (startIdx === -1) return []

  const chunk = html.slice(startIdx, startIdx + 45000)
  const regex = /<a\s+[^>]*href="(\/es\/(?:serie|pelicula)\/[^"]+)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]+)"/g
  const seen = new Set()
  const results = []
  let match

  while ((match = regex.exec(chunk)) !== null) {
    const rawUrl = match[1]
    const rawTitle = match[2].trim()
    const cleanUrl = rawUrl.split('?')[0]
    if (seen.has(cleanUrl)) continue
    seen.add(cleanUrl)
    results.push({
      url: cleanUrl,
      title: rawTitle,
      rank: results.length,
    })
  }

  return results
}

async function searchJustWatchGraphQL(item) {
  const query = `
    query SearchTitles($q: String!) {
      popularTitles(country: "ES", filter: { searchQuery: $q, objectTypes: [${JW_GRAPHQL_TYPE}] }, first: 6) {
        edges {
          node {
            id
            objectId
            content(country: "ES", language: "es") {
              title
              originalReleaseYear
              fullPath
              externalIds {
                tmdbId
                imdbId
              }
            }
          }
        }
      }
    }
  `

  const queries = [item.title]
  const ct = cleanTitle(item.title)
  if (ct !== item.title) queries.push(ct)

  for (const q of queries) {
    try {
      const res = await fetchWithRetry('https://apis.justwatch.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { q } }),
      })

      if (!res.ok) continue
      const json = await res.json()
      const edges = json.data?.popularTitles?.edges || []
      if (edges.length === 0) continue

      // 1. Si coincide tmdbId
      if (item.tmdbId) {
        const matchTmdb = edges.find((e) => {
          const ext = e.node?.content?.externalIds?.tmdbId
          return ext && String(ext) === String(item.tmdbId)
        })
        if (matchTmdb?.node?.content?.fullPath) {
          return matchTmdb.node.content.fullPath
        }
      }

      // 2. Si coincide el año exacto y el título normalizado es similar
      const itemNt = norm(item.title)
      const itemCtNt = norm(ct)
      for (const edge of edges) {
        const c = edge.node?.content
        if (!c?.fullPath) continue
        const cNt = norm(c.title)
        const sameYear = item.year && c.originalReleaseYear && Math.abs(item.year - c.originalReleaseYear) <= 1
        if (cNt === itemNt || cNt === itemCtNt || (sameYear && (cNt.includes(itemCtNt) || itemCtNt.includes(cNt)))) {
          return c.fullPath
        }
      }

      // 3. Fallback al primer resultado si coincide el título normalizado
      const first = edges[0]?.node?.content
      if (first?.fullPath && (norm(first.title) === itemNt || norm(first.title) === itemCtNt)) {
        return first.fullPath
      }
    } catch (err) {
      console.warn(`    Error GraphQL para ${item.id} (query "${q}"):`, err.message)
    }
  }

  return null
}

async function scrapeItem(item) {
  const candidates = []
  const add = (s) => {
    const sl = slugify(s)
    if (sl && !candidates.includes(sl)) candidates.push(sl)
  }

  const idSlugFull = item.id.replace(/^(?:series|movie):/, '')
  const idSlugNoYear = idSlugFull.replace(/-\d{4}$/, '')
  const idSlugClean = idSlugFull.replace(/-(?:ee-uu|us|uk)(?:-|$)/, '-').replace(/-$/, '')
  const ct = cleanTitle(item.title)

  // Priorizar candidatos con año si hay año conocido
  if (item.year) {
    if (ct) add(`${ct}-${item.year}`)
    add(`${item.title}-${item.year}`)
    add(`${idSlugClean}-${item.year}`)
    add(`${idSlugNoYear}-${item.year}`)
    add(`${idSlugFull}-${item.year}`)
  }

  // Candidatos sin año
  if (ct) add(ct)
  add(item.title)
  add(idSlugClean)
  add(idSlugNoYear)
  add(idSlugFull)

  // Títulos alternativos
  for (const alt of Object.values(item.titles || {})) {
    if (item.year) add(`${alt}-${item.year}`)
    add(alt)
  }

  let html = null
  let matchedUrl = null

  // Intentar descarga directa por candidato
  for (const cand of candidates) {
    const url = `https://www.justwatch.com/es/${JW_TYPE_PREFIX}/${cand}`
    try {
      const res = await fetchWithRetry(url)
      if (res.status === 200) {
        html = await res.text()
        matchedUrl = url
        break
      }
    } catch {}
  }

  // Si no se encontró por slug directo, probar búsqueda en GraphQL
  if (!html) {
    const fullPath = await searchJustWatchGraphQL(item)
    if (fullPath) {
      const url = `https://www.justwatch.com${fullPath}`
      try {
        const res = await fetchWithRetry(url)
        if (res.status === 200) {
          html = await res.text()
          matchedUrl = url
        }
      } catch {}
    }
  }

  if (!html) {
    return { notFound: true, scrapedAt: new Date().toISOString() }
  }

  const similars = parseSimilarsFromHtml(html)
  return {
    id: item.id,
    title: item.title,
    year: item.year,
    jwUrl: matchedUrl,
    similars,
    scrapedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Pipeline principal
// ---------------------------------------------------------------------------

async function main() {
  const targetItems = shelfItems.slice(0, limitArg)
  let cachedCount = 0
  let fetchedCount = 0
  let notFoundCount = 0

  if (!buildOnly) {
    console.log(`\nFase 1: Verificación y descarga con caché (máx. 1 req/s)...`)
    let i = 0
    for (const item of targetItems) {
      i++
      const safeId = item.id.replace(/[:\/\\?%*|"<>]/g, '_')
      const cacheFile = join(JW_CACHE_DIR, `${safeId}.json`)

      if (existsSync(cacheFile)) {
        if (!retryNotFound) {
          cachedCount++
          continue
        }
        // Si es retry-not-found y la entrada fue exitosa, no repetir
        const prev = JSON.parse(readFileSync(cacheFile, 'utf8'))
        if (prev && !prev.notFound && prev.similars?.length > 0) {
          cachedCount++
          continue
        }
      }

      const res = await scrapeItem(item)
      writeFileSync(cacheFile, JSON.stringify(res, null, 2), 'utf8')
      fetchedCount++

      if (res.notFound) {
        notFoundCount++
        console.log(`[${i}/${targetItems.length}] ❌ ${item.title} (${item.id}) -> No encontrada en JustWatch`)
      } else {
        console.log(
          `[${i}/${targetItems.length}] ✅ ${item.title} -> ${res.similars.length} similares (${res.jwUrl})`
        )
      }
    }
    console.log(`Descarga finalizada: ${cachedCount} en caché, ${fetchedCount} descargadas/reintentadas, ${notFoundCount} sin ficha.`)
  }

  console.log(`\nFase 2: Cruce de similares con catálogo y generación de aristas...`)
  // Leer todas las fichas cacheadas
  const files = readdirSync(JW_CACHE_DIR).filter((f) => f.endsWith('.json'))
  const pairWeights = new Map()
  let totalSimilarsConsidered = 0
  let totalSimilarsMatched = 0
  const degreeMap = new Map()

  for (const file of files) {
    const data = JSON.parse(readFileSync(join(JW_CACHE_DIR, file), 'utf8'))
    if (!data || data.notFound || !data.similars || !data.id) continue

    const sourceId = canon(data.id)
    if (!byId.has(sourceId)) continue

    const L = data.similars.length
    if (L === 0) continue

    for (const sim of data.similars) {
      totalSimilarsConsidered++
      const targetItem = matchSimilarToCatalog(sim)
      if (!targetItem) continue

      const targetId = canon(targetItem.id)
      if (sourceId === targetId) continue

      totalSimilarsMatched++

      // Peso según posición en la lista (1.0 la primera, decrece hasta 0.5)
      const p = sim.rank || 0
      const w = 1.0 - 0.5 * (p / Math.max(1, L - 1))

      const a = sourceId < targetId ? sourceId : targetId
      const b = sourceId < targetId ? targetId : sourceId
      const pairKey = `${a}|${b}`

      pairWeights.set(pairKey, (pairWeights.get(pairKey) || 0) + w)
    }
  }

  console.log(`Similares considerados: ${totalSimilarsConsidered}`)
  console.log(`Similares cruzados con el catálogo: ${totalSimilarsMatched} (${((totalSimilarsMatched / Math.max(1, totalSimilarsConsidered)) * 100).toFixed(1)}%)`)
  console.log(`Pares únicos de co-ocurrencia generados: ${pairWeights.size}`)

  // Contar grados por obra
  for (const [pairKey, weight] of pairWeights) {
    const [a, b] = pairKey.split('|')
    degreeMap.set(a, (degreeMap.get(a) || 0) + 1)
    degreeMap.set(b, (degreeMap.get(b) || 0) + 1)
  }

  // Escribir cooc-justwatch.jsonl ordenado
  const sortedPairs = [...pairWeights.entries()].sort((x, y) => x[0].localeCompare(y[0]))
  const lines = sortedPairs.map(([pairKey, weight]) => {
    const [a, b] = pairKey.split('|')
    return JSON.stringify({
      a,
      b,
      source: 'justwatch-es',
      n: Number(weight.toFixed(3)),
    })
  })

  // Si ya existía cooc-justwatch.jsonl con otras estanterías (ej. pelis), preservar los de otras estanterías
  let otherLines = []
  if (existsSync(OUT_FILE)) {
    const existing = readFileSync(OUT_FILE, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l))
    // Filtrar los que no pertenecen a la estantería actual
    otherLines = existing.filter((e) => {
      const aIsCurrent = byId.has(e.a)
      const bIsCurrent = byId.has(e.b)
      return !(aIsCurrent && bIsCurrent)
    })
  }

  const allLines = [...otherLines.map((e) => JSON.stringify(e)), ...lines]
  writeFileSync(OUT_FILE, allLines.join('\n') + '\n', 'utf8')
  console.log(`\nArchivo escrito: ${OUT_FILE} (${allLines.length} aristas en total)`)

  // Cobertura del catálogo
  let withAtLeast1 = 0
  let withAtLeast10 = 0
  for (const it of shelfItems) {
    const deg = degreeMap.get(it.id) || 0
    if (deg >= 1) withAtLeast1++
    if (deg >= 10) withAtLeast10++
  }

  const cov1Pct = ((withAtLeast1 / shelfItems.length) * 100).toFixed(1)
  const cov10Pct = ((withAtLeast10 / shelfItems.length) * 100).toFixed(1)

  console.log(`\n=== Cobertura de ${SHELF} en JustWatch ===`)
  console.log(`Total obras catálogo: ${shelfItems.length}`)
  console.log(`Obras con ≥ 1 arista:  ${withAtLeast1}/${shelfItems.length} (${cov1Pct}%)`)
  console.log(`Obras con ≥ 10 aristas: ${withAtLeast10}/${shelfItems.length} (${cov10Pct}%)`)

  // Vecinos de las 6 obras clave solicitadas en C1
  const keySeriesIds = [
    'series:breaking-bad-2008',
    'series:la-casa-de-papel-2017',
    'series:merli-2015',
    'series:los-serrano-2003',
    'series:the-office-ee-uu-2005',
    'series:juego-de-tronos-2011',
  ]

  console.log(`\n=== Vecinos directos en el grafo de JustWatch (top 5 por peso) ===`)
  for (const sid of keySeriesIds) {
    const it = byId.get(sid)
    const name = it ? it.title : sid
    const neighbors = []

    for (const [pairKey, weight] of pairWeights) {
      const [a, b] = pairKey.split('|')
      if (a === sid) neighbors.push({ id: b, w: weight })
      else if (b === sid) neighbors.push({ id: a, w: weight })
    }

    neighbors.sort((x, y) => y.w - x.w)
    const top5 = neighbors.slice(0, 5).map((n) => {
      const t = byId.get(n.id)
      return `${t ? t.title : n.id} (n=${n.w.toFixed(2)})`
    })

    console.log(`* ${name} [${neighbors.length} aristas]:`)
    if (top5.length > 0) {
      console.log(`  -> ${top5.join(', ')}`)
    } else {
      console.log(`  -> (sin aristas)`)
    }
  }
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
