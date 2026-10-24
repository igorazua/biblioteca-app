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
const COVERS_CACHE = join(ROOT, 'scripts', 'cache', 'covers', 'book')

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

const BOOKS = [
  {
    id: 'book:los-tres-mosqueteros-1844',
    slug: 'los-tres-mosqueteros-1844',
    title: 'Los tres mosqueteros',
    isbn: '9788491052401',
    imageUrl: 'https://covers.openlibrary.org/b/isbn/9788491052401-L.jpg?default=false'
  },
  {
    id: 'book:la-divina-comedia-1320',
    slug: 'la-divina-comedia-1320',
    title: 'La divina comedia',
    isbn: '9788437632186',
    imageUrl: 'https://covers.openlibrary.org/b/isbn/9788437632186-L.jpg?default=false'
  },
  {
    id: 'book:esquire-s-the-new-rules-for-men-2016',
    slug: 'esquire-s-the-new-rules-for-men-2016',
    title: "Esquire's The New Rules for Men",
    isbn: '9781618371867',
    imageUrl: 'https://covers.openlibrary.org/b/isbn/9781618371867-L.jpg?default=false'
  }
]

async function processBookBuffer(buf) {
  const meta = await sharp(buf).metadata()
  if (!meta || !meta.width || !meta.height) return null
  const initialRatio = meta.height / meta.width

  let pipeline = sharp(buf)
  // Si es un poco ancho (< 1.30), recortar bordes laterales para encajar en 1.35
  if (initialRatio < 1.30) {
    const targetRatio = 1.35
    const targetWidth = Math.floor(meta.height / targetRatio)
    const cropX = Math.max(0, Math.floor((meta.width - targetWidth) / 2))
    pipeline = pipeline.extract({ left: cropX, top: 0, width: targetWidth, height: meta.height })
  } else if (initialRatio > 1.65) {
    const targetRatio = 1.60
    const targetHeight = Math.floor(meta.width * targetRatio)
    const cropY = Math.max(0, Math.floor((meta.height - targetHeight) / 2))
    pipeline = pipeline.extract({ left: 0, top: cropY, width: meta.width, height: targetHeight })
  }

  return await pipeline
    .resize({ width: 600, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()
}

async function main() {
  console.log('--- Corrigiendo portadas de los 3 libros ---')
  mkdirSync(COVERS_CACHE, { recursive: true })

  const orig = existsSync(ORIGINAL_FILE) ? JSON.parse(readFileSync(ORIGINAL_FILE, 'utf8')) : {}
  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const itemMap = new Map(seed.items.map(i => [i.id, i]))

  for (const b of BOOKS) {
    console.log(`\nProcesando ${b.title} (${b.id})...`)
    const res = await fetch(b.imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) {
      console.error(`Error ${res.status} al descargar de ${b.imageUrl}`)
      continue
    }

    const rawBuf = Buffer.from(await res.arrayBuffer())
    const webpBuf = await processBookBuffer(rawBuf)
    if (!webpBuf) {
      console.error(`Error procesando imagen de ${b.title}`)
      continue
    }

    const localPath = join(COVERS_CACHE, `${b.slug}.webp`)
    writeFileSync(localPath, webpBuf)

    const storagePath = `book/${b.slug}.webp`
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
    console.log(`✓ ${b.title} subido -> ${publicUrl}`)

    orig[b.id] = b.imageUrl

    const posterEntry = {
      id: b.id,
      attr: 'posterUrl',
      value: publicUrl,
      src: 'openlibrary',
      imageSrc: 'covers.openlibrary.org',
      imageCredit: 'Open Library',
      conf: 0.99,
      updatedAt: new Date().toISOString()
    }
    appendFileSync(ATTRS_POSTER_FILE, JSON.stringify(posterEntry) + '\n', 'utf8')

    const it = itemMap.get(b.id)
    if (it) {
      it.posterUrl = publicUrl
      it.imageSrc = 'covers.openlibrary.org'
      it.imageCredit = 'Open Library'
      it.isbn = b.isbn
      it.src = { ...(it.src || {}), posterUrl: 'openlibrary', isbn: 'curated' }
    }
  }

  writeFileSync(ORIGINAL_FILE, JSON.stringify(orig, null, 2), 'utf8')
  writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2), 'utf8')
  console.log('\n✓ seed.json y original.json actualizados.')
}

main().catch(console.error)
