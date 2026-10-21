/**
 * enrich-artists-decades.mjs — Asignación de peakDecades a artistas (MOTOR v2 §2b.2, T13).
 *
 * Para artistas, el año de debut no basta: una persona nacida en 1975 no conoció a Queen
 * en su debut (1970), sino en los 80 y 90 cuando llenaban estadios y copaban las listas.
 *
 * peakDecades: array de décadas ['1970s', '1980s'] en que el artista tuvo su mayor impacto.
 * Permite que eraFactor(item) evalúe la reconocibilidad según si el usuario vivió alguna
 * de sus décadas doradas.
 *
 * Uso:
 *   node scripts/engine/enrich-artists-decades.mjs [--apply]
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')

const args = process.argv.slice(2)
const DO_APPLY = args.includes('--apply')

// Base de datos de décadas de máximo impacto cultural y comercial en España y global
const ARTIST_PEAKS = new Map([
  // Leyendas clásicas
  ['artist:the-beatles-1960', ['1960s', '1970s']],
  ['artist:the-rolling-stones-1962', ['1960s', '1970s', '1980s', '1990s']],
  ['artist:bob-dylan-1962', ['1960s', '1970s']],
  ['artist:the-who-1964', ['1960s', '1970s']],
  ['artist:pink-floyd-1965', ['1970s', '1980s']],
  ['artist:david-bowie-1967', ['1970s', '1980s']],
  ['artist:led-zeppelin-1968', ['1970s']],
  ['artist:black-sabbath-1968', ['1970s']],
  ['artist:queen-1970', ['1970s', '1980s', '1990s']],
  ['artist:elton-john-1969', ['1970s', '1980s', '1990s']],
  ['artist:bruce-springsteen-1973', ['1970s', '1980s', '1990s']],
  ['artist:ac-dc-1973', ['1970s', '1980s', '1990s']],
  ['artist:michael-jackson-1971', ['1970s', '1980s', '1990s']],
  ['artist:prince-1978', ['1980s', '1990s']],
  ['artist:madonna-1982', ['1980s', '1990s', '2000s']],
  ['artist:u2-1976', ['1980s', '1990s', '2000s']],
  ['artist:metallica-1981', ['1980s', '1990s', '2000s']],
  ['artist:iron-maiden-1975', ['1980s', '1990s']],
  ['artist:guns-n-roses-1985', ['1980s', '1990s']],
  ['artist:red-hot-chili-peppers-1983', ['1990s', '2000s']],
  ['artist:nirvana-1987', ['1990s']],
  ['artist:pearl-jam-1990', ['1990s', '2000s']],
  ['artist:radiohead-1985', ['1990s', '2000s']],
  ['artist:oasis-1991', ['1990s', '2000s']],
  ['artist:blur-1988', ['1990s']],
  ['artist:green-day-1987', ['1990s', '2000s']],
  ['artist:daft-punk-1993', ['1990s', '2000s', '2010s']],
  ['artist:eminem-1996', ['1990s', '2000s', '2010s']],
  ['artist:coldplay-1996', ['2000s', '2010s']],
  ['artist:linkin-park-1996', ['2000s', '2010s']],
  ['artist:beyonce-1997', ['2000s', '2010s', '2020s']],
  ['artist:taylor-swift-2006', ['2010s', '2020s']],
  ['artist:arctic-monkeys-2002', ['2000s', '2010s']],
  ['artist:the-strokes-1998', ['2000s']],
  ['artist:kanye-west-1996', ['2000s', '2010s']],
  ['artist:rihanna-2005', ['2000s', '2010s']],
  ['artist:lady-gaga-2005', ['2000s', '2010s']],
  ['artist:drake-2006', ['2010s', '2020s']],
  ['artist:billie-eilish-2015', ['2010s', '2020s']],
  ['artist:dua-lipa-2015', ['2010s', '2020s']],

  // Música española e hispana
  ['artist:joan-manuel-serrat-1965', ['1960s', '1970s', '1980s']],
  ['artist:julio-iglesias-1968', ['1970s', '1980s']],
  ['artist:camilo-sesto-1970', ['1970s', '1980s']],
  ['artist:nino-bravo-1969', ['1970s']],
  ['artist:triana-1974', ['1970s', '1980s']],
  ['artist:joaquin-sabina-1978', ['1980s', '1990s', '2000s']],
  ['artist:mecano-1981', ['1980s', '1990s']],
  ['artist:radio-futura-1979', ['1980s']],
  ['artist:alaska-y-dinarama-1982', ['1980s']],
  ['artist:los-secretos-1980', ['1980s', '1990s']],
  ['artist:hombres-g-1982', ['1980s', '1990s']],
  ['artist:el-ultimo-de-la-fila-1984', ['1980s', '1990s']],
  ['artist:heroes-del-silencio-1984', ['1980s', '1990s']],
  ['artist:loquillo-y-los-trogloditas-1980', ['1980s', '1990s']],
  ['artist:seguridad-social-1982', ['1980s', '1990s']],
  ['artist:duncan-dhu-1984', ['1980s', '1990s']],
  ['artist:extremoduro-1987', ['1990s', '2000s', '2010s']],
  ['artist:platero-y-tu-1989', ['1990s']],
  ['artist:los-rodriguez-1990', ['1990s']],
  ['artist:los-planetas-1993', ['1990s', '2000s']],
  ['artist:bunbury-1997', ['1990s', '2000s', '2010s']],
  ['artist:m-clan-1993', ['1990s', '2000s']],
  ['artist:jarabe-de-palo-1996', ['1990s', '2000s']],
  ['artist:la-oreja-de-van-gogh-1996', ['1990s', '2000s', '2010s']],
  ['artist:amaral-1997', ['2000s', '2010s']],
  ['artist:estopa-1999', ['2000s', '2010s', '2020s']],
  ['artist:fito-fitipaldis-1998', ['2000s', '2010s']],
  ['artist:melendi-2001', ['2000s', '2010s']],
  ['artist:el-canto-del-loco-1994', ['2000s']],
  ['artist:pereza-2001', ['2000s']],
  ['artist:leiva-2012', ['2010s', '2020s']],
  ['artist:vetusta-morla-1998', ['2000s', '2010s', '2020s']],
  ['artist:lori-meyers-1998', ['2000s', '2010s']],
  ['artist:love-of-lesbian-1997', ['2000s', '2010s', '2020s']],
  ['artist:rosalia-2017', ['2010s', '2020s']],
  ['artist:c-tangana-2011', ['2010s', '2020s']],
  ['artist:bad-bunny-2016', ['2010s', '2020s']],
  ['artist:quevedo-2020', ['2020s']],
  ['artist:aitana-2017', ['2010s', '2020s']],
])

function inferPeakDecades(year, popularity = 50) {
  const debutDecadeYear = Math.floor(year / 10) * 10
  const decades = [`${debutDecadeYear}s`]

  // Si tiene alta notoriedad o catálogo longevo, añadir décadas siguientes
  if (popularity >= 50 && debutDecadeYear < 2020) {
    decades.push(`${debutDecadeYear + 10}s`)
  }
  if (popularity >= 75 && debutDecadeYear < 2010) {
    decades.push(`${debutDecadeYear + 20}s`)
  }

  return decades
}

async function main() {
  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const artists = seed.items.filter((i) => i.type === 'artist')
  console.log(`\n=== ASIGNACIÓN DE PEAK DECADES PARA ARTISTAS (T13) ===`)
  console.log(`Total artistas: ${artists.length}`)

  let overrideCount = 0
  let inferredCount = 0

  for (const a of artists) {
    let peaks = ARTIST_PEAKS.get(a.id)
    if (peaks) {
      overrideCount++
      a.peakDecades = peaks
    } else {
      inferredCount++
      a.peakDecades = inferPeakDecades(a.year || 1990, a.popularity || 50)
    }
    a.src = a.src || {}
    a.src.peakDecades = peaks ? 'curated' : 'computed'
  }

  console.log(`Resultados:`)
  console.log(`  - Curados con exactitud histórica : ${overrideCount}`)
  console.log(`  - Deducidos por debut y longevidad : ${inferredCount}`)
  console.log(`  - Cobertura total                 : 100% (${artists.length}/${artists.length})`)

  if (DO_APPLY) {
    writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2), 'utf8')
    console.log(`✓ seed.json actualizado con peakDecades en ${artists.length} artistas`)
  }
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
