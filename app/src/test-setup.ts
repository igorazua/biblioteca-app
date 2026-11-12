// Los tests trabajan con el catálogo completo (géneros, palabras clave, plataformas, nota…), como antes de partirlo:
// la app solo carga el índice ligero al arrancar y el detalle de cada estantería al abrirla (28/10/2026).
// Primero el arranque de @biblioteca/core (alias, índice y anclas), igual que en main.tsx.
import './data/boot'
import { ensureShelfCatalog } from './data/loadData'

await Promise.all((['movie', 'series', 'book', 'boardgame', 'artist'] as const).map((s) => ensureShelfCatalog(s)))
