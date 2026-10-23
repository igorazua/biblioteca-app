/**
 * enrich-pageviews.mjs — Descarga visitas de Wikipedia en 6 idiomas (12 meses)
 * (es, en, fr, de, it, pt) a través de la API REST de Wikimedia con agent=user
 * a partir de los sitelinks de Wikidata (T20.3).
 *
 * MOTOR v2 §2b.2 / T20.3: Objetivo ≥ 90% de las obras con wikidataId en las 5 estanterías.
 *
 * Uso:
 *   node scripts/engine/enrich-pageviews.mjs
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

const USER_AGENT = 'BibliotecaAppMotor/2.0 (mailto:igorazua@gmail.com; educational non-commercial)'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const LANGS = ['es', 'en', 'fr', 'de', 'it', 'pt']

async function getPageviews(articleTitle, lang = 'es') {
  if (!articleTitle) return 0
  const normalized = articleTitle.replace(/ /g, '_')
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${lang}.wikipedia/all-access/user/${encodeURIComponent(
    normalized
  )}/monthly/20251001/20261001`

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
      if (!res.ok) {
        if (res.status === 404) return 0
        if (res.status === 429) {
          const waitMs = attempt * 3000
          console.warn(`[429 Wikimedia] Esperando ${waitMs}ms para ${articleTitle} (${lang})...`)
          await sleep(waitMs)
          continue
        }
        return 0
      }
      const data = await res.json()
      if (!data?.items?.length) return 0
      return data.items.reduce((acc, row) => acc + (row.views || 0), 0)
    } catch {
      if (attempt === 3) return 0
      await sleep(attempt * 1000)
    }
  }
  return 0
}

async function fetchMissingSitelinks(qids, sitelinksCache) {
  const missing = qids.filter((q) => !sitelinksCache[q])
  if (!missing.length) return

  console.log(`Descargando sitelinks de Wikidata para ${missing.length} QIDs nuevos...`)
  for (let i = 0; i < missing.length; i += 50) {
    const chunk = missing.slice(i, i + 50)
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${chunk.join('|')}&props=sitelinks&format=json`
    try {
      const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
      if (r.ok) {
        const j = await r.json()
        for (const [qid, ent] of Object.entries(j?.entities || {})) {
          const sl = {}
          for (const lang of LANGS) {
            const key = `${lang}wiki`
            if (ent.sitelinks?.[key]?.title) {
              sl[lang] = ent.sitelinks[key].title
            }
          }
          sitelinksCache[qid] = sl
        }
      }
    } catch (err) {
      console.warn('Error descargando sitelinks chunk:', err.message)
    }
    await sleep(250)
  }
  writeFileSync(SITELINKS_CACHE, JSON.stringify(sitelinksCache, null, 2), 'utf8')
  console.log(`Sitelinks actualizados en caché.`)
}

async function main() {
  console.log('--- Descarga de Pageviews Wikimedia 6 idiomas (enrich-pageviews.mjs) ---')

  if (!existsSync(CACHE_ATTRS_DIR)) mkdirSync(CACHE_ATTRS_DIR, { recursive: true })

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const items = (seed.items || []).filter((i) => !i.hidden && Boolean(i.wikidataId))

  let sitelinks = {}
  if (existsSync(SITELINKS_CACHE)) {
    try {
      sitelinks = JSON.parse(readFileSync(SITELINKS_CACHE, 'utf8'))
    } catch {}
  }

  // 1. Descargar sitelinks que falten para obras con wikidataId
  const allQids = items.map((i) => i.wikidataId)
  await fetchMissingSitelinks(allQids, sitelinks)

  // 2. Cargar pageviews existentes
  const pageviewsMap = new Map() // id -> { value, src, conf, at }
  if (existsSync(PAGEVIEWS_FILE)) {
    const lines = readFileSync(PAGEVIEWS_FILE, 'utf8').split('\n').filter(Boolean)
    for (const l of lines) {
      try {
        const p = JSON.parse(l)
        if (p.id) pageviewsMap.set(p.id, p)
      } catch {}
    }
  }

  // Identificar las que necesitan visitas:
  // - no tienen registro en pageviewsMap;
  // - o tienen valor con todas las visitas a 0 pero tienen títulos en sitelinks (como los artistas que sufrieron 429)
  const targets = []
  for (const it of items) {
    const existing = pageviewsMap.get(it.id)
    const sl = sitelinks[it.wikidataId] || {}
    const hasAnyTitle = Object.values(sl).some(Boolean)

    if (!existing) {
      targets.push(it)
    } else {
      const views = existing.value || {}
      const totalViews = Object.values(views).reduce((a, b) => a + b, 0)
      if (totalViews === 0 && hasAnyTitle) {
        // Tenía 0 pero tiene títulos en Wikipedia: reintentar
        targets.push(it)
      }
    }
  }

  console.log(`Obras visibles con wikidataId: ${items.length}`)
  console.log(`Obras a consultar: ${targets.length}`)

  if (targets.length === 0) {
    console.log('✓ Todas las obras ya tienen visitas descargadas o verificadas.')
    return
  }

  // Secuencial a ritmo constante (~20-25 req/s) sin concurrencia para evitar ráfagas y 429
  let done = 0
  let withViews = 0
  const startTime = Date.now()

  for (const it of targets) {
    const sl = sitelinks[it.wikidataId] || {}
    const hasAnyTitle = Object.values(sl).some(Boolean)
    const views = {}

    if (hasAnyTitle) {
      for (const lang of LANGS) {
        if (sl[lang]) {
          views[lang] = await getPageviews(sl[lang], lang)
          await sleep(35)
        } else {
          views[lang] = 0
        }
      }
    }

    done++
    const totalViews = Object.values(views).reduce((a, b) => a + b, 0)
    if (totalViews > 0) withViews++

    // Guardar en mapa (si no tiene artículos en ninguno de los 6 idiomas, guardar {} según T20.3)
    const record = {
      id: it.id,
      value: hasAnyTitle ? views : {},
      src: 'wikimedia-api',
      conf: 1.0,
      at: new Date().toISOString().slice(0, 10),
    }
    pageviewsMap.set(it.id, record)
    appendFileSync(PAGEVIEWS_FILE, JSON.stringify(record) + '\n', 'utf8')

    if (done % 50 === 0 || done >= targets.length) {
      const elapsedSec = Math.max(1, (Date.now() - startTime) / 1000)
      const rate = (done / elapsedSec).toFixed(1)
      console.log(`  [${done}/${targets.length}] procesadas (${withViews} con visitas > 0) [${rate} obras/s]`)
    }

    await sleep(25)
  }

  // Escribir archivo consolidado único (sin duplicados)
  const outLines = Array.from(pageviewsMap.values()).map((v) => JSON.stringify(v))
  writeFileSync(PAGEVIEWS_FILE, outLines.join('\n') + '\n', 'utf8')
  console.log(`\n✓ Descarga finalizada: ${done} obras procesadas (${withViews} con visitas > 0).`)
  console.log(`Total registros en pageviews.jsonl: ${pageviewsMap.size}`)
}

main().catch((err) => {
  console.error('Error fatal en enrich-pageviews.mjs:', err)
  process.exit(1)
})
