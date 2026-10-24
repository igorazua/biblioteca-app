# T22-T26 — Que la primera impresión de Decidir sea buena (24/10/2026)

> Encargos escritos por Claude con las decisiones de Igor del 24/10. **Cinco tareas para agentes distintos en paralelo.** Cada agente hace **solo su sección**. Enlazado desde el final de `docs/TAREAS_MOTOR_V2.md`.
> Objetivo de Igor: *«en los duelos de Decidir tienen que salir obras lo más reconocidas posible y que tengan valor para dirigir la respuesta. Cuantas más obras tenga el usuario, mejor funcionará, pero el primer impacto tiene que ser bueno.»*
> **Descartado por Igor:** preguntar la época o la edad del usuario. No se hace en ninguna tarea.

---

## Normas comunes (las cinco tareas)
1. **Cada tarea solo toca sus archivos** (tabla siguiente). Si necesita algo de otro archivo, **lo pide en su registro y no lo toca**.
2. **Registro obligatorio:** `docs/registro/T2X.md` (crea la carpeta), con la **salida real, sin resumir,** de cada comprobación. Sin registro, no está hecho.
3. **Un commit por paso**, solo con sus archivos (`git add <archivo>`, nunca `git add -A`), con el mensaje `T2X: …`.
4. **Nada se inventa ni se rellena con fórmulas, azar o hashes.** Si un dato no se puede conseguir, para y escríbelo en el registro.
5. **Nadie edita `seed.json` a mano** ni toca los umbrales de `coverage.mjs` ni los archivos de oro.
6. Al acabar: `npx tsc -p app/tsconfig.json --noEmit` limpio y `npx vitest run` en verde, pegados en el registro.
7. Sin revisión visual por vuestra parte (la hace Igor) y **sin desplegar**.

### Reparto de archivos y orden
| Tarea | Quién (propuesta) | Archivos que solo toca ella | Depende de |
|---|---|---|---|
| **T22 · Anclas y guion de los 3 primeros duelos** | **Sonnet** (es la más delicada y define la primera impresión) | `app/src/data/anchors/*.json` (nuevo), `app/src/lib/engine/anchors.ts` (nuevo), `app/src/lib/engine/userSeeds.ts` (nuevo, solo el esqueleto), `app/src/lib/engine/decide.ts`, `decide.test.ts`, `anchors.test.ts` | nada |
| **T23 · Aprendizaje colectivo de «No conozco»** | Gemini | `supabase/migrations/0010_biblio_recog_stats.sql`, `supabase/functions/biblio-recog/` (nueva), `app/src/lib/engine/crowd.ts` (nuevo), `app/src/lib/engine/recog.ts` (+ test), `app/src/screens/WhatToWatch.tsx` | nada |
| **T24 · Lo que se ve ahora en España** | Gemini | `app/scripts/engine/trending/*.mjs` (nuevos), `app/scripts/cache/trending/`, `app/scripts/cache/attrs/trend.jsonl`, `app/scripts/engine/build.mjs` (solo la fórmula de `trend` y de `notoriety`) | **T21 terminada** (también toca `build.mjs`) |
| **T25 · Lo que ya trae el usuario** | Gemini | `app/src/lib/engine/userSeeds.ts` (lo implementa), `app/src/screens/Onboarding.tsx`, `app/src/screens/JoinInvite.tsx`, `app/src/store/useFriends.ts` | **T22 terminada** (crea el esqueleto de `userSeeds.ts` y lo enchufa en `decide.ts`) |
| **T26 · Aprender qué parejas funcionan** | Gemini, **más adelante** | `app/scripts/engine/pair-stats.mjs` (nuevo), `app/src/data/engine/pair-stats.json` (nuevo), `app/src/lib/engine/pairStats.ts` (nuevo) | T22 y que haya ≥ 500 sesiones de Decidir reales |

**Se pueden lanzar ya en paralelo: T22, T23 y T21** (la que está en curso). **T24, cuando acabe T21. T25, cuando acabe T22. T26, más adelante.**

---

## T22 — Anclas elegidas a mano y guion de los 3 primeros duelos

### Por qué
Para un usuario nuevo, los 3 primeros duelos deciden si la app «le entiende». Tienen que salir **obras que conozca seguro** y que **separen gustos de verdad**. Eso no lo garantiza una fórmula: hace falta una lista elegida y un guion pensado de antemano, como un buen test.

### 22.1 La lista de anclas (`app/src/data/anchors/<shelf>.json`)
**Cuántas:** 60 pelis, 60 series, 60 libros, 40 juegos y 40 artistas. Mercado España; el formato admite otros países después.

**Cada ancla:**
```json
{ "id": "movie:toy-story-1995",
  "sides": { "tono": "light", "humor": "comedy", "intensidad": "calm", "realismo": "fantasy", "publico": "all" },
  "era": "1995-2004",
  "why": "Pixar, la conoce todo el mundo; extremo luminoso y familiar" }
```
- `sides`: solo las dimensiones en las que la obra está **claramente en un extremo**. Usa las claves de T21 §0b; si T21 aún no las ha creado, usa las de `labels-gold.json` traducidas a clave. **Las pones tú, obra a obra**, razonando cada una en `why`.
- `era`: la franja de estreno (`<1980`, `1980-1994`, `1995-2004`, `2005-2014`, `2015+`).

**Reglas (las comprueba `anchors.test.ts`):**
1. **Todas son conocidísimas en España:** `fameTier = 1` y `recog` ≥ 0,85 para un usuario nuevo de España sin datos (la función actual de `recog.ts`). Si una no lo cumple, **se cambia la obra, no el umbral**.
2. **Cubren los dos extremos de cada dimensión:** al menos **6 anclas por extremo** y dimensión.
3. **Cubren todas las épocas:** al menos **8 anclas por franja** desde `1980-1994`, y al menos 4 de `<1980` (clásicos que conoce todo el mundo), para que cualquier edad tenga anclas.
4. **Variedad:** como mucho 2 anclas por saga y por creador.
5. **Incluyen obligatoriamente** todas las obras de nivel 1 de la lista de oro de T17 §A.5 que tengan un extremo claro, y las de `labels-gold.json` de esa estantería.
6. Ningún id oculto (`hidden`) ni inexistente en el seed.

**Revisión de Igor (⛔ para hasta su OK):** `app/src/data/anchors/REVISION.md` con una tabla por estantería: título, año, extremos y `why`. Igor quita o cambia las que no le convenzan.

### 22.2 El guion (`app/src/data/anchors/<shelf>.tree.json`)
Un árbol de 3 niveles generado por `app/src/lib/engine/anchors.ts` (función pura `buildTree(anchors, labels)`) y guardado como dato revisable:
- **Duelo 1:** la dimensión que mejor reparte la estantería (la que más cerca deja la mitad del catálogo visible en cada lado). La pareja: dos anclas de **extremos opuestos** de esa dimensión, **lo más neutras en las demás**, para que la elección se deba a esa dimensión y no a otra cosa.
- **Duelo 2:** según quién ganó el 1, la siguiente dimensión que mejor reparte **dentro del lado elegido**. La pareja: dos anclas opuestas en la nueva dimensión y **del lado ganador en la primera** (si eligió animación, las dos del 2 son de animación).
- **Duelo 3:** igual, con las dos anteriores fijadas.
- **Para cada hueco del árbol, 3 parejas alternativas** (no una). En tiempo de ejecución se elige la de mayor `R_a · R_b` para ese usuario, para adaptarse a su edad sin preguntarla (la edad se deduce como ya se hace), y para que dos sesiones seguidas no repitan pareja (rotación de 3 sesiones).

### 22.3 Enchufarlo en `decide.ts`
- **Usuario sin obras propias en la estantería** (o con menos de 5): los duelos 1 a 3 salen **del guion**. Las respuestas cierran o empujan las dimensiones, como dice T17 §C.4.
- **Usuario con 5 o más obras propias:** se mezclan. En cada hueco del guion, si tiene una obra propia en el mismo extremo, se usa la suya en lugar del ancla.
- **Si pulsa «No conozco ninguna»** en un duelo del guion: se usa la siguiente alternativa de ese hueco. Si no quedan, la siguiente rama.
- Desde el duelo 4, la lógica de fases actual (T19 §1.2).
- **Esqueleto de `userSeeds.ts`:** `export function userSeedAnchors(ctx): Anchor[] { return [] }`, que `decide.ts` mezcla con las anclas (T25 lo rellena).

### 22.4 Comprueba (va en el registro)
- `npx vitest run app/src/lib/engine/anchors.test.ts`: las 6 reglas de 22.1 en las 5 estanterías.
- `decide.test.ts`, simulación de **1.000 usuarios nuevos** al azar (edades deducidas distintas, respuestas al azar):
  - en los 3 primeros duelos, **el 100 % de las obras son anclas**;
  - **en el 100 % de los duelos, las dos obras están en extremos opuestos** de la dimensión del duelo;
  - **ninguna pareja se repite** dentro de una sesión;
  - en 2 sesiones seguidas del mismo usuario, **menos del 20 %** de parejas repetidas.
- Pega en el registro, por estantería, el árbol en texto: «Duelo 1: *Toy Story* o *Seven* (tono). Si gana *Toy Story* → Duelo 2: …».

---

## T23 — Aprendizaje colectivo: «No conozco» enseña a todos
### Por qué
Si muchos usuarios de España y de una edad parecida pulsan «No conozco ninguna» con una obra, esa obra no debe volver a salir a gente parecida. Con unas decenas de usuarios, la reconocibilidad se corrige sola.

### 23.1 Datos
- Migración `0010_biblio_recog_stats.sql`:
  - tabla `biblio_recog_events` (`user_id`, `item_id`, `country`, `age_band`, `kind`: `unknown` | `slow` | `answered`, `at`), con RLS: cada usuario inserta solo lo suyo y nadie lee lo de otros;
  - vista materializada `biblio_recog_stats` (`item_id`, `country`, `age_band`, `shown`, `unknown`, `slow`) que se refresca cada hora, **agregada**, sin `user_id`, legible por todos.
  - `age_band` sale de la edad **deducida** (nunca se pregunta): `<25`, `25-34`, `35-44`, `45+` o `?`.
- **Qué se manda:** cada obra de cada duelo de Decidir que se enseña (`answered`), las dos de un «No conozco ninguna» (`unknown`) y las de un duelo de más de 6 s (`slow`). Desde `WhatToWatch.tsx`, en segundo plano y sin bloquear nada; si no hay cuenta o red, se guarda y se manda luego.

### 23.2 Uso en R (`crowd.ts` + `recog.ts`)
```
tasa  = (unknown + 0.5·slow + 1) / (shown + 10)        (suavizada: con pocos datos no mueve casi nada)
factor = clamp(0.3, 1.0, 1 − 1.5·max(0, tasa − 0.05))   (por debajo del 5 % de «no la conozco», no penaliza)
R = R_actual · factor
```
- Se usa la fila del país y la franja de edad del usuario. Si esa fila tiene `shown < 20`, se usa la del país entero; si tampoco, factor 1.
- `crowd.ts` descarga `biblio_recog_stats` al abrir Decidir (con caché de 1 hora) y expone `crowdFactor(itemId, country, ageBand)`.

### 23.3 Comprueba
- `recog.test.ts`:
  - 50 enseñadas y 25 «no la conozco» → R baja más de un 40 %;
  - 3 enseñadas y 1 «no la conozco» → R baja menos de un 5 %;
  - sin datos → igual que antes.
- Con datos de prueba en una base local o en una rama de Supabase (**no en producción**): inserta eventos y comprueba que la vista agrega y que la RLS impide leer filas ajenas. Pega las consultas y su resultado en el registro.
- **⛔ Para y pide el OK de Igor** antes de aplicar la migración en producción.

---

## T24 — Lo que se está viendo y leyendo ahora en España
### Por qué
Un estreno que todo el mundo está viendo tiene pocas visitas en Wikipedia los primeros meses, pero se conoce. Las listas semanales públicas lo detectan.

### 24.1 Fuentes (raspado permitido, con caché, ≤ 1 petición/s, sin iniciar sesión)
| Estantería | Fuente | Qué se coge |
|---|---|---|
| Pelis y series | Top 10 semanal de **Netflix España** (`top10.netflix.com/spain`); FlixPatrol España para **Prime Video, Max y Disney+** | posición y semanas en lista |
| Libros | Lo más vendido en España: listas semanales de Casa del Libro y de El Corte Inglés | posición y semanas |
| Artistas | **Spotify Charts España** (top 50 semanal, `charts.spotify.com`; si exige sesión, el top 50 de Kworb) | artistas del top 50 |
| Juegos | Lo más vendido de juegos de mesa en Amazon.es | posición |

- Guarda cada semana en `app/scripts/cache/trending/<fuente>/<AAAA-semana>.json`, con la URL y la fecha. **Lee las condiciones de cada web** y apunta en el registro si alguna prohíbe el raspado; si es así, no la uses.
- **Emparejar con el catálogo:** por título en español y original + año, con el emparejador de `lib/import/match`. Lo que no esté en el catálogo va a `trending/fuera-del-catalogo.md` (candidatas a añadir, para Igor).

### 24.2 Cálculo
```
trend.ES = max sobre las últimas 12 semanas de  (11 − posición)/10 · 0.85^(semanas desde esa semana)
notoriety.ES = max(notoriety.ES, 0.6 + 0.35·trend.ES)    solo si la obra es de los últimos 3 años
```
Lo que está de moda **sube** la reconocibilidad, nunca la baja. Va en `build.mjs`, en el paso 4.

### 24.3 Comprueba
- Ejecuta las fuentes una vez y pega en el registro, por fuente, cuántas obras ha encontrado y cuántas han casado con el catálogo.
- **Prueba de verdad:** las 5 primeras del top 10 de Netflix España de esta semana tienen `notoriety.ES ≥ 0.6` (si están en el catálogo).
- `coverage.mjs` sigue en verde (lista de oro incluida).
- Deja preparado el comando `npm run engine:trending` para ejecutarlo cada semana, y explica en `app/README.md` cómo programarlo (por ejemplo, con el Programador de tareas de Windows). **No lo programes tú.**

---

## T25 — Aprovechar lo que ya trae el usuario
### 25.1 Invitado por un amigo
- Si el usuario entró por `/unete/:code` (`JoinInvite.tsx`), se guarda quién le invitó (`useFriends`).
- `userSeedAnchors(ctx)` en `userSeeds.ts` devuelve, para la estantería, las obras del **top 30 % del ranking de quien le invitó** que sean de nivel de fama 1 o 2. `decide.ts` (T22) ya las mezcla en el guion.
- **Límite:** como mucho 1 de cada 2 obras de un duelo sale de aquí, y siempre en un extremo claro de la dimensión del duelo (comprueba sus `sides` con las etiquetas de T21).

### 25.2 Entre estanterías
- Si el usuario tiene obras propias en otra estantería, `userSeedAnchors` añade como candidatas las **adaptaciones** de esas obras en esta estantería. Salen de las aristas `adapt` de `cross.json` y de Wikidata P144: si leyó *Harry Potter*, en pelis entra la peli de *Harry Potter*.
- Solo si la adaptación es de nivel 1 o 2.

### 25.3 Conectar en la bienvenida
- En `Onboarding.tsx`, después de los 3 gestos, una pantalla **opcional**: «¿Ya usas alguna de estas?», con los 6 servicios más usados en España de `lib/connect/services.ts` (Netflix, Spotify, Prime Video, Letterboxd, Goodreads, YouTube Music), que llevan a su hoja de Conectar, y un botón de texto «Ahora no». Sin cambiar nada de Conectar.

### 25.4 Comprueba
- Test de `userSeeds`:
  - invitado por alguien con *Breaking Bad* arriba → sale entre las candidatas;
  - con *Harry Potter* (libro) vista → la peli sale en pelis;
  - una obra de nivel 4 del amigo **no** sale.
- Test de que la pantalla de Conectar de la bienvenida se puede saltar y no bloquea el resto.

---

## T26 — Aprender qué parejas funcionan (más adelante)
**Solo cuando haya al menos 500 sesiones de Decidir reales** (`biblio_events`, `dec_duel` y `dec_accept`).
- `pair-stats.mjs` (fuera de la app, sin coste): por cada pareja del guion y por cada dimensión, se calcula la **tasa de acierto** = sesiones con esa pareja que acabaron en una propuesta aceptada **y** vista con percentil ≥ 50 en el ranking, sobre las sesiones con esa pareja. También la tasa de «No conozco».
- `pair-stats.json` alimenta `anchors.ts`: entre las 3 alternativas de cada hueco, se prefiere la de mayor acierto (**como mucho ×1,5**; nunca elimina una pareja por sí solo).
- **Comprueba:** un informe en el registro con las 10 mejores y las 10 peores parejas por estantería, para que Igor quite las malas del guion a mano.

---

## Lo que tiene que hacer Igor
- **T22:** revisar `anchors/REVISION.md` (unas 260 obras, de un vistazo).
- **T23:** el OK para aplicar la migración en producción.
- **T24:** decidir si quiere programar `npm run engine:trending` cada semana.
- Lanzar los agentes en este orden: **T22 (Sonnet) y T23 ya; T24 al acabar T21; T25 al acabar T22.**
