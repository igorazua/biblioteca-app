/**
 * goodbooks.mjs — Comportamiento REAL de lectores (goodbooks-10k: ~6 M valoraciones de Goodreads,
 * 53 k usuarios, 10 k libros) para LIBROS del catálogo.
 *
 * Produce dos cosas a partir del mismo dataset:
 *   1. Grafo de co-gusto  -> cache/graph/cooc-goodbooks.jsonl  (solo recuentos agregados, sin usuarios)
 *   2. Conjunto de EVALUACIÓN con usuarios reales (10 %) -> cache/eval/real-users-books.jsonl
 *      (ids anónimos "gb<n>"; esos usuarios NO entran en el grafo)
 *
 * Pasos (cada uno cachea su salida; se pueden relanzar sueltos):
 *   node scripts/brain/sources/goodbooks.mjs download   # books.csv y ratings.csv -> cache/graph/sources/goodbooks/
 *   node scripts/brain/sources/goodbooks.mjs titles     # títulos EN del catálogo (Wikidata + Open Library) -> en-titles.json
 *   node scripts/brain/sources/goodbooks.mjs map        # cruce goodbooks -> catálogo -> map.json + informe
 *   node scripts/brain/sources/goodbooks.mjs build      # separa usuarios, co-gusto + PPMI, evaluación
 *   node scripts/brain/sources/goodbooks.mjs all
 *
 * Reglas del cruce: precisión antes que cobertura. Un libro solo se cruza si coinciden
 * (a) apellido del autor (con inicial del nombre compatible) y (b) título normalizado
 * (acentos, artículos, paréntesis de serie y subtítulo fuera), y (c) el año no se aleja demasiado
 * (si se aleja, solo se acepta con título completo exacto y queda marcado como dudoso).
 */

import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'

const here = dirname(fileURLToPath(import.meta.url))
const APP = join(here, '..', '..', '..')
const CACHE = join(APP, 'scripts', 'cache')
const SRC_DIR = join(CACHE, 'graph', 'sources', 'goodbooks')
const GRAPH_DIR = join(CACHE, 'graph')
const EVAL_DIR = join(CACHE, 'eval')
const RAW = 'https://raw.githubusercontent.com/zygmuntz/goodbooks-10k/master/'
const UA = 'BibliotecaApp-research/0.1 (igorazua@gmail.com)'

const SEED_SEED = 20261027 // semilla fija de la partición evaluación / grafo
const EVAL_FRACTION = 0.1
const MIN_CROSSED_EVAL = 20 // mínimo de libros cruzados por usuario de evaluación
const LIKE_MIN = 4 // valoración mínima que cuenta como "gusto"
const MIN_N = 3 // mínimo de usuarios compartiendo un par
const TOP_K = 50 // vecinos por libro

mkdirSync(SRC_DIR, { recursive: true })
mkdirSync(EVAL_DIR, { recursive: true })

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const seed = JSON.parse(readFileSync(join(APP, 'src', 'data', 'seed.json'), 'utf8'))
const aliases = JSON.parse(readFileSync(join(APP, 'src', 'data', 'aliases.json'), 'utf8'))
const books = seed.items.filter((i) => i.type === 'book')

/** Sigue la cadena de alias hasta el id conservado. */
function canon(id) {
  let n = 0
  while (aliases[id] && n++ < 10) id = aliases[id]
  return id
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getJson(url, tries = 3) {
  for (let t = 0; t < tries; t++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) })
      if (r.status === 404) return null
      if (!r.ok) throw new Error('HTTP ' + r.status)
      return await r.json()
    } catch (e) {
      if (t === tries - 1) return null
      await sleep(1500 * (t + 1))
    }
  }
  return null
}

/** CSV con comillas (los títulos llevan comas). Devuelve la fila como array. */
function parseCsvLine(line) {
  const out = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ } else q = false
      } else cur += c
    } else if (c === '"') q = true
    else if (c === ',') { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out
}

function readCsv(file) {
  // books.csv no tiene saltos de línea dentro de campos; lectura simple por líneas.
  const lines = readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean)
  const head = parseCsvLine(lines[0])
  return lines.slice(1).map((l) => {
    const v = parseCsvLine(l)
    const o = {}
    head.forEach((h, i) => (o[h] = v[i]))
    return o
  })
}

// --- normalización de textos ---

const ARTICLES = new Set(['the', 'a', 'an', 'el', 'la', 'los', 'las', 'un', 'una', 'le', 'les', 'l', 'der', 'die', 'das', 'il', 'lo', 'de', 'het'])

function fold(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`´]/g, '')
}

/** Clave de título: sin acentos, sin paréntesis, sin artículo inicial, solo alfanuméricos. */
function titleKey(raw) {
  let s = fold(raw).replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ')
  s = s.replace(/[^a-z0-9]+/g, ' ').trim()
  const w = s.split(' ').filter(Boolean)
  while (w.length > 1 && ARTICLES.has(w[0])) w.shift()
  return w.join(' ')
}

/** Variantes de una cadena de título: completa y sin subtítulo (": ", " - ", " — "). */
function titleKeys(raw) {
  const out = new Set()
  const full = titleKey(raw)
  if (full) out.add(full)
  const cut = String(raw || '').split(/\s*[:;–—]\s+|\s+-\s+|,\s+or,?\s+/i)[0]
  const sub = titleKey(cut)
  if (sub && sub !== full && sub.split(' ').length >= 2) out.add(sub)
  return [...out]
}

/** Quita "(Serie, #n)" de los títulos de Goodreads. */
function stripSeries(t) {
  return String(t || '').replace(/\s*\([^)]*#[^)]*\)\s*$/, '').replace(/\s*\([^)]*\)\s*$/, '').trim()
}

/** Autor -> {sur, ini} (apellido sin acentos y primera inicial). */
function authorKey(name) {
  const clean = fold(name).replace(/\([^)]*\)/g, ' ').replace(/[^a-z\s.-]/g, ' ').replace(/\./g, ' ')
  const toks = clean.split(/\s+/).filter(Boolean)
  const PART = new Set(['de', 'del', 'la', 'van', 'von', 'der', 'den', 'da', 'di', 'le', 'du', 'mc', 'st', 'jr', 'sr', 'ii', 'iii'])
  const core = toks.filter((t, i) => i === 0 || !['jr', 'sr', 'ii', 'iii'].includes(t))
  if (!core.length) return null
  let sur = core[core.length - 1]
  // Apellidos compuestos con partícula (van der X, de la X): usar el último token no partícula
  if (core.length > 1 && sur.length <= 1) sur = core[core.length - 2]
  return { sur: sur.replace(/-/g, ''), ini: core[0] && core.length > 1 ? core[0][0] : '', all: core.join('') }
}

/** Apellido + inicial compatibles. */
function authorMatch(a, b) {
  if (!a || !b) return false
  if (a.sur !== b.sur) return false
  if (a.ini && b.ini && a.ini !== b.ini) return false
  return true
}

/** Autores de goodbooks: "Suzanne Collins, J.K. Rowling, Mary GrandPré". Ojo con "Last, First". */
function gbAuthors(s) {
  return String(s || '').split(',').map((x) => x.trim()).filter(Boolean).map(authorKey).filter(Boolean)
}

/** Autores del catálogo: puede traer varios separados por "y", "&", "/", ";", ",". */
function catAuthors(s) {
  return String(s || '').split(/\s+(?:y|and|&)\s+|[/;,]/i).map((x) => x.trim()).filter(Boolean).map(authorKey).filter(Boolean)
}

// ---------------------------------------------------------------------------
// download
// ---------------------------------------------------------------------------

async function download() {
  for (const f of ['books.csv', 'ratings.csv']) {
    const dest = join(SRC_DIR, f)
    if (existsSync(dest)) { console.log('ya está:', f); continue }
    console.log('descargando', f)
    const r = await fetch(RAW + f)
    if (!r.ok) throw new Error(f + ' HTTP ' + r.status)
    writeFileSync(dest, Buffer.from(await r.arrayBuffer()))
  }
}

// ---------------------------------------------------------------------------
// titles: títulos en inglés del catálogo (el catálogo está en español)
// ---------------------------------------------------------------------------

async function titles() {
  const file = join(SRC_DIR, 'en-titles.json')
  const cache = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { wd: {}, ol: {} }
  cache.wdAll ||= {}

  // Wikidata: etiquetas en TODOS los idiomas (el original_title de goodbooks viene en la lengua original)
  const allIds = [...new Set(books.map((b) => b.wikidataId).filter(Boolean))].filter((q) => !(q in cache.wdAll))
  for (let i = 0; i < allIds.length; i += 50) {
    const batch = allIds.slice(i, i + 50)
    const j = await getJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${batch.join('|')}&props=labels&format=json&origin=*`)
    for (const q of batch) {
      const e = j?.entities?.[q]
      if (e) cache.wdAll[q] = [...new Set(Object.values(e.labels || {}).map((l) => l.value))]
    }
    console.log('wikidata (todas las lenguas)', Math.min(i + 50, allIds.length), '/', allIds.length)
    await sleep(300)
  }

  // Wikidata: etiqueta + alias en inglés, por lotes de 50
  const wdIds = [...new Set(books.map((b) => b.wikidataId).filter(Boolean))].filter((q) => !(q in cache.wd))
  for (let i = 0; i < wdIds.length; i += 50) {
    const batch = wdIds.slice(i, i + 50)
    const j = await getJson(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${batch.join('|')}&props=labels|aliases&languages=en&format=json&origin=*`,
    )
    for (const q of batch) {
      const e = j?.entities?.[q]
      if (!e) { if (j) cache.wd[q] = []; continue }
      const out = []
      if (e.labels?.en) out.push(e.labels.en.value)
      for (const a of e.aliases?.en || []) out.push(a.value)
      cache.wd[q] = out
    }
    console.log('wikidata', Math.min(i + 50, wdIds.length), '/', wdIds.length)
    await sleep(300)
  }

  // Open Library: título de la obra (suele ser el original/inglés)
  const olids = [...new Set(books.map((b) => b.olid).filter(Boolean))].filter((o) => !(o in cache.ol))
  let done = 0
  const queue = [...olids]
  async function worker() {
    while (queue.length) {
      const o = queue.shift()
      const j = await getJson(`https://openlibrary.org/works/${o}.json`)
      cache.ol[o] = j ? [j.title, j.subtitle ? `${j.title}: ${j.subtitle}` : null].filter(Boolean) : []
      if (++done % 100 === 0) console.log('openlibrary', done, '/', olids.length)
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])
  writeFileSync(file, JSON.stringify(cache))
  console.log('en-titles.json guardado')
}

// ---------------------------------------------------------------------------
// map: cruce goodbooks -> catálogo
// ---------------------------------------------------------------------------

function loadCatalogNames() {
  const en = existsSync(join(SRC_DIR, 'en-titles.json')) ? JSON.parse(readFileSync(join(SRC_DIR, 'en-titles.json'), 'utf8')) : { wd: {}, ol: {} }
  const esBook = JSON.parse(readFileSync(join(CACHE, 'titles', 'es-book.json'), 'utf8'))
  // inverso: título español -> inglés original (formato "Original (año)")
  const inv = {}
  for (const [k, v] of Object.entries(esBook)) (inv[v] ||= []).push(k.replace(/\s*\(\d{4}\)\s*$/, ''))
  return books.map((b) => {
    const names = new Set([b.title, ...Object.values(b.titles || {})])
    for (const t of en.wd[b.wikidataId] || []) names.add(t)
    for (const t of (en.wdAll || {})[b.wikidataId] || []) names.add(t)
    for (const t of en.ol[b.olid] || []) names.add(t)
    for (const t of inv[b.title] || []) names.add(t)
    const keys = new Map() // clave -> {full:boolean}
    for (const n of names) {
      const full = titleKey(n)
      if (full) keys.set(full, { full: true })
      for (const k of titleKeys(n)) if (!keys.has(k)) keys.set(k, { full: false })
    }
    return { id: canon(b.id), rawId: b.id, title: b.title, year: b.year, creator: b.creator, authors: catAuthors(b.creator), keys, names: [...names] }
  })
}

function mapBooks() {
  const cat = loadCatalogNames()
  // índice clave de título -> obras del catálogo
  const idx = new Map()
  for (const c of cat) for (const k of c.keys.keys()) (idx.get(k) || idx.set(k, []).get(k)).push(c)

  const gb = readCsv(join(SRC_DIR, 'books.csv'))
  const cands = [] // {gbId, catId, score, flags...}
  for (const g of gb) {
    const gAuth = gbAuthors(g.authors)
    const gYear = g.original_publication_year ? Math.round(parseFloat(g.original_publication_year)) : null
    const gNames = [g.original_title, stripSeries(g.title)].filter(Boolean)
    const gKeys = new Map()
    for (const n of gNames) {
      const full = titleKey(n)
      if (full) gKeys.set(full, true)
      for (const k of titleKeys(n)) if (!gKeys.has(k)) gKeys.set(k, false)
    }
    const seen = new Map()
    for (const [k, gFull] of gKeys) {
      for (const c of idx.get(k) || []) {
        if (!c.authors.some((ca) => gAuth.some((ga) => authorMatch(ca, ga)))) continue
        const cFull = c.keys.get(k).full
        const exact = gFull && cFull // título completo a ambos lados
        const dy = gYear != null && c.year ? Math.abs(gYear - c.year) : null
        let score = exact ? 3 : 2
        let dudoso = null
        if (dy == null) { dudoso = 'sin año'; score -= 0.5 }
        else if (dy <= 3) score += 1
        else if (dy <= 8) { score += 0.3 }
        else if (!exact) continue // año lejano y título parcial: descartar
        else { dudoso = `año ${gYear} vs ${c.year}`; score -= 0.5 }
        // título parcial (subtítulo/serie quitado) con una sola palabra: demasiado ambiguo
        // título parcial de una sola palabra: solo con año casi idéntico (p. ej. "Influence: The Psychology…")
        if (!exact && k.split(' ').length < 2) {
          if (dy == null || dy > 1) continue
          dudoso = 'título parcial de 1 palabra'
        }
        if (k.length < 4) continue
        const prev = seen.get(c.id)
        if (!prev || prev.score < score) seen.set(c.id, { gbId: g.book_id, grId: g.goodreads_book_id, gbTitle: g.original_title || stripSeries(g.title), gbAuthors: g.authors, gbYear: gYear, catId: c.id, catTitle: c.title, catCreator: c.creator, catYear: c.year, key: k, exact, score, dudoso })
      }
    }
    cands.push(...seen.values())
  }

  // Resolver conflictos: cada libro goodbooks -> una sola obra del catálogo (la mejor; empate = ambiguo, se descarta)
  const byId = new Map(books.map((b) => [canon(b.id), b]))
  const byGb = new Map()
  for (const c of cands) (byGb.get(c.gbId) || byGb.set(c.gbId, []).get(c.gbId)).push(c)
  const chosen = []
  const ambiguos = []
  for (const [, list] of byGb) {
    list.sort((a, b) => b.score - a.score)
    if (list.length > 1 && list[1].score === list[0].score) {
      // Empate: si todos los empatados coinciden con el título completo y el autor (la misma obra en dos fichas
      // del catálogo, p. ej. «Cumbres borrascosas» y «Wuthering Heights»), se elige uno como principal y el resto se registra como gemelo; si no, ambiguo.
      const tied = list.filter((x) => x.score === list[0].score)
      if (tied.every((x) => x.exact)) {
        const pop = (x) => byId.get(x.catId)?.readers ?? 0
        tied.sort((a, b) => pop(b) - pop(a) || (a.catId < b.catId ? -1 : 1))
        chosen.push({ ...tied[0], twins: tied.slice(1).map((x) => x.catId) })
      } else ambiguos.push(list)
      continue
    }
    chosen.push(list[0])
  }
  // Varias entradas goodbooks -> misma obra: se admiten solo si el título completo es exacto y el año coincide
  // (ediciones/duplicados); si no, se queda la de mejor score y las demás pasan al informe.
  const byCat = new Map()
  for (const c of chosen) (byCat.get(c.catId) || byCat.set(c.catId, []).get(c.catId)).push(c)
  const finalMap = []
  const multi = []
  for (const [, list] of byCat) {
    list.sort((a, b) => b.score - a.score)
    finalMap.push(list[0])
    for (const extra of list.slice(1)) {
      if (extra.exact && extra.score >= 4 && list[0].exact) finalMap.push({ ...extra, multi: true })
      else multi.push(extra)
    }
  }

  writeFileSync(join(SRC_DIR, 'map.json'), JSON.stringify(Object.fromEntries(finalMap.map((m) => [m.gbId, m.catId])), null, 0))
  // gemelos: principal -> [gemelos del catálogo con la misma obra]
  const twins = {}
  for (const m of finalMap) if (m.twins?.length) twins[m.catId] = [...new Set([...(twins[m.catId] || []), ...m.twins])]
  writeFileSync(join(SRC_DIR, 'twins.json'), JSON.stringify(twins, null, 1))
  writeFileSync(join(SRC_DIR, 'map-detalle.json'), JSON.stringify(finalMap, null, 1))

  const dud = finalMap.filter((m) => m.dudoso || !m.exact || m.score < 3.5 || m.multi)
  let md = `# Informe de cruces goodbooks -> catálogo\n\n- Libros goodbooks: ${gb.length}\n- Cruces aceptados: ${finalMap.length} (${new Set(finalMap.map((m) => m.catId)).size} obras del catálogo de ${books.length})\n- Marcados dudosos: ${dud.length}\n- Obras principales con gemelo en el catálogo (misma obra, dos fichas): ${Object.keys(twins).length}
- Descartados por ambigüedad (empate entre obras): ${ambiguos.length}\n- Descartados por duplicado (varios goodbooks -> misma obra): ${multi.length}\n\n## Dudosos\n\n`
  for (const m of dud) md += `- [${m.dudoso || (m.exact ? 'ok' : 'título parcial')}${m.multi ? ', múltiple' : ''}] GB "${m.gbTitle}" (${m.gbAuthors}, ${m.gbYear}) -> ${m.catId} "${m.catTitle}" (${m.catCreator}, ${m.catYear})\n`
  md += `\n## Ambiguos descartados\n\n`
  for (const l of ambiguos) md += `- GB "${l[0].gbTitle}" (${l[0].gbAuthors}) -> ${l.map((x) => x.catId).join(' | ')}\n`
  md += `\n## Duplicados descartados\n\n`
  for (const m of multi) md += `- GB "${m.gbTitle}" (${m.gbAuthors}, ${m.gbYear}) -> ${m.catId}\n`
  writeFileSync(join(SRC_DIR, 'informe-cruces.md'), md)
  console.log(`cruces: ${finalMap.length}, obras distintas: ${new Set(finalMap.map((m) => m.catId)).size}/${books.length}, dudosos: ${dud.length}, ambiguos: ${ambiguos.length}`)
}

// ---------------------------------------------------------------------------
// build: partición, co-gusto + PPMI, evaluación
// ---------------------------------------------------------------------------

/** PRNG determinista (mulberry32) */
function rng(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

async function build() {
  const map = JSON.parse(readFileSync(join(SRC_DIR, 'map.json'), 'utf8')) // gbBookId -> catId
  const ids = [...new Set(Object.values(map))].sort()
  const ix = new Map(ids.map((id, i) => [id, i]))
  const m = ids.length

  // Leer ratings (≈6 M líneas) agrupando por usuario, solo libros cruzados
  const byUser = new Map() // user -> Map(ix -> rating)
  const allUsers = new Set()
  const rl = createInterface({ input: createReadStream(join(SRC_DIR, 'ratings.csv')), crlfDelay: Infinity })
  let first = true
  for await (const line of rl) {
    if (first) { first = false; continue }
    const [u, b, r] = line.split(',')
    allUsers.add(u)
    const id = map[b]
    if (!id) continue
    let mu = byUser.get(u)
    if (!mu) byUser.set(u, (mu = new Map()))
    const i = ix.get(id)
    // si un usuario valora varias ediciones de la misma obra, la media (aprox: se queda con la mayor)
    mu.set(i, Math.max(mu.get(i) ?? 0, +r))
  }
  console.log(`usuarios totales: ${allUsers.size}, con ≥1 libro cruzado: ${byUser.size}`)

  // Partición 10 % evaluación con semilla fija sobre TODOS los usuarios (orden numérico estable)
  const sorted = [...allUsers].sort((a, b) => +a - +b)
  const rand = rng(SEED_SEED)
  const evalSet = new Set(sorted.filter(() => rand() < EVAL_FRACTION))
  console.log(`usuarios de evaluación (10 % al azar): ${evalSet.size}`)

  // --- evaluación ---
  const evalLines = []
  let evalTotal = 0
  for (const u of sorted) {
    if (!evalSet.has(u)) continue
    const mu = byUser.get(u)
    if (!mu || mu.size < MIN_CROSSED_EVAL) continue
    const entries = [...mu.entries()].map(([i, r]) => ({ itemId: ids[i], score: r }))
    evalTotal += entries.length
    evalLines.push(JSON.stringify({ id: 'gb' + u, platform: 'goodbooks', entries }))
  }
  writeFileSync(join(EVAL_DIR, 'real-users-books.jsonl'), evalLines.join('\n') + '\n')
  console.log(`evaluación: ${evalLines.length} usuarios (≥${MIN_CROSSED_EVAL} cruzados), ${(evalTotal / evalLines.length).toFixed(1)} obras de media`)

  // --- grafo: solo el 90 % restante ---
  const cnt = new Uint32Array(m) // usuarios a los que les gustó cada libro
  const pair = new Uint32Array(m * m)
  let N = 0 // usuarios con al menos un gusto cruzado
  for (const [u, mu] of byUser) {
    if (evalSet.has(u)) continue
    const liked = []
    for (const [i, r] of mu) if (r >= LIKE_MIN) liked.push(i)
    if (!liked.length) continue
    N++
    liked.sort((a, b) => a - b)
    for (let x = 0; x < liked.length; x++) {
      cnt[liked[x]]++
      for (let y = x + 1; y < liked.length; y++) pair[liked[x] * m + liked[y]]++
    }
  }
  // PPMI sobre usuarios: log( P(a,b) / (P(a)·P(b)) ), con P = fracción de usuarios del grafo
  const edges = []
  for (let a = 0; a < m; a++) {
    for (let b = a + 1; b < m; b++) {
      const n = pair[a * m + b]
      if (n < MIN_N) continue
      const ppmi = Math.log((n * N) / (cnt[a] * cnt[b]))
      if (ppmi <= 0) continue
      edges.push({ a: a, b: b, n, ppmi })
    }
  }
  // Top-K por libro: se conserva una arista si está en el top-K de alguno de sus extremos
  const per = Array.from({ length: m }, () => [])
  edges.forEach((e, k) => { per[e.a].push(k); per[e.b].push(k) })
  const keep = new Set()
  for (const list of per) {
    list.sort((p, q) => edges[q].ppmi - edges[p].ppmi)
    list.slice(0, TOP_K).forEach((k) => keep.add(k))
  }
  // Gemelos del catálogo (misma obra en dos fichas): heredan las aristas de su principal, sin arista entre ellos
  const twins = existsSync(join(SRC_DIR, 'twins.json')) ? JSON.parse(readFileSync(join(SRC_DIR, 'twins.json'), 'utf8')) : {}
  const variants = (id) => [id, ...(twins[id] || [])]
  const out = []
  let baseEdges = 0
  for (const k of keep) {
    const e = edges[k]
    baseEdges++
    for (const va of variants(ids[e.a])) {
      for (const vb of variants(ids[e.b])) {
        if (va === vb) continue
        const [a, b] = va < vb ? [va, vb] : [vb, va]
        out.push({ a, b, source: 'goodbooks', n: e.n, ppmi: Math.round(e.ppmi * 10000) / 10000 })
      }
    }
  }
  console.log(`aristas base: ${baseEdges}; con gemelos: ${out.length}`)
  out.sort((p, q) => (p.a < q.a ? -1 : p.a > q.a ? 1 : p.b < q.b ? -1 : 1))
  writeFileSync(join(GRAPH_DIR, 'cooc-goodbooks.jsonl'), out.map((o) => JSON.stringify(o)).join('\n') + '\n')

  // Estadísticas
  const deg = new Map()
  for (const e of out) { deg.set(e.a, (deg.get(e.a) || 0) + 1); deg.set(e.b, (deg.get(e.b) || 0) + 1) }
  const catIds = new Set(books.map((b) => canon(b.id)))
  const ge10 = [...catIds].filter((id) => (deg.get(id) || 0) >= 10).length
  console.log(`grafo: usuarios N=${N}, aristas (antes de top-${TOP_K})=${edges.length}, finales=${out.length}`)
  console.log(`libros del catálogo con ≥10 aristas: ${ge10}/${catIds.size} (${((100 * ge10) / catIds.size).toFixed(1)} %)`)
  console.log(`libros con ≥1 arista: ${deg.size}`)
}

// ---------------------------------------------------------------------------

export { titleKey, titleKeys, authorKey, authorMatch, gbAuthors, catAuthors, stripSeries, loadCatalogNames, readCsv }

// Solo se ejecuta como script (no al importarlo desde un diagnóstico)
if (process.argv[1] && process.argv[1].endsWith('goodbooks.mjs')) {
  const step = process.argv[2] || 'all'
  if (step === 'download' || step === 'all') await download()
  if (step === 'titles' || step === 'all') await titles()
  if (step === 'map' || step === 'all') mapBooks()
  if (step === 'build' || step === 'all') await build()
}
