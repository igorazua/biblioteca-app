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
| **T22 · Anclas y guion de los 3 primeros duelos** | **Sonnet** (es la más delicada y define la primera impresión) | `app/src/data/anchors/*.json` (nuevo), `app/src/lib/engine/anchors.ts` (nuevo), `app/src/lib/engine/userSeeds.ts` (nuevo, solo el esqueleto), `app/src/lib/engine/decide.ts`, `decide.test.ts`, `anchors.test.ts` | nada · **en curso (Sonnet)** |
| **T23 · Aprendizaje colectivo de «No conozco»** | — | — | ⏸ **aplazada** (hacen falta muchos usuarios) |
| **T24 · Lo que se ve ahora en España, solo para sugerir** | — | — | ⏸ **no se hace ahora** (no toca los duelos) |
| **T25 · Lo que ya trae el usuario** | Gemini | ver la tabla de archivos en la sección T25 | **A y C ya**; **B espera a T22** |
| **T26 · Aprender qué parejas funcionan** | Gemini, **más adelante** | `app/scripts/engine/pair-stats.mjs` (nuevo), `app/src/data/engine/pair-stats.json` (nuevo), `app/src/lib/engine/pairStats.ts` (nuevo) | T22 y que haya ≥ 500 sesiones de Decidir reales |

**Ahora: T22 (Sonnet, en curso), T21 (Gemini, en curso) y T25-A + T25-C (Gemini). T25-B cuando Claude dé por buena T22. T23, T24 y T26, más adelante.**

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

## T23 — Aprendizaje colectivo de «No conozco» · ⏸ APLAZADA (Igor, 24/10/2026)
**No se hace ahora.** El botón «No conozco ninguna» ya aprende **para cada usuario** (`skipDuelUnknown` en `decide.ts`): a quien pasa de una obra le sale menos. T23 compartiría ese aprendizaje entre usuarios, pero no se nota hasta que haya **decenas de usuarios por país y edad**, y la primera impresión ya la cubren las anclas de T22.
**Cuándo retomarla:** con más de 300 usuarios activos en España. El diseño de entonces se queda como referencia:
- tabla de eventos con RLS y vista agregada sin `user_id`;
- `tasa = (unknown + 0.5·slow + 1)/(shown + 10)`;
- `factor = clamp(0.3, 1, 1 − 1.5·max(0, tasa − 0.05))`, aplicado a R.

---

## T24 — Lo que se ve ahora en España, **solo para sugerir** · ⏸ NO SE HACE AHORA
**Cambio de Igor (24/10/2026):** para comparar se quieren **clásicos muy conocidos, no lo que está de moda**. Por eso esta tarea **no toca la reconocibilidad (R), ni `notoriety`, ni los duelos de Decidir o de Comparar**.
Cuando se haga, sirve solo para sugerir:
- **Propuesta de Decidir:** un empujón pequeño (como mucho ×1,15 en la puntuación final) a lo que está en el top 10 de España **y** encaja con los gustos que han salido en los duelos. Nunca cambia qué obras salen en los duelos.
- **Descubrir:** la etiqueta «Lo están viendo en España» en la carta y un hueco pequeño en el mazo (como mucho 1 de cada 10 cartas).
- **Fuentes** (raspado con caché, ≤ 1 petición/s, sin iniciar sesión y respetando las condiciones de cada web):
  - el top 10 semanal de Netflix España;
  - FlixPatrol España para Prime Video, Max y Disney+;
  - los más vendidos de Casa del Libro y de El Corte Inglés;
  - Spotify Charts España (o Kworb);
  - los juegos de mesa más vendidos de Amazon.es.
- **Dato:** `trend.ES` en `scripts/cache/attrs/trend.jsonl`, calculado como `(11 − posición)/10 · 0.85^semanas`.

---

## T25 — Lo que ya trae el usuario · ✅ SE HACE AHORA (Gemini)
Se divide en tres partes. **Gemini hace ahora T25-A y T25-C. T25-B espera a que Claude dé por buena T22** (toca `decide.ts` y `userSeeds.ts`, que son de T22).

### Archivos de T25-A y T25-C (solo estos)
| Archivo | Qué cambia |
|---|---|
| `app/src/store/useFriends.ts` | `acceptInvite` devuelve también `creatorId` (la RPC `biblio_accept_invite` ya devuelve `creator_id`; en el camino antiguo, `invite.creator_id`) |
| `app/src/store/useStore.ts` | nuevo campo persistido `invitedBy: { friendId: string; at: number } \| null`, con su acción `setInvitedBy` y su paso en `migrateStore` (sube la versión en 1) |
| `app/src/screens/JoinInvite.tsx` | al aceptar con éxito: `setInvitedBy({ friendId: res.creatorId, at: Date.now() })` |
| `app/src/lib/engine/deck.ts` | la regla de A2 |
| `app/src/lib/engine/deck.test.ts` | los tests de A4 |
| `app/src/screens/Discover.tsx` | pasa `invitedBy` a `nextCards` (solo ese campo en el `input`) |
| `app/src/screens/Onboarding.tsx` | el paso de T25-C |
| `app/scripts/check-t25.mjs` | el script de comprobación |
| `docs/registro/T25.md` | el registro |

**No toques** `decide.ts`, `userSeeds.ts`, `anchors.ts` ni `data/anchors/` (son de T22, que está en curso), ni `SwipeDeck.tsx`, ni el diseño de las cartas.

### T25-A · Descubrir empieza por las obras de quien te invitó
**Por qué:** en cada carta de Descubrir ya salen las caras de tus amigos con su nota (`getFriendHits`). Si el primer mazo está lleno de obras que tu amigo ha valorado, la app «está viva» desde el primer minuto. Es el gancho social.

**A1 · Quién es «el amigo de referencia»** (en este orden):
1. `invitedBy.friendId`, si está entre los `friends` reales;
2. si no, el amigo real con **más obras vistas en esa estantería**, si tiene al menos 5;
3. si no, ninguno: el mazo funciona como hoy. Los amigos de demostración (`seedFriends` de `data/catalog`) **nunca** cuentan como amigo de referencia. `Discover.tsx` le pasa a `nextCards` si los `friends` son reales (por ejemplo, `friendsAreReal: realFriends.length > 0`).

**A2 · La regla en `nextCards`** (campos nuevos opcionales en `DeckInput`: `invitedBy?: string | null` y `friendsAreReal?: boolean`):
- **Solo se aplica** si el usuario tiene **menos de 20 obras marcadas** (vistas, pendientes o descartadas) en esa estantería. Pasado eso, el mazo de siempre.
- **Candidatas:**
  - obras que el amigo ha marcado como **vistas** en esa estantería;
  - que el usuario no tiene marcadas y no están ocultas (`hidden`);
  - de nivel de fama (`fameTier.ES`, o el número si no es un objeto) **1, 2 o 3**: nada de nicho en la primera impresión.
- **Orden de las candidatas:** por el percentil del amigo (`friendPct`), de mayor a menor. A igualdad, la de mejor nivel de fama.
- **Mezcla:**
  - en las **12 primeras cartas** que devuelve `nextCards`, van candidatas del amigo en las posiciones 1, 2, 4, 6, 8 y 10 (contando desde 1), como mucho 6;
  - el resto, como hoy;
  - si hay menos de 6 candidatas, se ponen las que haya y los demás huecos se quedan con el mazo normal.
- **Esas cartas** llevan `bucket: 'social'` y `reason: { friendId }`. Las caras ya salen solas; no cambies el diseño de la carta.
- **Sin repeticiones:** `already` se respeta, así que una obra ya enseñada no vuelve en el siguiente lote.

**A3 · Lo que no cambia:** las proporciones de cubos de `params.ts`, `calcAdapt` y el resto de `nextCards` para usuarios sin amigo de referencia o con 20 obras o más.

**A4 · Tests en `deck.test.ts`** (todos deben pasar):
1. Usuario nuevo, invitado por un amigo con 30 pelis vistas de nivel 1 a 3: las cartas 1, 2, 4, 6, 8 y 10 son del amigo, en orden de su percentil.
2. El mismo usuario con 20 pelis marcadas: el mazo es **idéntico** al de una llamada sin `invitedBy`.
3. Una obra de nivel 4 que el amigo tiene arriba **no** sale entre esas cartas.
4. Una obra que el usuario ya tiene marcada **no** sale.
5. Sin `invitedBy` y sin amigos reales con 5 o más obras (o con `friendsAreReal: false`): el mazo es idéntico al de antes.
6. Sin `invitedBy`, con un amigo real de 12 obras vistas y otro de 6: el amigo de referencia es el de 12.
7. `migrateStore`: un estado guardado de la versión anterior carga con `invitedBy: null`.

### T25-C · Conectar en la bienvenida
- En `Onboarding.tsx`, un paso nuevo **justo después de «Amigos» (paso 3)** y antes de «Registro»: «¿Ya usas alguna de estas?».
- **Seis servicios,** sacados de `lib/connect/services.ts`, nunca escritos a mano: Netflix, Spotify, Prime Video, Letterboxd, Goodreads y YouTube Music. Si alguno no existe con ese nombre en `services.ts`, usa el más parecido y apúntalo en el registro.
- **Al tocar un servicio:** se marca (como un chip seleccionado) y se sigue en la bienvenida. **No abre Conectar en mitad de la bienvenida.** Al terminar la bienvenida, si eligió alguno, va a `/conectar` con el primero abierto, si `Connect.tsx` admite abrir uno por la URL o el estado (míralo). Si no lo admite, va a `/conectar` sin más y lo apuntas en el registro.
- **Botón de texto «Ahora no»,** que salta el paso. El paso **nunca bloquea** la bienvenida.
- **Ajusta el contador de pasos** («Paso N de 7»), los puntitos de progreso y la flecha de volver.
- **Sistema de diseño** (`docs/SISTEMA_DISENO.md`):
  - cabecera §5.1;
  - filas `Group` y `Row` con el logo de `BrandLogo` si existe;
  - el único botón ámbar es «Continuar»;
  - sin emojis ni efectos.
- **Test** (o comprobación con Testing Library, si ya se usa en el proyecto): se puede llegar al final de la bienvenida pulsando «Ahora no», sin elegir nada. Si en el proyecto no hay tests de pantallas, sácalo a una función pura (el siguiente paso según el paso actual y lo elegido) y pruébala.

### T25-B · Adaptaciones entre estanterías en Decidir · ⏳ ESPERA A T22
**No la empieces** hasta que Claude confirme que T22 está bien: toca `userSeeds.ts` y `decide.ts`, que ahora son de T22.
- `userSeedAnchors(ctx)` en `userSeeds.ts` añade como anclas las **adaptaciones** de obras que el usuario tiene vistas en otra estantería:
  - salen de las aristas `adapt` de `cross.json` (si faltan, de Wikidata P144, guardadas en caché);
  - por ejemplo, si leyó *Harry Potter*, la peli de *Harry Potter* entra como ancla en pelis;
  - solo si la adaptación es de nivel 1 o 2 y tiene un extremo claro en la dimensión del duelo.
- **Límite:** como mucho 1 de las 2 obras de cada duelo sale de aquí.
- **Tests:**
  - con el libro de *Harry Potter* visto, la peli sale entre las candidatas de pelis;
  - con una adaptación de nivel 4, no sale.

### Comprobaciones para dar T25-A y T25-C por hechas (pega la salida real en `docs/registro/T25.md`)
- `npx tsc -p app/tsconfig.json --noEmit` limpio.
- `npx vitest run` en verde, incluidos los 7 tests de A4 y el de T25-C.
- **Prueba de las 12 primeras cartas:** escribe `app/scripts/check-t25.mjs`. Monta un usuario nuevo invitado por uno de los amigos de demostración, tratado como real **solo en el script**, y saca los títulos de esas 12 cartas en pelis y en libros, marcando cuáles son del amigo. Pega esa lista en el registro.
- Un commit por parte (`T25-A: …` y `T25-C: …`), con `git add` archivo a archivo, nunca `git add -A`. **Sin `git push`.** Sin revisión visual: la hace Igor en el móvil.
- Si algo del encargo no encaja con el código (un nombre que no existe o un tipo distinto), **para y apúntalo en el registro**. No lo arregles en archivos que no son tuyos.

---

## T26 — Aprender qué parejas funcionan (más adelante)
**Solo cuando haya al menos 500 sesiones de Decidir reales** (`biblio_events`, `dec_duel` y `dec_accept`).
- `pair-stats.mjs` (fuera de la app, sin coste): por cada pareja del guion y por cada dimensión, se calcula la **tasa de acierto** = sesiones con esa pareja que acabaron en una propuesta aceptada **y** vista con percentil ≥ 50 en el ranking, sobre las sesiones con esa pareja. También la tasa de «No conozco».
- `pair-stats.json` alimenta `anchors.ts`: entre las 3 alternativas de cada hueco, se prefiere la de mayor acierto (**como mucho ×1,5**; nunca elimina una pareja por sí solo).
- **Comprueba:** un informe en el registro con las 10 mejores y las 10 peores parejas por estantería, para que Igor quite las malas del guion a mano.

---

## Lo que tiene que hacer Igor
- **T22:** revisar `anchors/REVISION.md` (unas 260 obras, de un vistazo).
- **T25:** lanzar un agente de Gemini con **T25-A y T25-C** (no T25-B).
- T23, T24 y T26 se retoman más adelante.
