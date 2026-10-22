/**
 * restore-posters.mjs — Recupera los pósteres reales que había antes del 16/10/2026.
 *
 * El commit 1e74270 sustituyó los pósteres de la semilla (IMDb para pelis, TVmaze, Open Library, BGG, Deezer)
 * por la imagen principal de Wikidata (P18), que muchas veces no es el póster: Seven → un canal de TV australiano,
 * Malditos bastardos → una foto de Tarantino. Este script:
 *   1. guarda en scripts/cache/posters/original.json el póster original de cada obra (de la semilla a2fd1f2),
 *      para que covers.mjs lo use siempre como primera fuente;
 *   2. descarga ese original, lo pasa a WebP de 600 px de ancho (vale para pantalla completa) y lo sube a
 *      biblio-covers en la misma ruta, sustituyendo la imagen mala; la URL lleva ?v=2 para saltarse la caché.
 *
 * Uso: node --env-file-if-exists=.env.local scripts/engine/restore-posters.mjs [--dry] [--only movie]
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const ALIASES_FILE = join(ROOT, 'src', 'data', 'aliases.json')
const ORIG_FILE = join(ROOT, 'scripts', 'cache', 'posters', 'original.json')
const COVERS_CACHE = join(ROOT, 'scripts', 'cache', 'covers')
const SOURCE_COMMIT = 'a2fd1f2'
const GOOD_HOSTS = ['m.media-amazon.com', 'static.tvmaze.com', 'covers.openlibrary.org', 'cf.geekdo-images.com', 'cdn-images.dzcdn.net']

const args = process.argv.slice(2)
const DRY = args.includes('--dry')
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null

// 1. Mapa id → póster original
let orig = {}
if (existsSync(ORIG_FILE)) {
  orig = JSON.parse(readFileSync(ORIG_FILE, 'utf8'))
} else {
  const old = JSON.parse(execSync(`git show ${SOURCE_COMMIT}:app/src/data/seed.json`, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }).toString())
  for (const it of old.items) {
    const url = it.posterUrl
    if (url && GOOD_HOSTS.some((h) => url.includes(h))) orig[it.id] = url
  }
  mkdirSync(dirname(ORIG_FILE), { recursive: true })
  writeFileSync(ORIG_FILE, JSON.stringify(orig, null, 1))
  console.log(`Guardados ${Object.keys(orig).length} pósteres originales en ${ORIG_FILE}`)
}

const aliases = existsSync(ALIASES_FILE) ? JSON.parse(readFileSync(ALIASES_FILE, 'utf8')) : {}
const back = {} // id actual → ids antiguos que apuntan a él
for (const [oldId, newId] of Object.entries(aliases)) (back[newId] ??= []).push(oldId)
const originalFor = (id) => orig[id] ?? (back[id] ?? []).map((o) => orig[o]).find(Boolean)

const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
// las ya recuperadas (?v=2) no se repiten
const targets = seed.items.filter((it) => (!ONLY || it.type === ONLY) && originalFor(it.id) && !it.posterUrl?.endsWith('?v=2'))
console.log(`Obras con póster original recuperable: ${targets.length}`)
if (DRY) process.exit(0)

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function fetchBuf(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Biblioteca/0.1' }, signal: AbortSignal.timeout(15000) })
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null
  } catch {
    return null
  }
}

let ok = 0
let failed = []
let i = 0
async function worker() {
  while (i < targets.length) {
    const it = targets[i++]
    const src = originalFor(it.id)
    const buf = await fetchBuf(src)
    if (!buf) {
      failed.push(it.id)
      continue
    }
    try {
      const webp = await sharp(buf).resize({ width: 600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
      const path = `${it.type}/${it.id.replace(/^[^:]+:/, '')}.webp`
      const { error } = await supabase.storage.from('biblio-covers').upload(path, webp, { contentType: 'image/webp', upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('biblio-covers').getPublicUrl(path)
      it.posterUrl = `${data.publicUrl}?v=2`
      it.imageSrc = new URL(src).hostname
      it.src = { ...(it.src ?? {}), posterUrl: 'scrape:' + new URL(src).hostname }
      // la caché de covers.mjs tenía la imagen mala: se sustituye por la buena
      const cacheDir = join(COVERS_CACHE, it.type)
      mkdirSync(cacheDir, { recursive: true })
      writeFileSync(join(cacheDir, `${it.id.replace(/^[^:]+:/, '')}.webp`), webp)
      ok++
      if (ok % 100 === 0) console.log(`  ${ok}/${targets.length}`)
    } catch (e) {
      failed.push(it.id)
    }
  }
}
await Promise.all(Array.from({ length: 6 }, worker))

writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2))
console.log(`✓ Recuperados ${ok}. Fallidos ${failed.length}${failed.length ? ': ' + failed.slice(0, 20).join(', ') : ''}`)
