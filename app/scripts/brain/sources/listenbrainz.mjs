/**
 * listenbrainz.mjs — Fuente de co-consumo de artistas (MOTOR v2 §2c) basada en ListenBrainz.
 *
 * Para cada artista del catálogo con MBID pide a la API pública de ListenBrainz (sin clave)
 * sus artistas similares por comportamiento de escucha («quien escucha A también escucha B»),
 * cachea cada respuesta y cruza los resultados con nuestro catálogo por MBID.
 *
 * Fases (en cada ejecución):
 *   1. Descarga: una petición por artista, como máximo una por segundo. Reanuda sin repetir
 *      lo ya cacheado en cache/graph/sources/listenbrainz/<mbid>.json.
 *   2. Construcción: regenera desde cero cache/graph/cooc-listenbrainz.jsonl, una línea por
 *      par no ordenado (a < b). Si el par sale en las dos direcciones, se toma el máximo.
 *
 * Campo n: la puntuación bruta de ListenBrainz (~10.000) no es comparable con los conteos
 * de otras fuentes, así que n = max(1, round(100 * score / score_máximo_de_esa_consulta)).
 * El score original se conserva en el campo `score`.
 *
 * Uso:
 *   node scripts/brain/sources/listenbrainz.mjs
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const APP_DIR = join(here, '..', '..', '..')
const SEED_FILE = join(APP_DIR, 'src', 'data', 'seed.json')
const ALIASES_FILE = join(APP_DIR, 'src', 'data', 'aliases.json')
const GRAPH_DIR = join(here, '..', '..', 'cache', 'graph')
const CACHE_DIR = join(GRAPH_DIR, 'sources', 'listenbrainz')
const OUT_FILE = join(GRAPH_DIR, 'cooc-listenbrainz.jsonl')

const ENDPOINT = 'https://labs.api.listenbrainz.org/similar-artists/json'
const ALGORITHM =
  'session_based_days_7500_session_300_contribution_5_threshold_10_limit_100_filter_True_skip_30'
const USER_AGENT = 'BibliotecaApp/1.0 (biblioteca-social.vercel.app)'
const INTERVALO_MIN_MS = 1000
const ESPERAS_REINTENTO_MS = [5000, 15000, 45000] // tras el 1.º, 2.º y 3.º fallo
const MAX_INTENTOS = ESPERAS_REINTENTO_MS.length + 1
const MAX_ESPERA_RETRY_AFTER_MS = 300000
const LOG_CADA = 25

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Throttling global: garantiza al menos INTERVALO_MIN_MS entre peticiones reales de red.
let ultimaPeticion = 0
async function esperarTurno() {
  const falta = ultimaPeticion + INTERVALO_MIN_MS - Date.now()
  if (falta > 0) await sleep(falta)
  ultimaPeticion = Date.now()
}

async function esperarAntesDeReintentar(intento, retryAfterHeader) {
  const seg = Number(retryAfterHeader)
  const ms =
    Number.isFinite(seg) && seg > 0
      ? Math.min(seg * 1000, MAX_ESPERA_RETRY_AFTER_MS)
      : ESPERAS_REINTENTO_MS[intento]
  console.warn(`    reintento en ${Math.round(ms / 1000)} s`)
  await sleep(ms)
}

/** Pide los similares de un MBID. Devuelve { ok, data } o { ok: false, motivo }. */
async function pedirSimilares(mbid) {
  const url = `${ENDPOINT}?artist_mbids=${encodeURIComponent(mbid)}&algorithm=${ALGORITHM}`
  let motivo = 'sin intentos'

  for (let intento = 0; intento < MAX_INTENTOS; intento++) {
    const hayMas = intento < MAX_INTENTOS - 1
    await esperarTurno()

    let res
    try {
      res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } })
    } catch (err) {
      motivo = `error de red: ${err.message}`
      if (hayMas) await esperarAntesDeReintentar(intento, null)
      continue
    }

    // Límite de peticiones o caída temporal: se reintenta con espera.
    if (res.status === 429 || res.status >= 500) {
      motivo = `HTTP ${res.status}`
      if (hayMas) await esperarAntesDeReintentar(intento, res.headers.get('retry-after'))
      continue
    }

    // Otros errores (400, 404…) no se reintentan: el MBID o la petición están mal.
    if (!res.ok) return { ok: false, motivo: `HTTP ${res.status} (sin reintento)` }

    let data
    try {
      data = await res.json()
    } catch (err) {
      motivo = `JSON no válido: ${err.message}`
      if (hayMas) await esperarAntesDeReintentar(intento, null)
      continue
    }

    // Solo se acepta una lista (también vacía, que significa «sin similares»).
    if (!Array.isArray(data)) {
      motivo = 'respuesta que no es una lista'
      if (hayMas) await esperarAntesDeReintentar(intento, null)
      continue
    }

    return { ok: true, data }
  }

  return { ok: false, motivo }
}

/** Lee la caché de un MBID. Devuelve la lista, o null si falta, está corrupta o no es lista. */
function leerCache(mbid) {
  const file = join(CACHE_DIR, `${mbid}.json`)
  if (!existsSync(file)) return null
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'))
    return Array.isArray(data) ? data : null
  } catch {
    return null
  }
}

/** Escribe la caché con un fichero temporal y renombrado: nunca deja JSON truncado. */
function guardarCache(mbid, data) {
  const file = join(CACHE_DIR, `${mbid}.json`)
  const tmp = `${file}.tmp`
  writeFileSync(tmp, JSON.stringify(data))
  renameSync(tmp, file)
}

async function main() {
  console.log('--- ListenBrainz: artistas similares (sources/listenbrainz.mjs) ---')

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const aliases = JSON.parse(readFileSync(ALIASES_FILE, 'utf8'))
  // Siempre el id conservado: el mapa de alias se aplica a cada id.
  const canon = (id) => aliases[id] ?? id

  const todosArtistas = seed.items.filter((i) => i.type === 'artist')
  const artistas = todosArtistas
    .filter((i) => i.mbid)
    .map((i) => ({ id: canon(i.id), mbid: String(i.mbid).toLowerCase() }))
  const mbidToId = new Map(artistas.map((a) => [a.mbid, a.id]))

  console.log(`Artistas en catálogo: ${todosArtistas.length}; con MBID: ${artistas.length}`)

  // Fase 1: descarga con reanudación.
  mkdirSync(CACHE_DIR, { recursive: true })
  let yaCacheados = 0
  let pedidos = 0
  const fallidos = []

  for (let i = 0; i < artistas.length; i++) {
    const { id, mbid } = artistas[i]
    if (leerCache(mbid) !== null) {
      yaCacheados++
      continue
    }

    pedidos++
    const res = await pedirSimilares(mbid)
    if (res.ok) {
      guardarCache(mbid, res.data)
    } else {
      fallidos.push({ id, mbid, motivo: res.motivo })
      console.warn(`  FALLO ${id} (${mbid}): ${res.motivo}`)
    }

    if (pedidos % LOG_CADA === 0) {
      console.log(`  progreso: ${i + 1}/${artistas.length} (${pedidos} peticiones nuevas)`)
    }
  }

  console.log(`Descarga: ${yaCacheados} ya cacheados, ${pedidos} pedidos, ${fallidos.length} fallidos`)

  // Fase 2: construir aristas dentro del catálogo desde toda la caché.
  const pares = new Map()
  const ficherosCache = readdirSync(CACHE_DIR).filter((f) => f.endsWith('.json'))

  for (const fichero of ficherosCache) {
    const refMbid = fichero.slice(0, -'.json'.length)
    const refId = mbidToId.get(refMbid)
    const data = leerCache(refMbid)
    if (!refId || !data) continue // artista retirado del catálogo o caché corrupta

    const topScore = Math.max(0, ...data.map((e) => Number(e.score) || 0))

    for (const vecino of data) {
      const vMbid = typeof vecino.artist_mbid === 'string' ? vecino.artist_mbid.toLowerCase() : null
      const vId = vMbid ? mbidToId.get(vMbid) : undefined
      if (!vId || vId === refId) continue // fuera de catálogo o autorreferencia

      const score = Number(vecino.score) || 0
      const n = Math.max(1, Math.round(topScore > 0 ? (100 * score) / topScore : 1))
      const [a, b] = refId < vId ? [refId, vId] : [vId, refId]
      const clave = `${a}|${b}`

      const previo = pares.get(clave)
      if (!previo) {
        pares.set(clave, { a, b, source: 'listenbrainz', n, score })
      } else {
        // Mismo par en las dos direcciones: nos quedamos con el máximo.
        previo.n = Math.max(previo.n, n)
        previo.score = Math.max(previo.score, score)
      }
    }
  }

  const lineas = [...pares.values()]
    .sort((x, y) => (x.a !== y.a ? (x.a < y.a ? -1 : 1) : x.b < y.b ? -1 : x.b > y.b ? 1 : 0))
    .map((p) => JSON.stringify(p))
  writeFileSync(OUT_FILE, lineas.length ? `${lineas.join('\n')}\n` : '')
  console.log(`Escrito ${OUT_FILE}: ${pares.size} aristas`)

  // Estadísticas de cobertura (denominador: todos los artistas del catálogo).
  const grado = new Map()
  for (const p of pares.values()) {
    grado.set(p.a, (grado.get(p.a) ?? 0) + 1)
    grado.set(p.b, (grado.get(p.b) ?? 0) + 1)
  }
  const conRespuesta = artistas.filter((a) => leerCache(a.mbid) !== null).length
  const pct = (k) => ((100 * k) / todosArtistas.length).toFixed(1)
  const con1 = artistas.filter((a) => (grado.get(a.id) ?? 0) >= 1).length
  const con10 = artistas.filter((a) => (grado.get(a.id) ?? 0) >= 10).length

  console.log(`Artistas consultados con respuesta: ${conRespuesta} de ${artistas.length} con MBID`)
  console.log(`Aristas dentro del catálogo: ${pares.size}`)
  console.log(`Con >= 1 arista: ${con1} (${pct(con1)} % del catálogo de ${todosArtistas.length})`)
  console.log(`Con >= 10 aristas: ${con10} (${pct(con10)} % del catálogo de ${todosArtistas.length})`)
  if (fallidos.length) {
    console.log(`Fallidos (${fallidos.length}):`)
    for (const f of fallidos) console.log(`  ${f.id} ${f.mbid} ${f.motivo}`)
  }
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
