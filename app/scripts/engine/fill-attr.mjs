/**
 * fill-attr.mjs — Herramienta de relleno y validación de atributos (MOTOR v2 §2b.2).
 *
 * Modos:
 *   --mode agent   Exporta bloques a scripts/cache/attrs/agent-in/ para que un agente los complete.
 *   --mode import  Valida scripts/cache/attrs/agent-out/ y consolida en cache/attrs/<attr>.jsonl.
 *   --mode direct  Rellena automáticamente consultando fuentes duras (Wikidata, Open Library, Wikimedia API).
 *
 * Uso:
 *   node --env-file-if-exists=.env.local scripts/engine/fill-attr.mjs --attr originalLanguage --shelf book --mode direct [--sample 50]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ATTRS, validateAttrValue } from './attrs.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const CACHE_ATTRS_DIR = join(here, '..', 'cache', 'attrs')
const AGENT_IN_DIR = join(CACHE_ATTRS_DIR, 'agent-in')
const AGENT_OUT_DIR = join(CACHE_ATTRS_DIR, 'agent-out')

const args = process.argv.slice(2)
const getArg = (flag) => {
  const idx = args.indexOf(flag)
  return idx !== -1 ? args[idx + 1] : null
}

const ATTR_NAME = getArg('--attr')
const SHELF = getArg('--shelf')
const MODE = getArg('--mode') || 'agent'
const SAMPLE = getArg('--sample') ? parseInt(getArg('--sample'), 10) : null

if (!ATTR_NAME || !ATTRS[ATTR_NAME]) {
  console.error(`Error: --attr inválido o no especificado. Disponibles: ${Object.keys(ATTRS).join(', ')}`)
  process.exit(1)
}

const def = ATTRS[ATTR_NAME]
if (SHELF && !def.shelves.includes(SHELF)) {
  console.error(`Error: la estantería '${SHELF}' no aplica a '${ATTR_NAME}'. Aplica a: ${def.shelves.join(', ')}`)
  process.exit(1)
}

function ensureDirs() {
  if (!existsSync(CACHE_ATTRS_DIR)) mkdirSync(CACHE_ATTRS_DIR, { recursive: true })
  if (!existsSync(AGENT_IN_DIR)) mkdirSync(AGENT_IN_DIR, { recursive: true })
  if (!existsSync(AGENT_OUT_DIR)) mkdirSync(AGENT_OUT_DIR, { recursive: true })
}

const USER_AGENT = 'BibliotecaSocial/1.0.0 ( contact@biblioteca-social.vercel.app )'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchJson(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function runDirectMode(items) {
  console.log(`\n--- Relleno directo para '${ATTR_NAME}' (${items.length} obras) ---`)
  const outFile = join(CACHE_ATTRS_DIR, `${ATTR_NAME}.jsonl`)
  let okCount = 0

  for (const item of items) {
    let val = null
    let src = 'wikidata'
    let conf = 1.0
    let evidence = null

    if (ATTR_NAME === 'originalLanguage') {
      if (item.wikidataId) {
        const entity = await fetchJson(`https://www.wikidata.org/wiki/Special:EntityData/${item.wikidataId}.json`)
        await sleep(150)
        const claims = entity?.entities?.[item.wikidataId]?.claims || {}
        // P364 = original language of film/series, P407 = language of work, P1412 = languages spoken (artist)
        const langQid =
          claims.P364?.[0]?.mainsnak?.datavalue?.value?.id ||
          claims.P407?.[0]?.mainsnak?.datavalue?.value?.id ||
          claims.P1412?.[0]?.mainsnak?.datavalue?.value?.id
        if (langQid === 'Q1321') val = 'es'
        else if (langQid === 'Q1860') val = 'en'
        else if (langQid === 'Q150') val = 'fr'
        else if (langQid === 'Q188') val = 'de'
        else if (langQid === 'Q652') val = 'it'
        else if (langQid === 'Q5287') val = 'ja'
        else if (langQid === 'Q9176') val = 'ko'
        else if (langQid === 'Q7737') val = 'ru'
      }
      if (!val && item.type === 'artist' && item.originCountry?.includes('ES')) {
        val = 'es'
        src = 'llm-infer'
        conf = 0.95
      }
    } else if (ATTR_NAME === 'originCountry') {
      if (item.wikidataId) {
        const entity = await fetchJson(`https://www.wikidata.org/wiki/Special:EntityData/${item.wikidataId}.json`)
        await sleep(150)
        const claims = entity?.entities?.[item.wikidataId]?.claims || {}
        // P495 = country of origin, P27 = country of citizenship
        const countryQid =
          claims.P495?.[0]?.mainsnak?.datavalue?.value?.id ||
          claims.P27?.[0]?.mainsnak?.datavalue?.value?.id
        if (countryQid === 'Q29') val = ['ES']
        else if (countryQid === 'Q30') val = ['US']
        else if (countryQid === 'Q145') val = ['GB']
        else if (countryQid === 'Q142') val = ['FR']
        else if (countryQid === 'Q183') val = ['DE']
        else if (countryQid === 'Q38') val = ['IT']
        else if (countryQid === 'Q17') val = ['JP']
      }
    } else if (ATTR_NAME === 'pageviews') {
      if (item.wikidataId) {
        const entity = await fetchJson(`https://www.wikidata.org/wiki/Special:EntityData/${item.wikidataId}.json`)
        await sleep(150)
        const sitelinks = entity?.entities?.[item.wikidataId]?.sitelinks || {}
        const esTitle = sitelinks.eswiki?.title
        const enTitle = sitelinks.enwiki?.title
        const pv = {}

        if (esTitle) {
          const now = new Date()
          const endStr = now.toISOString().slice(0, 10).replace(/-/g, '')
          const past = new Date(now.getTime() - 365 * 24 * 3600 * 1000)
          const startStr = past.toISOString().slice(0, 10).replace(/-/g, '')
          const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/es.wikipedia/all-access/all-agents/${encodeURIComponent(
            esTitle
          )}/monthly/${startStr}/${endStr}`
          const pvData = await fetchJson(url)
          await sleep(150)
          if (pvData?.items?.length) {
            pv.es = pvData.items.reduce((acc, row) => acc + (row.views || 0), 0)
          }
        }
        if (enTitle) {
          const now = new Date()
          const endStr = now.toISOString().slice(0, 10).replace(/-/g, '')
          const past = new Date(now.getTime() - 365 * 24 * 3600 * 1000)
          const startStr = past.toISOString().slice(0, 10).replace(/-/g, '')
          const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent(
            enTitle
          )}/monthly/${startStr}/${endStr}`
          const pvData = await fetchJson(url)
          await sleep(150)
          if (pvData?.items?.length) {
            pv.en = pvData.items.reduce((acc, row) => acc + (row.views || 0), 0)
          }
        }
        if (Object.keys(pv).length > 0) {
          val = pv
          src = 'wikimedia-api'
        }
      }
    }

    if (val !== null) {
      const check = validateAttrValue(ATTR_NAME, val, evidence, src)
      if (check.valid) {
        const line = JSON.stringify({
          id: item.id,
          value: check.value,
          src,
          conf,
          ...(evidence ? { evidence } : {}),
          at: new Date().toISOString().slice(0, 10),
        })
        appendFileSync(outFile, line + '\n', 'utf8')
        okCount++
        console.log(`  ✓ ${item.id}:`, check.value)
      } else {
        console.warn(`  ⚠️ Validación falló para ${item.id}:`, check.error)
      }
    }
  }

  console.log(`\n✓ Direct mode completado: +${okCount}/${items.length} valores guardados en ${outFile}`)
}

async function main() {
  ensureDirs()
  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const items = seed.items || []

  // Filtrar estanterías aplicables
  const relevantShelves = SHELF ? [SHELF] : def.shelves
  const filtered = items.filter((i) => relevantShelves.includes(i.type))

  // Cargar valores existentes de cache/attrs/<attr>.jsonl
  const attrFile = join(CACHE_ATTRS_DIR, `${ATTR_NAME}.jsonl`)
  const knownIds = new Set()
  if (existsSync(attrFile)) {
    const lines = readFileSync(attrFile, 'utf8').split('\n').filter(Boolean)
    for (const l of lines) {
      try {
        const parsed = JSON.parse(l)
        if (parsed.id) knownIds.add(parsed.id)
      } catch {}
    }
  }

  // Identificar huecos (items que no tienen el atributo en seed.json ni en el .jsonl)
  const missing = filtered.filter((i) => !knownIds.has(i.id) && (i[ATTR_NAME] === undefined || i[ATTR_NAME] === null))
  console.log(`Atributo '${ATTR_NAME}': ${filtered.length - missing.length}/${filtered.length} cubiertos. Faltan: ${missing.length}`)

  let targets = missing
  if (SAMPLE) targets = targets.slice(0, SAMPLE)

  if (MODE === 'agent') {
    const exportFile = join(AGENT_IN_DIR, `${ATTR_NAME}-${SHELF || 'all'}.json`)
    const exportData = targets.map((i) => ({
      id: i.id,
      type: i.type,
      title: i.title,
      year: i.year,
      creator: i.creator,
      wikidataId: i.wikidataId,
      prompt: def.question || `Indica el valor de '${ATTR_NAME}' para esta obra.`,
      expectedType: def.type,
    }))
    writeFileSync(exportFile, JSON.stringify(exportData, null, 2), 'utf8')
    console.log(`\n✓ Exportados ${exportData.length} items a ${exportFile}`)
    console.log(`El agente debe rellenar las respuestas en scripts/cache/attrs/agent-out/${ATTR_NAME}-${SHELF || 'all'}.json`)
    console.log(`Luego ejecuta: node scripts/engine/fill-attr.mjs --attr ${ATTR_NAME} --mode import`)
  } else if (MODE === 'import') {
    const importFile = join(AGENT_OUT_DIR, `${ATTR_NAME}-${SHELF || 'all'}.json`)
    if (!existsSync(importFile)) {
      console.error(`Error: No existe el archivo de salida del agente: ${importFile}`)
      process.exit(1)
    }
    const importData = JSON.parse(readFileSync(importFile, 'utf8'))
    let validCount = 0
    let invalidCount = 0

    for (const row of importData) {
      const check = validateAttrValue(ATTR_NAME, row.value, row.evidence, row.src || 'llm-infer')
      if (check.valid) {
        const line = JSON.stringify({
          id: row.id,
          value: check.value,
          src: row.src || 'llm-infer',
          conf: row.conf ?? 0.85,
          ...(row.evidence ? { evidence: row.evidence } : {}),
          at: new Date().toISOString().slice(0, 10),
        })
        appendFileSync(attrFile, line + '\n', 'utf8')
        validCount++
      } else {
        invalidCount++
        console.warn(`  ⚠️ Fila descartada (${row.id}):`, check.error)
      }
    }
    console.log(`\n✓ Importación finalizada: ${validCount} válidas añadidas a ${attrFile}, ${invalidCount} descartadas.`)
  } else if (MODE === 'direct') {
    await runDirectMode(targets)
  }
}

main().catch((err) => {
  console.error('Error fatal en fill-attr.mjs:', err)
  process.exit(1)
})
