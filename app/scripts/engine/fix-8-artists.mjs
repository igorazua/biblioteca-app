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

const FIXES = [
  {
    id: 'artist:muse-1994',
    slug: 'muse-1994',
    title: 'Muse',
    imageUrl: 'https://cdn-images.dzcdn.net/images/artist/cd7c5861be0009d3b75d4d3c069317a7/1000x1000-000000-80-0-0.jpg',
    src: 'deezer',
    imageSrc: 'cdn-images.dzcdn.net',
    imageCredit: 'Deezer / Muse',
    isSquare: true
  },
  {
    id: 'artist:madonna-1982',
    slug: 'madonna-1982',
    title: 'Madonna',
    imageUrl: 'https://cdn-images.dzcdn.net/images/artist/62896581ffe80588d00fdf89667adb02/1000x1000-000000-80-0-0.jpg',
    src: 'deezer',
    imageSrc: 'cdn-images.dzcdn.net',
    imageCredit: 'Deezer / Madonna',
    isSquare: true
  },
  {
    id: 'artist:nas-1991',
    slug: 'nas-1991',
    title: 'Nas',
    imageUrl: 'https://cdn-images.dzcdn.net/images/artist/f6e4f9d1f6be43c36339a9a96dcee725/1000x1000-000000-80-0-0.jpg',
    src: 'deezer',
    imageSrc: 'cdn-images.dzcdn.net',
    imageCredit: 'Deezer / Nas',
    isSquare: true
  },
  {
    id: 'artist:kanye-west-1996',
    slug: 'kanye-west-1996',
    title: 'Kanye West',
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Kanye%20West%20at%20the%202009%20Tribeca%20Film%20Festival%20(crop%202).jpg?width=1000',
    src: 'wikimedia',
    imageSrc: 'commons.wikimedia.org',
    imageCredit: 'David Shankbone / Wikimedia Commons',
    cropSquare: true
  },
  {
    id: 'artist:zahara-2005',
    slug: 'zahara-2005',
    title: 'Zahara',
    imageUrl: 'https://cdn-images.dzcdn.net/images/artist/04950881d6aa5deaed2ad09396fd1bb2/1000x1000-000000-80-0-0.jpg',
    src: 'deezer',
    imageSrc: 'cdn-images.dzcdn.net',
    imageCredit: 'Deezer / Zahara',
    isSquare: true
  },
  {
    id: 'artist:duki-2016',
    slug: 'duki-2016',
    title: 'Duki',
    imageUrl: 'https://cdn-images.dzcdn.net/images/artist/795d09a17bc833425e4b88639bb931af/1000x1000-000000-80-0-0.jpg',
    src: 'deezer',
    imageSrc: 'cdn-images.dzcdn.net',
    imageCredit: 'Deezer / DUKI',
    isSquare: true
  },
  {
    id: 'artist:cupido',
    slug: 'cupido',
    title: 'Cupido',
    wikidataId: 'Q109313219',
    imageUrl: 'https://cdn-images.dzcdn.net/images/artist/500ea01d06be3c9786587ebd9a650c51/1000x1000-000000-80-0-0.jpg',
    src: 'deezer',
    imageSrc: 'cdn-images.dzcdn.net',
    imageCredit: 'Deezer / Cupido',
    isSquare: true
  },
  {
    id: 'artist:burning',
    slug: 'burning',
    title: 'Burning',
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Burning%20(2012)%20-%2001.jpg?width=1000',
    src: 'wikimedia',
    imageSrc: 'commons.wikimedia.org',
    imageCredit: 'Wikimedia Commons / Burning',
    cropSquare: true
  }
]

async function processImage(rawBuf, isCropSquare) {
  let pipeline = sharp(rawBuf)
  if (isCropSquare) {
    pipeline = pipeline.resize(600, 600, { fit: 'cover', position: 'attention' })
  } else {
    pipeline = pipeline.resize({ width: 600, withoutEnlargement: true })
  }
  return await pipeline.webp({ quality: 82 }).toBuffer()
}

async function main() {
  console.log('--- Corrigiendo los 8 artistas marcados en la auditoría ---')
  mkdirSync(COVERS_CACHE, { recursive: true })

  const orig = existsSync(ORIGINAL_FILE) ? JSON.parse(readFileSync(ORIGINAL_FILE, 'utf8')) : {}
  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const itemMap = new Map(seed.items.map(i => [i.id, i]))

  for (const item of FIXES) {
    console.log(`\nProcesando ${item.title} (${item.id})...`)
    const res = await fetch(item.imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })

    if (!res.ok) {
      console.error(`Error ${res.status} al descargar imagen de ${item.title}: ${item.imageUrl}`)
      continue
    }

    const rawBuf = Buffer.from(await res.arrayBuffer())
    const webpBuf = await processImage(rawBuf, item.cropSquare)

    // Guardar en cache local
    const localPath = join(COVERS_CACHE, `${item.slug}.webp`)
    writeFileSync(localPath, webpBuf)
    console.log(`✓ Guardado localmente en ${localPath} (${webpBuf.length} bytes)`)

    // Subir a Supabase Storage
    const storagePath = `artist/${item.slug}.webp`
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
    console.log(`✓ Subido a Supabase: ${publicUrl}`)

    // Actualizar original.json
    orig[item.id] = item.imageUrl

    // Actualizar attrs/posterUrl.jsonl
    const posterEntry = {
      id: item.id,
      attr: 'posterUrl',
      value: publicUrl,
      src: item.src,
      imageSrc: item.imageSrc,
      imageCredit: item.imageCredit,
      conf: 0.99,
      updatedAt: new Date().toISOString()
    }
    appendFileSync(ATTRS_POSTER_FILE, JSON.stringify(posterEntry) + '\n', 'utf8')

    // Actualizar seed.json en memoria
    const it = itemMap.get(item.id)
    if (it) {
      it.posterUrl = publicUrl
      it.imageSrc = item.imageSrc
      it.imageCredit = item.imageCredit
      if (item.wikidataId) {
        it.wikidataId = item.wikidataId
      }
      it.src = {
        ...(it.src || {}),
        posterUrl: item.src,
        ...(item.wikidataId ? { wikidataId: 'curated' } : {})
      }
      it.conf = {
        ...(it.conf || {}),
        posterUrl: 0.99,
        ...(item.wikidataId ? { wikidataId: 1 } : {})
      }
    }
  }

  // Guardar original.json
  writeFileSync(ORIGINAL_FILE, JSON.stringify(orig, null, 2), 'utf8')
  console.log('\n✓ original.json actualizado.')

  // Guardar seed.json
  writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2), 'utf8')
  console.log('✓ seed.json actualizado con las portadas corregidas.')
}

main().catch(console.error)
