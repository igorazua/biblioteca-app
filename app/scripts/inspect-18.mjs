import sharp from 'sharp'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const GAMES = [
  { id: 'boardgame:scout-2019', bggId: 291453, name: 'SCOUT' },
  { id: 'boardgame:ark-nova-2021', bggId: 342942, name: 'Ark Nova' },
  { id: 'boardgame:inis-2016', bggId: 155821, name: 'Inis' },
  { id: 'boardgame:kemet-2012', bggId: 127023, name: 'Kemet' },
  { id: 'boardgame:cyclades-2009', bggId: 54998, name: 'Cyclades' },
  { id: 'boardgame:love-letter-2019', bggId: 277085, name: 'Love Letter' },
  { id: 'boardgame:oath-2021', bggId: 291572, name: 'Oath' },
  { id: 'boardgame:through-the-desert-1998', bggId: 503, name: 'Through the Desert' },
  { id: 'boardgame:next-station-london-2022', bggId: 353545, name: 'Next Station: London' },
  { id: 'boardgame:descent-journeys-in-the-dark-2005', bggId: 17226, name: 'Descent: Journeys in the Dark' },
  { id: 'boardgame:villagers-2019', bggId: 241724, name: 'Villagers' },
  { id: 'boardgame:cards-against-humanity-2009', bggId: 50381, name: 'Cards Against Humanity' },
  { id: 'boardgame:risk-1959', bggId: 181, name: 'Risk' },
  { id: 'boardgame:monopoly-1935', bggId: 1406, name: 'Monopoly' },
  { id: 'boardgame:exploding-kittens-2015', bggId: 172225, name: 'Exploding Kittens' },
  { id: 'boardgame:trivial-pursuit-1981', bggId: 2952, name: 'Trivial Pursuit' },
  { id: 'boardgame:cluedo-1949', bggId: 1294, name: 'Cluedo' },
  { id: 'boardgame:parchis-1900', customUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Parchis.jpg', name: 'Parchís' }
]

async function inspect() {
  for (const g of GAMES) {
    let imgUrl = g.customUrl
    if (!imgUrl && g.bggId) {
      const res = await fetch(`https://api.geekdo.com/api/geekitems?objectid=${g.bggId}&objecttype=thing`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      if (res.ok) {
        const d = await res.json()
        imgUrl = d.item?.images?.original || d.item?.images?.previewthumb
      }
    }

    if (!imgUrl) {
      console.log('FAIL:', g.name, 'No image URL found')
      continue
    }

    const r = await fetch(imgUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!r.ok) {
      console.log('FAIL FETCH:', g.name, imgUrl, r.status)
      continue
    }

    const buf = Buffer.from(await r.arrayBuffer())
    const meta = await sharp(buf).metadata()
    console.log(`OK: ${g.name} (${g.id}) | ${meta.width}x${meta.height} (ratio: ${(meta.height/meta.width).toFixed(2)}) | ${imgUrl}`)
  }
}

inspect()
