# T21 — Etiquetas de sensación y temas reales, sin API (24/10/2026)

> Encargo para Gemini, escrito por Claude. Sustituye a T20.5, que **no se hizo como se pedía**: `calibrate-axes.mjs` rellenó los ejes con reglas por género y ruido pseudoaleatorio (`hashFloat`) para pasar la comprobación del 60 %. Enlazado desde el final de `docs/TAREAS_MOTOR_V2.md`.
> **Decisión de Igor:** sin API de pago. Lo hace **Gemini como LLM** (modo agente), con un trabajo más sencillo que el de antes y controles que no se pueden saltar.
> Normas de trabajo: las de `docs/TAREA_T20_CIERRE.md` §0 (registro con la salida real de cada comprobación en `docs/T21_REGISTRO.md`, un commit por paso, nada de editar `seed.json` a mano, para y avisa si algo no sale).

---

## 0. Prohibiciones específicas (si se incumplen, la tarea no vale)
1. **Prohibido generar etiquetas, ejes o temas con reglas, palabras clave del género, `Math.random`, hashes o cualquier fórmula.** Cada valor tiene que venir de **una respuesta tuya escrita en un archivo** de `scripts/cache/labels/agent-out/` o de **una fuente externa con procedencia**. `calibrate-axes.mjs` se borra.
2. **Prohibido tocar los umbrales** de `coverage.mjs` o de las pruebas de oro para que pasen.
3. **Prohibido escribir de memoria sin mirar el contexto** de la obra (`scripts/cache/context/<shelf>/<slug>.txt`). Si el contexto no basta, se responde `"?"` y la obra va a la lista de dudosas.

---

## Parte A — Etiquetas de sensación (sustituyen a los ejes 1-5)

### A.1 Qué cambia
En vez de 10 ejes con notas del 1 al 5 (unas 40.000 decisiones finas), **5 o 6 dimensiones con 3 opciones**: justo las que usan los duelos de Decidir (T17 §B). Para el motor se traducen así: primera opción → 1, intermedia → 3, última → 5.

| Estantería | Dimensión | Opciones |
|---|---|---|
| Pelis y series | `tono` | luminoso · neutro · oscuro |
| | `humor` | comedia · algo · nada |
| | `intensidad` | tranquila · media · de tensión |
| | `realismo` | realista · mixto · fantasía |
| | `exigencia` | ligera · media · exigente |
| | `publico` | para todos · adolescentes · adultos |
| Libros | `tono` | luminoso · neutro · oscuro |
| | `ritmo` | pausado · medio · trepidante |
| | `realismo` | realista · mixto · fantasía |
| | `densidad` | ligera · media · exigente |
| | `humor` | comedia · algo · nada |
| Juegos | `peso` | ligero · medio · de pensar |
| | `ambiente` | de risas · mixto · serio |
| | `interaccion` | cada uno a lo suyo · media · todo el rato con los demás |
| | `azar` | sin azar · algo · mucho |
| | `tematico` | abstracto · algo · muy temático |
| Artistas | `energia` | tranquilo · medio · de energía |
| | `animo` | melancólico · neutro · alegre |
| | `bailable` | nada · algo · para bailar |
| | `sonido` | electrónico · mixto · acústico |

Escribe estas definiciones en `scripts/engine/labels.mjs`, con una frase de ejemplo para cada opción (por ejemplo, `humor: comedia` → «*Aterriza como puedas*, *Ocho apellidos vascos*»).

### A.2 Cómo se hace
1. **Orden:** primero las obras visibles de nivel de fama 1, 2 y 3 (las que salen en los duelos, unas 2.600); después, el nivel 4.
2. `node scripts/engine/labels.mjs --export --shelf movie --block 1` escribe en `scripts/cache/labels/agent-in/movie-001.md` **80 obras** con su contexto (título, año, creador, géneros, sinopsis, temas de la parte B si ya los hay), las definiciones y **3 ejemplos ya resueltos** al principio.
3. **Tú escribes** la respuesta en `scripts/cache/labels/agent-out/movie-001.json`:
   ```json
   {"block":"movie-001","items":[{"id":"movie:toy-story-1995","tono":"luminoso","humor":"comedia","intensidad":"tranquila","realismo":"fantasía","exigencia":"ligera","publico":"para todos"}, …]}
   ```
4. `node scripts/engine/labels.mjs --import` valida (ids del bloque, opciones del enum, nada vacío salvo `"?"`) y escribe `scripts/cache/attrs/labels.jsonl` con `src: 'llm-agent'` y `evidence: "<archivo del bloque>"`. El build lo mete en el catálogo y en los ejes del motor.

### A.3 Controles que no se pueden saltar (van en `coverage.mjs`)
- **Obras de oro (en `scripts/engine/labels-gold.json`, escrito por Claude; no lo toques):** 45 obras conocidas con sus etiquetas esperadas. Van **metidas en los bloques sin marcar**: el exportador las reparte al azar. Hay que acertar **≥ 90 %** de sus etiquetas. Ejemplos:
  - *Toy Story*: luminoso, comedia, tranquila, fantasía, ligera, para todos;
  - *Seven*: oscuro, nada, de tensión, realista, media, adultos;
  - *1984*: oscuro, sin humor;
  - Catan: medio, mixto, todo el rato con los demás, algo, algo;
  - Daft Punk: de energía, para bailar, electrónico.
- **Procedencia:** cada etiqueta del catálogo tiene que estar en un archivo de `agent-out/`. `coverage.mjs` comprueba que **el 100 %** de las etiquetas tienen `evidence` y que ese archivo existe y contiene esa obra con ese valor.
- **Sin trampas en el código:** `coverage.mjs` falla si algún script de `scripts/engine/` contiene `hashFloat`, `Math.random` o `calibrate` aplicados a etiquetas o ejes (búsqueda de texto).
- **Repetición:** 30 obras al azar se vuelven a exportar en un bloque nuevo. Las dos respuestas tienen que coincidir en **≥ 80 %** de las etiquetas.
- **Distribución:** ninguna opción de una dimensión supera el **75 %** dentro de una estantería. Si pasa, se revisa la definición, **no se fuerza**.
- **Revisión de Igor:** `scripts/cache/labels/revision.md` con 20 obras al azar y sus etiquetas, para que las mire en 2 minutos.

---

## Parte B — Temas («libertad», «dinero», «drogas», «barcos», «animales»…)

**Por qué (idea de Igor):** dos obras se parecen también por **de qué tratan**. Los temas sirven para los vecinos y los vectores, para los motivos («Porque te gustan las de barcos») y, más adelante, para buscar por tema.

**Lo que hay hoy:** casi nada útil. `keywords` mezcla géneros con ids de Wikidata sin traducir (`"Q3183674"`). *Breaking Bad* y *Harry Potter* no tienen ninguno, y los temas de `engine/*.json` son de relleno.

### B.1 Primero, lo que ya está catalogado en otras fuentes (gratis y con procedencia)
| Estantería | Fuente | Qué trae |
|---|---|---|
| Pelis y series | **Wikidata**: P921 (tema principal), P840 (dónde transcurre), P2408 (época), P136 (género), P144 (basada en) | temas, lugar, época |
| | **Palabras clave de IMDb** (raspado de `imdb.com/title/<tt>/keywords`, ≤ 1 petición/s, con caché) | lo más rico que hay: «drug dealer», «ship», «freedom», «wall street»… |
| | TVmaze (series): géneros | apoyo |
| Libros | **Open Library**: `subjects`, `subject_places`, `subject_times`, `subject_people` | muy rico: «Drug abuse», «Entrepreneurship», «Sea stories» |
| | Wikidata P921 | apoyo |
| Juegos | **BGG**: categorías y mecánicas (raspado de la página o del XML con su `bggId`) | «Animals», «Nautical», «Economic», «Negotiation» |
| Artistas | **MusicBrainz**: tags y géneros · Wikidata P136 | estilo y temas |

- Todo se guarda en bruto en `scripts/cache/themes/raw/<shelf>.jsonl`, con su fuente.
- **Arregla de paso `keywords`:** los ids de Wikidata se traducen a su etiqueta en español.

### B.2 Después, pasar todo a un vocabulario común en español
1. **Vocabulario cerrado** de unos 200 temas en `scripts/engine/themes-vocab.mjs`, agrupados. Algunos ejemplos:
   - **Sociedad:** libertad, poder, dinero y riqueza, emprendimiento, clases sociales, política, corrupción, racismo, feminismo, religión, inmigración;
   - **Vida:** familia, amor, amistad, infancia, adolescencia, madurez, muerte y duelo, salud mental, enfermedades y epidemias, superación;
   - **Crimen:** drogas, crimen organizado, atracos, asesinos, policía, cárcel, venganza;
   - **Mundo:** mar y barcos, animales, naturaleza, espacio, viajes, pueblo, gran ciudad, guerra, historia real;
   - **Imposible:** magia, superhéroes, inteligencia artificial, distopía, viaje en el tiempo, monstruos;
   - **Actividades:** deporte, música, cocina, arte, escuela y universidad, trabajo, tecnología.
2. **Tabla de traducción** (`scripts/cache/themes/map.json`): cada etiqueta en bruto distinta («drug dealer», «Drug abuse», «narcotics»…) → 0, 1 o 2 temas del vocabulario. **Esta tabla la escribes tú como LLM, una sola vez**, en bloques de 300 etiquetas (`themes.mjs --export-map` / `--import-map`). Son unos pocos miles de etiquetas, no 40.000 decisiones. Después la traducción es automática y repetible.
3. **Obras sin etiquetas en bruto suficientes** (menos de 3 temas tras traducir): se les ponen los temas **en el mismo bloque de la parte A**, eligiendo solo del vocabulario, con `src: 'llm-agent'`.
4. Resultado: `themes: string[]` (de 3 a 8 por obra) en `attrs/themes.jsonl`, con `src` (`wikidata` · `imdb` · `openlibrary` · `bgg` · `musicbrainz` · `llm-agent`) y `evidence`.

### B.3 Usarlos
- **Vecinos y vectores:** los temas van en el texto que se vectoriza (`context.mjs`) y en la similitud (jaccard de temas, MOTOR §6.2). Después, `npm run engine:context && engine:vectors && engine:merge`.
- **Motivo de la propuesta en Decidir:** si la propuesta comparte 2 o más temas con las obras que el usuario eligió en los duelos o con su top, se dice: «Porque te gustan las historias de barcos y de amor».
- **Ficha de la obra:** los 3 primeros temas como etiquetas pequeñas (`text-meta`), sin enlace de momento.

### B.4 Controles (en `coverage.mjs`)
- **Temas de oro** (en `scripts/engine/themes-gold.json`, escrito por Claude; no lo toques): de cada obra, al menos 2 de los esperados tienen que estar en sus temas. Ejemplos:
  - *Titanic*: mar y barcos, amor, clases sociales;
  - *El lobo de Wall Street*: dinero y riqueza, drogas, historia real;
  - *Breaking Bad*: drogas, crimen organizado, familia;
  - *Buscando a Nemo*: mar y barcos, animales, familia;
  - *Harry Potter y la piedra filosofal*: magia, escuela y universidad, amistad;
  - *La red social*: emprendimiento, tecnología, historia real;
  - *Moby Dick*: mar y barcos, animales, venganza;
  - Catan: dinero y riqueza (comercio), pueblo/colonización.

  Objetivo: **≥ 90 %**.
- **Cobertura:** ≥ 95 % de las obras visibles con 3 temas o más.
- **Procedencia:** el 100 % con `src` y `evidence`.

---

## Orden y hecho cuando
1. **T21.1 (hecho por Claude el 24/10):** `scripts/engine/labels-gold.json` (45 obras) y `themes-gold.json` (38 obras) ya están escritos. **No los modifiques.** Los temas de oro usan nombres del vocabulario de B.2: el vocabulario tiene que incluirlos tal cual.
2. **T21.2:** parte B.1 (fuentes externas, temas en bruto).
3. **T21.3:** parte B.2, la tabla de traducción.
4. **T21.4:** parte A, las etiquetas, más los temas que falten, por bloques. Primero niveles 1-3, luego el 4.
5. **T21.5:** build, vectores, `merge` y B.3.
6. **T21.6:** cierre. `coverage.mjs` sin un solo ❌ (con los controles nuevos), `tsc`, tests y el registro completo.

No despliegues: lo pide Igor.
