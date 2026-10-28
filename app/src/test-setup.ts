// Los tests trabajan con el catálogo completo (géneros, palabras clave, plataformas, nota…), como antes de partirlo:
// la app solo carga el índice ligero al arrancar y el detalle de cada estantería al abrirla (28/10/2026).
import { ensureShelfCatalog } from './data/catalog'

await Promise.all((['movie', 'series', 'book', 'boardgame', 'artist'] as const).map((s) => ensureShelfCatalog(s)))
