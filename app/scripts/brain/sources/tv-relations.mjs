/**
 * tv-relations.mjs — Relaciones por metadatos para series (y películas cruzadas) (MOTOR v3 §C2).
 *
 * Fuentes:
 *   1. Wikidata SPARQL:
 *      - Creador (P170)
 *      - Guionista (P58)
 *      - Reparto (P161)
 *      - Cadena (P449)
 *      - Basada en (P144)
 *      - Ambientación (P840)
 *      - Tema principal (P921)
 *   2. TVmaze API:
 *      - Reparto facturado (primeros 5 actores en orden de facturación)
 *      - Equipo técnico (Creador, Guionista / Head Writer)
 *      - Cadena / WebChannel
 *
 * Salida:
 *   app/scripts/cache/graph/edges-tv.jsonl
 *   Formato: {"a", "b", "kind", "w", "src"}
 *   kind ∈ creator (w 1), writer (0.6), cast (0.3 por actor, máx 1, top 5),
 *          network (0.1, < 40 series), basedOn (1), setting (0.3).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const APP = join(here, '..', '..', '..')
const CACHE = join(APP, 'scripts', 'cache')
const GRAPH_CACHE = join(CACHE, 'graph')
const WIKI_DIR = join(GRAPH_CACHE, 'sources', 'wikidata')
const TVMAZE_DIR = join(GRAPH_CACHE, 'sources', 'tvmaze')
const OLD_TVMAZE_DIR = join(CACHE, 'tvmaze')
const OUT_FILE = join(GRAPH_CACHE, 'edges-tv.jsonl')

const SEED_FILE = join(APP, 'src', 'data', 'seed.json')
const ALIASES_FILE = join(APP, 'src', 'data', 'aliases.json')

const UA = 'BibliotecaApp/1.0 (biblioteca-social.vercel.app)'

mkdirSync(WIKI_DIR, { recursive: true })
mkdirSync(TVMAZE_DIR, { recursive: true })

const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
const aliases = existsSync(ALIASES_FILE) ? JSON.parse(readFileSync(ALIASES_FILE, 'utf8')) : {}
const items = seed.items || []

function canon(id) {
  let n = 0
  while (aliases[id] && n++ < 10) id = aliases[id]
  return id
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function normalizeName(s) {
  if (!s) return ''
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// -----------------------------------------------------------------------------
// 1. Wikidata SPARQL
// -----------------------------------------------------------------------------

async function fetchSparql(query, retries = 3) {
  const url = 'https://query.wikidata.org/sparql?query=' + encodeURIComponent(query) + '&format=json'
  for (let r = 0; r < retries; r++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': UA,
          Accept: 'application/sparql-results+json',
        },
        signal: AbortSignal.timeout(45000),
      })
      if (res.status === 429 || res.status === 503) {
        console.warn(`Wikidata HTTP ${res.status}, waiting 10s before retry (attempt ${r + 1}/${retries})...`)
        await sleep(10000)
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      return await res.json()
    } catch (err) {
      if (r === retries - 1) throw err
      console.warn(`Wikidata query error: ${err.message}, waiting 5s...`)
      await sleep(5000)
    }
  }
  return null
}

async function fetchWikidataSeriesProps(seriesWithQid) {
  const qids = seriesWithQid.map((s) => s.wikidataId)
  console.log(`[Wikidata] Verificando caché o descargando metadatos para ${qids.length} series...`)

  const BATCH_SIZE = 50
  const allBindings = []

  for (let i = 0; i < qids.length; i += BATCH_SIZE) {
    const chunkIndex = Math.floor(i / BATCH_SIZE)
    const cacheFile = join(WIKI_DIR, `batch_${chunkIndex}.json`)

    if (existsSync(cacheFile)) {
      const data = JSON.parse(readFileSync(cacheFile, 'utf8'))
      allBindings.push(...(data.results?.bindings || []))
      continue
    }

    const chunk = qids.slice(i, i + BATCH_SIZE)
    const values = chunk.map((q) => `wd:${q}`).join(' ')
    const query = `
SELECT ?show ?prop ?val ?valLabel WHERE {
  VALUES ?show { ${values} }
  {
    ?show wdt:P170 ?val . BIND("creator" AS ?prop)
  } UNION {
    ?show wdt:P58 ?val . BIND("writer" AS ?prop)
  } UNION {
    ?show wdt:P449 ?val . BIND("network" AS ?prop)
  } UNION {
    ?show wdt:P144 ?val . BIND("basedOn" AS ?prop)
  } UNION {
    ?show wdt:P840 ?val . BIND("setting" AS ?prop)
  } UNION {
    ?show wdt:P921 ?val . BIND("setting" AS ?prop)
  } UNION {
    ?show wdt:P161 ?val . BIND("cast" AS ?prop)
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}
`
    console.log(`[Wikidata] Descargando lote ${chunkIndex + 1} / ${Math.ceil(qids.length / BATCH_SIZE)} (${chunk.length} QIDs)...`)
    const data = await fetchSparql(query)
    if (data) {
      writeFileSync(cacheFile, JSON.stringify(data), 'utf8')
      allBindings.push(...(data.results?.bindings || []))
    }
    await sleep(1500)
  }

  // Parse bindings by QID
  const byQid = new Map()
  for (const b of allBindings) {
    const qid = b.show.value.split('/').pop()
    const prop = b.prop.value
    const valQid = b.val.value.split('/').pop()
    const label = b.valLabel?.value || valQid

    if (!byQid.has(qid)) {
      byQid.set(qid, {
        creator: new Set(),
        writer: new Set(),
        network: new Set(),
        basedOn: new Set(),
        setting: new Set(),
        cast: new Set(),
      })
    }
    const target = byQid.get(qid)[prop]
    if (target) {
      target.add(JSON.stringify({ qid: valQid, label }))
    }
  }

  console.log(`[Wikidata] Obtenidos metadatos para ${byQid.size} series.`)
  return byQid
}

// -----------------------------------------------------------------------------
// 2. TVmaze API
// -----------------------------------------------------------------------------

async function fetchTvmazeShow(tvId, retries = 3) {
  const url = `https://api.tvmaze.com/shows/${tvId}?embed[]=cast&embed[]=crew`
  for (let r = 0; r < retries; r++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(30000),
      })
      if (res.status === 404) return { notFound: true }
      if (res.status === 429 || res.status === 503) {
        console.warn(`TVmaze HTTP ${res.status}, waiting 10s before retry...`)
        await sleep(10000)
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      return await res.json()
    } catch (err) {
      if (r === retries - 1) throw err
      await sleep(3000)
    }
  }
  return null
}

async function searchTvmazeShow(query, retries = 3) {
  const url = `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(query)}&embed[]=cast&embed[]=crew`
  for (let r = 0; r < retries; r++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(30000),
      })
      if (res.status === 404) return { notFound: true }
      if (res.status === 429 || res.status === 503) {
        console.warn(`TVmaze search HTTP ${res.status}, waiting 10s...`)
        await sleep(10000)
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      return await res.json()
    } catch (err) {
      if (r === retries - 1) return null
      await sleep(3000)
    }
  }
  return null
}

async function fetchTvmazeData(seriesList) {
  console.log(`[TVmaze] Verificando caché y descargando cast/crew para ${seriesList.length} series...`)
  const byItemId = new Map()
  let fetchedCount = 0

  for (let idx = 0; idx < seriesList.length; idx++) {
    const s = seriesList[idx]
    const slug = s.id.replace('series:', '')

    // Check if we know TVmaze ID
    let tvId = s.tvmazeId
    if (!tvId) {
      const oldCache = join(OLD_TVMAZE_DIR, `${slug}.json`)
      if (existsSync(oldCache)) {
        try {
          const oldData = JSON.parse(readFileSync(oldCache, 'utf8'))
          if (oldData.id) tvId = oldData.id
        } catch {}
      }
    }

    let cacheFile = tvId ? join(TVMAZE_DIR, `${tvId}.json`) : join(TVMAZE_DIR, `slug_${slug}.json`)
    let data = null

    if (existsSync(cacheFile)) {
      try {
        data = JSON.parse(readFileSync(cacheFile, 'utf8'))
      } catch {}
    }

    if (!data) {
      if (tvId) {
        data = await fetchTvmazeShow(tvId)
      } else {
        // Try searching by title
        data = await searchTvmazeShow(s.title)
        if (data && data.id) {
          tvId = data.id
          cacheFile = join(TVMAZE_DIR, `${tvId}.json`)
        }
      }

      if (data) {
        writeFileSync(cacheFile, JSON.stringify(data), 'utf8')
        fetchedCount++
        if (fetchedCount % 25 === 0 || fetchedCount === seriesList.length) {
          console.log(`[TVmaze] Descargadas ${fetchedCount} fichas (serie ${idx + 1}/${seriesList.length}: ${s.title})...`)
        }
      }
      await sleep(1050) // Máximo 1 petición/s según Regla 4
    }

    if (data && !data.notFound) {
      byItemId.set(s.id, data)
    }
  }

  console.log(`[TVmaze] Completado: datos disponibles para ${byItemId.size} / ${seriesList.length} series.`)
  return byItemId
}

// -----------------------------------------------------------------------------
// 3. Extracción y generación del grafo de relaciones
// -----------------------------------------------------------------------------

function buildGraph(seriesList, wikiProps, tvmazeData) {
  console.log('--- Construyendo grafo de relaciones de series (edges-tv.jsonl) ---')

  // Recopilar nombres de cadenas para evitar que se cuelen en creadores de seed
  const knownNetworks = new Set([
    'nbc', 'abc', 'cbs', 'fox', 'the cw', 'usa network', 'hbo', 'syfy', 'bbc one',
    'tnt', 'paramount+ with showtime', 'freeform', 'discovery', 'history', 'mtv',
    'bbc two', 'fx', 'nickelodeon', 'itv1', 'comedy central', 'showtime', 'netflix',
    'amc', 'amazon prime video', 'apple tv+', 'disney+', 'movistar+', 'american broadcasting company',
    'national broadcasting company', 'columbia broadcasting system'
  ])
  for (const s of seriesList) {
    if (s.network) knownNetworks.add(normalizeName(s.network))
  }

  const metaByItem = new Map()

  for (const s of seriesList) {
    const id = canon(s.id)
    const creators = new Set()
    const writers = new Set()
    const cast = []
    const networks = new Set()
    const basedOn = new Set()
    const settings = new Set()

    // 1. From seed item
    if (s.creator) {
      const parts = s.creator.split(/,| y | and | & /i).map(normalizeName).filter(Boolean)
      for (const p of parts) {
        // Solo aceptar si no es una cadena y tiene longitud razonable
        if (p.length > 3 && !knownNetworks.has(p)) {
          creators.add(p)
        }
      }
    }
    if (s.network) {
      networks.add(normalizeName(s.network))
    }
    if (s.basedOn) {
      basedOn.add(s.basedOn.trim())
    }

    // 2. From Wikidata
    if (s.wikidataId && wikiProps.has(s.wikidataId)) {
      const wp = wikiProps.get(s.wikidataId)
      for (const raw of wp.creator) {
        const { qid, label } = JSON.parse(raw)
        creators.add(qid)
        if (label && !knownNetworks.has(normalizeName(label))) {
          creators.add(normalizeName(label))
        }
      }
      for (const raw of wp.writer) {
        const { qid, label } = JSON.parse(raw)
        writers.add(qid)
        if (label) writers.add(normalizeName(label))
      }
      for (const raw of wp.network) {
        const { label } = JSON.parse(raw)
        if (label) networks.add(normalizeName(label))
      }
      for (const raw of wp.basedOn) {
        const { qid } = JSON.parse(raw)
        basedOn.add(qid)
      }
      for (const raw of wp.setting) {
        const { qid } = JSON.parse(raw)
        settings.add(qid)
      }
    }

    // 3. From TVmaze
    if (tvmazeData.has(s.id)) {
      const td = tvmazeData.get(s.id)
      // Top 5 cast in billing order
      const embeddedCast = td._embedded?.cast || []
      for (const c of embeddedCast.slice(0, 5)) {
        if (c.person?.name) {
          cast.push(normalizeName(c.person.name))
        }
      }
      // Crew
      const embeddedCrew = td._embedded?.crew || []
      for (const cr of embeddedCrew) {
        const type = cr.type || ''
        const name = normalizeName(cr.person?.name)
        if (!name || name.length <= 3 || knownNetworks.has(name)) continue
        if (type === 'Creator' || type === 'Created by') {
          creators.add(name)
        } else if (type.includes('Writer') || type.includes('Story Editor') || type.includes('Screenplay')) {
          writers.add(name)
        } else if (type === 'Based on the Novel Of') {
          basedOn.add('novel_author:' + name)
        }
      }
      // Network
      if (td.network?.name) networks.add(normalizeName(td.network.name))
      if (td.webChannel?.name) networks.add(normalizeName(td.webChannel.name))
    }

    // Fallback cast if TVmaze didn't have it
    if (cast.length === 0 && s.cast && Array.isArray(s.cast)) {
      for (const c of s.cast.slice(0, 5)) {
        cast.push(normalizeName(c))
      }
    }

    metaByItem.set(id, {
      id,
      title: s.title,
      creators,
      writers,
      cast: cast.slice(0, 5),
      networks,
      basedOn,
      settings,
    })
  }

  const networkAliases = {
    'american broadcasting company': 'abc',
    'national broadcasting company': 'nbc',
    'columbia broadcasting system': 'cbs',
    'home box office': 'hbo',
    'british broadcasting corporation': 'bbc',
    'hbo espana': 'hbo',
    'hbo max': 'hbo',
  }
  const canonNet = (n) => networkAliases[n] || n

  // Pre-calculate network frequencies (only < 40 series)
  const networkCounts = new Map()
  for (const item of metaByItem.values()) {
    const unifiedNets = new Set(Array.from(item.networks).map(canonNet))
    item.networks = unifiedNets
    for (const net of unifiedNets) {
      networkCounts.set(net, (networkCounts.get(net) || 0) + 1)
    }
  }
  const validNetworks = new Set()
  for (const [net, count] of networkCounts.entries()) {
    if (count >= 2 && count < 40) {
      validNetworks.add(net)
    }
  }
  console.log(`[Grafo] Cadenas con < 40 series aceptadas: ${validNetworks.size} (excluidas >= 40: ${Array.from(networkCounts.entries()).filter(([, c]) => c >= 40).map(([n, c]) => `${n} (${c})`).join(', ')})`)

  // Pre-calculate setting frequencies (filter settings appearing in too many series to prevent hub noise, e.g. Earth or general country)
  const settingCounts = new Map()
  for (const item of metaByItem.values()) {
    for (const setQid of item.settings) {
      settingCounts.set(setQid, (settingCounts.get(setQid) || 0) + 1)
    }
  }
  const validSettings = new Set()
  for (const [setQid, count] of settingCounts.entries()) {
    if (count >= 2 && count <= 30) {
      validSettings.add(setQid)
    }
  }
  console.log(`[Grafo] Ambientaciones / temas específicos (2 a 30 series): ${validSettings.size}`)

  // Also include movies from seed for cross-shelf linking (basedOn / creator / cast)
  const movies = items.filter((i) => i.type === 'movie' && !i.hidden)
  const movieMeta = new Map()
  for (const m of movies) {
    const id = canon(m.id)
    const creators = new Set()
    if (m.creator) {
      const parts = m.creator.split(/,| y | and | & /i).map(normalizeName).filter(Boolean)
      for (const p of parts) creators.add(p)
    }
    const cast = []
    if (m.cast && Array.isArray(m.cast)) {
      for (const c of m.cast.slice(0, 5)) cast.push(normalizeName(c))
    }
    const basedOn = new Set()
    if (m.basedOn) basedOn.add(m.basedOn.trim())
    if (m.wikidataId) basedOn.add(m.wikidataId.trim())

    movieMeta.set(id, { id, title: m.title, creators, cast, basedOn, wikidataId: m.wikidataId })
  }

  const edges = []
  const seen = new Set()

  function addEdge(aId, bId, kind, w, src = 'tv-meta') {
    if (aId === bId) return
    const a = aId < bId ? aId : bId
    const b = aId < bId ? bId : aId
    const key = `${a}|${b}|${kind}`
    if (seen.has(key)) return
    seen.add(key)
    edges.push({ a, b, kind, w, src })
  }

  const seriesEntries = Array.from(metaByItem.values())

  // Pairwise series <-> series
  for (let i = 0; i < seriesEntries.length; i++) {
    const itemA = seriesEntries[i]
    for (let j = i + 1; j < seriesEntries.length; j++) {
      const itemB = seriesEntries[j]

      // 1. Creator (w: 1)
      let sharedCreator = false
      for (const c of itemA.creators) {
        if (itemB.creators.has(c)) {
          sharedCreator = true
          break
        }
      }
      if (sharedCreator) {
        addEdge(itemA.id, itemB.id, 'creator', 1.0)
      }

      // 2. Writer (w: 0.6)
      let sharedWriter = false
      for (const wr of itemA.writers) {
        if (itemB.writers.has(wr)) {
          sharedWriter = true
          break
        }
      }
      if (sharedWriter) {
        addEdge(itemA.id, itemB.id, 'writer', 0.6)
      }

      // 3. Cast (w: 0.3 per actor, max 1.0, top 5)
      if (itemA.cast.length > 0 && itemB.cast.length > 0) {
        const sharedActors = itemA.cast.filter((actor) => itemB.cast.includes(actor))
        if (sharedActors.length > 0) {
          const w = Math.min(1.0, Math.round(sharedActors.length * 0.3 * 10) / 10)
          addEdge(itemA.id, itemB.id, 'cast', w)
        }
      }

      // 4. Network (w: 0.1, < 40 series)
      let sharedNet = false
      for (const net of itemA.networks) {
        if (validNetworks.has(net) && itemB.networks.has(net)) {
          sharedNet = true
          break
        }
      }
      if (sharedNet) {
        addEdge(itemA.id, itemB.id, 'network', 0.1)
      }

      // 5. BasedOn (w: 1.0)
      let sharedBased = false
      for (const bo of itemA.basedOn) {
        if (itemB.basedOn.has(bo)) {
          sharedBased = true
          break
        }
      }
      if (sharedBased) {
        addEdge(itemA.id, itemB.id, 'basedOn', 1.0)
      }

      // 6. Setting / theme (w: 0.3)
      let sharedSetting = false
      for (const st of itemA.settings) {
        if (validSettings.has(st) && itemB.settings.has(st)) {
          sharedSetting = true
          break
        }
      }
      if (sharedSetting) {
        addEdge(itemA.id, itemB.id, 'setting', 0.3)
      }
    }
  }

  // Cross-shelf series <-> movie
  for (const sItem of seriesEntries) {
    for (const mItem of movieMeta.values()) {
      // Shared creator
      let sharedCreator = false
      for (const c of sItem.creators) {
        if (mItem.creators.has(c)) {
          sharedCreator = true
          break
        }
      }
      if (sharedCreator) addEdge(sItem.id, mItem.id, 'creator', 1.0)

      // Shared basedOn or adaptation link
      let sharedBased = false
      for (const bo of sItem.basedOn) {
        if (mItem.basedOn.has(bo) || mItem.wikidataId === bo) {
          sharedBased = true
          break
        }
      }
      if (sharedBased) addEdge(sItem.id, mItem.id, 'basedOn', 1.0)

      // Shared cast
      if (sItem.cast.length > 0 && mItem.cast.length > 0) {
        const shared = sItem.cast.filter((a) => mItem.cast.includes(a))
        if (shared.length > 0) {
          const w = Math.min(1.0, Math.round(shared.length * 0.3 * 10) / 10)
          addEdge(sItem.id, mItem.id, 'cast', w)
        }
      }
    }
  }

  console.log(`✓ Total aristas generadas en edges-tv.jsonl: ${edges.length}`)
  const byKind = {}
  for (const e of edges) byKind[e.kind] = (byKind[e.kind] || 0) + 1
  console.log('  Por tipo de relación:', byKind)

  // Series-series edge count
  const seriesSeries = edges.filter((e) => e.a.startsWith('series:') && e.b.startsWith('series:')).length
  console.log(`  Aristas series-series: ${seriesSeries}`)

  const lines = edges.map((e) => JSON.stringify(e)).join('\n')
  writeFileSync(OUT_FILE, lines ? lines + '\n' : '', 'utf8')
  console.log(`✓ Guardado en ${OUT_FILE}`)
}

// -----------------------------------------------------------------------------
// Principal
// -----------------------------------------------------------------------------

async function main() {
  const activeSeries = items.filter((i) => i.type === 'series' && !i.hidden)
  console.log(`Iniciando tv-relations para ${activeSeries.length} series activas...`)

  const seriesWithQid = activeSeries.filter((s) => s.wikidataId)
  const wikiProps = await fetchWikidataSeriesProps(seriesWithQid)
  const tvmazeData = await fetchTvmazeData(activeSeries)

  buildGraph(activeSeries, wikiProps, tvmazeData)
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
