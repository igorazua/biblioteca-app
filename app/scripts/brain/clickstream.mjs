/**
 * clickstream.mjs — Procesa los dumps de Wikipedia Clickstream (MOTOR v2 §2c.2 / T6.1).
 *
 * 1. Mapea artículos de cada wiki con las obras del catálogo vía Wikidata sitelinks
 *    (cache/graph/sitelinks.json; los idiomas que falten se piden a Wikidata, 1 req/s).
 * 2. Descarga en streaming cada dump mensual mes-idioma y guarda un parcial reanudable en
 *    cache/graph/sources/clickstream/<YYYY-MM>-<lang>.json (ids crudos; no se re-descarga si existe).
 * 3. Combina los parciales pedidos aplicando aliases.json, calcula PPMI y escribe
 *    cache/graph/cooc-wikiclick.jsonl con { a, b, source, n, ppmi }.
 *
 * Uso:
 *   node scripts/brain/clickstream.mjs --months 2026-09,2026-08 --lang es,en [--force]
 *   --force rehace los parciales que ya existan.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import https from 'node:https'
import zlib from 'node:zlib'
import readline from 'node:readline'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const ALIASES_FILE = join(ROOT, 'src', 'data', 'aliases.json')
const GRAPH_CACHE_DIR = join(here, '..', 'cache', 'graph')
const SITELINKS_FILE = join(GRAPH_CACHE_DIR, 'sitelinks.json')
const SOURCES_DIR = join(GRAPH_CACHE_DIR, 'sources', 'clickstream')
const OUTPUT_FILE = join(GRAPH_CACHE_DIR, 'cooc-wikiclick.jsonl')

const USER_AGENT = 'BibliotecaApp/1.0.0 (contact@biblioteca-social.vercel.app; academic research)'

// Idiomas con dump de clickstream y su sitelink de Wikidata. pt se cachea pero no se procesa.
const WIKI_SITE = { es: 'eswiki', en: 'enwiki', fr: 'frwiki', de: 'dewiki', it: 'itwiki', pt: 'ptwiki' }
const SITELINK_LANGS = Object.keys(WIKI_SITE)

const args = process.argv.slice(2)
const monthsArg = args.find((a, i) => args[i - 1] === '--months')
const MONTHS = monthsArg ? monthsArg.split(',') : ['2026-09', '2026-08']
const langArg = args.find((a, i) => args[i - 1] === '--lang')
const LANGS = langArg ? langArg.split(',') : ['es', 'en']
const FORCE = args.includes('--force')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const stamp = () => new Date().toISOString().slice(11, 19)
const log = (msg) => console.log(`[${stamp()}] ${msg}`)

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true })
}

function writeAtomic(path, text) {
  const tmp = `${path}.tmp`
  writeFileSync(tmp, text, 'utf8')
  renameSync(tmp, path)
}

async function fetchJson(url) {
  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
      if (!res.ok) {
        if (res.status === 429) {
          await sleep(attempt * 1500)
          continue
        }
        return null
      }
      return await res.json()
    } catch {
      if (attempt === maxRetries) return null
      await sleep(attempt * 500)
    }
  }
  return null
}

// Devuelve { es: {titulo -> id}, en: {...}, ... }. Solo pide a Wikidata los idiomas que faltan
// (1 petición por segundo, 50 QIDs por petición) y guarda la caché al terminar.
async function loadOrBuildSitelinks(items, langs) {
  ensureDir(GRAPH_CACHE_DIR)
  const sitelinks = existsSync(SITELINKS_FILE) ? JSON.parse(readFileSync(SITELINKS_FILE, 'utf8')) : {}
  const missing = langs.filter((l) => !sitelinks[l])
  if (missing.length === 0) {
    log(`Sitelinks en caché para: ${langs.join(', ')}`)
    return sitelinks
  }

  log(`Pidiendo sitelinks de Wikidata para: ${missing.join(', ')}`)
  const qidMap = new Map()
  for (const it of items) {
    if (it.wikidataId) qidMap.set(it.wikidataId, it.id)
  }
  const qids = Array.from(qidMap.keys())
  const sitefilter = missing.map((l) => WIKI_SITE[l]).join('|')
  for (const l of missing) sitelinks[l] = {}

  let failed = 0
  const CHUNK_SIZE = 50
  for (let i = 0; i < qids.length; i += CHUNK_SIZE) {
    const chunk = qids.slice(i, i + CHUNK_SIZE)
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${chunk.join('|')}&props=sitelinks&sitefilter=${sitefilter}&format=json`
    const data = await fetchJson(url)
    if (!data?.entities) failed++
    for (const [qid, ent] of Object.entries(data?.entities ?? {})) {
      const itemId = qidMap.get(qid)
      if (!itemId) continue
      for (const l of missing) {
        const title = ent.sitelinks?.[WIKI_SITE[l]]?.title
        if (title) sitelinks[l][title.replace(/ /g, '_')] = itemId
      }
    }
    await sleep(1000)
  }

  writeAtomic(SITELINKS_FILE, JSON.stringify(sitelinks, null, 2))
  for (const l of missing) log(`  ${l}: ${Object.keys(sitelinks[l]).length} sitelinks`)
  if (failed) log(`  ⚠️ ${failed} peticiones a Wikidata fallaron; esos sitelinks faltan en la caché`)
  return sitelinks
}

// Una pasada completa del dump. Lanza error si falla o si la descarga queda incompleta.
function streamDump(url, sitelinkMap, redirects = 0) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < 5) {
        res.resume()
        const next = new URL(res.headers.location, url).toString()
        return streamDump(next, sitelinkMap, redirects + 1).then(resolve, reject)
      }
      if (res.statusCode !== 200) {
        res.resume()
        const err = new Error(`HTTP ${res.statusCode}`)
        err.status = res.statusCode
        return reject(err)
      }

      const expected = parseInt(res.headers['content-length'] || '0', 10)
      let received = 0
      res.on('data', (chunk) => {
        received += chunk.length
      })
      res.on('error', reject)
      res.on('close', () => {
        if (!res.complete) reject(new Error('conexión cortada antes de terminar'))
      })

      const gunzip = zlib.createGunzip()
      gunzip.on('error', (err) => reject(new Error(`descompresión: ${err.message}`)))
      res.pipe(gunzip)

      const rl = readline.createInterface({ input: gunzip, crlfDelay: Infinity })
      const pairs = {}
      const totals = {}
      let totalClicks = 0
      let lines = 0
      let matches = 0

      rl.on('line', (line) => {
        lines++
        if (lines % 5000000 === 0) log(`    ...${(lines / 1e6).toFixed(0)}M líneas (${matches} pares)`)
        // Solo filas de tipo 'link' (enlace interno). El tipo es la 3.ª columna.
        if (!line.includes('\tlink\t')) return

        const tab1 = line.indexOf('\t')
        const tab2 = line.indexOf('\t', tab1 + 1)
        const tab3 = line.indexOf('\t', tab2 + 1)
        if (tab1 === -1 || tab2 === -1 || tab3 === -1) return

        const prev = line.slice(0, tab1)
        const curr = line.slice(tab1 + 1, tab2)
        const count = parseInt(line.slice(tab3 + 1), 10) || 0

        const idA = sitelinkMap.get(prev)
        const idB = sitelinkMap.get(curr)

        if (idA) {
          totals[idA] = (totals[idA] || 0) + count
          totalClicks += count
        }
        if (idB) {
          totals[idB] = (totals[idB] || 0) + count
          totalClicks += count
        }
        if (idA && idB && idA !== idB) {
          const key = idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`
          pairs[key] = (pairs[key] || 0) + count
          matches++
        }
      })

      rl.on('error', reject)
      rl.on('close', () => {
        if (expected && received !== expected) {
          return reject(new Error(`descarga incompleta: ${received}/${expected} bytes`))
        }
        resolve({ lines, matches, totalClicks, pairs, totals, bytes: received })
      })
    })

    req.setTimeout(60000, () => req.destroy(new Error('sin datos durante 60 s')))
    req.on('error', reject)
  })
}

// Procesa un mes-idioma y guarda su parcial. Reintenta 3 veces; un parcial solo se escribe si
// la descarga fue completa, así que un fallo se reintenta en la siguiente ejecución.
async function processMonthLang(month, lang, sitelinkMap) {
  const partialPath = join(SOURCES_DIR, `${month}-${lang}.json`)
  if (existsSync(partialPath) && !FORCE) {
    log(`${month} ${lang}: parcial ya existe, se reutiliza`)
    return 'cached'
  }

  const url = `https://dumps.wikimedia.org/other/clickstream/${month}/clickstream-${lang}wiki-${month}.tsv.gz`
  const maxAttempts = 3
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const started = Date.now()
    log(`${month} ${lang}: descargando y procesando (intento ${attempt}) ${url}`)
    try {
      const r = await streamDump(url, sitelinkMap)
      const partial = {
        month,
        lang,
        url,
        createdAt: new Date().toISOString(),
        sitelinkTitles: sitelinkMap.size,
        lines: r.lines,
        matches: r.matches,
        totalClicks: r.totalClicks,
        pairs: r.pairs,
        totals: r.totals,
      }
      ensureDir(SOURCES_DIR)
      writeAtomic(partialPath, JSON.stringify(partial))
      const secs = ((Date.now() - started) / 1000).toFixed(0)
      log(`${month} ${lang}: OK ${r.lines.toLocaleString()} líneas, ${r.matches} pares, ${Object.keys(r.pairs).length} únicos, ${(r.bytes / 1e6).toFixed(0)} MB, ${secs} s`)
      return 'ok'
    } catch (err) {
      if (err.status === 404) {
        log(`${month} ${lang}: no disponible (404)`)
        return 'missing'
      }
      log(`${month} ${lang}: fallo en intento ${attempt}: ${err.message}`)
      if (attempt < maxAttempts) await sleep(attempt * 10000)
    }
  }
  log(`${month} ${lang}: FALLIDO tras ${maxAttempts} intentos`)
  return 'failed'
}

// Combina los parciales pedidos. Aplica aliases.json a cada id; suma pares, totales y N.
function combinePartials(months, langs, aliases) {
  const canon = (id) => aliases.get(id) ?? id
  const pairMap = new Map()
  const totalMap = new Map()
  let N = 0
  const used = []

  for (const lang of langs) {
    for (const month of months) {
      const path = join(SOURCES_DIR, `${month}-${lang}.json`)
      if (!existsSync(path)) continue
      const p = JSON.parse(readFileSync(path, 'utf8'))
      used.push(`${month}-${lang}`)
      N += p.totalClicks
      for (const [id, n] of Object.entries(p.totals)) {
        const c = canon(id)
        totalMap.set(c, (totalMap.get(c) || 0) + n)
      }
      for (const [key, n] of Object.entries(p.pairs)) {
        const sep = key.indexOf('|')
        const a = canon(key.slice(0, sep))
        const b = canon(key.slice(sep + 1))
        if (a === b) continue
        const k = a < b ? `${a}|${b}` : `${b}|${a}`
        pairMap.set(k, (pairMap.get(k) || 0) + n)
      }
    }
  }
  return { pairMap, totalMap, N: N || 1, used }
}

async function main() {
  const t0 = Date.now()
  log('=== Extracción de Co-Consumo desde Wikipedia Clickstream ===')
  log(`Meses: ${MONTHS.join(', ')} | Idiomas: ${LANGS.join(', ')}${FORCE ? ' | --force' : ''}`)

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const sitelinks = await loadOrBuildSitelinks(seed.items, SITELINK_LANGS)
  const aliasObj = existsSync(ALIASES_FILE) ? JSON.parse(readFileSync(ALIASES_FILE, 'utf8')) : {}
  const aliases = new Map(Object.entries(aliasObj))

  // Orden: idioma primero, meses dentro (en el orden dado, normalmente el más reciente primero).
  for (const lang of LANGS) {
    const map = new Map(Object.entries(sitelinks[lang] || {}))
    if (map.size === 0) {
      log(`${lang}: sin sitelinks, se omite`)
      continue
    }
    for (const month of MONTHS) {
      await processMonthLang(month, lang, map)
    }
  }

  const { pairMap, totalMap, N, used } = combinePartials(MONTHS, LANGS, aliases)
  log(`Parciales combinados (${used.length}): ${used.join(', ')}`)
  log(`Pares únicos tras aliases: ${pairMap.size}`)

  const edges = []
  for (const [key, n] of pairMap) {
    const sep = key.indexOf('|')
    const a = key.slice(0, sep)
    const b = key.slice(sep + 1)
    const countA = totalMap.get(a) || 1
    const countB = totalMap.get(b) || 1
    const ppmi = Math.max(0, Math.log((n * N) / (countA * countB)))
    const roundedPpmi = Number(ppmi.toFixed(4))
    if (roundedPpmi > 0) {
      edges.push({ a, b, source: 'wikipedia-clickstream', n, ppmi: roundedPpmi })
    }
  }
  edges.sort((x, y) => y.ppmi - x.ppmi)

  ensureDir(GRAPH_CACHE_DIR)
  writeAtomic(OUTPUT_FILE, edges.map((e) => JSON.stringify(e)).join('\n') + '\n')
  log(`✓ Escritas ${edges.length} aristas con PPMI positivo en ${OUTPUT_FILE}`)
  log(`Tiempo total: ${((Date.now() - t0) / 60000).toFixed(1)} min`)
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
