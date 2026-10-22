# T17 — Decidir: duelos con obras que conoces y que de verdad se distinguen (22/10/2026)

> Encargo para Gemini, diseñado por Claude con las decisiones de Igor. Va después de T15 y T16. Enlazado desde el final de `docs/TAREAS_MOTOR_V2.md`.
> Lee antes `docs/MOTOR.md` §2b.4 (R) y §8 (Decidir), y `app/src/lib/engine/decide.ts` y `recog.ts`.

**Decisiones de Igor:**
1. **Al principio solo salen obras que el usuario conoce seguro:** las suyas (vistas, valoradas o comparadas) o las conocidísimas de su país y su generación. Más adelante se puede ir a cosas menos conocidas, pero **hay que evitar a toda costa que no conozca lo que se le plantea**. No queremos el botón «no las conozco».
2. **Las parejas tienen que ser muy distintas al principio.** *Toy Story* contra *Del revés* no sirve para empezar; como mucho, en la tercera tanda si el usuario sigue dudando.
3. **Lo elegido se convierte en preferencias claras:** si elige animación frente a imagen real dos veces, la propuesta final es de animación. Lo mismo con cualquier otra dimensión.
4. Vale para **todas las estanterías:** pelis, series, libros, juegos y artistas.

---

## Parte A — Arreglar la reconocibilidad (R) desde los datos

### A.1 Qué está mal (medido por Claude el 22/10)
| Obra | Notoriedad hoy | Problema |
|---|---|---|
| *Friends* | 0,18 | **sin `wikidataId`**: se perdió al limpiar (T2b) y no se volvió a resolver |
| *Harry Potter y la piedra filosofal* (libro) | 0,30 (`popPct` 4,7) | sin visitas ni sitelinks |
| *Breaking Bad* | 0,40 | sin visitas de Wikipedia |
| *Titanic* | 0,69 | apunta a `Q1197729`, que **no es** la película de 1997 (solo 5.096 visitas en es) |
| *Catan* | 0,48 | `Q5051418` con 1 sitelink: **id equivocado** |
| *Ra* (juego) | 0,69, `popPct` 97 | la popularidad sale de BGG (jugones) |
| *Dolor y gloria* | 0,86 | el extra por «ser española» pesa demasiado |
| «Queen» | — | es una **película india**, no el grupo |

Causas, en `scripts/engine/build.mjs` (pasos 3 y 4):
- **Las visitas de Wikipedia casi no existen:** las tiene el 5 % de las pelis y el 0 % del resto. El percentil `popPct` acaba saliendo de `voteCount`, `wikiLangs` y la `popularity` antigua (de BGG o inventada).
- La fórmula de notoriedad suma **+0,25 por ser de España** y **+0,135 por «canon»**, y `isCanon` se marca con **cualquier premio** (54 % de las pelis «canon», incluido *Ra*).
- **Nunca se hizo la parte del LLM** de la notoriedad (MOTOR §2b.4: «¿qué parte de la gente de este país la reconocería?»).

### A.2 Datos que hay que traer (en el registro de atributos, `ATTRS`)
1. **Ids correctos de las obras famosas.** Primero la lista de oro de A.5. Comprueba con `check-wikidata-type.mjs` y además que el título, el año y el creador coincidan. *Titanic* (1997) es la de James Cameron; «Queen» tiene que ser un `artist`.
2. **`pageviews`** de los últimos 12 meses, sumando **es, en, fr, de, it y pt** a partir de los sitelinks. API REST de visitas de Wikimedia, por meses, `agent=user`. Se guarda el total por idioma: `pageviews: { es, en, fr, de, it, pt }`. Objetivo: ≥ 90 % de las obras con `wikidataId`.
3. **`fameLlm`** (nuevo, `Record<país, 0..1>`): estimación del LLM de **qué parte de los adultos de 18 a 60 años del país reconocería la obra por su título o su portada**, en 5 escalones (0 · 0,25 · 0,5 · 0,75 · 1). Prompt con **anclas fijas** en cada lote para que no derive:
   - 1: *Titanic*, *Friends*, *Harry Potter*, Monopoly, Queen, *La casa de papel*;
   - 0,75: *Breaking Bad*, *Cien años de soledad*, Catan, Rosalía;
   - 0,5: *Drive*, *Normal People*, Dixit, Vetusta Morla;
   - 0,25: *Paterson*, *Severance*, Azul, Sigur Rós;
   - 0: *Ra*, *Taj Mahal*, *Stationfall*.

   Lote por API (Haiku, unos 2 $ para todo el catálogo) o en modo agente; **Igor elige** con una muestra de 50. Procedencia `llm-infer`.
4. **`isCanon`** solo desde listas de canon reales (Wikidata, listas escolares, «1001…», AFI/BFI, lo más vendido de todos los tiempos) o del LLM con prueba. **Nunca «tiene un premio».**

> **Cambio de regla:** hasta ahora `TAREAS_MOTOR_V2.md` §0.2 y MOTOR §2b.0.3 prohibían los umbrales absolutos sobre R. **Desde T17, R pasa a ser una probabilidad calibrada** («¿qué probabilidad hay de que la conozca?»), gracias a `fameLlm`, la lista de oro y la medición del §C.6. Por eso aquí **sí se permiten umbrales absolutos**. Esta nota sustituye a esas dos reglas.

### A.3 Nueva fórmula de la notoriedad (`build.mjs`)
```
visW  = percentil en la estantería de log(1 + suma de pageviews de los 6 idiomas)   (fama mundial)
visES = percentil en la estantería de log(1 + pageviews.es)                          (fama en español)
llm   = fameLlm.ES
notoriety.ES = 0.45·llm + 0.30·visW + 0.25·visES
```
- **Sin extra por ser de aquí ni por canon:** la fama local ya la recogen `visES` y `llm`.
- Si falta un término, se reparten sus pesos entre los que haya. Si solo queda `llm`, vale `llm`.
- **`fameTier`** (nuevo, 1 a 4, por país). Lo deciden sobre todo el LLM y la fama más alta de las dos (mundial o en español), para que las muy conocidas **solo aquí** (*Aída*, *Torrente*) también lleguen al nivel 1:
  - **1, «la conoce todo el mundo»:** `llm ≥ 0.75` **y** `max(visW, visES) ≥ 90` (percentil);
  - **2:** `llm ≥ 0.5` y `max(visW, visES) ≥ 70`;
  - **3:** `llm ≥ 0.25` o `max(visW, visES) ≥ 50`;
  - **4:** el resto.
- `popPct` se calcula igual pero **sin** la `popularity` antigua.

### A.4 Cambios en `recog.ts`
**El problema de hoy:** R = `base · época · (0,6 + 0,4·zona)`, combinado con lo social. A un usuario nuevo le falta todo:
- sin historial del mazo, `zona` = 0,5 → el factor vale 0,8;
- sin año de nacimiento, `época` = 0,75.

Así que *Titanic*, con notoriedad 1, se queda en R ≈ 0,6 para un usuario nuevo. **Ninguna obra puede llegar a 0,85.** Que falten datos no puede bajar R: tiene que ser neutro. Cambios:
- **Lo del usuario manda:** vista, valorada, comparada o en su ranking → `R = 1`; pendiente → 0,9. Descartada no cuenta.
- **Época:**
  - sin año de nacimiento (ni declarado ni deducido), vale **1** para los niveles 1 y 2 y **0,9** para el resto;
  - con año, la curva actual, pero **a las de nivel 1 nunca se les baja de 0,95** («todos conocen *Titanic*»).
- **Zona, neutra si no hay datos:**
  ```
  si la década de la obra tiene menos de 10 tarjetas vistas en el mazo → zonaMult = 1
  si no → tasa = (seen + 2) / (shown + 4)                    (suavizada)
          zonaMult = clamp(0.75, 1.1, 0.8 + 0.4 · tasa)
  ```
- **Fórmula:** `R = 1 − (1 − base · época · zonaMult) · (1 − social)`, acotada a [0,01, 1].
- **Test obligatorio** en `recog.test.ts`, con un contexto vacío (usuario nuevo de España): una obra de nivel 1 con notoriedad ≥ 0,9 da **R ≥ 0,85**, y una de nivel 4 da **R < 0,5**.

### A.5 Lista de oro (prueba que tiene que pasar, en `coverage.mjs`)
La prueba es **relativa**, para no tentar a ajustar pesos hasta que pasen 30 títulos. En cada estantería:
- todas las de «tienen que ser nivel 1» tienen `fameTier = 1` y están en el **5 % de arriba** por `notoriety.ES`;
- todas ellas están **por encima de todas** las de «tienen que ser bajas»;
- las «bajas» tienen `fameTier ≥ 3`.

Si una no cumple, `coverage.mjs` falla y **se arregla el dato** (id equivocado, visitas que faltan, `fameLlm` mal estimado), **no los pesos**.

| Estantería | Tienen que ser nivel 1 | Tienen que ser bajas |
|---|---|---|
| Pelis | *Titanic*, *El padrino*, *La guerra de las galaxias*, *El rey león*, *Harry Potter y la piedra filosofal*, *Avatar*, *Torrente* | *Paterson*, *Under the Silver Lake* |
| Series | *Friends*, *Los Simpson*, *La casa de papel*, *Juego de tronos*, *Aída* | *Halt and Catch Fire*, *Banshee* |
| Libros | *Harry Potter y la piedra filosofal*, *Don Quijote*, *1984*, *El principito*, *Cien años de soledad* | *Stoner*, *Gilead* |
| Juegos | Monopoly, Parchís, Trivial Pursuit, UNO, Cluedo, ajedrez | *Ra*, *Taj Mahal*, *Stationfall* |
| Artistas | Queen, The Beatles, Michael Jackson, Shakira, Rosalía, Alejandro Sanz | Slowdive, Khruangbin |

- Si falta en el catálogo alguna de las de **nivel 1**, se añade (por `additions/`, T2).
- Si falta alguna de las **bajas**, **no se añade**: se sustituye por otra poco conocida que ya esté en el catálogo y se apunta el cambio aquí.

---

## Parte B — Ejes de contraste: qué pregunta cada duelo

### B.1 Requisito: ejes de sensación reales
Medido el 22/10: los ejes del LLM **siguen siendo casi de relleno** fuera de pelis. Porcentaje de obras con el mismo valor en un eje:

| Estantería | Ejes casi vacíos |
|---|---|
| Juegos | `tema` 99 %, `risas` 98 %, `cooperacion` 96 %, `confrontacion` 96 % |
| Libros | `humor` 100 %, `tension` 97 % |
| Artistas | `valencia` 100 % |
| Series | `escala` 95 %, `fantasia` 92 % |

**Rehaz T5 (ejes) para series, libros, juegos y artistas** con el validador de MOTOR §5.5: ningún eje con más del 60 % de las obras en un mismo valor. Hasta entonces, las dimensiones de B.2 usan solo **datos duros** cuando los hay.

### B.2 Dimensiones por estantería
Cada dimensión clasifica cada obra en el lado **A**, el lado **B** o **ninguno** (si está en medio no sirve para ese duelo). Van en `app/src/lib/engine/dimensions.ts`, con una función por dimensión `side(item) → 'A' | 'B' | null` y el texto de cada lado (para el motivo final).

| Estantería | Dimensión | Lado A | Lado B | Fuente |
|---|---|---|---|---|
| Pelis y series | formato | animación | imagen real | géneros (`Animación`) |
| | tono | comedia (`humor ≥ 4`) | drama (`humor ≤ 2` y `emocion ≥ 4`) | ejes; respaldo, géneros |
| | intensidad | para desconectar (`reconfort ≥ 4` y `tension ≤ 2`) | de tensión (`tension ≥ 4`) | ejes; respaldo, géneros Thriller/Terror |
| | realismo | fantasía o ciencia ficción (`fantasia ≥ 4`) | realista (`fantasia ≤ 2`) | ejes; respaldo, géneros |
| | época | clásica (antes de 1995) | reciente (2015 o después) | año |
| | idioma | en español | en otro idioma | `originalLanguage` |
| | exigencia | ligera (`exigencia ≤ 2`) | exigente (`exigencia ≥ 4`) | ejes |
| Solo series | duración | capítulos cortos (≤ 30 min) | capítulos largos (≥ 45 min) | `durationMin` |
| | compromiso | miniserie (1 temporada) | larga (5 o más temporadas) | `seasons` |
| Libros | tipo | ficción | no ficción | géneros |
| | extensión | corto (< 250 págs.) | largo (> 450 págs.) | `pages` |
| | realismo | fantasía o ciencia ficción | realista | géneros + ejes |
| | época | clásico (antes de 1950) | actual (2000 o después) | año |
| | ritmo | trepidante (thriller, misterio) | pausado (literario, ensayo) | géneros + ejes |
| | idioma | escrito en español | traducido | `originalLanguage` |
| Juegos | peso | ligero | de pensar | `weight` (T13) / ejes |
| | modo | cooperativo | competitivo | `coop` (T13) |
| | ambiente | de fiesta y risas | de estrategia | géneros/mecánicas + ejes |
| | grupo | para 2 | para 5 o más | `players` |
| | duración | rápido (≤ 30 min) | largo (≥ 90 min) | `durationMin` |
| Artistas | energía | tranquilo | de energía | ejes + géneros |
| | idioma | canta en español | en otro idioma | `originalLanguage` / país |
| | sonido | electrónico | acústico u orgánico | géneros + ejes |
| | época | clásico (pico antes de 1995) | actual (pico desde 2010) | `peakDecades` (T13) |

Las respuestas de las preguntas previas de Decidir que ya fijan una dimensión («para reír» → tono = comedia; «poco tiempo» → duración corta) **se cuentan como ya respondidas** y no se preguntan.

---

## Parte C — Cómo se eligen los duelos (`decide.ts`)

### C.1 Conjuntos de obras por fase («¿la conoce?»)
Los conjuntos se definen sobre todo por **nivel de fama y obras propias**; R hace de filtro de seguridad:
- **F1 (seguro que la conoce):**
  - **las suyas:** vistas, valoradas, comparadas o en su ranking, de esa estantería;
  - **las de nivel 1** de su país con `R ≥ 0.8`. Con A.4, *Titanic* da ≈ 0,9 a un usuario nuevo; si su edad la deja fuera, no entra.
- **F2:** F1 + las de nivel 2 con `R ≥ 0.65`.
- **F3:** F2 + las de nivel 3 con `R ≥ 0.55`. **Nunca sale un orientador de nivel 4 ni con `R < 0.55`**, en ninguna fase.
- Si F1 tiene menos de 12 obras útiles (por ejemplo, en una estantería pequeña), se completa con las mejores de F2, nunca con F3.
- Si el usuario tiene **8 o más obras propias** en la estantería, en F1 al menos **2 de cada 3** orientadores son suyos. Se prefieren los extremos de su ranking (las que más le gustaron y las que menos), que son las que mejor orientan.

### C.2 Fases de la sesión
| Duelos | Fase | Conjunto | Qué se busca |
|---|---|---|---|
| 1-3 | **Contraste** | F1 | una dimensión por duelo, con **una obra claramente de cada lado** |
| 4-5 | **Afinar** | F2 | las dimensiones que siguen abiertas, **dentro del lado ya elegido** en las anteriores |
| A partir de «Seguir buscando» (tercera tanda) | **Parecidas** | F3 | parejas parecidas (lo que hay hoy en la fase `fine`: similitud de 0,55 a 0,85) |

### C.3 Elegir la dimensión y la pareja (fases de contraste y afinar)
1. **Dimensión:** entre las que no están cerradas (C.4), la que **mejor parte en dos** las candidatas que quedan: la masa de `post` del lado A más cercana al 50 %. Las que tienen menos del 15 % de la masa en uno de los lados no se preguntan.
2. **Pareja:** una obra de F del lado A y otra del lado B de esa dimensión.
   - **En afinar,** las dos tienen que cumplir **todas las dimensiones ya cerradas** (si eligió animación, las dos son de animación).
   - **Puntuación:** `R_a · R_b · pureza_a · pureza_b`, con `pureza` = lo claramente que la obra está en su lado (1 si está en el extremo y 0,6 si está justo en el borde).
   - **Se evita:** mismo creador, misma saga, obras ya enseñadas en esta sesión y orientadores de las 3 últimas sesiones (×0,5).
   - Se elige al azar entre las 3 mejores.
3. Si una dimensión no tiene pareja posible en F, se pasa a la siguiente. Si no queda ninguna, se baja a la fase siguiente.

### C.4 Preferencias explícitas
- `prefs[dimensión]`, de −2 a +2, empezando en 0: cada duelo de esa dimensión suma +1 al lado del ganador. Las respuestas previas cuentan como ±2.
- **Dimensión cerrada:** `|prefs| ≥ 2`. Ya no se pregunta y **filtra la propuesta:** solo obras de ese lado o «ninguno». Si quedan menos de 5 candidatas, se relaja a empujón.
- `|prefs| = 1`: empujón. ×1,5 al `prior` del lado elegido y ×0,6 al contrario. Se puede volver a preguntar con otra pareja para confirmar.
- **Si el usuario se contradice** (+1 y luego −1), la dimensión vuelve a 0 y se marca como «le da igual»: no se pregunta más y no filtra.
- La actualización bayesiana por similitud de hoy (§8.6) **se mantiene** encima de esto.

### C.5 Motivo de la propuesta
Las preferencias cerradas se dicen primero: «Porque elegiste animación dos veces · De las que te ponen tensión». Después, los motivos actuales (amigos, plataforma).

### C.6 Eventos y métricas
- `dec_duel` guarda la dimensión, la fase, la R de las dos obras, su nivel de fama, si son suyas y `ms`.
- En `/metricas`: el **porcentaje de duelos con respuesta lenta** (`ms` > 4 s), que es la señal de que no conocía alguna de las dos, por fase y por estantería. **Objetivo: menos del 10 % en F1.**

---

## T17.0 — Antes de empezar: comprobaciones automáticas de lo ya hecho
Lo medido el 22/10 no coincide con lo que se dio por hecho:
- **T3** pedía visitas de Wikipedia en ≥ 85 % de las obras con id; hay entre un **0 y un 5 %**;
- **T5** pedía que ningún eje tuviera más del 60 % de las obras en un mismo valor; los de libros, juegos y artistas **siguen de relleno**;
- **T2b** tenía que volver a resolver las obras purgadas; ***Friends* sigue sin id**.

Por eso, antes de nada, **añade a `coverage.mjs` comprobaciones que fallen solas** (no basta con una frase en un documento):
1. cobertura de `pageviews` por estantería (≥ 90 % de las que tienen id);
2. concentración de cada eje (≤ 60 % en un mismo valor);
3. obras de la lista de oro sin id o con id de otro tipo;
4. la lista de oro (A.5).

Ejecútalo y pega el resultado en `app/scripts/cache/coverage.md`. **Una tarea solo está hecha si `coverage.mjs` pasa.**

## Tests (los justos)
- En F1 solo salen obras propias o de nivel 1 con `R ≥ 0.8`, y nunca un orientador de nivel 4 ni con `R < 0.55` en ninguna fase.
- Usuario nuevo: R de una obra de nivel 1 ≥ 0,85 (A.4).
- En contraste, las dos obras están en lados opuestos de la dimensión.
- Dos victorias del mismo lado → dimensión cerrada → la propuesta es de ese lado.
- Lista de oro (A.5) dentro de `coverage.mjs`.

## Hecho cuando
- `coverage.mjs` pasa la lista de oro, con visitas en ≥ 90 % de las obras con id y `fameLlm` en el 100 %.
- Ejes reales en las 5 estanterías (ningún eje con más del 60 % en un mismo valor).
- Decidir funciona por fases según C.2, con preferencias explícitas y su motivo.
- Igor prueba 10 sesiones por estantería en el móvil: en los 3 primeros duelos reconoce las dos obras siempre, y las parejas son claramente distintas.
- Commits por parte (A datos, B dimensiones, C motor). Sin revisión visual por tu parte.
