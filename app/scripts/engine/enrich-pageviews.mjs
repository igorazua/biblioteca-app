/**
 * enrich-pageviews.mjs — Descarga visitas de Wikipedia en 6 idiomas (12 meses)
 * (es, en, fr, de, it, pt) a través de la API REST de Wikimedia con agent=user
 * a partir de los sitelinks de Wikidata.
 *
 * MOTOR v2 §2b.2 / T17 §A.2.2: Objetivo ≥ 90% de las obras con wikidataId.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const CACHE_ATTRS_DIR = join(here, '..', 'cache', 'attrs')
const PAGEVIEWS_FILE = join(CACHE_ATTRS_DIR, 'pageviews.jsonl')
const SITELINKS_CACHE = join(CACHE_ATTRS_DIR, 'sitelinks-cache.json')

const USER_AGENT = 'BibliotecaSocial/1.0.0 ( contact@biblioteca-social.vercel.app )'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const LANGS = ['es', 'en', 'fr', 'de', 'it', 'pt']

async function getPageviews(articleTitle, lang = 'es') {
  if (!articleTitle) return 0
  const normalized = articleTitle.replace(/ /g, '_')
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${lang}.wikipedia/all-access/user/${encodeURIComponent(
    normalized
  )}/monthly/20251001/20261001`

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
      if (!res.ok) {
        if (res.status === 404) return 0
        if (res.status === 429) {
          await sleep(attempt * 1500)
          continue
        }
        return 0
      }
      const data = await res.json()
      if (!data?.items?.length) return 0
      return data.items.reduce((acc, row) => acc + (row.views || 0), 0)
    } catch {
      if (attempt === 4) return 0
      await sleep(attempt * 400)
    }
  }
  return 0
}

async function main() {
  console.log('--- Descarga de Pageviews Wikimedia 6 idiomas (enrich-pageviews.mjs) ---')

  if (!existsSync(CACHE_ATTRS_DIR)) mkdirSync(CACHE_ATTRS_DIR, { recursive: true })

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const items = seed.items || []
  const withWiki = items.filter((i) => Boolean(i.wikidataId))

  const sitelinks = JSON.parse(readFileSync(SITELINKS_CACHE, 'utf8'))

  // Cargar existentes que ya tengan visitas > 0
  const knownGood = new Set()
  if (existsSync(PAGEVIEWS_FILE)) {
    const lines = readFileSync(PAGEVIEWS_FILE, 'utf8').split('\n').filter(Boolean)
    for (const l of lines) {
      try {
        const p = JSON.parse(l)
        if (p.id && p.value) {
          const total = Object.values(p.value).reduce((a, b) => a + b, 0)
          if (total > 0) {
            knownGood.add(p.id)
          }
        }
      } catch {}
    }
  }

  // Filtrar targets: solo los que faltan o tenían 0 y tienen títulos
  const targets = []
  for (const it of withWiki) {
    if (knownGood.has(it.id)) continue
    const sl = sitelinks[it.wikidataId]
    const hasAnyTitle = sl && Object.values(sl).some(Boolean)
    if (hasAnyTitle) {
      targets.push(it)
    }
  }

  console.log(`Obras con wikidataId: ${withWiki.length}`)
  console.log(`Ya con visitas verificadas (> 0): ${knownGood.size}. Pendientes con títulos: ${targets.length}`)

  if (targets.length === 0) {
    console.log('✓ Todas las obras ya tienen visitas descargadas.')
    return
  }

  // Worker pool concurrente (8 workers con 40ms sleep para no exceder rate limit)
  const CONCURRENCY = 8
  let targetIdx = 0
  let done = 0
  let withViews = 0
  const startTime = Date.now()

  async function worker() {
    while (targetIdx < targets.length) {
      const it = targets[targetIdx++]
      if (!it) break

      const sl = sitelinks[it.wikidataId] || {}
      const views = { es: 0, en: 0, fr: 0, de: 0, it: 0, pt: 0 }

      for (const lang of LANGS) {
        if (sl[lang]) {
          views[lang] = await getPageviews(sl[lang], lang)
          await sleep(25)
        }
      }

      done++
      const totalViews = Object.values(views).reduce((a, b) => a + b, 0)
      if (totalViews > 0) withViews++

      // Guardar incrementalmente
      const line = JSON.stringify({
        id: it.id,
        value: views,
        src: 'wikimedia-api',
        conf: 1.0,
        at: new Date().toISOString().slice(0, 10),
      })
      appendFileSync(PAGEVIEWS_FILE, line + '\n', 'utf8')

      if (done % 50 === 0 || done >= targets.length) {
        const elapsedSec = Math.max(1, (Date.now() - startTime) / 1000)
        const rate = (done / elapsedSec).toFixed(1)
        console.log(`  [${done}/${targets.length}] procesadas (${withViews} con visitas > 0) [${rate} obras/s]`)
      }

      await sleep(40)
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  console.log(`\n✓ Descarga finalizada: ${done} obras procesadas (${withViews} con visitas > 0).`)
}

main().catch((err) => {
  console.error('Error fatal en enrich-pageviews.mjs:', err)
  process.exit(1)
})
