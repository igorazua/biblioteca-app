// app/scripts/fetch-brand-logos.mjs
// Descarga una vez el icono de los servicios de Conectar que no tienen logo dibujado en BrandLogo.tsx y lo deja
// alojado por nosotros en public/logos/<id>.png (nunca se enlaza en caliente). Guarda la procedencia en sources.json.
// Uso: node scripts/fetch-brand-logos.mjs   (vuelve a descargar solo los que falten; --force para todos)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'logos')
const force = process.argv.includes('--force')

// id del servicio (lib/connect/services.ts) → dominio del que sale su icono
const DOMAINS = {
  prime: 'primevideo.com',
  disney: 'disneyplus.com',
  max: 'max.com',
  movistar: 'movistarplus.es',
  filmin: 'filmin.es',
  skyshowtime: 'skyshowtime.com',
  kindle: 'amazon.com',
  ytmusic: 'music.youtube.com',
  mal: 'myanimelist.net',
}

mkdirSync(OUT, { recursive: true })
const srcFile = join(OUT, 'sources.json')
const sources = existsSync(srcFile) ? JSON.parse(readFileSync(srcFile, 'utf8')) : {}

for (const [id, domain] of Object.entries(DOMAINS)) {
  const file = join(OUT, `${id}.png`)
  if (existsSync(file) && !force) continue
  const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`
  const res = await fetch(url)
  if (!res.ok || !res.headers.get('content-type')?.includes('image/png')) {
    console.warn(`✗ ${id}: ${res.status}`)
    continue
  }
  writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  sources[id] = { src: url, domain, fetchedAt: new Date().toISOString().slice(0, 10) }
  console.log(`✓ ${id}`)
  await new Promise((r) => setTimeout(r, 1000)) // ≤ 1 petición/s
}

writeFileSync(srcFile, JSON.stringify(sources, null, 2) + '\n')
