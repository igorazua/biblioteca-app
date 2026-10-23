# T20_REGISTRO — Registro de comprobaciones de la tarea T20

Fecha: 23/10/2026

---

## T20.1 — Limpiar el catálogo de obras basura

### Candidatas identificadas
Generadas con `node app/scripts/engine/junk-candidates.mjs`. Reporte completo en `app/scripts/cache/junk/candidatas.md`.
Total candidatas: **37** (32 programas/reality shows de relleno de televisión estadounidense y 5 publicaciones no comerciales/microfilms/folletos de libros).

Obras ocultas por estantería aplicadas con `hidden: true`:
- `movie`: 0
- `series`: 32
- `book`: 5
- `boardgame`: 0
- `artist`: 0

### Comprobación 1: `node app/scripts/engine/coverage.mjs`
```
📊 ESTADO DE COBERTURA DEL CATÁLOGO (ENRIQUECIMIENTO.md §1.1 y §6)

| Categoría | Obras | ID Ext. | Metadatos (votos/lect.) | Palabras clave | Sinopsis | Portada legal | Ejes LLM |
|---|---|---|---|---|---|---|---|
| **movie** | 935 | TMDB: 79.9% · Wiki: 85.9% | Votos: 84.4% | 84.4% | 98.7% | 0.0% | 99.9% |
| **series** | 966 | TMDB: 73.1% · Wiki: 88.4% | Votos: 86.9% | 86.9% | 88.2% | 0.0% | 103.3% |
| **book** | 983 | OLID: 96.9% · Wiki: 43.4% | Readers: 95.3% | 86.2% | 99.3% | 0.0% | 100.5% |
| **boardgame** | 1018 | Wiki: 69.5% | Votos: 68.9% | 68.9% | 91.5% | 0.3% | 99.7% |
| **artist** | 410 | MBID: 99.8% · Wiki: 97.6% | Votos: 0.0% | 60.2% | 100.0% | 0.0% | 100.0% |

Ocultas por estantería: movie: 0, series: 32, book: 5, boardgame: 0, artist: 0
```

### Comprobación 2: `npx vitest run app/src/lib/engine/hidden.test.ts`
```
 RUN  v5.0.4 C:/Users/igora/.gemini/antigravity/scratch/biblioteca-app/app

 ✓ src/lib/engine/hidden.test.ts (1 test) 20ms
   ✓ T20.1 — Obras ocultas (hidden) (1)
     ✓ una obra oculta no sale en nextCards ni en nextDuel 20ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  11:48:38
   Duration  463ms
```

### Comprobación suite completa y TypeScript:
- `npx vitest run`: 143 passed (21 test files)
- `npx tsc -p app/tsconfig.json --noEmit`: 0 errores
