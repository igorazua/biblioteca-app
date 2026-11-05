import { Asset } from 'expo-asset'
import { File } from 'expo-file-system'
import {
  setAliases,
  setCatalogIndex,
  setCrossEngine,
  setShelfAnchors,
  setShelfCatalog,
  setShelfEngine,
  type ShelfType,
} from '@biblioteca/core'

// D27: los archivos de app/src/data se copian a assets/data (scripts/copy-data.mjs) y se cargan como assets, no dentro del JS.
// Los `require` tienen que ser literales para que Metro los vea.
type Mod = number
const A = {
  index: require('../../assets/data/catalog-index.data') as Mod,
  aliases: require('../../assets/data/aliases.data') as Mod,
  shelf: {
    movie: require('../../assets/data/shelves/movie.data') as Mod,
    series: require('../../assets/data/shelves/series.data') as Mod,
    book: require('../../assets/data/shelves/book.data') as Mod,
    boardgame: require('../../assets/data/shelves/boardgame.data') as Mod,
    artist: require('../../assets/data/shelves/artist.data') as Mod,
  },
  engine: {
    movie: require('../../assets/data/engine/movie.data') as Mod,
    series: require('../../assets/data/engine/series.data') as Mod,
    book: require('../../assets/data/engine/book.data') as Mod,
    boardgame: require('../../assets/data/engine/boardgame.data') as Mod,
    artist: require('../../assets/data/engine/artist.data') as Mod,
    cross: require('../../assets/data/engine/cross.data') as Mod,
  },
  anchors: {
    movie: [require('../../assets/data/anchors/movie.data') as Mod, require('../../assets/data/anchors/movie.tree.data') as Mod],
    series: [require('../../assets/data/anchors/series.data') as Mod, require('../../assets/data/anchors/series.tree.data') as Mod],
    book: [require('../../assets/data/anchors/book.data') as Mod, require('../../assets/data/anchors/book.tree.data') as Mod],
    boardgame: [require('../../assets/data/anchors/boardgame.data') as Mod, require('../../assets/data/anchors/boardgame.tree.data') as Mod],
    artist: [require('../../assets/data/anchors/artist.data') as Mod, require('../../assets/data/anchors/artist.tree.data') as Mod],
  },
}

const ACTIVE: Exclude<ShelfType, 'song'>[] = ['movie', 'series', 'book', 'boardgame', 'artist']

/** Descarga (o localiza) el asset y devuelve su JSON ya leído. */
async function readJson<T = unknown>(mod: Mod): Promise<T> {
  const asset = Asset.fromModule(mod)
  if (!asset.localUri) await asset.downloadAsync()
  const uri = asset.localUri ?? asset.uri
  const raw = uri.startsWith('http') ? await (await fetch(uri)).text() : await new File(uri).text()
  return JSON.parse(raw) as T
}

/** Cede el hilo de JS entre archivos grandes para que la interfaz no se quede congelada. */
const breathe = () => new Promise<void>((r) => setTimeout(r, 0))

let ready: Promise<void> | null = null
let shelvesDone: Promise<void> | null = null

/**
 * Carga lo mínimo para arrancar: alias → índice del catálogo → anclas y motor de las cinco estanterías.
 * (El orden importa: `setShelfCatalog` usa `canonicalId`, que necesita los alias.) Se llama una vez.
 */
export function loadCore(): Promise<void> {
  ready ??= (async () => {
    setAliases(await readJson<Record<string, string>>(A.aliases))
    await breathe()
    setCatalogIndex(await readJson(A.index))
    for (const s of ACTIVE) {
      const [file, tree] = await Promise.all([readJson(A.anchors[s][0]), readJson(A.anchors[s][1])])
      setShelfAnchors(s, file, tree)
    }
    for (const s of ACTIVE) {
      setShelfEngine(s, await readJson(A.engine[s]))
      await breathe()
    }
    setCrossEngine(await readJson(A.engine.cross))
  })()
  return ready
}

/** Detalle completo de cada estantería (4,6 MB): se carga después de arrancar, de una en una. */
export function loadShelves(first?: ShelfType): Promise<void> {
  shelvesDone ??= (async () => {
    const order = [...new Set([...(first && first !== 'song' ? [first] : []), ...ACTIVE])]
    for (const s of order) {
      setShelfCatalog(s, await readJson(A.shelf[s]))
      await breathe()
    }
  })()
  return shelvesDone
}
