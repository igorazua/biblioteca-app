# Revisión de los motores — fase 1 (solo informe)

> 15/11/2026. Encargo: `docs/ENCARGO_FABLE_MOTORES.md`. No se ha tocado código.
> Revisado en el worktree `native/fase-1` (commit `7eb1e08`). `packages/core/src/lib` es idéntico al de `main` (`git diff main` sin diferencias), así que todo vale para los dos.
> Las rutas son relativas a `packages/core/src/`.

## Resumen

- **31 hallazgos**: 5 de gravedad alta, 12 media y 14 baja.
- Los tres que más pesan:
  1. **El aprendizaje del mazo nunca llega a la reconocibilidad** (A1): `recog` busca la década en un sitio donde no está.
  2. **Dos caminos calientes son lentos** (A2, A3): la reconocibilidad recalcula el año de nacimiento por cada obra, y cada duelo de Decidir ya tarda más de lo que su propio test permite.
  3. **Los datos de fama están mal en obras muy conocidas** (A4): Star Wars sale con notoriedad 0,01 y Brazil (1985) con notoriedad 1 porque se emparejó con el país.
- **Mucho código sin uso**: unas 600 líneas de `ranking.ts` (todo Bradley-Terry), `recommend.ts` y `lib/deck.ts` enteros, y 11 parámetros de `params.ts`.

## Tests de partida

`cd packages/core && npx vitest run`, una sola ejecución completa:

```
Test Files  1 failed | 27 passed | 1 skipped (29)
     Tests  1 failed | 294 passed | 17 expected fail | 6 skipped (318)
  Duration  314.94s
FAIL src/lib/engine/decide2.test.ts > Decidir v2 > cada duelo se calcula rápido (< 400 ms en node, con el catálogo entero)
AssertionError: expected 483.17 to be less than 400
```

El encargo esperaba 295 pasados. El que falla es el test de velocidad de Decidir (hallazgo A3). La ejecución tardó 315 s con la máquina ocupada, así que parte del exceso puede ser carga; aun así el margen es mínimo.

## Lo que no he podido hacer

- **Recuentos de datos.** Escribí un script de solo lectura para contar por estantería (niveles de fama, obras con `popPct` 0, votos, ids de Wikidata sospechosos, cobertura de vectores), pero el permiso para ejecutarlo fue denegado dos veces y no he insistido. Los hallazgos de datos (A4, M9, B13, B14) salen **solo de las 15 obras de ejemplo** de `muestra-datos.mjs`: sé que el problema existe, no cuántas obras afecta. El script está en `C:\Users\igora\AppData\Local\Temp\claude\cfab85b2a838a996\2f86c58a-f3bb-4a86-a883-77232a11d705\scratchpad\datos.mjs`.
- **Segunda ejecución completa de tests.** No hay cambios de código, así que no la he repetido.
- **Pantallas.** No he abierto `app/src/screens` ni `apps/native`. Solo he usado `grep` para ver quién llama a cada función y con qué argumentos. Donde un hallazgo depende de cómo llama la pantalla, lo digo.

---

## Gravedad alta

### A1. La «zona» de la reconocibilidad no se aplica nunca

| | |
|---|---|
| Gravedad | Alta |
| Dónde | `lib/engine/recog.ts:222-229`, `lib/engine/deck.ts:183`, `lib/engine/decide2.ts:297` |
| Qué falla | `recog` busca `deckLearn['1990s']`, pero lo que recibe es `DeckLearnShelf = { byMacro, byDecade }`: la década está en `deckLearn.byDecade['1990s']`. La búsqueda siempre da `undefined` y `zonaMult` se queda en 1. Además, Descubrir (web) no pasa `deckLearn` a `nextCards`. |
| Escenario | Usuario al que el mazo le ha enseñado 40 pelis de los 90 y solo marcó 2 como vistas. `recog` de otra peli de los 90 da el mismo valor con y sin `deckLearn`. Lo mismo en Decidir (`WhatToWatch.tsx:253` pasa `deckLearn[shelf]`). |
| Arreglo | Leer `deckLearn.byDecade?.[década] ?? deckLearn[década]` (acepta las dos formas) y pasar `deckLearn` desde Descubrir. Cambia el orden del mazo y los orientadores. |
| Test | `recog(item1995, { deckLearn: { byMacro: {}, byDecade: { '1990s': { shown: 40, seen: 2 } } } })` debe ser menor que sin `deckLearn`. Hoy son iguales. |

### A2. El año de nacimiento se infiere otra vez por cada obra, y con el método que el documento prohíbe

| | |
|---|---|
| Gravedad | Alta (rendimiento e incoherencia) |
| Dónde | `lib/engine/recog.ts:183-186` y `109-159`; lo llaman `deck.ts:237` y `decide2.ts:303` |
| Qué falla | Si no hay `birthYear` declarado, `recog` llama a `inferBirthYear` **dentro de cada obra**. Cada llamada construye un `Map` con todo el catálogo y recorre todas las entradas. En el mazo ocurre siempre que el usuario no ha declarado el año (lo normal, por «cero fricción»): unas 1.000 obras × un `Map` de 1.000. En Decidir ocurre cuando la inferencia da `null` (usuario nuevo con menos de 5 vistas): 1.000 obras × un `Map` de unas 4.500. Además nunca se le pasa `deckLearn`, así que usa siempre la mediana de los años de lo visto, justo lo que `MOTOR.md` §2b.3 dice que no se haga porque se retroalimenta. Y aunque se le pasara, las claves `byMacro`/`byDecade` no casan con su expresión regular. Mezcla estanterías: el año de un artista es el de formación y hay libros de −385. |
| Escenario | Usuario nuevo sin año de nacimiento abre Descubrir de pelis: cada tanda de 20 cartas hace ~1 millón de inserciones en `Map`. En Decidir, ~4,5 millones al arrancar. |
| Arreglo | Calcular el año **una vez** en `nextCards` e `initDecideSession` y pasarlo en `ctx.birthYear` (con `null` como «ya lo intenté»). `recog` deja de inferir. `inferBirthYear` lee `deckLearn.byDecade` y solo obras de la estantería. |
| Test | Contador de llamadas a `inferBirthYear` en una tanda de `nextCards` con 1.000 obras y sin `birthYear`: debe ser 1. Y otro: con `byDecade` de ≥ 3 décadas, el resultado sale de la tasa por década, no de los años vistos. |

### A3. Cada duelo de Decidir cuesta demasiado

| | |
|---|---|
| Gravedad | Alta (rendimiento) |
| Dónde | `lib/engine/decide2.ts:426-554` (`scorePairsRaw`), con `sigmaTimes` en `141-158` |
| Qué falla | Para cada una de las ~1.100 parejas de la lista corta (48 obras) se crea un `Map` con la diferencia de rasgos, se recorre **toda** la matriz de covarianza activa (`sigmaTimes`, k filas) y se puntúan ~46 candidatas con búsquedas en `Map`. Son del orden de 13 millones de operaciones por duelo. Encima, por duelo se recalcula `baseTitles` sobre todo el catálogo (línea 440) y `isOwn` hace `rankings[shelf].includes` por cada obra (línea 346). |
| Escenario | El test propio del motor («< 400 ms en node») dio 483 ms en la ejecución de partida. Un móvil es varias veces más lento que node en este PC. |
| Arreglo | Σ·d es lineal: calcular una vez `s_i = Σ·rasgos(i)` para las 48 obras y la tabla `candidata·s_i` (46 × 48); cada pareja pasa a ser restas sobre esa tabla. Sacar `baseTitles` y el conjunto de obras propias a `initDecideSession`. El resultado numérico no cambia. |
| Test | El existente, con margen real (por ejemplo < 150 ms), más uno de igualdad: las mismas parejas y `kg` que antes con una semilla fija. |

### A4. Datos: fama equivocada en obras muy conocidas

| | |
|---|---|
| Gravedad | Alta (datos) |
| Dónde | `app/src/data/shelves/*.json`, campos `notoriety`, `popPct`, `fameTier`, `wikidataId`; los consume `recog.ts:188-205` y `decide2.ts:351-357, 452-453` |
| Qué falla | En la muestra: **Star Wars: Una nueva esperanza** tiene `notoriety` 0,01, `popPct` 0 y `fameTier` 4 (no tiene `wikidataId`). **Pink Floyd**, **Mad Men** y **Brass: Birmingham**, `popPct` 0. Al revés, emparejamientos erróneos con Wikidata inflan la fama: **Brazil (1985)** → `Q155` (el país), **Planet Earth** → `Q2` (la Tierra), **Nippon** → `Q17` (Japón), todas con sinopsis del país o planeta y notoriedad 0,59-1 y nivel 1. **Brass: Birmingham** tiene la sinopsis «videojuego de 2021». |
| Escenario | Usuario nuevo en Decidir de pelis: los tres primeros duelos solo admiten obras de nivel 1. Star Wars no puede salir nunca (nivel 4, R ≈ 0,01) y Brazil sí. En el mazo, Star Wars queda al fondo de `seen_likely`. |
| Arreglo | En el build: rechazar un `wikidataId` cuya clase (P31) no sea la de la estantería; una obra sin fuente de notoriedad no recibe 0 sino el respaldo (`popularity` de la semilla). Recalcular `notoriety`, `popPct` y `fameTier`. |
| Test | Test de datos: ninguna obra con `popularity` ≥ 85 en la semilla tiene `notoriety` ≤ 0,05; ningún `wikidataId` con menos de 4 cifras; una lista corta de obras emblemáticas por estantería con `fameTier` ≤ 2. |

### A5. El ranking por Elo ya no respeta las franjas de estrellas, pero la colocación sigue contando con ellas

| | |
|---|---|
| Gravedad | Alta si las estrellas siguen en uso; a confirmar por Igor |
| Dónde | `lib/ranking.ts:986-995` (orden solo por Elo), `744-748` (`winnerAbove`), frente a `121-138` (`starBand`), `140-154` (`startPlacement`) y `lib/import/apply.ts` |
| Qué falla | `starBand` supone que las estrellas no crecen hacia abajo («franja contigua»). `applyDuelToRanking` ordena solo por Elo y `winnerAbove` pone a la ganadora justo encima de la perdedora. Tras un duelo cruzado, la franja de 4★ puede abarcar obras de 5★ y 2★, y la siguiente colocación o importación «dentro de su franja» elige un hueco que no es el suyo. |
| Escenario | Ranking [A 5★, B 5★, C 4★, D 2★]. D gana a A en un duelo: queda [D, A, B, C]. Se importa una obra con 2★: `starBand(…, 2)` devuelve [0, 1) y la obra entra en el puesto 1 o 2 de la lista. |
| Arreglo | Decidir qué manda. Si manda el duelo: `starBand` y la importación dejan de usar estrellas como franja y colocan por Elo inicial (`getInitialElo` ya lo hace por estrellas). Si mandan las estrellas: limitar el Elo a la franja. |
| Test | El escenario de arriba: tras el duelo y la importación, la obra de 2★ no queda por encima de las de 5★. |

---

## Gravedad media

### M1. Un duelo cuyo ganador no es ninguna de las dos obras cuenta como victoria de la segunda

| | |
|---|---|
| Gravedad | Media |
| Dónde | `lib/ranking.ts:878` y `942` |
| Qué falla | `winner === a ? 'a' : 'b'`: cualquier otro valor (id de una gemela fusionada, dato corrupto, `undefined`) da la victoria a B sin avisar. Las claves de `duels` tampoco se canonizan (`canonicalId` no aparece en `ranking.ts`). |
| Escenario | Duelo guardado antes de fusionar gemelas: clave `viejo|x`, `w: 'viejo'`. Tras la migración de entradas, al reproducir el historial gana siempre la segunda del par y `viejo` entra al ranking como obra nueva. |
| Arreglo | Ignorar el duelo si `w` no es `a` ni `b`; canonizar claves y ganador de `duels` en la migración del store (la v3 solo migra entradas, rankings y listas). |
| Test | `applyDuelToRanking` con `winner: 'otra'` no cambia ni notas ni orden. |

### M2. Las cinco primeras cartas se fuerzan en cada tanda, no en cada sesión

| | |
|---|---|
| Gravedad | Media (depende de cómo pida las tandas la pantalla; no la he abierto) |
| Dónde | `lib/engine/deck.ts:318-335` |
| Qué falla | §7.5 dice «las 5 primeras de cada sesión». El código las fuerza en cada llamada, aunque `already` ya traiga cartas. Con tandas de 20, el cupo `seen_likely` pasa de 0,42 a 0,25 + 0,75·0,42 ≈ 0,57 con más de 150 vistas, y `social` baja de 0,45 a 0,34. Además esas cartas se etiquetan `seen_likely` aunque salgan de `social` (línea 328), lo que falsea las métricas por cupo. |
| Escenario | Usuario con 200 vistas y amigos: en 100 cartas ve ~57 de «la vi» en vez de ~42. |
| Arreglo | Forzar las cinco solo si `already.length === 0`; guardar el cupo real. Cambia el mazo. |
| Test | `nextCards(input, veinteIds, 20)`: las cinco primeras no son todas `seen_likely`, y la proporción en 100 cartas queda a ±0,05 de `BUCKET_BASE`. |

### M3. Las descartadas que vuelven no siguen las reglas de §7.7

| | |
|---|---|
| Gravedad | Media |
| Dónde | `lib/engine/deck.ts:84-111` y `135-144` |
| Qué falla | El documento dice que vuelven solo por `social`, `friend_gem` o `explore`, como mucho 1 de cada 30, y que si se vuelve a descartar el plazo se duplica. El código las trata como cualquier otra: pueden entrar por `seen_likely`, no hay tope y no hay duplicación. |
| Escenario | Usuario que descartó 300 obras famosas hace 13 meses: vuelven todas a la vez y, por ser famosas, copan `seen_likely`. |
| Arreglo | Excluirlas de `seen_likely`, limitar a 1 por cada 30 y guardar un contador de descartes para duplicar el plazo. |
| Test | Con 100 descartadas hace 400 días, en 60 cartas salen como mucho 2 y ninguna con cupo `seen_likely`. |

### M4. El cupo «explorar» depende de un umbral absoluto que deja fuera estanterías enteras

| | |
|---|---|
| Gravedad | Media |
| Dónde | `lib/engine/deck.ts:254-257` y `271` |
| Qué falla | Calidad mínima = `voteAvg >= 6.5` (umbral absoluto, contra el principio 3) o `social > 0.3` o `pop >= 0.4`. La tercera condición no sirve: para entrar en `explore` hace falta `pop < 0.4`. Los artistas no tienen `voteAvg` (0 %) y el 36 % de los juegos tampoco: sin amigos, ese cupo queda vacío y su 6 % se reparte. `novelty` es `1 − 0,4·pop`, no «lo lejos que está de lo tuyo» (§7.3). |
| Escenario | Usuario sin amigos en Artistas: ninguna carta es de `explore`, nunca. |
| Arreglo | Calidad por percentil dentro de la estantería (de `voteAvg` si hay, si no de `notoriety` o `popPct`), y `novelty` con la distancia al vector de usuario. |
| Test | En Artistas sin amigos, 100 cartas contienen entre 3 y 10 de `explore`. |

### M5. Mazo y reconocibilidad recorren las entradas de cada amigo por cada obra

| | |
|---|---|
| Gravedad | Media (rendimiento) |
| Dónde | `lib/engine/deck.ts:204-205` y `184-188`; `lib/engine/recog.ts:236-239` |
| Qué falla | `f.entries.find(…)` por obra y amigo en el mazo, y otra vez `f.entries.some(…)` dentro de `recog`. Además se copia el array de entradas de cada amigo en cada tanda. |
| Escenario | 1.000 obras × 10 amigos × 300 entradas × 2 ≈ 6 millones de comparaciones por tanda. |
| Arreglo | Un índice `Map<itemId, {amigo, entrada}[]>` por tanda, compartido con `recog`. |
| Test | Tiempo de `nextCards` con 10 amigos de 300 entradas por debajo de un límite, y mismo resultado que antes. |

### M6. La afinidad de los amigos no llega a la reconocibilidad

| | |
|---|---|
| Gravedad | Media |
| Dónde | `lib/engine/recog.ts:241-242`; `lib/engine/deck.ts:184-188`; `lib/engine/decide2.ts:293-301` |
| Qué falla | `recog` lee `ctx.affinity(f.id)` (una función). El mazo pone la afinidad como campo de cada amigo y Decidir no la pasa. Resultado: todos los amigos pesan igual (`wf = 1`). |
| Escenario | Un amigo con afinidad 95 y otro con 10 tienen la misma obra: suman lo mismo a R. |
| Arreglo | Pasar `affinity` en el contexto desde los dos sitios (o leer también `f.affinity`). |
| Test | `recog` con un amigo de afinidad 95 debe ser mayor que con uno de afinidad 10. |

### M7. Si la bolsa de Decidir queda corta, se ignoran filtros que el documento llama duros

| | |
|---|---|
| Gravedad | Media |
| Dónde | `lib/engine/decide.ts:294-296` |
| Qué falla | Con menos de 3 candidatas se coge toda la estantería. §8.10: en juegos, jugadores y tiempo son filtros duros «sin fallback que los ignore». Además, los juegos sin `players` (7 %) pasan cualquier filtro de jugadores (línea 189). |
| Escenario | Juegos, «fiesta» + cooperativo + corta: quedan 2 candidatas y la propuesta puede ser un juego para dos. |
| Arreglo | En juegos, el último nivel relaja ánimo y tiempo pero nunca jugadores; mejor proponer con 1-2 candidatas. |
| Test | Con esas respuestas, ninguna obra de la bolsa tiene un máximo de jugadores menor que 5. |

### M8. La calidad compara recuentos de votos de fuentes distintas con un umbral fijo

| | |
|---|---|
| Gravedad | Media (código y datos) |
| Dónde | `lib/engine/decide.ts:321-323`, `PARAMS.Q_PRIOR_VOTES = 200` |
| Qué falla | `votes = voteCount || readers` contra un `m = 200` absoluto. En la muestra, *La ventana indiscreta* tiene 18 votos y *Brazil* 46.440: son fuentes distintas, no popularidad distinta. Con 18 votos, un 9,2 se queda en ≈ 0,67; con 46.440, un 7,9 se queda en 0,79. Va contra el principio 3. |
| Escenario | Dos pelis igual de buenas: gana la que trajo los votos de la fuente grande. |
| Arreglo | Votos a percentil dentro de la estantería (o `m` = mediana de la estantería) y marcar la fuente del recuento. |
| Test | Dos obras con la misma nota y percentil de votos parecido deben tener calidades a menos de 0,03. |

### M9. Datos: `voteAvg` parece copiado de `popularity`

| | |
|---|---|
| Gravedad | Media (datos; sin recuento, ver «Lo que no he podido hacer») |
| Dónde | `app/src/data/shelves/*.json` |
| Qué falla | En 5 de las 9 obras con nota de la muestra, `voteAvg` = `popularity` / 10 exacto: Brazil 79 → 7,9; Planet Earth 95 → 9,5; Mock the Week 95 → 9,5; Nippon 70 → 7,0; Rats of Wistar 67 → 6,7. Si es así, la «calidad» de Decidir y el filtro de `explore` usan un dato de relleno. |
| Escenario | *Mock the Week* aparece con un 9,5: gana en calidad a casi todo el catálogo. |
| Arreglo | En el build, no escribir `voteAvg` si no viene de una fuente; guardar su procedencia. |
| Test | Menos del 10 % de las obras con `voteAvg` cumplen `voteAvg === popularity / 10`. |

### M10. El ánimo se casa por texto exacto del género, y los géneros están en dos idiomas

| | |
|---|---|
| Gravedad | Media |
| Dónde | `lib/engine/decide.ts:342`, con `data/questions.ts:115-123` |
| Qué falla | `moodGenres.includes(g)` exige el texto exacto («Comedia», «Rock»). En los datos hay géneros en inglés y en minúsculas («Nature», «ska punk», «Industry / Manufacturing»). `traits.ts:40-55` ya tiene el traductor, pero la puntuación previa no lo usa. |
| Escenario | Serie con género «Comedy»: con ánimo «risas» puntúa 0 en ánimo, como un drama. |
| Arreglo | Normalizar con `translate`/`norm` de `traits.ts` en los dos lados de la comparación. |
| Test | Una obra con género «Comedy» y otra con «Comedia» reciben la misma puntuación de ánimo. |

### M11. La caché de puestos de un amigo no se vacía nunca

| | |
|---|---|
| Gravedad | Media (se nota con amigos reales) |
| Dónde | `lib/rank.ts:19-33` |
| Qué falla | `friendCache` guarda por `friend.id` para siempre. Si el amigo añade o revalora obras (sincronización), sus puestos, la afinidad y lo social del mazo siguen con los datos del arranque. |
| Escenario | Un amigo marca una peli como vista con buena nota mientras tienes la app abierta: no cuenta hasta recargar. |
| Arreglo | Clave de caché por referencia de `friend.entries` (`WeakMap`) o exportar una función para vaciarla al sincronizar. |
| Test | `friendRanks` con el mismo `id` y entradas nuevas devuelve los puestos nuevos. |

### M12. El aviso de importar sale casi siempre y tapa los demás

| | |
|---|---|
| Gravedad | Media |
| Dónde | `lib/nudges.ts:79-84` |
| Qué falla | Es elegible si pelis **o** series **o** libros tienen menos de 30, así que casi cualquier usuario lo cumple. Como va segundo en prioridad, bloquea los cinco siguientes hasta descartarlo tres veces (mínimo 6 días). Las entradas sin `shelf` cuentan como pelis y las descartadas cuentan como obras. |
| Escenario | Usuario con 500 pelis y 0 libros que nunca importó: solo ve «¿Tienes tus pelis en Letterboxd?». |
| Arreglo | Elegible solo si las tres estanterías están por debajo de 30 (o la de pelis), contando vistas y pendientes. Es decisión de producto. |
| Test | Con 500 pelis vistas y sin importar, `evaluateNudges` no devuelve `import`. |

---

## Gravedad baja

| # | Dónde | Qué falla | Escenario | Arreglo | Test |
|---|---|---|---|---|---|
| B1 | `lib/engine/traits.ts:88` | La etiqueta de década corta a dos cifras sin mirar el siglo | *Menón* (−385) → «de los 90»; *Frankenstein* (1818) → «de los 10». Se lee en el motivo: «Porque elegiste de los 90» | Etiqueta solo entre 1920 y hoy; fuera, «del siglo XIX» o sin etiqueta | `traitLabel` de `d:1810` y `d:-390` no devuelve «de los …» |
| B2 | `lib/engine/decide2.ts:494-495` con `220-231` | Si `ranked` queda vacío (se excluye la familia de la rechazada) y aún «quedan» candidatas, `Math.max()` da −∞, `kg` es `NaN` y la propuesta final es `null` | Bolsa de 3 «Catan…»: se rechaza una y las otras dos son de su familia | `shouldPropose` usa `ranked().length`, no `pool − rejected`; guarda para `dec` vacío | Con esa bolsa, `shouldPropose` es `true` y `nextDuel` no devuelve `infoGain` `NaN` |
| B3 | `lib/engine/decide.ts:359` | `trend` se lee como mapa por país, pero el dato es un número (y en la muestra siempre 0): `TREND_BOOST` no se aplica nunca | Cualquier obra con `trend: 0.8` | Leer número o mapa, como hace `recog` con `notoriety` | Obra con `trend: 1` recibe más previa que con 0 |
| B4 | `lib/engine/decide2.ts:395-402` y `613-616` | `bestKG` rellena la memoria de parejas con un azar fijo (0,5); si se llama antes que `nextDuel`, este pierde la variación de orientadores | `shouldPropose` y luego `nextDuel` en el mismo estado | No memorizar cuando el azar es el fijo, o separar memoria de `kg` y de elección | Con la misma semilla, `nextDuel` da lo mismo se llame o no antes a `shouldPropose` |
| B5 | `lib/engine/decide2.ts:578-579` | Una obra dudosa de sesiones anteriores se penaliza dos veces (en `recog` y otra vez al pasar), aunque los 90 días hayan vencido | Obra dudosa hace 100 días que sale en un «Pasar» | Aplicar la mitad solo a las que se vuelven dudosas en esta llamada | R de esa obra no baja de la mitad de su valor inicial |
| B6 | `lib/engine/decide2.ts:198` y `515-516` | El tope `max(1e-12, Φ)` anula la corrección justo cuando la sorpresa es máxima (t < −7) | Elegir contra muchos rasgos «pedidos» a la vez | Usar la aproximación asintótica (−t) para t muy negativo | `observe` con t = −9 mueve μ más que con t = −5 |
| B7 | `lib/engine/recog.ts:195-205` | Si `notoriety` es un mapa sin el país, la base se queda en 0,5 y no cae a `popPct` | Perfil con país `MX` y datos recortados a `ES` en forma de mapa | Encadenar los respaldos sin `else if` | `recog` con `notoriety: {}` usa `popPct` |
| B8 | `lib/engine/recog.ts:255`, `decide2.ts:576` | `Date.now()` dentro del motor: no reproducible ni comprobable | Tests de caducidad de dudosas | Recibir `now` por parámetro | Test con `now` fijo |
| B9 | `lib/ranking.ts:1196-1205` y `1223-1232` | En el sorteo ponderado, si el resto no llega a ≤ 0 por redondeo se elige el índice 0 en vez del último; y `includes`/`indexOf` dentro del bucle dan coste cuadrático | Estantería de 1.000 vistas: ~1 millón de operaciones por duelo | Caer al último índice; `Set` e índice de posiciones | `planNextDuel` con `rng = () => 0.999999` no devuelve siempre la primera obra |
| B10 | `lib/ranking.ts:858-859` | El factor K cuenta rivales distintos, no duelos: repetir pareja no lo baja | Obra con 10 duelos contra 2 rivales sigue con K = 48 | Guardar el número de duelos por obra | K de esa obra = 20 |
| B11 | `lib/ranking.ts:744-748` | Un solo duelo sube a la última por encima de la primera. Es decisión de Igor (27/10), la apunto por si se quiere un tope | La nº 50 gana a la nº 1 por un toque equivocado | Opcional: subir como mucho medio camino si la diferencia es grande | — |
| B12 | `lib/engine/cleanup.ts:38-44` | El código pone primero las que un amigo vio hace poco; §9 dice primero las más antiguas y «luego» las de amigos | 20 pendientes, 3 con amigo reciente | Aclarar en el documento cuál manda | Test de orden según lo que se decida |
| B13 | Datos, series | En varias series `creator` es la cadena («BBC One», «AMC»). `sameFamily` (`decide.ts:50-56`) impide enfrentar dos de la misma cadena y el motivo puede decir «de BBC One» | *Planet Earth* y otra de BBC One nunca salen juntas | Guardar la cadena en `network` y dejar `creator` para el creador | Ningún `creator` de series coincide con su `network` |
| B14 | Datos, varios | `engine/book.json` tiene 988 ids y el catálogo 976; palabras clave con código («Q36396»); *El elogio de la locura* con país `US` e idioma `en`; título local « Mad Men» con espacio inicial; Ska-P con `popPct` 100 y `notoriety` 0,09 | — | Limpieza en el build | Tests de datos por cada caso |

---

## Incoherencias con `MOTOR.md` que no son fallos por sí solas

| Dónde | El documento dice | El código hace |
|---|---|---|
| `deck.ts:41`, §7.1 y §7.4 | `seed` da un jitter estable por sesión | `seed` no se usa; el mazo es determinista |
| `deck.ts:289-307`, §7.4 | La proporción de cada cupo se ajusta por respuesta (`BUCKET_ADAPT_CLAMP`) | No existe el ajuste |
| `deck.ts:405-435`, §10 | Diversidad en `PARAMS.DIVERSITY` | Números fijos 6, 3 y 2; no mira la tanda anterior |
| `deck.ts:50-52`, §7.6 | Aprendizaje por `macro` | `macro` = primer género, no el clúster del motor |
| `deck.ts:228` + `recog` | — | Cuando A1 se arregle, la tasa de «la vi» contará dos veces en `seen_likely` (zona y `adapt`) |
| `recog.ts:243`, §2b.4 | `social = 1 − Π(1 − 0,35·wf)` | Usa `0,35·wf/1,5` |
| `deck.ts`, `decide.ts`, principio 5 | Todo número en `params.ts` | Decenas de pesos fijos (0,95/0,05; 0,7/0,15/0,1; 60; 80; 0,35/0,25/0,40…) |
| `userVec.ts:59-71`, §2c.4 | — | La última de tu ranking suma +1,0, más que una pendiente (+0,5). Coincide con el documento; lo apunto por si no es lo que se quiere |
| `userVec.ts:27-28` | Pesos de duelos y de propuestas rechazadas | El store no los pasa nunca (`useStore.ts:154`) |

## Código muerto o duplicado

Comprobado con `grep` en `app/src`, `apps/native/src` y `packages/core/src` (sin tests).

- **`lib/ranking.ts`** — sin ningún uso fuera del archivo: `fitRatings`, `buildPriors`, `updateRankingFromRatings`, `anchorPriors`, `mixedPlacement`, `settlePlacements`, `nextRefinePair`, `answerRefine`, `scoresForShelf`, `kendallTau`, y las constantes `MIN_UTILITY`, `REPEAT_NOVELTY`, `NEIGHBORS_COUNT`, `RANDOM_CANDIDATES_COUNT`, `POLISH_MAX_DIST`, `OPEN_PLACEMENTS`, `PLACE_SHARE_*`, `ANCHOR_PRIOR_*`, `PRIOR_WEIGHT_*`. Son unas 600 líneas. **El motor vivo es solo Elo**: `planNextDuel` + `applyDuelToRanking`. `fitRatings` no se ejecuta en ningún gesto, aunque el encargo lo cite como camino caliente.
- **`planNextDuel`** ignora seis de sus entradas (`shelf`, `cmp`, `sessionIndex`, `activePlacement`, `refineState`, `anchor`) y solo devuelve `kind: 'rank'`. `applyDuelToRanking` ignora `entries`, y su modo de repetición (líneas 892-965) no se alcanza desde las pantallas, que siempre pasan `lastDuel` y `ratings`.
- **`lib/recommend.ts`** entero (`scoreCandidates`, `nextShaperPair`, `applyShaper`…): sin usos. Incluye una lista de series en emisión por título, contra el principio 4.
- **`lib/deck.ts`** entero (`buildDeck`, `deckScore`, `stableNoise`): sin usos. §7.9 ya decía que se eliminaría.
- **`lib/engine/features.ts`**: `crossOf`, `neighbors`, `axesOf` y `microOf` sin usos fuera del archivo.
- **`lib/engine/decide.ts`**: de la v1 solo se usan `initDecideSession`, `passesFilters`, `sourceAllows`, `sameFamily`, `familyKey` y `PASSES_FOR_DOUBTFUL`. El resto (líneas 424-1350) queda para el banco de pruebas.
- **`params.ts`** — sin ningún uso: `SIM_W`, `BUCKET_ADAPT_CLAMP`, `DIVERSITY`, `DECIDE_MODE`, `ETA`, `CLEANUP_MIN`, `NOTORIETY_W`, `ORIENTER_R_PCT`, `ORIENTER_MIN`, `ORIENTER_K`, `ORIENTER_ROTATION` y la función `variant`. De `R_W` solo se lee `socialFriendRate`. `TAU` y `BETA` solo los usa la v1.
- **Duplicado**: `passes` (`recommend.ts:74`) y `passesFilters` (`decide.ts:152`); `isOwnEntry` (`decide2.ts:345`) repite la condición de `recog.ts:171-176`; el recuento de duelos por obra está escrito tres veces en `ranking.ts` (536, 835 y 1170).

## Revisado sin hallazgos

- `ranking.ts`: búsqueda binaria de colocación (`startPlacement`, `answerPlacement`, `settle`, `insertAt`) con ranking vacío y de una obra; `calculateEloUpdate` (signos, regla de la obra nueva, dos obras nuevas a la vez); `seedMissingRatings` (interpolación y extremos); `assignSides`; `pairKey`; empates del orden final (deterministas).
- `fitRatings`: sin divisiones por cero con los pesos por defecto; no se usa.
- `deck.ts`: estantería vacía y sin elegibles devuelven `[]`; cupos vacíos se reparten bien; orden estable y sin azar; obras ocultas nunca salen.
- `features.ts`: `sim`, `centroid` y `simWithCentroid` protegen norma cero; ids de gemelas se canonizan en vecinos y cruces.
- `userVec.ts`: normalización y vector nulo; `cosineWithUser` no produce `NaN` con vectores de 48.
- `decide2.ts`: álgebra de `observe`/`activate`/`quad` (la covarianza se actualiza de forma simétrica); `duelBudget` coincide con §8b.5; bolsa vacía y de una obra; el motor A no usa reconocibilidad, idioma ni época (cumple §2b.5).
- `traits.ts`: memoria por catálogo y sello de detalle; rasgos con ≥ 3 obras y ≤ la mitad; vectores normalizados.
- `recog.ts`: curva de época y sus transiciones; R acotada a [0,01, 1]; vista y pendiente mandan.
- `cleanup.ts`: el comparador es un orden total coherente; lista vacía.
- `nudges.ts`: `canShowNudge` y el orden de prioridad; sin divisiones.
- `rank.ts` y `affinity.ts`: percentil con una obra; afinidad con menos de 3 comunes devuelve `null`.

## Fase 2 (15/11/2026): A1, A2 y A3 arreglados

Igor aprobó los cinco de gravedad alta. Hechos tres, uno por commit en `native/fase-1`, sin push. **A4 y A5 siguen abiertos** porque necesitan una decisión (abajo).

| Hallazgo | Commit | Qué cambia para el usuario |
|---|---|---|
| A1 | `f8ee27f` | **Cambia el resultado del motor.** La zona ya se aplica: quien tenga ≥ 10 tarjetas vistas de una década verá R entre ×0,75 y ×1,1 en las obras de esa década. Afecta a los orientadores de Decidir. En Descubrir **todavía no**: la pantalla no pasa `deckLearn` a `nextCards` (no he tocado pantallas). |
| A2 | `4626ed3` | **Cambia el resultado del motor** para quien no ha declarado su año y tiene ≥ 3 décadas con ≥ 10 tarjetas: el año sale de la tasa de «la vi» por década (§2b.3) y no de la mediana de lo visto. Para el resto, mismo resultado y una sola inferencia por tanda o sesión en vez de una por obra. |
| A3 | `2247daa` | Mismos números. De 243 ms de media por duelo (máximo 712) a 19 ms (máximo 55), en node con el catálogo entero. Comparado pareja a pareja con el cálculo anterior en 180 estados y 104.091 parejas: mismas parejas, diferencia máxima 1,8e-15. **Solo puede cambiar el duelo elegido cuando varias parejas empatan** (antes lo decidía el redondeo). El test de velocidad baja de 400 a 100 ms. |

Tests nuevos: 1 de A1 y 3 de A2 en `recog.test.ts`, 1 de A3 en `decide2.test.ts`. Cada uno se vio fallar antes del arreglo (el de velocidad, por la medida de 243 ms). No se ha relajado ni borrado ninguna expectativa.

Lo que queda de estos tres:
- **Descubrir** tiene que pasar `deckLearn: deckLearn[shelf]` a `nextCards` (web y nativa) para que A1 se note en el mazo. Cuando se haga, la tasa de «la vi» contará dos veces en `seen_likely` (zona y `adapt`): conviene quitar una.
- `inferBirthYear` sigue mezclando estanterías en su respaldo por años vistos y no excluye canon ni los dos últimos años en el cálculo por década (§2b.3).

### Comprobación final (salida real)

```
packages/core   npx tsc --noEmit → sin errores
                Test Files  28 passed | 1 skipped (29)
                     Tests  300 passed | 17 expected fail | 6 skipped (323)
                  Duration  54.35s
app             npx tsc --noEmit → sin errores
                Test Files  9 passed (9)
                     Tests  48 passed (48)
apps/native     npx tsc --noEmit → sin errores
                Test Files  8 passed (8)
                     Tests  45 passed (45)
```

Antes: 294 pasados y 1 fallo en `packages/core`. Ahora 300 pasados (los 295 de siempre y 5 nuevos) y ningún fallo.

### Pendiente de decisión

- **A4 (datos de fama).** No es código del motor: es el build de datos (`app/scripts/engine/…`), que el encargo me dejaba fuera, y necesita consultar Wikidata para validar cada emparejamiento. Además sigo sin los recuentos (el permiso del script fue denegado).
- **A5 (Elo frente a estrellas).** Hay que decidir qué manda: el duelo o las estrellas.

## No revisado

- `decide.ts` líneas 424-1350 (v1: `nextDuel`, `applyDuelChoice`, `getProposal`…): la app no las usa.
- `anchors.ts`, `dimensions.ts`, `metrics.ts`, `ranker.ts`, `userSeeds.ts`, `events.ts`, `axes.ts`: fuera de la lista de la fase 1 (solo `dimensions` entra de refilón en la bolsa).
- Las pantallas y el store, salvo las líneas que salieron en los `grep`.
