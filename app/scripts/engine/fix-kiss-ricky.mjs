import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const ORIGINAL_FILE = join(ROOT, 'scripts', 'cache', 'posters', 'original.json')
const ATTRS_POSTER_FILE = join(ROOT, 'scripts', 'cache', 'attrs', 'posterUrl.jsonl')
const COVERS_CACHE = join(ROOT, 'scripts', 'cache', 'covers', 'artist')

// Cargar .env.local
const envFile = join(ROOT, '.env.local')
if (existsSync(envFile)) {
  const envContent = readFileSync(envFile, 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx !== -1) {
      const k = trimmed.slice(0, idx).trim()
      const v = trimmed.slice(idx + 1).trim()
      if (!process.env[k]) process.env[k] = v
    }
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltan variables de entorno Supabase.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const BUCKET = 'biblio-covers'

const ARTISTS = [
  {
    id: 'artist:kiss-1973',
    slug: 'kiss-1973',
    title: 'Kiss',
    deezerId: 67,
    imageUrl: 'https://cdn-images.dzcdn.net/images/artist/d841e3ff7379c9272005e53f1c46f5b9/1000x1000-000000-80-0-0.jpg'
  },
  {
    id: 'artist:ricky-martin-1984',
    slug: 'ricky-martin-1984',
    title: 'Ricky Martin',
    deezerId: 2789,
    imageUrl: 'https://cdn-images.dzcdn.net/images/artist/d1f0759714219db995124470310ad665/1000x1000-000000-80-0-0.jpg'
  }
]

async function processArtistBuffer(buf) {
  return await sharp(buf)
    .resize({ width: 600, height: 600, fit: 'cover' })
    .webp({ quality: 85 })
    .toBuffer()
}

async function main() {
  console.log('--- Corrigiendo portadas oficiales de KISS y Ricky Martin ---')
  mkdirSync(COVERS_CACHE, { recursive: true })

  const orig = existsSync(ORIGINAL_FILE) ? JSON.parse(readFileSync(ORIGINAL_FILE, 'utf8')) : {}
  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const itemMap = new Map(seed.items.map(i => [i.id, i]))

  for (const a of ARTISTS) {
    console.log(`\nProcesando ${a.title} (${a.id})...`)
    const res = await fetch(a.imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) {
      console.error(`Error ${res.status} al descargar de ${a.imageUrl}`)
      continue
    }

    const rawBuf = Buffer.from(await res.arrayBuffer())
    const webpBuf = await processArtistBuffer(rawBuf)

    const localPath = join(COVERS_CACHE, `${a.slug}.webp`)
    writeFileSync(localPath, webpBuf)

    const storagePath = `artist/${a.slug}.webp`
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, webpBuf, {
        contentType: 'image/webp',
        upsert: true
      })

    if (uploadError) {
      console.error(`Error subiendo a Supabase:`, uploadError)
      continue
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}?v=3`
    console.log(`✓ ${a.title} subido -> ${publicUrl}`)

    orig[a.id] = a.imageUrl

    const posterEntry = {
      id: a.id,
      attr: 'posterUrl',
      value: publicUrl,
      src: 'deezer',
      imageSrc: 'cdn-images.dzcdn.net',
      imageCredit: 'Deezer',
      conf: 0.99,
      updatedAt: new Date().toISOString()
    }
    appendFileSync(ATTRS_POSTER_FILE, JSON.stringify(posterEntry) + '\n', 'utf8')

    const it = itemMap.get(a.id)
    if (it) {
      it.posterUrl = publicUrl
      it.imageSrc = 'cdn-images.dzcdn.net'
      it.imageCredit = 'Deezer'
      it.deezerId = a.deezerId
      it.src = { ...(it.src || {}), posterUrl: 'deezer' }
    }
  }

  writeFileSync(ORIGINAL_FILE, JSON.stringify(orig, null, 2), 'utf8')
  writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2), 'utf8')
  console.log('\n✓ seed.json y original.json actualizados.')
}

main().catch(console.error)
