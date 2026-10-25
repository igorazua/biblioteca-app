/**
 * upload-missing-covers.mjs — Sube las carátulas faltantes a Supabase Storage (T28.9)
 *
 * Busca la carátula según la cadena oficial:
 * 1. Archivo local existente en scripts/cache/covers/song/<slug>.webp
 * 2. Cover Art Archive (por CAA release mbid)
 * 3. iTunes Store Search API (600px)
 * 4. Foto del artista del seed
 * 5. Póster geométrico generado
 *
 * Redimensiona a 400x400 WebP (q82) y sube a biblio-covers/song/<slug>.webp en Supabase Storage.
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { generateSvgCover } from '../engine/covers.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SONGS_FILE = join(ROOT, 'public', 'data', 'songs.json')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const LOCAL_COVERS_DIR = join(ROOT, 'scripts', 'cache', 'covers', 'song')
const ENV_FILE = join(ROOT, '.env.local')

mkdirSync(LOCAL_COVERS_DIR, { recursive: true })

// Cargar variables de entorno desde .env.local si no están en process.env
if (existsSync(ENV_FILE)) {
  const envContent = readFileSync(ENV_FILE, 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim()
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const BUCKET = 'biblio-covers'
const USER_AGENT = 'BibliotecaApp/1.0 (contacto@biblioteca.app)'

const songs = JSON.parse(readFileSync(SONGS_FILE, 'utf8'))
const seedRaw = existsSync(SEED_FILE) ? JSON.parse(readFileSync(SEED_FILE, 'utf8')) : []
const seedItems = seedRaw.items || (Array.isArray(seedRaw) ? seedRaw : [])
const seedArtistsById = new Map(seedItems.filter((s) => s.type === 'artist').map((a) => [a.id, a]))

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchBufferWithRetry(url, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(10000) })
      if (!res.ok) {
        if (res.status === 404) return null
        await sleep(500 * (attempt + 1))
        continue
      }
      const arrayBuf = await res.arrayBuffer()
      return Buffer.from(arrayBuf)
    } catch {
      await sleep(500 * (attempt + 1))
    }
  }
  return null
}

async function obtainWebpCover(song, slug) {
  const localPath = join(LOCAL_COVERS_DIR, `${slug}.webp`)

  // 1. Ya existe en disco con tamaño válido
  if (existsSync(localPath) && statSync(localPath).size > 200) {
    try {
      return readFileSync(localPath)
    } catch {}
  }

  // 2. Cover Art Archive
  let rawBuf = null
  if (song.caaReleaseMbid) {
    rawBuf = await fetchBufferWithRetry(`https://coverartarchive.org/release/${song.caaReleaseMbid}/front-500`)
  }

  // 3. iTunes Search si no hay CAA
  if (!rawBuf && song.title && song.creator) {
    try {
      const term = `${song.title} ${song.creator}`
      const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=1`
      const itunesRes = await fetch(searchUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(8000) })
      if (itunesRes.ok) {
        const data = await itunesRes.json()
        const match = data.results?.[0]
        if (match?.artworkUrl100) {
          const highRes = match.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg')
          rawBuf = await fetchBufferWithRetry(highRes)
        }
      }
    } catch {}
  }

  // 4. Foto del artista del seed
  if (!rawBuf && song.artistId) {
    const artistSeed = seedArtistsById.get(song.artistId)
    if (artistSeed?.posterUrl?.startsWith('http')) {
      rawBuf = await fetchBufferWithRetry(artistSeed.posterUrl)
    }
  }

  // Si conseguimos buffer de imagen, redimensionar a 400x400 WebP
  if (rawBuf) {
    try {
      const webpBuf = await sharp(rawBuf)
        .resize(400, 400, { fit: 'cover' })
        .webp({ quality: 82 })
        .toBuffer()
      writeFileSync(localPath, webpBuf)
      return webpBuf
    } catch {}
  }

  // 5. Póster geométrico generado
  try {
    const svg = generateSvgCover(song)
    const webpBuf = await sharp(Buffer.from(svg))
      .resize(400, 400, { fit: 'cover' })
      .webp({ quality: 82 })
      .toBuffer()
    writeFileSync(localPath, webpBuf)
    return webpBuf
  } catch (err) {
    console.error(`Error generando SVG para ${song.id}:`, err)
    return null
  }
}

async function uploadCoverWithRetry(storagePath, buffer, maxRetries = 4) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
        contentType: 'image/webp',
        upsert: true,
      })
      if (!error) return { ok: true, data }
      if (error.message?.includes('Too many connections') || error.message?.includes('rate limit')) {
        await sleep(1500 * (attempt + 1))
        continue
      }
      return { ok: false, error }
    } catch (err) {
      if (attempt === maxRetries) return { ok: false, error: err }
      await sleep(1000 * (attempt + 1))
    }
  }
  return { ok: false, error: new Error('Exceeded max retries') }
}

export async function uploadMissingCovers(targetList = null) {
  const songsToProcess = targetList || songs
  console.log(`\n=== Procesando subida de carátulas para ${songsToProcess.length} canciones ===`)

  let uploadedCount = 0
  let failedCount = 0
  const BATCH_SIZE = 15

  for (let i = 0; i < songsToProcess.length; i += BATCH_SIZE) {
    const batch = songsToProcess.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map(async (song) => {
        const slug = song.id.replace(/^song:/, '')
        const storagePath = `song/${slug}.webp`

        const webpBuf = await obtainWebpCover(song, slug)
        if (!webpBuf) {
          failedCount++
          console.error(`[ERROR] No se pudo obtener carátula para ${song.id}`)
          return
        }

        const res = await uploadCoverWithRetry(storagePath, webpBuf)
        if (res.ok) {
          uploadedCount++
        } else {
          failedCount++
          console.error(`[ERROR] Fallo subida ${storagePath}:`, res.error?.message || res.error)
        }
      })
    )

    if ((i + BATCH_SIZE) % 150 === 0 || i + BATCH_SIZE >= songsToProcess.length) {
      console.log(`Progreso: ${Math.min(i + BATCH_SIZE, songsToProcess.length)}/${songsToProcess.length} | Subidas OK: ${uploadedCount} | Fallos: ${failedCount}`)
    }
    await sleep(50)
  }

  console.log(`\nFinalizado: ${uploadedCount} subidas correctamente, ${failedCount} fallidas.`)
  return { uploadedCount, failedCount }
}

// Ejecución directa
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const rotasFile = join(ROOT, '..', 'docs', 'registro', 'T28_caratulas_rotas.json')
  let list = null
  if (process.argv.includes('--only-rotas') && existsSync(rotasFile)) {
    const rotas = JSON.parse(readFileSync(rotasFile, 'utf8'))
    const rotasIds = new Set(rotas.map((r) => r.id))
    list = songs.filter((s) => rotasIds.has(s.id))
    console.log(`Modo --only-rotas: filtradas ${list.length} canciones de ${rotas.length} rotas reportadas`)
  }

  uploadMissingCovers(list)
    .then(({ failedCount }) => {
      process.exit(failedCount > 0 ? 1 : 0)
    })
    .catch((err) => {
      console.error('Error fatal:', err)
      process.exit(1)
    })
}
