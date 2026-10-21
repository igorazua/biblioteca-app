/**
 * clickstream.mjs — Procesa los dumps de Wikipedia Clickstream (MOTOR v2 §2c.2 / T6.1).
 *
 * 1. Mapea artículos de eswiki y enwiki con las obras del catálogo vía Wikidata sitelinks.
 * 2. Descarga y procesa en streaming los dumps mensuales de clickstream (eswiki y enwiki).
 * 3. Identifica transiciones entre obras (a -> b con tipo 'link').
 * 4. Calcula PPMI (Positive Pointwise Mutual Information) para cada par.
 * 5. Guarda las aristas en cache/graph/cooc-wikiclick.jsonl.
 *
 * Uso:
 *   node scripts/brain/clickstream.mjs [--months 2026-09,2026-08] [--lang es,en]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, createWriteStream } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import https from 'node:https'
import zlib from 'node:zlib'
import readline from 'node:readline'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const GRAPH_CACHE_DIR = join(here, '..', 'cache', 'graph')
const SITELINKS_FILE = join(GRAPH_CACHE_DIR, 'sitelinks.json')
const OUTPUT_FILE = join(GRAPH_CACHE_DIR, 'cooc-wikiclick.jsonl')

const USER_AGENT = 'BibliotecaApp/1.0.0 (contact@biblioteca-social.vercel.app; academic research)'

const args = process.argv.slice(2)
const monthsArg = args.find((a, i) => args[i - 1] === '--months')
const MONTHS = monthsArg ? monthsArg.split(',') : ['2026-09', '2026-08']
const langArg = args.find((a, i) => args[i - 1] === '--lang')
const LANGS = langArg ? langArg.split(',') : ['es', 'en']

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true })
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

async function getOrBuildSitelinks(items) {
  ensureDir(GRAPH_CACHE_DIR)
  if (existsSync(SITELINKS_FILE)) {
    console.log(`Cargando sitelinks desde caché: ${SITELINKS_FILE}`)
    return JSON.parse(readFileSync(SITELINKS_FILE, 'utf8'))
  }

  console.log('Construyendo mapeo de sitelinks de Wikidata...')
  const qidMap = new Map()
  for (const it of items) {
    if (it.wikidataId) {
      qidMap.set(it.wikidataId, it.id)
    }
  }

  const qids = Array.from(qidMap.keys())
  const sitelinks = {
    es: {}, // normalized title -> item.id
    en: {},
  }

  const CHUNK_SIZE = 50
  for (let i = 0; i < qids.length; i += CHUNK_SIZE) {
    const chunk = qids.slice(i, i + CHUNK_SIZE)
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${chunk.join('|')}&props=sitelinks&format=json`
    const data = await fetchJson(url)
    await sleep(150)

    if (data?.entities) {
      for (const [qid, ent] of Object.entries(data.entities)) {
        const itemId = qidMap.get(qid)
        if (!itemId) continue

        const esTitle = ent.sitelinks?.eswiki?.title
        if (esTitle) {
          const normTitle = esTitle.replace(/ /g, '_')
          sitelinks.es[normTitle] = itemId
        }

        const enTitle = ent.sitelinks?.enwiki?.title
        if (enTitle) {
          const normTitle = enTitle.replace(/ /g, '_')
          sitelinks.en[normTitle] = itemId
        }
      }
    }

    if ((i + CHUNK_SIZE) % 500 === 0 || i + CHUNK_SIZE >= qids.length) {
      console.log(`  Sitelinks descargados: ${Math.min(i + CHUNK_SIZE, qids.length)}/${qids.length}`)
    }
  }

  writeFileSync(SITELINKS_FILE, JSON.stringify(sitelinks, null, 2), 'utf8')
  console.log(`✓ Guardados ${Object.keys(sitelinks.es).length} eswiki y ${Object.keys(sitelinks.en).length} enwiki sitelinks.`)
  return sitelinks
}

function streamClickstream(month, lang, sitelinkMap, coocCounts, itemTotals, totalClicksRef) {
  return new Promise((resolve, reject) => {
    const url = `https://dumps.wikimedia.org/other/clickstream/${month}/clickstream-${lang}wiki-${month}.tsv.gz`
    console.log(`Descargando y procesando: ${url}...`)

    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': USER_AGENT,
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          console.warn(`  ⚠️ HTTP ${res.statusCode} al descargar ${url}`)
          return resolve()
        }

        const gunzip = zlib.createGunzip()
        res.pipe(gunzip)

        const rl = readline.createInterface({ input: gunzip })
        let linesCount = 0
        let matchesCount = 0

        rl.on('line', (line) => {
          linesCount++
          const tab1 = line.indexOf('\t')
          if (tab1 === -1) return
          const tab2 = line.indexOf('\t', tab1 + 1)
          if (tab2 === -1) return
          const tab3 = line.indexOf('\t', tab2 + 1)
          if (tab3 === -1) return

          const type = line.slice(tab2 + 1, tab3)
          if (type !== 'link') return

          const prev = line.slice(0, tab1)
          const curr = line.slice(tab1 + 1, tab2)
          const count = parseInt(line.slice(tab3 + 1), 10) || 0

          const idA = sitelinkMap[prev]
          const idB = sitelinkMap[curr]

          if (idA) {
            itemTotals[idA] = (itemTotals[idA] || 0) + count
            totalClicksRef.val += count
          }
          if (idB) {
            itemTotals[idB] = (itemTotals[idB] || 0) + count
            totalClicksRef.val += count
          }

          if (idA && idB && idA !== idB) {
            const pairKey = idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`
            coocCounts[pairKey] = (coocCounts[pairKey] || 0) + count
            matchesCount++
          }
        })

        rl.on('close', () => {
          console.log(`  Procesadas ${linesCount.toLocaleString()} líneas. Coincidencias catálogo: ${matchesCount}`)
          resolve()
        })

        rl.on('error', (err) => {
          console.error(`  Error leyendo stream:`, err.message)
          resolve() // continuar con el siguiente
        })

        gunzip.on('error', (err) => {
          console.error(`  Error descompresión:`, err.message)
          resolve()
        })
      }
    )

    req.on('error', (err) => {
      console.error(`  Error de conexión para ${url}:`, err.message)
      resolve()
    })
  })
}

async function main() {
  console.log('=== Extracción de Co-Consumo desde Wikipedia Clickstream ===\n')

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const sitelinks = await getOrBuildSitelinks(seed.items)

  const coocCounts = {}
  const itemTotals = {}
  const totalClicksRef = { val: 0 }

  for (const month of MONTHS) {
    for (const lang of LANGS) {
      const map = sitelinks[lang] || {}
      if (Object.keys(map).length === 0) continue
      await streamClickstream(month, lang, map, coocCounts, itemTotals, totalClicksRef)
    }
  }

  const pairs = Object.entries(coocCounts)
  console.log(`\nTotal de pares únicos detectados en catálogo: ${pairs.length}`)

  if (pairs.length === 0) {
    console.warn('No se detectaron co-ocurrencias directas.')
    return
  }

  // Calcular PPMI: log( (count(a,b) * N) / (count(a) * count(b)) )
  const N = totalClicksRef.val || 1
  const edges = []

  for (const [key, n] of pairs) {
    const [a, b] = key.split('|')
    const countA = itemTotals[a] || 1
    const countB = itemTotals[b] || 1

    const pmi = Math.log((n * N) / (countA * countB))
    const ppmi = Math.max(0, pmi)

    if (ppmi > 0) {
      edges.push({
        a,
        b,
        source: 'wikipedia-clickstream',
        n,
        ppmi: Number(ppmi.toFixed(4)),
      })
    }
  }

  edges.sort((x, y) => y.ppmi - x.ppmi)

  const outLines = edges.map((e) => JSON.stringify(e)).join('\n') + '\n'
  writeFileSync(OUTPUT_FILE, outLines, 'utf8')

  console.log(`✓ Escritas ${edges.length} aristas con PPMI positivo en ${OUTPUT_FILE}`)
  console.log('Ejemplos de conexiones encontradas:')
  edges.slice(0, 10).forEach((e) => {
    console.log(`  ${e.a} <-> ${e.b} (n: ${e.n}, ppmi: ${e.ppmi})`)
  })
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
