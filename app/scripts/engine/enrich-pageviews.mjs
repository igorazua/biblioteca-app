/**
 * enrich-pageviews.mjs — Descarga visitas de Wikipedia en español e inglés (12 meses)
 * a través de la API REST de Wikimedia a partir de los sitelinks de Wikidata.
 *
 * MOTOR v2 §2b.2 / T3.2: Objetivo ≥ 85% de las obras con wikidataId.
 *
 * Uso:
 *   node scripts/engine/enrich-pageviews.mjs [--sample 50]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const CACHE_ATTRS_DIR = join(here, '..', 'cache', 'attrs')
const PAGEVIEWS_FILE = join(CACHE_ATTRS_DIR, 'pageviews.jsonl')

const USER_AGENT = 'BibliotecaSocial/1.0.0 ( contact@biblioteca-social.vercel.app )'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const args = process.argv.slice(2)
const sampleIdx = args.indexOf('--sample')
const SAMPLE = sampleIdx !== -1 ? parseInt(args[sampleIdx + 1], 10) : null

async function fetchJson(url) {
  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
      if (!res.ok) {
        if (res.status === 404) return null
        if (res.status === 429) {
          await sleep(attempt * 1500)
          continue
        }
        return null
      }
      return await res.json()
    } catch {
      if (attempt === maxRetries) return null
      await sleep(attempt * 400)
    }
  }
  return null
}

async function getPageviews(articleTitle, lang = 'es') {
  if (!articleTitle) return 0
  const normalized = articleTitle.replace(/ /g, '_')
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${lang}.wikipedia/all-access/all-agents/${encodeURIComponent(
    normalized
  )}/monthly/20251001/20261001`
  const data = await fetchJson(url)
  if (!data?.items?.length) return 0
  return data.items.reduce((acc, row) => acc + (row.views || 0), 0)
}

async function main() {
  console.log('--- Descarga de Pageviews Wikimedia (enrich-pageviews.mjs) ---')

  if (!existsSync(CACHE_ATTRS_DIR)) mkdirSync(CACHE_ATTRS_DIR, { recursive: true })

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const items = seed.items || []
  const withWiki = items.filter((i) => i.wikidataId)

  // Cargar existentes
  const known = new Set()
  if (existsSync(PAGEVIEWS_FILE)) {
    const lines = readFileSync(PAGEVIEWS_FILE, 'utf8').split('\n').filter(Boolean)
    for (const l of lines) {
      try {
        const p = JSON.parse(l)
        if (p.id) known.add(p.id)
      } catch {}
    }
  }

  const targets = withWiki.filter((i) => !known.has(i.id))
  console.log(`Obras con wikidataId: ${withWiki.length}. Ya procesadas: ${known.size}. Faltan: ${targets.length}`)

  let toProcess = targets
  if (SAMPLE) {
    console.log(`Modo muestra: procesando ${SAMPLE} obras...`)
    toProcess = toProcess.slice(0, SAMPLE)
  }

  // 1. Obtener sitelinks en bloques de 50 QIDs
  const qidToItem = new Map()
  for (const it of toProcess) {
    qidToItem.set(it.wikidataId, it)
  }

  const qids = Array.from(qidToItem.keys())
  const sitelinksMap = new Map()

  console.log(`\nConsultando sitelinks de Wikidata para ${qids.length} entidades...`)
  const CHUNK_SIZE = 50
  for (let i = 0; i < qids.length; i += CHUNK_SIZE) {
    const chunk = qids.slice(i, i + CHUNK_SIZE)
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${chunk.join('|')}&props=sitelinks&format=json`
    const data = await fetchJson(url)
    await sleep(150)

    if (data?.entities) {
      for (const [qid, ent] of Object.entries(data.entities)) {
        const eswiki = ent.sitelinks?.eswiki?.title || null
        const enwiki = ent.sitelinks?.enwiki?.title || null
        sitelinksMap.set(qid, { eswiki, enwiki })
      }
    }
    if ((i + CHUNK_SIZE) % 250 === 0 || i + CHUNK_SIZE >= qids.length) {
      console.log(`  Sitelinks obtenidos: ${Math.min(i + CHUNK_SIZE, qids.length)}/${qids.length}`)
    }
  }

  // 2. Descargar pageviews con concurrencia de 10
  console.log(`\nDescargando visitas mensuales de Wikimedia API...`)
  let processed = 0
  let withViews = 0
  const CONCURRENCY = 8

  for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
    const chunk = toProcess.slice(i, i + CONCURRENCY)
    await Promise.all(
      chunk.map(async (item) => {
        const links = sitelinksMap.get(item.wikidataId) || {}
        let esViews = 0
        let enViews = 0

        if (links.eswiki) {
          esViews = await getPageviews(links.eswiki, 'es')
          await sleep(60)
        }
        if (links.enwiki) {
          enViews = await getPageviews(links.enwiki, 'en')
          await sleep(60)
        }

        const views = { es: esViews, en: enViews }
        const line = JSON.stringify({
          id: item.id,
          value: views,
          src: 'wikimedia-api',
          conf: 1.0,
          at: new Date().toISOString().slice(0, 10),
        })
        appendFileSync(PAGEVIEWS_FILE, line + '\n', 'utf8')
        processed++
        if (esViews > 0 || enViews > 0) withViews++
      })
    )

    if (processed % 100 === 0 || processed >= toProcess.length) {
      console.log(`  Progreso visitas: ${processed}/${toProcess.length} (${withViews} con visitas > 0)`)
    }
  }

  console.log(`\n✓ Finalizado: ${processed} obras procesadas y guardadas en ${PAGEVIEWS_FILE}`)
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
