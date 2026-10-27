/**
 * bgg.mjs — Comportamiento REAL de aficionados a los juegos de mesa («a los fans de A también
 * les gusta B»), a partir de las recomendaciones públicas de BoardGameGeek, para los JUEGOS del catálogo.
 *
 * Aprobado por Igor el 27/10/2026: ~1.000 peticiones, ≤ 1 por segundo, solo recuentos agregados.
 * Solo se guardan ids, nombre, año y posición de cada recomendación; nada de usuarios ni textos.
 *
 * Pasos (cada uno cachea su salida; se pueden relanzar sueltos y son reanudables):
 *   node scripts/brain/sources/bgg.mjs ids      # id de BGG de cada juego -> sources/bgg/ids.json (+ dudosos)
 *   node scripts/brain/sources/bgg.mjs recs     # recomendaciones por id -> sources/bgg/recs/<id>.json
 *   node scripts/brain/sources/bgg.mjs pool     # emparejar por nombre+año los que no tienen id con lo ya visto en recs
 *   node scripts/brain/sources/bgg.mjs build    # aristas -> cache/graph/cooc-bgg.jsonl + informe
 *   node scripts/brain/sources/bgg.mjs all      # ids -> (recs -> pool)* -> build
 *   node scripts/brain/sources/bgg.mjs verify N # comprueba N ids al azar contra geekitems (petición extra por id)
 *
 * Origen del id de BGG (por orden de preferencia):
 *   wikidata  propiedad P2339 de la ficha de Wikidata (wbgetentities, lotes de 50)
 *   seed      campo bggId que ya traía el catálogo (cruzado y marcado si discrepa de Wikidata)
 *   recs-pool el juego aparece, con el mismo nombre normalizado y año ±1, en las recomendaciones ya
 *             descargadas de otros juegos (no hay buscador público utilizable: boardgamegeek.com está
 *             tras Cloudflare, la API XML da 401 y no se intenta saltarlos)
 *
 * Dudosos: discrepancia Wikidata/seed, nombre o año que no cuadran con el que BGG publica para ese id,
 * varios juegos del catálogo con el mismo id. Los dudosos con nombre Y año distintos NO generan aristas.
 *
 * Peso de posición: la recomendación en el puesto p (0 = primera) de una lista de L pesa
 *   1 - 0.5 * p / max(1, L - 1)    (1.0 la primera, 0.5 la última)
 * `n` de cada par es la suma de ese peso en las dos direcciones (A->B y B->A), redondeada a 3 decimales.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const APP = join(here, '..', '..', '..')
const CACHE = join(APP, 'scripts', 'cache')
const SRC_DIR = join(CACHE, 'graph', 'sources', 'bgg')
const RECS_DIR = join(SRC_DIR, 'recs')
const IDS_FILE = join(SRC_DIR, 'ids.json')
const GRAPH_DIR = join(CACHE, 'graph')
const OUT_FILE = join(GRAPH_DIR, 'cooc-bgg.jsonl')
const REPORT_FILE = join(SRC_DIR, 'report.json')

const UA = 'BibliotecaApp/1.0 (biblioteca-social.vercel.app)'
const RECS_URL = 'https://api.geekdo.com/api/geekitem/recs?ajax=1&objecttype=thing&objectid='
const ITEM_URL = 'https://api.geekdo.com/api/geekitems?objecttype=thing&objectid='
const MIN_GAP_MS = 1000 // ≤ 1 petición por segundo
const JITTER_MS = 600 // + hasta 0,6 s aleatorios
const BACKOFFS = [20, 45, 90, 180, 300] // segundos de espera ante 429/503/5xx

mkdirSync(RECS_DIR, { recursive: true })

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const readJson = (f, d) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : d)

const seed = JSON.parse(readFileSync(join(APP, 'src', 'data', 'seed.json'), 'utf8'))
const aliases = JSON.parse(readFileSync(join(APP, 'src', 'data', 'aliases.json'), 'utf8'))
const canon = (id) => aliases[id] || id
const games = seed.items.filter((i) => i.type === 'boardgame').map((i) => ({ ...i, id: canon(i.id) }))
const gameById = new Map(games.map((g) => [g.id, g]))

/** Normaliza un nombre: sin acentos, minúsculas, sin puntuación ni artículos iniciales. */
function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^(the|a|an|el|la|los|las|le|les|der|die|das) /, '')
    .trim()
}

/** Nombres con los que puede aparecer un juego (título, títulos localizados, sin subtítulo tras «:»). */
function namesOf(g) {
  const set = new Set()
  const add = (t) => {
    const n = norm(t)
    if (n) set.add(n)
    const base = norm(String(t || '').split(/[:\-–—(]/)[0])
    if (base && base.length >= 4) set.add(base)
  }
  add(g.title)
  for (const v of Object.values(g.titles || {})) add(v)
  return set
}

/** Solo títulos completos normalizados (sin recortar subtítulos): para emparejar sin ambigüedad. */
function fullNamesOf(g) {
  const set = new Set()
  for (const t of [g.title, ...Object.values(g.titles || {})]) {
    const n = norm(t)
    if (n) set.add(n)
  }
  return set
}

function tokenSim(a, b) {
  const A = new Set(a.split(' ')), B = new Set(b.split(' '))
  let inter = 0
  for (const t of A) if (B.has(t)) inter++
  return inter / Math.max(1, Math.min(A.size, B.size))
}

/** ¿Cuadra el nombre de BGG con el del catálogo? 'exacto' | 'parcial' | 'no' */
function nameMatch(g, bggName) {
  const b = norm(bggName)
  const names = namesOf(g)
  if (names.has(b)) return 'exacto'
  for (const n of names) {
    if (n.length >= 4 && b.length >= 4 && (b.startsWith(n) || n.startsWith(b) || tokenSim(n, b) >= 0.8)) return 'parcial'
  }
  return 'no'
}

const yearOk = (g, y) => !g.year || !y || Math.abs(g.year - y) <= 1

let lastReq = 0
/** fetch con límite de ritmo, UA propio y reintento con espera ante 429/503/5xx. Devuelve JSON o null (404). */
async function getJson(url) {
  for (let attempt = 0; ; attempt++) {
    const wait = lastReq + MIN_GAP_MS + Math.random() * JITTER_MS - Date.now()
    if (wait > 0) await sleep(wait)
    lastReq = Date.now()
    let res
    try {
      res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    } catch (e) {
      if (attempt >= BACKOFFS.length) throw e
      console.log(`  red caída (${e.message}); espero ${BACKOFFS[attempt]} s`)
      await sleep(BACKOFFS[attempt] * 1000)
      continue
    }
    if (res.status === 404) return null
    if (res.status === 429 || res.status === 503 || res.status >= 500) {
      if (attempt >= BACKOFFS.length) throw new Error(`HTTP ${res.status} tras ${attempt} reintentos: ${url}`)
      console.log(`  HTTP ${res.status}; espero ${BACKOFFS[attempt]} s`)
      await sleep(BACKOFFS[attempt] * 1000)
      continue
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
    try {
      return await res.json()
    } catch {
      if (attempt >= 2) throw new Error(`Respuesta no JSON: ${url}`)
      await sleep(5000)
    }
  }
}

// ---------------------------------------------------------------------------
// Paso 1: ids de BGG
// ---------------------------------------------------------------------------

async function wikidataIds() {
  const cacheF = join(SRC_DIR, 'wikidata-p2339.json')
  const cache = readJson(cacheF, {})
  const qids = [...new Set(games.map((g) => g.wikidataId).filter(Boolean))].filter((q) => !(q in cache))
  for (let i = 0; i < qids.length; i += 50) {
    const batch = qids.slice(i, i + 50)
    const url =
      'https://www.wikidata.org/w/api.php?action=wbgetentities&props=claims&format=json&origin=*&ids=' +
      batch.join('|')
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!res.ok) throw new Error('Wikidata HTTP ' + res.status)
    const j = await res.json()
    for (const q of batch) {
      const e = j.entities?.[q]
      const claims = (e?.claims?.P2339 || []).filter((c) => c.rank !== 'deprecated')
      claims.sort((a, b) => (b.rank === 'preferred') - (a.rank === 'preferred'))
      cache[q] = claims.map((c) => String(c.mainsnak?.datavalue?.value || '')).filter(Boolean)
    }
    // los Q fusionados (redirecciones) devuelven la entidad bajo el Q nuevo: se resuelve abajo
    for (const [k, e] of Object.entries(j.entities || {})) {
      if (!batch.includes(k) && e?.claims) {
        const claims = (e.claims.P2339 || []).filter((c) => c.rank !== 'deprecated')
        cache[k] = claims.map((c) => String(c.mainsnak?.datavalue?.value || '')).filter(Boolean)
      }
    }
    const lost = batch.filter((q) => !j.entities?.[q])
    if (lost.length) console.log('  Q sin entidad (¿fusionados?):', lost.join(','))
    writeFileSync(cacheF, JSON.stringify(cache))
    console.log(`  Wikidata ${Math.min(i + 50, qids.length)}/${qids.length}`)
    await sleep(300)
  }
  return cache
}

/** Índice offline de Wikidata: todo lo que tiene P2339 -> {bggId, etiquetas en/es + alias en, año}. */
async function wikidataIndex() {
  const f = join(SRC_DIR, 'wikidata-index.json')
  if (existsSync(f)) return readJson(f, {})
  const run = async (q) => {
    const res = await fetch('https://query.wikidata.org/sparql', {
      method: 'POST',
      headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'query=' + encodeURIComponent(q)
    })
    if (!res.ok) throw new Error('SPARQL HTTP ' + res.status)
    return (await res.json()).results.bindings
  }
  const idx = {} // bggId -> { q, year, names:Set }
  const add = (b, nameKey) => {
    const bgg = b.bgg.value
    const e = (idx[bgg] ||= { q: b.item.value.split('/').pop(), year: null, names: [] })
    if (b.year) e.year = Number(b.year.value)
    if (!e.names.includes(b[nameKey].value)) e.names.push(b[nameKey].value)
  }
  for (const b of await run(`SELECT ?bgg ?label ?year ?item WHERE { ?item wdt:P2339 ?bgg . OPTIONAL { ?item wdt:P577 ?d . BIND(YEAR(?d) AS ?year) } ?item rdfs:label ?label . FILTER(LANG(?label) IN ("en","es")) }`)) add(b, 'label')
  try {
    for (const b of await run(`SELECT ?bgg ?alt ?year ?item WHERE { ?item wdt:P2339 ?bgg . OPTIONAL { ?item wdt:P577 ?d . BIND(YEAR(?d) AS ?year) } ?item skos:altLabel ?alt . FILTER(LANG(?alt) IN ("en","es")) }`)) add(b, 'alt')
  } catch (e) {
    console.log('  alias de Wikidata omitidos:', e.message)
  }
  writeFileSync(f, JSON.stringify(idx))
  console.log('  índice Wikidata:', Object.keys(idx).length, 'juegos con P2339')
  return idx
}

async function stepIds() {
  const wd = await wikidataIds()
  const widx = await wikidataIndex()
  const byNameWd = new Map() // nombre normalizado -> [bggId]
  for (const [bgg, e] of Object.entries(widx)) {
    for (const n of e.names) {
      const k = norm(n)
      if (!byNameWd.has(k)) byNameWd.set(k, new Set())
      byNameWd.get(k).add(bgg)
    }
  }
  const prev = readJson(IDS_FILE, { ids: {}, doubtful: [] })
  const ids = {}
  for (const g of games) {
    const cands = []
    const w = g.wikidataId ? wd[g.wikidataId] || [] : []
    if (w.length) cands.push({ id: w[0], source: 'wikidata', extra: w.slice(1) })
    if (g.bggId) cands.push({ id: String(g.bggId), source: 'seed' })
    const prevEntry = prev.ids[g.id]
    if (!cands.length && prevEntry && prevEntry.source === 'recs-pool') cands.push(prevEntry)
    if (!cands.length) {
      // Etiquetas de Wikidata (en/es): título completo normalizado + año ±1, candidato único
      const found = new Set()
      for (const n of fullNamesOf(g)) for (const b of byNameWd.get(n) || []) found.add(b)
      const ok = [...found].filter((b) => yearOk(g, widx[b].year))
      if (ok.length === 1) {
        const b = ok[0]
        ids[g.id] = { bggId: b, source: 'wikidata-label', wikidata: widx[b].q, flags: widx[b].year ? [] : ['wd-sin-año'] }
      }
      continue
    }
    const main = cands[0]
    const entry = { bggId: main.id, source: main.source }
    const flags = []
    if (main.extra?.length) flags.push('wikidata-varios:' + [main.id, ...main.extra].join(','))
    const other = cands.find((c) => c.source === 'seed' && c.id !== main.id)
    if (main.source === 'wikidata' && other) flags.push(`discrepa-seed:${other.id}`)
    if (main.source === 'wikidata' && !other && g.bggId) entry.confirmedBy = 'seed'
    entry.flags = flags
    ids[g.id] = entry
  }
  writeFileSync(IDS_FILE, JSON.stringify({ ids, doubtful: prev.doubtful || [] }, null, 1))
  const by = {}
  for (const e of Object.values(ids)) by[e.source] = (by[e.source] || 0) + 1
  console.log('ids:', Object.keys(ids).length, 'de', games.length, by)
}

// ---------------------------------------------------------------------------
// Paso 2: recomendaciones
// ---------------------------------------------------------------------------

const recFile = (id) => join(RECS_DIR, id + '.json')

function parseRecs(j) {
  const list = Array.isArray(j?.recs) ? j.recs : []
  return list
    .map((r, p) => {
      const it = r.item || {}
      const yr = (it.descriptors || []).find((d) => d.name === 'yearpublished')
      return {
        id: String(it.id || ''),
        name: it.name || '',
        year: yr ? Number(yr.displayValue) || null : r.yearpublished ? Number(r.yearpublished) || null : null,
        pos: p
      }
    })
    .filter((r) => r.id)
}

async function stepRecs(limit = Infinity) {
  const { ids } = readJson(IDS_FILE, { ids: {} })
  const todo = [...new Set(Object.values(ids).filter((e) => !(e.excluded)).map((e) => e.bggId))].filter((id) => !existsSync(recFile(id)))
  console.log(`recs: ${todo.length} por pedir (≈ ${Math.round(todo.length * 1.3 / 60)} min)`)
  let done = 0, fails = 0
  for (const id of todo.slice(0, limit)) {
    try {
      const j = await getJson(RECS_URL + id)
      const recs = j ? parseRecs(j) : []
      writeFileSync(recFile(id), JSON.stringify({ id, fetched: new Date().toISOString().slice(0, 10), numrecs: Number(j?.numrecs) || recs.length, recs }))
      fails = 0
    } catch (e) {
      console.log(`  fallo en ${id}: ${e.message}`)
      if (++fails >= 5) throw new Error('Demasiados fallos seguidos; paro')
    }
    if (++done % 25 === 0) console.log(`  recs ${done}/${todo.length}`)
  }
  console.log(`recs: hechos ${done}`)
}

// ---------------------------------------------------------------------------
// Verificación cruzada y emparejado por nombre con lo ya descargado
// ---------------------------------------------------------------------------

/** id BGG -> {name, year} visto en alguna lista de recomendaciones. */
function loadPool() {
  const pool = new Map()
  for (const f of readdirSync(RECS_DIR)) {
    const d = readJson(join(RECS_DIR, f), null)
    for (const r of d?.recs || []) if (!pool.has(r.id)) pool.set(r.id, { name: r.name, year: r.year })
  }
  return pool
}

function stepPool() {
  const data = readJson(IDS_FILE, { ids: {}, doubtful: [] })
  const pool = loadPool()
  // índice nombre normalizado -> ids de pool
  const byName = new Map()
  for (const [id, v] of pool) {
    const n = norm(v.name)
    if (!byName.has(n)) byName.set(n, [])
    byName.get(n).push(id)
  }
  const taken = new Set(Object.values(data.ids).map((e) => e.bggId))
  let added = 0
  for (const g of games) {
    if (data.ids[g.id]) continue
    const cands = new Set()
    for (const n of fullNamesOf(g)) for (const id of byName.get(n) || []) cands.add(id)
    const ok = [...cands].filter((id) => !taken.has(id) && yearOk(g, pool.get(id).year) && (!g.year || pool.get(id).year))
    // solo se acepta si es único y el nombre es exacto con el título principal o el año coincide exacto
    if (ok.length === 1) {
      const id = ok[0]
      const exactYear = pool.get(id).year === g.year
      const exactTitle = norm(pool.get(id).name) === norm(g.title)
      if (exactYear || exactTitle) { // el nombre completo normalizado ya coincide; año ±1 comprobado arriba
        data.ids[g.id] = { bggId: id, source: 'recs-pool', flags: exactYear ? [] : ['año-±1'] }
        taken.add(id)
        added++
      }
    }
  }
  writeFileSync(IDS_FILE, JSON.stringify(data, null, 1))
  console.log(`pool: ${pool.size} juegos de BGG vistos; emparejados ${added} nuevos`)
  return added
}

/** Marca dudosos comparando cada id con el nombre/año que BGG publica (si lo hemos visto en el pool). */
function classify() {
  const data = readJson(IDS_FILE, { ids: {} })
  const pool = loadPool()
  const doubtful = []
  const seenIds = new Map() // bggId -> [catalogId]
  for (const [cid, e] of Object.entries(data.ids)) {
    if (!seenIds.has(e.bggId)) seenIds.set(e.bggId, [])
    seenIds.get(e.bggId).push(cid)
  }
  for (const [cid, e] of Object.entries(data.ids)) {
    const g = gameById.get(cid)
    const flags = (e.flags || []).filter((f) => !f.startsWith('nombre') && !f.startsWith('año:') && f !== 'sin-verificar' && f !== 'duplicado')
    let excluded = false
    const p = pool.get(e.bggId)
    e.bgg = p ? { name: p.name, year: p.year } : undefined
    if (p) {
      const nm = nameMatch(g, p.name)
      const yo = yearOk(g, p.year)
      e.check = nm + (yo ? '+año' : '-año')
      if (nm === 'no') flags.push(`nombre:${p.name}`)
      if (!yo) flags.push(`año:${p.year}`)
      if (nm === 'no' && !yo) excluded = true
      // nombre muy distinto aunque el año cuadre y el origen no es wikidata+seed: se deja pero marcado
    } else {
      e.check = 'sin-verificar'
      flags.push('sin-verificar')
    }
    const same = seenIds.get(e.bggId)
    if (same.length > 1) {
      flags.push('duplicado:' + same.filter((x) => x !== cid).join(','))
      // se queda el que mejor casa de nombre; los demás se excluyen
      const score = (x) => (p ? { exacto: 2, parcial: 1, no: 0 }[nameMatch(gameById.get(x), p.name)] : 0) * 10 + (gameById.get(x).year === p?.year ? 1 : 0)
      const best = [...same].sort((a, b) => score(b) - score(a) || a.localeCompare(b))[0]
      if (best !== cid) excluded = true
    }
    e.flags = flags
    e.excluded = excluded || undefined
    const dud = flags.some((f) => /^(nombre|año:|discrepa|duplicado|wikidata-varios|wd-sin-año)/.test(f))
    if (dud) doubtful.push({ id: cid, bggId: e.bggId, source: e.source, flags, excluded: !!excluded, title: g.title, year: g.year })
  }
  data.doubtful = doubtful
  writeFileSync(IDS_FILE, JSON.stringify(data, null, 1))
  return data
}

async function stepVerify(n) {
  const data = readJson(IDS_FILE, { ids: {} })
  const vf = join(SRC_DIR, 'verify.json')
  const out = readJson(vf, {})
  const entries = Object.entries(data.ids)
  let rnd = 20261027
  const rand = () => ((rnd = (rnd * 1664525 + 1013904223) % 4294967296) / 4294967296)
  const pick = [...entries].sort(() => rand() - 0.5).slice(0, n)
  for (const [cid, e] of pick) {
    if (out[cid]) continue
    const j = await getJson(ITEM_URL + e.bggId)
    const it = j?.item
    out[cid] = { bggId: e.bggId, name: it?.name, year: it?.yearpublished ? Number(it.yearpublished) : null }
    writeFileSync(vf, JSON.stringify(out, null, 1))
  }
  return out
}

// ---------------------------------------------------------------------------
// Paso 3: aristas
// ---------------------------------------------------------------------------

function stepBuild() {
  const data = classify()
  const byBgg = new Map() // id BGG -> id catálogo (solo los no excluidos)
  for (const [cid, e] of Object.entries(data.ids)) if (!e.excluded) byBgg.set(e.bggId, cid)
  const pairs = new Map()
  let lists = 0, withRecs = 0, hits = 0
  for (const [cid, e] of Object.entries(data.ids)) {
    if (e.excluded) continue
    const d = readJson(recFile(e.bggId), null)
    if (!d) continue
    lists++
    if (d.recs.length) withRecs++
    const L = d.recs.length
    for (const r of d.recs) {
      const other = byBgg.get(r.id)
      if (!other || other === cid) continue
      hits++
      const w = 1 - (0.5 * r.pos) / Math.max(1, L - 1)
      const [a, b] = cid < other ? [cid, other] : [other, cid]
      const k = a + '|' + b
      pairs.set(k, (pairs.get(k) || 0) + w)
    }
  }
  const lines = [...pairs.entries()]
    .sort((x, y) => x[0].localeCompare(y[0]))
    .map(([k, n]) => {
      const [a, b] = k.split('|')
      return JSON.stringify({ a, b, source: 'bgg-recs', n: Math.round(n * 1000) / 1000 })
    })
  writeFileSync(OUT_FILE, lines.join('\n') + '\n')

  // informe
  const deg = new Map(games.map((g) => [g.id, 0]))
  for (const k of pairs.keys()) for (const x of k.split('|')) deg.set(x, deg.get(x) + 1)
  const dv = [...deg.values()]
  const rep = {
    juegos: games.length,
    conId: Object.keys(data.ids).length,
    porOrigen: Object.values(data.ids).reduce((m, e) => ((m[e.source] = (m[e.source] || 0) + 1), m), {}),
    dudosos: data.doubtful.length,
    excluidos: Object.values(data.ids).filter((e) => e.excluded).length,
    listasRecs: lists,
    listasNoVacias: withRecs,
    recomendacionesEnCatalogo: hits,
    aristas: pairs.size,
    pctConAlMenos1: +((100 * dv.filter((x) => x >= 1).length) / games.length).toFixed(1),
    pctConAlMenos10: +((100 * dv.filter((x) => x >= 10).length) / games.length).toFixed(1)
  }
  writeFileSync(REPORT_FILE, JSON.stringify(rep, null, 1))
  console.log(rep)
}

// ---------------------------------------------------------------------------

const cmd = process.argv[2] || 'all'
if (cmd === 'ids') await stepIds()
else if (cmd === 'recs') await stepRecs()
else if (cmd === 'pool') { stepPool(); classify() }
else if (cmd === 'build') stepBuild()
else if (cmd === 'verify') console.log(await stepVerify(Number(process.argv[3]) || 20))
else if (cmd === 'all') {
  await stepIds()
  for (let round = 0; round < 4; round++) {
    classify()
    await stepRecs()
    if (!stepPool()) break
  }
  await stepRecs()
  stepBuild()
} else {
  console.error('Uso: node scripts/brain/sources/bgg.mjs [ids|recs|pool|build|verify N|all]')
  process.exit(1)
}
