// Script para integrar Juegos de mesa y Artistas en seed.json
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const SEED_FILE = join(here, '..', 'src', 'data', 'seed.json')

const slugify = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

function parseCSV(text) {
  const rows = []
  let currentRow = []
  let currentCell = ''
  let insideQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"'
        i++
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim())
      currentCell = ''
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++
      currentRow.push(currentCell.trim())
      if (currentRow.length > 1) rows.push(currentRow)
      currentRow = []
      currentCell = ''
    } else {
      currentCell += char
    }
  }
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim())
    if (currentRow.length > 1) rows.push(currentRow)
  }
  return rows
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const TOP_ARTISTS = [
  // Leyendas internacionales (Rock, Pop, Soul, Electrónica, Hip hop, Jazz)
  { name: 'The Beatles', year: 1960, creator: 'Liverpool, Reino Unido', genres: ['Rock', 'Pop', 'Psicodelia'], synopsis: 'El cuarteto de Liverpool que revolucionó la música popular en los años sesenta.' },
  { name: 'Queen', year: 1970, creator: 'Londres, Reino Unido', genres: ['Rock', 'Glam rock', 'Ópera rock'], synopsis: 'Freddie Mercury, Brian May, Roger Taylor y John Deacon en una de las bandas más épicas de todos los tiempos.' },
  { name: 'Pink Floyd', year: 1965, creator: 'Londres, Reino Unido', genres: ['Rock progresivo', 'Psicodelia'], synopsis: 'Pioneros del rock espacial y conceptual, creadores de The Dark Side of the Moon y The Wall.' },
  { name: 'Led Zeppelin', year: 1968, creator: 'Londres, Reino Unido', genres: ['Hard rock', 'Blues rock'], synopsis: 'Robert Plant, Jimmy Page, John Paul Jones y John Bonham definieron el sonido del rock pesado.' },
  { name: 'David Bowie', year: 1967, creator: 'Londres, Reino Unido', genres: ['Art rock', 'Glam rock', 'Pop'], synopsis: 'El camaleón del rock que reinventó su identidad artística y estética década tras década.' },
  { name: 'Radiohead', year: 1985, creator: 'Abingdon, Reino Unido', genres: ['Rock alternativo', 'Art rock', 'Electrónica'], synopsis: 'Thom Yorke y compañía desafiaron los límites del rock desde OK Computer hasta Kid A.' },
  { name: 'Daft Punk', year: 1993, creator: 'París, Francia', genres: ['Electrónica', 'French house', 'Disco'], synopsis: 'El legendario dúo de cascos robóticos que transformó la música electrónica de baile mundial.' },
  { name: 'Nirvana', year: 1987, creator: 'Aberdeen, EE. UU.', genres: ['Grunge', 'Rock alternativo'], synopsis: 'Kurt Cobain lideró la explosión del sonido grunge de Seattle que marcó a toda la Generación X.' },
  { name: 'Bob Dylan', year: 1962, creator: 'Minnesota, EE. UU.', genres: ['Folk', 'Rock', 'Poesía'], synopsis: 'Premio Nobel de Literatura y la voz poética y contestataria más influyente del siglo XX.' },
  { name: 'Michael Jackson', year: 1971, creator: 'Indiana, EE. UU.', genres: ['Pop', 'R&B', 'Funk'], synopsis: 'El indiscutible Rey del Pop, creador de Thriller y pionero del videoclip musical moderno.' },
  { name: 'The Rolling Stones', year: 1962, creator: 'Londres, Reino Unido', genres: ['Rock and roll', 'Blues rock'], synopsis: 'Mick Jagger y Keith Richards liderando sesenta años ininterrumpidos de puro rock and roll.' },
  { name: 'Fleetwood Mac', year: 1967, creator: 'Londres, Reino Unido', genres: ['Pop rock', 'Soft rock'], synopsis: 'Las complejas relaciones sentimentales entre Stevie Nicks, Lindsey Buckingham y sus compañeros dieron luz a Rumours.' },
  { name: 'The Cure', year: 1978, creator: 'Crawley, Reino Unido', genres: ['Post-punk', 'Gothic rock', 'New wave'], synopsis: 'Robert Smith y su atmósfera melancólica inconfundible convertida en himnos generacionales.' },
  { name: 'Depeche Mode', year: 1980, creator: 'Basildon, Reino Unido', genres: ['Synth-pop', 'Electrónica', 'Rock industrial'], synopsis: 'Pioneros en fusionar sintetizadores oscuros con estadios multitudinarios y pasión lírica.' },
  { name: 'Arctic Monkeys', year: 2002, creator: 'Sheffield, Reino Unido', genres: ['Indie rock', 'Garage rock'], synopsis: 'Alex Turner y el sonido afilado de guitarras que definió el indie rock de los 2000.' },
  { name: 'The Strokes', year: 1998, creator: 'Nueva York, EE. UU.', genres: ['Indie rock', 'Garage rock'], synopsis: 'Julian Casablancas y el renacimiento neoyorquino del rock de garaje con Is This It.' },
  { name: 'Coldplay', year: 1997, creator: 'Londres, Reino Unido', genres: ['Pop rock', 'Alt-rock'], synopsis: 'Chris Martin liderando melodías de piano y himnos de estadio universales desde Parachutes.' },
  { name: 'Oasis', year: 1991, creator: 'Mánchester, Reino Unido', genres: ['Britpop', 'Rock'], synopsis: 'Los hermanos Gallagher y el rugido del britpop de los noventa que conquistó el mundo.' },
  { name: 'Gorillaz', year: 1998, creator: 'Londres, Reino Unido', genres: ['Hip hop alternativo', 'Electrónica', 'Art pop'], synopsis: 'La banda virtual creada por Damon Albarn y Jamie Hewlett mezclando géneros sin fronteras.' },
  { name: 'Massive Attack', year: 1988, creator: 'Bristol, Reino Unido', genres: ['Trip hop', 'Electrónica'], synopsis: 'Arquitectos del sonido trip hop de Bristol, con atmósferas oscuras y ritmos envolventes.' },
  { name: 'Portishead', year: 1991, creator: 'Bristol, Reino Unido', genres: ['Trip hop', 'Downtempo'], synopsis: 'La voz estremecedora de Beth Gibbons sobre bases de cine negro y texturas de vinilo.' },
  { name: 'Björk', year: 1977, creator: 'Reikiavik, Islandia', genres: ['Art pop', 'Electrónica', 'Avant-garde'], synopsis: 'Una de las fuerzas creativas más singulares e innovadoras de la música contemporánea.' },
  { name: 'Amy Winehouse', year: 2003, creator: 'Londres, Reino Unido', genres: ['Soul', 'R&B', 'Jazz'], synopsis: 'La portentosa voz desgarrada y el renacimiento del soul clásico en Back to Black.' },
  { name: 'Stevie Wonder', year: 1961, creator: 'Michigan, EE. UU.', genres: ['Soul', 'Funk', 'R&B'], synopsis: 'Genio multiinstrumentista invidente de la Motown con una racha de obras maestras irrepetible.' },
  { name: 'Miles Davis', year: 1944, creator: 'Illinois, EE. UU.', genres: ['Jazz', 'Cool jazz', 'Jazz fusion'], synopsis: 'La trompeta legendaria que lideró cada una de las grandes revoluciones del jazz en el siglo XX.' },
  { name: 'Kendrick Lamar', year: 2004, creator: 'Compton, EE. UU.', genres: ['Hip hop', 'Conscious rap'], synopsis: 'Primer rapero en ganar el Premio Pulitzer de Música por la trascendencia lírica y social de su obra.' },
  { name: 'Billie Eilish', year: 2015, creator: 'Los Ángeles, EE. UU.', genres: ['Alt-pop', 'Electropop'], synopsis: 'Producción susurrada y oscuras melodías bedroom pop que cambiaron el paradigma del pop juvenil.' },
  { name: 'Hans Zimmer', year: 1977, creator: 'Frankfurt, Alemania', genres: ['Banda sonora', 'Clásica', 'Cinematográfica'], synopsis: 'El compositor que redefinió el sonido del cine contemporáneo en Gladiator, Origen e Interstellar.' },
  { name: 'Ennio Morricone', year: 1946, creator: 'Roma, Italia', genres: ['Banda sonora', 'Spaghetti western'], synopsis: 'Melodías inmortales para el cine de Sergio Leone, Cinema Paradiso y La misión.' },
  { name: 'Ludovico Einaudi', year: 1980, creator: 'Turín, Italia', genres: ['Neoclásica', 'Minimalismo', 'Piano'], synopsis: 'Pianista y compositor italiano de armonías minimalistas y gran profundidad emocional.' },

  // Música española e hispanohablante
  { name: 'Rosalía', year: 2017, creator: 'Barcelona, España', genres: ['Nuevo flamenco', 'Art pop', 'Urbano'], synopsis: 'Unión vanguardista entre la raíz flamenca, la música experimental y los ritmos globales.' },
  { name: 'C. Tangana', year: 2006, creator: 'Madrid, España', genres: ['Música latina', 'Pop', 'Flamenco urbano'], synopsis: 'De referente del rap underground a reinterpretar la música popular española en El Madrileño.' },
  { name: 'Extremoduro', year: 1987, creator: 'Plasencia, España', genres: ['Rock transgresivo', 'Hard rock'], synopsis: 'Robe Iniesta y su poesía de la calle cruda, lírica y visceral que marcó el rock español.' },
  { name: 'Héroes del Silencio', year: 1984, creator: 'Zaragoza, España', genres: ['Rock en español', 'Hard rock'], synopsis: 'Enrique Bunbury al frente de una banda de carisma arrollador y proyección internacional.' },
  { name: 'Estopa', year: 1999, creator: 'Cornellà de Llobregat, España', genres: ['Rumba rock', 'Pop rock'], synopsis: 'Los hermanos David y José Muñoz con su frescura callejera, rumbas irresistibles y letras cotidianas.' },
  { name: 'Joaquín Sabina', year: 1978, creator: 'Úbeda, España', genres: ['Canción de autor', 'Rock'], synopsis: 'El maestro de la metáfora urbana, los corazones rotos y la noche madrileña.' },
  { name: 'Vetusta Morla', year: 1998, creator: 'Tres Cantos, España', genres: ['Indie rock', 'Pop rock'], synopsis: 'El gran referente del indie rock en español, desde Un día en el mundo hasta llenar estadios.' },
  { name: 'Fito & Fitipaldis', year: 1998, creator: 'Bilbao, España', genres: ['Rock and roll', 'Blues rock'], synopsis: 'Fito Cabrales conquistó a varias generaciones con su sencillez, guitarras roqueras y saxo.' },
  { name: 'Love of Lesbian', year: 1997, creator: 'Sant Vicenç dels Horts, España', genres: ['Indie pop', 'Indie rock'], synopsis: 'Santi Balmes y la banda insignia de los festivales españoles con letras poéticas y emotivas.' },
  { name: 'Los Planetas', year: 1992, creator: 'Granada, España', genres: ['Indie rock', 'Noise pop', 'Psicodelia'], synopsis: 'Pioneros del sonido independiente en España, con guitarras distorsionadas y raíz flamenca.' },
  { name: 'Triana', year: 1974, creator: 'Sevilla, España', genres: ['Rock andaluz', 'Rock progresivo', 'Flamenco'], synopsis: 'Jesús de la Rosa creó la cumbre del rock andaluz aunando rock progresivo con sentimiento jondo.' },
  { name: 'Camarón de la Isla', year: 1969, creator: 'San Fernando, España', genres: ['Flamenco', 'Nuevo flamenco'], synopsis: 'El cantaor más revolucionario de la historia, inmortalizado junto a Paco de Lucía y La leyenda del tiempo.' },
  { name: 'Paco de Lucía', year: 1958, creator: 'Algeciras, España', genres: ['Guitarra flamenca', 'Flamenco jazz'], synopsis: 'El virtuoso indiscutible de la guitarra que abrió el flamenco al jazz y al mundo entero.' },
  { name: 'Bad Bunny', year: 2016, creator: 'Vega Baja, Puerto Rico', genres: ['Reggaeton', 'Trap latino', 'Pop'], synopsis: 'La mayor estrella de la música latina del siglo XXI, rompiendo récords mundiales en español.' },
]

async function enrichArtists(artists) {
  console.log(`Buscando fotos HD de ${artists.length} artistas en Deezer API...`)
  for (const art of artists) {
    try {
      const url = `https://api.deezer.com/search/artist?q=${encodeURIComponent(art.title || art.name)}`
      const res = await fetch(url)
      if (res.ok) {
        const d = await res.json()
        const first = d.data?.[0]
        if (first?.picture_big || first?.picture_medium) {
          art.posterUrl = first.picture_big || first.picture_medium
        }
      }
      await sleep(100)
    } catch (e) {
      // fallback
    }
  }
}

async function run() {
  console.log('--- Integrando Juegos de mesa y Artistas ---')

  const currentSeed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const existingItems = currentSeed.items || []
  const seenIds = new Set(existingItems.map((i) => i.id))
  const seenTitles = new Set(existingItems.map((i) => i.title.toLowerCase().trim()))

  // 1. Descargar catálogo de Juegos de mesa (BGG CSV)
  console.log('\nDescargando top juegos de mesa de BoardGameGeek...')
  const boardgames = []
  try {
    const bggRes = await fetch('https://gist.githubusercontent.com/stungeye/358bf7e10e11e42224a483990f64eed5/raw/board_games.csv')
    const bggText = await bggRes.text()
    const rows = parseCSV(bggText).slice(1) // omitir header

    for (const r of rows) {
      if (boardgames.length >= 100) break
      const name = r[3]
      const minP = r[4] || '2'
      const maxP = r[5] || '4'
      const avgTime = parseInt(r[6], 10) || 60
      const year = parseInt(r[9], 10) || 2015
      const rating = parseFloat(r[10]) || 8.0
      const img = r[13] || ''
      const categories = (r[17] || 'Estrategia, Familiar').split(',').map((c) => c.trim())
      const designer = r[18] || 'Varios autores'

      if (!name || isNaN(year)) continue
      const titleLower = name.toLowerCase().trim()
      if (seenTitles.has(titleLower)) continue

      let slug = `boardgame:${slugify(name)}-${year}`
      if (seenIds.has(slug)) slug = `boardgame:${slugify(name)}-${year}-${boardgames.length}`

      const players = minP === maxP ? `${minP}` : `${minP}-${maxP}`
      const pop = Math.min(95, Math.max(55, Math.round(rating * 10)))

      boardgames.push({
        id: slug,
        type: 'boardgame',
        title: name,
        year,
        creator: designer,
        durationMin: avgTime,
        players,
        genres: categories,
        synopsis: `Juego de mesa diseñado por ${designer} (${players} jugadores, ~${avgTime} min).`,
        posterUrl: img.startsWith('http') ? img : null,
        popularity: pop,
      })
      seenIds.add(slug)
      seenTitles.add(titleLower)
    }
  } catch (err) {
    console.error('Error importando juegos de mesa:', err.message)
  }
  console.log(`Juegos de mesa importados: ${boardgames.length}`)

  // 2. Enriquecer Artistas
  console.log('\nEnriqueciendo Artistas y Bandas...')
  const artists = []
  for (const a of TOP_ARTISTS) {
    let slug = `artist:${slugify(a.name)}-${a.year}`
    if (seenIds.has(slug)) slug = `artist:${slugify(a.name)}-${a.year}-${artists.length}`

    artists.push({
      id: slug,
      type: 'artist',
      title: a.name,
      year: a.year,
      creator: a.creator,
      genres: a.genres,
      synopsis: a.synopsis,
      posterUrl: null,
      popularity: 92,
    })
    seenIds.add(slug)
    seenTitles.add(a.name.toLowerCase().trim())
  }
  await enrichArtists(artists)
  console.log(`Artistas completados: ${artists.length} (${artists.filter((a) => a.posterUrl).length} con foto HD)`)

  // 3. Unir todo al catálogo existente
  const newAllItems = [...existingItems, ...boardgames, ...artists]
  console.log(`\nNuevo total de obras en catálogo: ${newAllItems.length}`)

  currentSeed.items = newAllItems
  writeFileSync(SEED_FILE, JSON.stringify(currentSeed))
  console.log('seed.json actualizado con éxito con Artistas y Juegos de mesa!')
}

run().catch(console.error)
