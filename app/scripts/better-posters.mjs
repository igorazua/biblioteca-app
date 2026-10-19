/**
 * Mejores portadas reales sin quitar ninguna (solo se cambia una imagen por otra mejor de una fuente abierta):
 * - Series con imagen de Wikimedia (a menudo el logo o una foto): el póster vertical de TVmaze, buscado por el
 *   IMDb ID de Wikidata o, si no lo hay, por nombre y año.
 * - Pelis cuya imagen es un logo: el póster oficial de Wikidata (P3383, en Commons), si existe.
 * Si no aparece nada mejor, la imagen se queda como estaba. Caché en scripts/cache/posters/ para no repetir llamadas.
 *
 * Uso: node scripts/better-posters.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const SEED_FILE = join(here, '..', 'src', 'data', 'seed.json')
const CACHE_DIR = join(here, 'cache', 'posters')
const CACHE_FILE = join(CACHE_DIR, 'lookups.json')
const UA = { 'User-Agent': 'Biblioteca/0.1 (portadas)' }

if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
const cache = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, 'utf-8')) : {}
const save = () => writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getJson(url, tries = 5) {
  for (let t = 0; t < tries; t++) {
    const res = await fetch(url, { headers: UA, redirect: 'follow' })
    if (res.status === 404) return null
    if (res.ok) return res.json()
    await sleep(1500 * (t + 1)) // 429 de TVmaze o de Wikidata: esperar y reintentar
  }
  return null
}

const seed = JSON.parse(readFileSync(SEED_FILE, 'utf-8'))
const isWikimedia = (u) => typeof u === 'string' && /wikimedia\.org/.test(u)
const isLogo = (u) => {
  try { return /\.svg|logo|wordmark|title[ _-]?(card|screen)/i.test(decodeURIComponent(u)) } catch { return true }
}
const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

const series = seed.items.filter((i) => i.type === 'series' && isWikimedia(i.posterUrl))
const movies = seed.items.filter((i) => i.type === 'movie' && isWikimedia(i.posterUrl) && isLogo(i.posterUrl))
console.log(`Series con imagen de Wikimedia: ${series.length} · pelis con logo: ${movies.length}`)

// 1. Datos de Wikidata (IMDb ID y póster P3383) en lotes de 50
const qids = [...new Set([...series, ...movies].map((i) => i.wikidataId).filter((q) => q && !(`wd:${q}` in cache)))]
for (let i = 0; i < qids.length; i += 50) {
  const ids = qids.slice(i, i + 50).join('|')
  const d = await getJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids}&props=claims&format=json`)
  for (const q of qids.slice(i, i + 50)) {
    const c = d?.entities?.[q]?.claims ?? {}
    cache[`wd:${q}`] = {
      imdb: c.P345?.[0]?.mainsnak?.datavalue?.value ?? null,
      poster: c.P3383?.[0]?.mainsnak?.datavalue?.value ?? null,
    }
  }
  save()
  await sleep(1000)
}

// 2. Series → TVmaze
let seriesDone = 0
for (const it of series) {
  const key = `tv:${it.id}`
  if (!(key in cache)) {
    const imdb = it.wikidataId ? cache[`wd:${it.wikidataId}`]?.imdb : null
    let show = imdb ? await getJson(`https://api.tvmaze.com/lookup/shows?imdb=${imdb}`) : null
    if (!show) {
      // sin IMDb ID: por nombre (original si lo hay), aceptando solo el mismo título y año ±1
      const hits = (await getJson(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(it.originalTitle ?? it.title)}`)) ?? []
      const wanted = [it.title, it.originalTitle].filter(Boolean).map(norm)
      show = hits.map((h) => h.show).find((s) => wanted.includes(norm(s.name)) && Math.abs(parseInt(s.premiered ?? '0', 10) - it.year) <= 1) ?? null
    }
    cache[key] = show?.image?.original ?? show?.image?.medium ?? null
    save()
    await sleep(550) // TVmaze: 20 llamadas cada 10 s
  }
  if (cache[key] && cache[key] !== it.posterUrl) {
    it.posterUrl = cache[key]
    it.imageSrc = 'tvmaze'
    it.imageCredit = 'TVmaze'
    seriesDone++
  }
}

// 3. Pelis con logo → póster P3383
let moviesDone = 0
for (const it of movies) {
  const file = it.wikidataId ? cache[`wd:${it.wikidataId}`]?.poster : null
  if (!file) continue
  it.posterUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=600`
  moviesDone++
}

writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2))
console.log(`Series con póster de TVmaze: ${seriesDone}/${series.length} · pelis con póster oficial: ${moviesDone}/${movies.length}`)
