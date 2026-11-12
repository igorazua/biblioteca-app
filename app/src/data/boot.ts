// Arranque de @biblioteca/core en la PWA: lo que antes entraba en el bundle con `import` estático (alias, índice ligero
// del catálogo y anclas) se entrega aquí, de forma síncrona, al evaluar el módulo. `main.tsx` y `test-setup.ts` lo
// importan PRIMERO: así los stores (que se rehidratan de localStorage al crearse y usan `canonicalId` y el catálogo)
// ya ven los datos, igual que cuando `data/catalog.ts` y `data/aliases.ts` los cargaban por su cuenta.
// Este archivo no puede importar ningún store: si lo hiciera, el store se crearía antes de entregar los datos.
// Lo que se carga más tarde (detalle de estanterías, vectores del motor, canciones) está en `loadData.ts`.
import { setAliases, setCatalogIndex, setShelfAnchors, type CatalogIndexData } from '@biblioteca/core'
import aliasesJson from './aliases.json'
import indexData from './catalog-index.json'
import movieFile from './anchors/movie.json'
import seriesFile from './anchors/series.json'
import bookFile from './anchors/book.json'
import boardgameFile from './anchors/boardgame.json'
import artistFile from './anchors/artist.json'
import movieTree from './anchors/movie.tree.json'
import seriesTree from './anchors/series.tree.json'
import bookTree from './anchors/book.tree.json'
import boardgameTree from './anchors/boardgame.tree.json'
import artistTree from './anchors/artist.tree.json'

// el orden importa: el índice y el detalle de las estanterías usan `canonicalId`, que necesita los alias
setAliases(aliasesJson as Record<string, string>)
setCatalogIndex(indexData as unknown as CatalogIndexData)
setShelfAnchors('movie', movieFile, movieTree)
setShelfAnchors('series', seriesFile, seriesTree)
setShelfAnchors('book', bookFile, bookTree)
setShelfAnchors('boardgame', boardgameFile, boardgameTree)
setShelfAnchors('artist', artistFile, artistTree)
