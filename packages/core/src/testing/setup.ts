// Solo para tests. La app real carga estos archivos como assets y se los entrega al paquete; los tests hacen lo mismo
// con los JSON de la PWA (alias `@data`). Equivale al `test-setup.ts` de la PWA: catálogo completo (índice + detalle).
import aliases from '@data/aliases.json'
import catalogIndex from '@data/catalog-index.json'
import movieShelf from '@data/shelves/movie.json'
import seriesShelf from '@data/shelves/series.json'
import bookShelf from '@data/shelves/book.json'
import boardgameShelf from '@data/shelves/boardgame.json'
import artistShelf from '@data/shelves/artist.json'
import movieAnchors from '@data/anchors/movie.json'
import seriesAnchors from '@data/anchors/series.json'
import bookAnchors from '@data/anchors/book.json'
import boardgameAnchors from '@data/anchors/boardgame.json'
import artistAnchors from '@data/anchors/artist.json'
import movieTree from '@data/anchors/movie.tree.json'
import seriesTree from '@data/anchors/series.tree.json'
import bookTree from '@data/anchors/book.tree.json'
import boardgameTree from '@data/anchors/boardgame.tree.json'
import artistTree from '@data/anchors/artist.tree.json'
import { setAliases } from '../data/aliases'
import { setCatalogIndex, setShelfCatalog, type CatalogIndexData } from '../data/catalog'
import { setShelfAnchors } from '../lib/engine/anchors'
import type { Item } from '../types'

setAliases(aliases as Record<string, string>)
setShelfAnchors('movie', movieAnchors, movieTree)
setShelfAnchors('series', seriesAnchors, seriesTree)
setShelfAnchors('book', bookAnchors, bookTree)
setShelfAnchors('boardgame', boardgameAnchors, boardgameTree)
setShelfAnchors('artist', artistAnchors, artistTree)
setCatalogIndex(catalogIndex as unknown as CatalogIndexData)
setShelfCatalog('movie', movieShelf as unknown as Item[])
setShelfCatalog('series', seriesShelf as unknown as Item[])
setShelfCatalog('book', bookShelf as unknown as Item[])
setShelfCatalog('boardgame', boardgameShelf as unknown as Item[])
setShelfCatalog('artist', artistShelf as unknown as Item[])
