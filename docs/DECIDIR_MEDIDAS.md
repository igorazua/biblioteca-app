# Medidas de Decidir

Cada sección la añade `BENCH=1 npx vitest run src/lib/engine/decide2.bench.test.ts` (en `packages/core`). No se sobrescribe: se añade.

> Nota: los modos `azar` y `pasa` tienen un ruido de ±10 puntos con 60 usuarios, así que no sirven para comprobar metas.
> Las metas del plan se comprueban con `sabe`, la media de `rA·rB`, «propuesta = orientador» y el orientador más repetido, que sí son estables.
> «Acierto nuevo» = la propuesta está en el 10 % favorito del usuario entre las obras que NO ha visto y además no la ha visto; «propuesta ya vista» = % de propuestas que el usuario ya había visto (vistas simuladas por notoriedad, estantería y gusto, sin usar el motor).

## 2026-11-15 · commit 94041f8

Banco `decide2.bench.test.ts` (BENCH=1). Usuario nuevo: 40 sesiones; curvas: 60 usuarios simulados; semillas fijas.

### Resumen

| Medida | Pelis | Series | Libros | Juegos | Artistas |
|---|---|---|---|---|---|
| Acierto tras 6 duelos, modo sabe | 37 % | 33 % | 50 % | 55 % | 18 % |
| Acierto tras 6 duelos, modo azar | 32 % | 23 % | 50 % | 38 % | 18 % |
| Acierto tras 6 duelos, modo pasa | 35 % | 22 % | 50 % | 52 % | 20 % |
| Acierto tras 6 duelos, modo ruido | 5 % | 10 % | 17 % | 18 % | 18 % |
| Media de rA·rB, duelos 4-6 (usuario nuevo) | 0.69 | 0.68 | 0.71 | 0.51 | 0.59 |
| Sesiones con el orientador más repetido en los duelos 1-3 (usuario nuevo) | 57 % | 70 % | 90 % | 80 % | 73 % |
| La propuesta es un orientador enseñado (sabe) | 73 % | 78 % | 98 % | 73 % | 98 % |
| R media de la propuesta (sabe) | 0.75 | 0.74 | 0.89 | 0.58 | 0.80 |
| Calidad media de la propuesta (percentil de voteAvg) | 67 % | 55 % | 52 % | 67 % | — |
| Peso de la previa: rango de st.base (máx − mín) | 0.14 | 0.02 | 0.08 | 0.08 | 0.00 |

### Pelis (935 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.99 | 0.98 | 0.97 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.98 | 0.97 | 0.97 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 39 | 0.99 | 0.97 | 0.98 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 39 | 0.82 | 0.58 | 0.67 | 0 % | 26 % | 29 % | 45 % | 0 % |
| 5 | 34 | 0.85 | 0.58 | 0.72 | 0 % | 32 % | 35 % | 32 % | 0 % |
| 6 | 29 | 0.83 | 0.56 | 0.69 | 0 % | 26 % | 33 % | 41 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.69**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): La La Land 57 %; El caballero oscuro: La leyenda renace 50 %; El rey león 48 %; Parque Jurásico 48 %; Toy Story 45 %; Vengadores: Endgame 28 %; Avatar 25 %; El lobo de Wall Street 25 %; Todo a la vez en todas partes 25 %; Bonnie y Clyde 23 %; Interstellar 23 %; Puñales por la espalda 15 %; Pulp Fiction 15 %; La guerra de las galaxias 15 %; El señor de los anillos: La comunidad del anillo 13 %.

Orientador más repetido en los duelos 1-3: **57 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.98 | 0.93 | 0.97 | 64 % | 36 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.98 | 0.92 | 0.95 | 51 % | 49 % | 0 % | 0 % | 0 % |
| 3 | 34 | 0.98 | 0.92 | 0.96 | 62 % | 38 % | 0 % | 0 % | 0 % |
| 4 | 33 | 0.80 | 0.55 | 0.65 | 23 % | 17 % | 14 % | 47 % | 0 % |
| 5 | 24 | 0.81 | 0.56 | 0.65 | 23 % | 10 % | 23 % | 44 % | 0 % |
| 6 | 21 | 0.83 | 0.57 | 0.69 | 26 % | 29 % | 29 % | 17 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.66**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Bonnie y Clyde 20 %; La La Land 20 %; El rey león 15 %; Shutter Island 15 %; Toy Story 15 %; Avatar 13 %; El caballero oscuro: La leyenda renace 13 %; Apocalypse Now 10 %; El padrino 10 %; Puñales por la espalda 10 %; Pulp Fiction 10 %; La guerra de las galaxias 10 %; Blade Runner 8 %; El resplandor 8 %; La herencia del viento 8 %.

Orientador más repetido en los duelos 1-3: **20 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 5 % | 38 % | 53 % | 5 % | 38 % | 53 % | 5 % | 38 % | 53 % | 5 % | 38 % | 53 % |
| 1 | 15 % | 32 % | 44 % | 15 % | 32 % | 44 % | 15 % | 32 % | 44 % | 5 % | 22 % | 58 % |
| 2 | 22 % | 35 % | 37 % | 22 % | 35 % | 37 % | 22 % | 35 % | 37 % | 3 % | 8 % | 56 % |
| 3 | 23 % | 43 % | 36 % | 23 % | 43 % | 36 % | 23 % | 42 % | 37 % | 5 % | 10 % | 53 % |
| 4 | 33 % | 43 % | 33 % | 32 % | 40 % | 35 % | 28 % | 38 % | 33 % | 8 % | 13 % | 47 % |
| 5 | 38 % | 52 % | 26 % | 35 % | 42 % | 32 % | 35 % | 42 % | 30 % | 8 % | 15 % | 47 % |
| 6 | 37 % | 52 % | 29 % | 32 % | 45 % | 37 % | 35 % | 43 % | 32 % | 5 % | 12 % | 45 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **73 %**; R media de la propuesta: **0.75**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo 0.11, mediana -0.01, mínimo -0.03.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 60 de 60 propuestas con dato): **67 %**.

### Series (1022 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.98 | 0.97 | 0.96 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.99 | 0.97 | 0.98 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 40 | 0.99 | 0.97 | 0.98 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 40 | 0.78 | 0.63 | 0.62 | 0 % | 11 % | 35 % | 54 % | 0 % |
| 5 | 39 | 0.84 | 0.63 | 0.71 | 0 % | 26 % | 35 % | 40 % | 0 % |
| 6 | 34 | 0.84 | 0.63 | 0.72 | 0 % | 31 % | 31 % | 38 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.68**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Bob Esponja 70 %; The Boys 53 %; El mentalista 45 %; Anatomía de Grey 35 %; Sexo en Nueva York 33 %; Sobrenatural 30 %; Crónicas vampíricas 30 %; American Horror Story 28 %; Juego de tronos 25 %; Mentes criminales 23 %; Friends 18 %; The Bear 18 %; Dexter 15 %; From 15 %; Ataque a los titanes 13 %.

Orientador más repetido en los duelos 1-3: **70 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.99 | 0.93 | 0.98 | 68 % | 33 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.99 | 0.93 | 0.97 | 59 % | 41 % | 0 % | 0 % | 0 % |
| 3 | 39 | 0.98 | 0.93 | 0.96 | 50 % | 50 % | 0 % | 0 % | 0 % |
| 4 | 38 | 0.80 | 0.56 | 0.64 | 16 % | 8 % | 24 % | 53 % | 0 % |
| 5 | 32 | 0.85 | 0.57 | 0.73 | 27 % | 17 % | 14 % | 42 % | 0 % |
| 6 | 27 | 0.84 | 0.57 | 0.71 | 22 % | 15 % | 28 % | 35 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.69**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Anatomía de Grey 23 %; Smallville 18 %; Crónicas vampíricas 18 %; Juego de tronos 15 %; The Boys 15 %; El mentalista 15 %; Urgencias 13 %; Las chicas Gilmore 13 %; Sobrenatural 13 %; American Horror Story 10 %; Dark 10 %; Homeland 10 %; The Walking Dead 10 %; True Detective 10 %; Dexter 8 %.

Orientador más repetido en los duelos 1-3: **23 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 7 % | 30 % | 52 % | 7 % | 30 % | 52 % | 7 % | 30 % | 52 % | 7 % | 30 % | 52 % |
| 1 | 18 % | 28 % | 33 % | 18 % | 28 % | 33 % | 18 % | 28 % | 33 % | 13 % | 28 % | 40 % |
| 2 | 15 % | 37 % | 39 % | 15 % | 35 % | 39 % | 15 % | 35 % | 38 % | 17 % | 33 % | 43 % |
| 3 | 22 % | 33 % | 35 % | 22 % | 33 % | 35 % | 23 % | 35 % | 34 % | 13 % | 33 % | 45 % |
| 4 | 28 % | 43 % | 33 % | 25 % | 42 % | 37 % | 30 % | 45 % | 34 % | 10 % | 33 % | 48 % |
| 5 | 32 % | 47 % | 28 % | 23 % | 38 % | 39 % | 28 % | 48 % | 36 % | 15 % | 32 % | 47 % |
| 6 | 33 % | 52 % | 30 % | 23 % | 37 % | 40 % | 22 % | 47 % | 41 % | 10 % | 32 % | 47 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **78 %**; R media de la propuesta: **0.74**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo 0.01, mediana 0.00, mínimo -0.01.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 60 de 60 propuestas con dato): **55 %**.

### Libros (971 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.98 | 0.97 | 0.96 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.97 | 0.93 | 0.94 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 37 | 0.97 | 0.92 | 0.94 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 29 | 0.86 | 0.62 | 0.74 | 0 % | 53 % | 17 % | 29 % | 0 % |
| 5 | 22 | 0.86 | 0.59 | 0.73 | 0 % | 48 % | 25 % | 27 % | 0 % |
| 6 | 14 | 0.81 | 0.63 | 0.64 | 0 % | 39 % | 14 % | 46 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.71**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Dune 90 %; El arte de la guerra 85 %; El hombre en busca de sentido 73 %; Drácula 68 %; El amor en los tiempos del cólera 68 %; Fahrenheit 451 35 %; Los tres mosqueteros 25 %; La casa de los espíritus 20 %; El conde de Montecristo 18 %; El extraño caso del doctor Jekyll y el señor Hyde 15 %; El Señor de los Anillos 15 %; Cien años de soledad 13 %; Siddhartha 13 %; El retrato de Dorian Gray 8 %; White Nights 8 %.

Orientador más repetido en los duelos 1-3: **90 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.99 | 0.92 | 0.98 | 75 % | 25 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.98 | 0.88 | 0.97 | 66 % | 34 % | 0 % | 0 % | 0 % |
| 3 | 33 | 0.98 | 0.91 | 0.96 | 64 % | 36 % | 0 % | 0 % | 0 % |
| 4 | 27 | 0.80 | 0.58 | 0.63 | 26 % | 13 % | 19 % | 43 % | 0 % |
| 5 | 19 | 0.80 | 0.59 | 0.65 | 18 % | 29 % | 13 % | 39 % | 0 % |
| 6 | 13 | 0.82 | 0.58 | 0.67 | 38 % | 12 % | 15 % | 35 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.64**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Dune 40 %; Drácula 35 %; El conde de Montecristo 18 %; The deerslayer 13 %; El extraño caso del doctor Jekyll y el señor Hyde 10 %; Los tres mosqueteros 10 %; Parménides 10 %; Anne of the Island 8 %; Dorothy and the Wizard in Oz 8 %; El gran Gatsby 8 %; Fahrenheit 451 8 %; Junkyard Planet 8 %; On the Beach 8 %; Orgullo y prejuicio 8 %; The Alhambra 8 %.

Orientador más repetido en los duelos 1-3: **40 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 18 % | 35 % | 34 % | 18 % | 35 % | 34 % | 18 % | 35 % | 34 % | 18 % | 35 % | 34 % |
| 1 | 43 % | 52 % | 28 % | 42 % | 50 % | 29 % | 42 % | 50 % | 28 % | 13 % | 32 % | 47 % |
| 2 | 17 % | 58 % | 34 % | 18 % | 57 % | 33 % | 18 % | 57 % | 33 % | 20 % | 35 % | 40 % |
| 3 | 37 % | 67 % | 26 % | 32 % | 65 % | 31 % | 33 % | 65 % | 28 % | 18 % | 32 % | 42 % |
| 4 | 50 % | 68 % | 21 % | 45 % | 65 % | 26 % | 45 % | 68 % | 25 % | 15 % | 42 % | 48 % |
| 5 | 48 % | 70 % | 21 % | 42 % | 67 % | 27 % | 45 % | 68 % | 25 % | 20 % | 38 % | 42 % |
| 6 | 50 % | 70 % | 20 % | 50 % | 63 % | 24 % | 50 % | 67 % | 23 % | 17 % | 40 % | 48 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **98 %**; R media de la propuesta: **0.89**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo 0.06, mediana -0.00, mínimo -0.02.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 60 de 60 propuestas con dato): **52 %**.

### Juegos (1095 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.91 | 0.75 | 0.83 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.86 | 0.74 | 0.74 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 40 | 0.83 | 0.74 | 0.70 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 40 | 0.69 | 0.58 | 0.48 | 0 % | 16 % | 84 % | 0 % | 0 % |
| 5 | 38 | 0.72 | 0.57 | 0.52 | 0 % | 34 % | 66 % | 0 % | 0 % |
| 6 | 34 | 0.73 | 0.58 | 0.54 | 0 % | 40 % | 60 % | 0 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.51**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Maracaibo 80 %; Risk Legacy 73 %; Risk 57 %; Monopoly 35 %; Bus 30 %; Coup 30 %; Friday 30 %; Barrage 28 %; Magic: The Gathering 28 %; Stella: Dixit Universe 25 %; Scrabble 23 %; Kingdomino 20 %; Automobile 18 %; QE 18 %; Cacao 15 %.

Orientador más repetido en los duelos 1-3: **80 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 1.00 | 0.74 | 0.99 | 95 % | 5 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.96 | 0.71 | 0.93 | 78 % | 23 % | 0 % | 0 % | 0 % |
| 3 | 37 | 0.96 | 0.71 | 0.93 | 81 % | 19 % | 0 % | 0 % | 0 % |
| 4 | 35 | 0.83 | 0.55 | 0.68 | 41 % | 17 % | 36 % | 6 % | 0 % |
| 5 | 29 | 0.85 | 0.55 | 0.73 | 52 % | 16 % | 22 % | 10 % | 0 % |
| 6 | 20 | 0.82 | 0.55 | 0.68 | 40 % | 20 % | 30 % | 10 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.70**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Robinson Crusoe: Adventures on the Cursed Island 15 %; Pandemic Legacy: Season 2 13 %; Coup 10 %; Gloomhaven: Jaws of the Lion 10 %; Imperial 10 %; Nemesis 10 %; Pandemic 10 %; Cryptid 8 %; Cyclades 8 %; Eldritch Horror 8 %; Frosthaven 8 %; Gloomhaven 8 %; Just One 8 %; Kemet 8 %; Maracaibo 8 %.

Orientador más repetido en los duelos 1-3: **15 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 13 % | 38 % | 43 % | 13 % | 38 % | 43 % | 13 % | 38 % | 43 % | 13 % | 38 % | 43 % |
| 1 | 17 % | 42 % | 40 % | 15 % | 40 % | 41 % | 17 % | 40 % | 40 % | 7 % | 28 % | 49 % |
| 2 | 22 % | 43 % | 37 % | 18 % | 42 % | 41 % | 20 % | 40 % | 38 % | 7 % | 25 % | 48 % |
| 3 | 27 % | 55 % | 31 % | 20 % | 47 % | 35 % | 27 % | 43 % | 32 % | 10 % | 18 % | 48 % |
| 4 | 42 % | 73 % | 22 % | 35 % | 48 % | 34 % | 38 % | 58 % | 26 % | 18 % | 30 % | 43 % |
| 5 | 62 % | 78 % | 18 % | 40 % | 50 % | 29 % | 45 % | 62 % | 23 % | 22 % | 33 % | 45 % |
| 6 | 55 % | 72 % | 16 % | 38 % | 53 % | 22 % | 52 % | 63 % | 20 % | 18 % | 28 % | 48 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **73 %**; R media de la propuesta: **0.58**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo 0.06, mediana -0.00, mínimo -0.02.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 60 de 60 propuestas con dato): **67 %**.

### Artistas (410 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.90 | 0.81 | 0.81 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.87 | 0.81 | 0.77 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 40 | 0.88 | 0.81 | 0.78 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 34 | 0.78 | 0.58 | 0.61 | 0 % | 35 % | 60 % | 4 % | 0 % |
| 5 | 34 | 0.77 | 0.56 | 0.59 | 0 % | 38 % | 41 % | 21 % | 0 % |
| 6 | 28 | 0.74 | 0.56 | 0.55 | 0 % | 36 % | 48 % | 16 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.59**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): AC/DC 73 %; The Beatles 70 %; Queen 55 %; Bruno Mars 33 %; Kiss 30 %; David Bowie 25 %; Elton John 25 %; Metallica 25 %; Bruce Springsteen 23 %; Lady Gaga 20 %; Wolfgang Amadeus Mozart 20 %; Bob Dylan 15 %; Led Zeppelin 15 %; Michael Jackson 15 %; Prince 15 %.

Orientador más repetido en los duelos 1-3: **73 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.95 | 0.78 | 0.90 | 54 % | 46 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.92 | 0.77 | 0.84 | 50 % | 50 % | 0 % | 0 % | 0 % |
| 3 | 25 | 0.93 | 0.77 | 0.87 | 54 % | 46 % | 0 % | 0 % | 0 % |
| 4 | 21 | 0.80 | 0.57 | 0.62 | 33 % | 5 % | 43 % | 19 % | 0 % |
| 5 | 14 | 0.81 | 0.57 | 0.65 | 36 % | 14 % | 32 % | 18 % | 0 % |
| 6 | 10 | 0.80 | 0.56 | 0.64 | 35 % | 10 % | 40 % | 15 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.63**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Amy Winehouse 18 %; Alejandro Sanz 15 %; Metallica 15 %; Avicii 13 %; Led Zeppelin 13 %; Michael Jackson 13 %; Queen 13 %; Shakira 13 %; The Rolling Stones 13 %; AC/DC 10 %; David Bowie 10 %; Gorillaz 10 %; Rosalía 10 %; Dua Lipa 8 %; Ludwig van Beethoven 8 %.

Orientador más repetido en los duelos 1-3: **18 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 7 % | 25 % | 56 % | 7 % | 25 % | 56 % | 7 % | 25 % | 56 % | 7 % | 25 % | 56 % |
| 1 | 20 % | 35 % | 34 % | 20 % | 33 % | 35 % | 18 % | 32 % | 36 % | 10 % | 32 % | 50 % |
| 2 | 15 % | 40 % | 30 % | 13 % | 38 % | 32 % | 18 % | 37 % | 30 % | 13 % | 30 % | 41 % |
| 3 | 20 % | 50 % | 32 % | 10 % | 40 % | 39 % | 18 % | 45 % | 33 % | 8 % | 35 % | 46 % |
| 4 | 20 % | 45 % | 30 % | 12 % | 40 % | 35 % | 20 % | 43 % | 30 % | 18 % | 35 % | 43 % |
| 5 | 18 % | 43 % | 28 % | 12 % | 42 % | 41 % | 22 % | 48 % | 29 % | 10 % | 33 % | 45 % |
| 6 | 18 % | 53 % | 29 % | 18 % | 42 % | 33 % | 20 % | 47 % | 30 % | 18 % | 33 % | 38 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **98 %**; R media de la propuesta: **0.80**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo -0.00, mediana -0.00, mínimo -0.00.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 0 de 60 propuestas con dato): **NaN %**.


## 2026-11-15 · commit a59bee8

Banco `decide2.bench.test.ts` (BENCH=1). Usuario nuevo: 40 sesiones; curvas: 60 usuarios simulados; semillas fijas.

### Resumen

| Medida | Pelis | Series | Libros | Juegos | Artistas |
|---|---|---|---|---|---|
| Acierto tras 6 duelos, modo sabe | 37 % | 45 % | 50 % | 55 % | 18 % |
| Acierto tras 6 duelos, modo azar | 32 % | 33 % | 50 % | 38 % | 18 % |
| Acierto tras 6 duelos, modo pasa | 35 % | 40 % | 50 % | 52 % | 20 % |
| Acierto tras 6 duelos, modo ruido | 5 % | 7 % | 17 % | 18 % | 18 % |
| Media de rA·rB, duelos 4-6 (usuario nuevo) | 0.69 | 0.68 | 0.71 | 0.51 | 0.59 |
| Sesiones con el orientador más repetido en los duelos 1-3 (usuario nuevo) | 57 % | 70 % | 90 % | 80 % | 73 % |
| La propuesta es un orientador enseñado (sabe) | 73 % | 77 % | 98 % | 73 % | 98 % |
| R media de la propuesta (sabe) | 0.75 | 0.77 | 0.89 | 0.58 | 0.80 |
| Calidad media de la propuesta (percentil de voteAvg) | 67 % | 55 % | 52 % | 67 % | — |
| Peso de la previa: rango de st.base (máx − mín) | 0.14 | 0.02 | 0.08 | 0.08 | 0.00 |

### Pelis (935 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.99 | 0.98 | 0.97 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.98 | 0.97 | 0.97 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 39 | 0.99 | 0.97 | 0.98 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 39 | 0.82 | 0.58 | 0.67 | 0 % | 26 % | 29 % | 45 % | 0 % |
| 5 | 34 | 0.85 | 0.58 | 0.72 | 0 % | 32 % | 35 % | 32 % | 0 % |
| 6 | 29 | 0.83 | 0.56 | 0.69 | 0 % | 26 % | 33 % | 41 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.69**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): La La Land 57 %; El caballero oscuro: La leyenda renace 50 %; El rey león 48 %; Parque Jurásico 48 %; Toy Story 45 %; Vengadores: Endgame 28 %; Avatar 25 %; El lobo de Wall Street 25 %; Todo a la vez en todas partes 25 %; Bonnie y Clyde 23 %; Interstellar 23 %; Puñales por la espalda 15 %; Pulp Fiction 15 %; La guerra de las galaxias 15 %; El señor de los anillos: La comunidad del anillo 13 %.

Orientador más repetido en los duelos 1-3: **57 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.98 | 0.93 | 0.97 | 64 % | 36 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.98 | 0.92 | 0.95 | 51 % | 49 % | 0 % | 0 % | 0 % |
| 3 | 34 | 0.98 | 0.92 | 0.96 | 62 % | 38 % | 0 % | 0 % | 0 % |
| 4 | 33 | 0.80 | 0.55 | 0.65 | 23 % | 17 % | 14 % | 47 % | 0 % |
| 5 | 24 | 0.81 | 0.56 | 0.65 | 23 % | 10 % | 23 % | 44 % | 0 % |
| 6 | 21 | 0.83 | 0.57 | 0.69 | 26 % | 29 % | 29 % | 17 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.66**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Bonnie y Clyde 20 %; La La Land 20 %; El rey león 15 %; Shutter Island 15 %; Toy Story 15 %; Avatar 13 %; El caballero oscuro: La leyenda renace 13 %; Apocalypse Now 10 %; El padrino 10 %; Puñales por la espalda 10 %; Pulp Fiction 10 %; La guerra de las galaxias 10 %; Blade Runner 8 %; El resplandor 8 %; La herencia del viento 8 %.

Orientador más repetido en los duelos 1-3: **20 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 5 % | 38 % | 53 % | 5 % | 38 % | 53 % | 5 % | 38 % | 53 % | 5 % | 38 % | 53 % |
| 1 | 15 % | 32 % | 44 % | 15 % | 32 % | 44 % | 15 % | 32 % | 44 % | 5 % | 22 % | 58 % |
| 2 | 22 % | 35 % | 37 % | 22 % | 35 % | 37 % | 22 % | 35 % | 37 % | 3 % | 8 % | 56 % |
| 3 | 23 % | 43 % | 36 % | 23 % | 43 % | 36 % | 23 % | 42 % | 37 % | 5 % | 10 % | 53 % |
| 4 | 33 % | 43 % | 33 % | 32 % | 40 % | 35 % | 28 % | 38 % | 33 % | 8 % | 13 % | 47 % |
| 5 | 38 % | 52 % | 26 % | 35 % | 42 % | 32 % | 35 % | 42 % | 30 % | 8 % | 15 % | 47 % |
| 6 | 37 % | 52 % | 29 % | 32 % | 45 % | 37 % | 35 % | 43 % | 32 % | 5 % | 12 % | 45 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **73 %**; R media de la propuesta: **0.75**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo 0.11, mediana -0.01, mínimo -0.03.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 60 de 60 propuestas con dato): **67 %**.

### Series (1022 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.98 | 0.97 | 0.96 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.99 | 0.97 | 0.98 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 40 | 0.99 | 0.97 | 0.98 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 40 | 0.78 | 0.63 | 0.62 | 0 % | 11 % | 35 % | 54 % | 0 % |
| 5 | 39 | 0.84 | 0.63 | 0.71 | 0 % | 26 % | 35 % | 40 % | 0 % |
| 6 | 34 | 0.84 | 0.63 | 0.72 | 0 % | 31 % | 31 % | 38 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.68**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Bob Esponja 70 %; The Boys 53 %; El mentalista 45 %; Anatomía de Grey 35 %; Sexo en Nueva York 33 %; Sobrenatural 30 %; Crónicas vampíricas 30 %; American Horror Story 28 %; Juego de tronos 25 %; Mentes criminales 23 %; Friends 18 %; The Bear 18 %; Dexter 15 %; From 15 %; Ataque a los titanes 13 %.

Orientador más repetido en los duelos 1-3: **70 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.99 | 0.93 | 0.98 | 68 % | 33 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.99 | 0.93 | 0.97 | 59 % | 41 % | 0 % | 0 % | 0 % |
| 3 | 39 | 0.98 | 0.93 | 0.96 | 50 % | 50 % | 0 % | 0 % | 0 % |
| 4 | 38 | 0.80 | 0.56 | 0.64 | 16 % | 8 % | 24 % | 53 % | 0 % |
| 5 | 32 | 0.85 | 0.57 | 0.73 | 27 % | 17 % | 14 % | 42 % | 0 % |
| 6 | 27 | 0.84 | 0.57 | 0.71 | 22 % | 15 % | 28 % | 35 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.69**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Anatomía de Grey 23 %; Smallville 18 %; Crónicas vampíricas 18 %; Juego de tronos 15 %; The Boys 15 %; El mentalista 15 %; Urgencias 13 %; Las chicas Gilmore 13 %; Sobrenatural 13 %; American Horror Story 10 %; Dark 10 %; Homeland 10 %; The Walking Dead 10 %; True Detective 10 %; Dexter 8 %.

Orientador más repetido en los duelos 1-3: **23 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 % | 17 % | 69 % | 0 % | 17 % | 69 % | 0 % | 17 % | 69 % | 0 % | 17 % | 69 % |
| 1 | 27 % | 52 % | 28 % | 25 % | 50 % | 29 % | 25 % | 52 % | 28 % | 8 % | 25 % | 50 % |
| 2 | 37 % | 58 % | 25 % | 37 % | 58 % | 26 % | 38 % | 60 % | 25 % | 13 % | 18 % | 52 % |
| 3 | 37 % | 63 % | 25 % | 35 % | 62 % | 27 % | 38 % | 65 % | 25 % | 10 % | 23 % | 52 % |
| 4 | 45 % | 67 % | 19 % | 43 % | 67 % | 20 % | 50 % | 70 % | 20 % | 10 % | 27 % | 51 % |
| 5 | 42 % | 75 % | 20 % | 37 % | 68 % | 23 % | 42 % | 72 % | 21 % | 10 % | 23 % | 52 % |
| 6 | 45 % | 73 % | 19 % | 33 % | 73 % | 27 % | 40 % | 67 % | 22 % | 7 % | 27 % | 51 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **77 %**; R media de la propuesta: **0.77**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo 0.01, mediana 0.00, mínimo -0.01.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 60 de 60 propuestas con dato): **55 %**.

### Libros (971 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.98 | 0.97 | 0.96 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.97 | 0.93 | 0.94 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 37 | 0.97 | 0.92 | 0.94 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 29 | 0.86 | 0.62 | 0.74 | 0 % | 53 % | 17 % | 29 % | 0 % |
| 5 | 22 | 0.86 | 0.59 | 0.73 | 0 % | 48 % | 25 % | 27 % | 0 % |
| 6 | 14 | 0.81 | 0.63 | 0.64 | 0 % | 39 % | 14 % | 46 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.71**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Dune 90 %; El arte de la guerra 85 %; El hombre en busca de sentido 73 %; Drácula 68 %; El amor en los tiempos del cólera 68 %; Fahrenheit 451 35 %; Los tres mosqueteros 25 %; La casa de los espíritus 20 %; El conde de Montecristo 18 %; El extraño caso del doctor Jekyll y el señor Hyde 15 %; El Señor de los Anillos 15 %; Cien años de soledad 13 %; Siddhartha 13 %; El retrato de Dorian Gray 8 %; White Nights 8 %.

Orientador más repetido en los duelos 1-3: **90 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.99 | 0.92 | 0.98 | 75 % | 25 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.98 | 0.88 | 0.97 | 66 % | 34 % | 0 % | 0 % | 0 % |
| 3 | 33 | 0.98 | 0.91 | 0.96 | 64 % | 36 % | 0 % | 0 % | 0 % |
| 4 | 27 | 0.80 | 0.58 | 0.63 | 26 % | 13 % | 19 % | 43 % | 0 % |
| 5 | 19 | 0.80 | 0.59 | 0.65 | 18 % | 29 % | 13 % | 39 % | 0 % |
| 6 | 13 | 0.82 | 0.58 | 0.67 | 38 % | 12 % | 15 % | 35 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.64**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Dune 40 %; Drácula 35 %; El conde de Montecristo 18 %; The deerslayer 13 %; El extraño caso del doctor Jekyll y el señor Hyde 10 %; Los tres mosqueteros 10 %; Parménides 10 %; Anne of the Island 8 %; Dorothy and the Wizard in Oz 8 %; El gran Gatsby 8 %; Fahrenheit 451 8 %; Junkyard Planet 8 %; On the Beach 8 %; Orgullo y prejuicio 8 %; The Alhambra 8 %.

Orientador más repetido en los duelos 1-3: **40 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 18 % | 35 % | 34 % | 18 % | 35 % | 34 % | 18 % | 35 % | 34 % | 18 % | 35 % | 34 % |
| 1 | 43 % | 52 % | 28 % | 42 % | 50 % | 29 % | 42 % | 50 % | 28 % | 13 % | 32 % | 47 % |
| 2 | 17 % | 58 % | 34 % | 18 % | 57 % | 33 % | 18 % | 57 % | 33 % | 20 % | 35 % | 40 % |
| 3 | 37 % | 67 % | 26 % | 32 % | 65 % | 31 % | 33 % | 65 % | 28 % | 18 % | 32 % | 42 % |
| 4 | 50 % | 68 % | 21 % | 45 % | 65 % | 26 % | 45 % | 68 % | 25 % | 15 % | 42 % | 48 % |
| 5 | 48 % | 70 % | 21 % | 42 % | 67 % | 27 % | 45 % | 68 % | 25 % | 20 % | 38 % | 42 % |
| 6 | 50 % | 70 % | 20 % | 50 % | 63 % | 24 % | 50 % | 67 % | 23 % | 17 % | 40 % | 48 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **98 %**; R media de la propuesta: **0.89**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo 0.06, mediana -0.00, mínimo -0.02.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 60 de 60 propuestas con dato): **52 %**.

### Juegos (1095 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.91 | 0.75 | 0.83 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.86 | 0.74 | 0.74 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 40 | 0.83 | 0.74 | 0.70 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 40 | 0.69 | 0.58 | 0.48 | 0 % | 16 % | 84 % | 0 % | 0 % |
| 5 | 38 | 0.72 | 0.57 | 0.52 | 0 % | 34 % | 66 % | 0 % | 0 % |
| 6 | 34 | 0.73 | 0.58 | 0.54 | 0 % | 40 % | 60 % | 0 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.51**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Maracaibo 80 %; Risk Legacy 73 %; Risk 57 %; Monopoly 35 %; Bus 30 %; Coup 30 %; Friday 30 %; Barrage 28 %; Magic: The Gathering 28 %; Stella: Dixit Universe 25 %; Scrabble 23 %; Kingdomino 20 %; Automobile 18 %; QE 18 %; Cacao 15 %.

Orientador más repetido en los duelos 1-3: **80 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 1.00 | 0.74 | 0.99 | 95 % | 5 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.96 | 0.71 | 0.93 | 78 % | 23 % | 0 % | 0 % | 0 % |
| 3 | 37 | 0.96 | 0.71 | 0.93 | 81 % | 19 % | 0 % | 0 % | 0 % |
| 4 | 35 | 0.83 | 0.55 | 0.68 | 41 % | 17 % | 36 % | 6 % | 0 % |
| 5 | 29 | 0.85 | 0.55 | 0.73 | 52 % | 16 % | 22 % | 10 % | 0 % |
| 6 | 20 | 0.82 | 0.55 | 0.68 | 40 % | 20 % | 30 % | 10 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.70**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Robinson Crusoe: Adventures on the Cursed Island 15 %; Pandemic Legacy: Season 2 13 %; Coup 10 %; Gloomhaven: Jaws of the Lion 10 %; Imperial 10 %; Nemesis 10 %; Pandemic 10 %; Cryptid 8 %; Cyclades 8 %; Eldritch Horror 8 %; Frosthaven 8 %; Gloomhaven 8 %; Just One 8 %; Kemet 8 %; Maracaibo 8 %.

Orientador más repetido en los duelos 1-3: **15 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 13 % | 38 % | 43 % | 13 % | 38 % | 43 % | 13 % | 38 % | 43 % | 13 % | 38 % | 43 % |
| 1 | 17 % | 42 % | 40 % | 15 % | 40 % | 41 % | 17 % | 40 % | 40 % | 7 % | 28 % | 49 % |
| 2 | 22 % | 43 % | 37 % | 18 % | 42 % | 41 % | 20 % | 40 % | 38 % | 7 % | 25 % | 48 % |
| 3 | 27 % | 55 % | 31 % | 20 % | 47 % | 35 % | 27 % | 43 % | 32 % | 10 % | 18 % | 48 % |
| 4 | 42 % | 73 % | 22 % | 35 % | 48 % | 34 % | 38 % | 58 % | 26 % | 18 % | 30 % | 43 % |
| 5 | 62 % | 78 % | 18 % | 40 % | 50 % | 29 % | 45 % | 62 % | 23 % | 22 % | 33 % | 45 % |
| 6 | 55 % | 72 % | 16 % | 38 % | 53 % | 22 % | 52 % | 63 % | 20 % | 18 % | 28 % | 48 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **73 %**; R media de la propuesta: **0.58**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo 0.06, mediana -0.00, mínimo -0.02.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 60 de 60 propuestas con dato): **67 %**.

### Artistas (410 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.90 | 0.81 | 0.81 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.87 | 0.81 | 0.77 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 40 | 0.88 | 0.81 | 0.78 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 34 | 0.78 | 0.58 | 0.61 | 0 % | 35 % | 60 % | 4 % | 0 % |
| 5 | 34 | 0.77 | 0.56 | 0.59 | 0 % | 38 % | 41 % | 21 % | 0 % |
| 6 | 28 | 0.74 | 0.56 | 0.55 | 0 % | 36 % | 48 % | 16 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.59**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): AC/DC 73 %; The Beatles 70 %; Queen 55 %; Bruno Mars 33 %; Kiss 30 %; David Bowie 25 %; Elton John 25 %; Metallica 25 %; Bruce Springsteen 23 %; Lady Gaga 20 %; Wolfgang Amadeus Mozart 20 %; Bob Dylan 15 %; Led Zeppelin 15 %; Michael Jackson 15 %; Prince 15 %.

Orientador más repetido en los duelos 1-3: **73 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.95 | 0.78 | 0.90 | 54 % | 46 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.92 | 0.77 | 0.84 | 50 % | 50 % | 0 % | 0 % | 0 % |
| 3 | 25 | 0.93 | 0.77 | 0.87 | 54 % | 46 % | 0 % | 0 % | 0 % |
| 4 | 21 | 0.80 | 0.57 | 0.62 | 33 % | 5 % | 43 % | 19 % | 0 % |
| 5 | 14 | 0.81 | 0.57 | 0.65 | 36 % | 14 % | 32 % | 18 % | 0 % |
| 6 | 10 | 0.80 | 0.56 | 0.64 | 35 % | 10 % | 40 % | 15 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.63**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Amy Winehouse 18 %; Alejandro Sanz 15 %; Metallica 15 %; Avicii 13 %; Led Zeppelin 13 %; Michael Jackson 13 %; Queen 13 %; Shakira 13 %; The Rolling Stones 13 %; AC/DC 10 %; David Bowie 10 %; Gorillaz 10 %; Rosalía 10 %; Dua Lipa 8 %; Ludwig van Beethoven 8 %.

Orientador más repetido en los duelos 1-3: **18 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 7 % | 25 % | 56 % | 7 % | 25 % | 56 % | 7 % | 25 % | 56 % | 7 % | 25 % | 56 % |
| 1 | 20 % | 35 % | 34 % | 20 % | 33 % | 35 % | 18 % | 32 % | 36 % | 10 % | 32 % | 50 % |
| 2 | 15 % | 40 % | 30 % | 13 % | 38 % | 32 % | 18 % | 37 % | 30 % | 13 % | 30 % | 41 % |
| 3 | 20 % | 50 % | 32 % | 10 % | 40 % | 39 % | 18 % | 45 % | 33 % | 8 % | 35 % | 46 % |
| 4 | 20 % | 45 % | 30 % | 12 % | 40 % | 35 % | 20 % | 43 % | 30 % | 18 % | 35 % | 43 % |
| 5 | 18 % | 43 % | 28 % | 12 % | 42 % | 41 % | 22 % | 48 % | 29 % | 10 % | 33 % | 45 % |
| 6 | 18 % | 53 % | 29 % | 18 % | 42 % | 33 % | 20 % | 47 % | 30 % | 18 % | 33 % | 38 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **98 %**; R media de la propuesta: **0.80**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo -0.00, mediana -0.00, mínimo -0.00.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 0 de 60 propuestas con dato): **NaN %**.


## 2026-11-15 · commit 7dcd634

Banco `decide2.bench.test.ts` (BENCH=1). Usuario nuevo: 40 sesiones; curvas: 60 usuarios simulados; semillas fijas.

### Resumen

| Medida | Pelis | Series | Libros | Juegos | Artistas |
|---|---|---|---|---|---|
| Acierto tras 6 duelos, modo sabe | 37 % | 45 % | 50 % | 55 % | 18 % |
| Acierto tras 6 duelos, modo azar | 32 % | 33 % | 50 % | 38 % | 18 % |
| Acierto tras 6 duelos, modo pasa | 35 % | 40 % | 50 % | 52 % | 20 % |
| Acierto tras 6 duelos, modo ruido | 5 % | 7 % | 17 % | 18 % | 18 % |
| Acierto nuevo tras 6 duelos (sabe, entre lo no visto) | 18 % | 22 % | 37 % | 32 % | 3 % |
| Propuesta ya vista tras 6 duelos (sabe) | 60 % | 52 % | 25 % | 42 % | 87 % |
| Media de rA·rB, duelos 4-6 (usuario nuevo) | 0.69 | 0.68 | 0.71 | 0.51 | 0.59 |
| Sesiones con el orientador más repetido en los duelos 1-3 (usuario nuevo) | 57 % | 70 % | 90 % | 80 % | 73 % |
| La propuesta es un orientador enseñado (sabe) | 73 % | 77 % | 98 % | 73 % | 98 % |
| R media de la propuesta (sabe) | 0.75 | 0.77 | 0.89 | 0.58 | 0.80 |
| Calidad media de la propuesta (percentil de voteAvg) | 67 % | 55 % | 52 % | 67 % | — |
| Peso de la previa: rango de st.base (máx − mín) | 0.14 | 0.02 | 0.08 | 0.08 | 0.00 |

### Pelis (935 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.99 | 0.98 | 0.97 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.98 | 0.97 | 0.97 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 39 | 0.99 | 0.97 | 0.98 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 39 | 0.82 | 0.58 | 0.67 | 0 % | 26 % | 29 % | 45 % | 0 % |
| 5 | 34 | 0.85 | 0.58 | 0.72 | 0 % | 32 % | 35 % | 32 % | 0 % |
| 6 | 29 | 0.83 | 0.56 | 0.69 | 0 % | 26 % | 33 % | 41 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.69**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): La La Land 57 %; El caballero oscuro: La leyenda renace 50 %; El rey león 48 %; Parque Jurásico 48 %; Toy Story 45 %; Vengadores: Endgame 28 %; Avatar 25 %; El lobo de Wall Street 25 %; Todo a la vez en todas partes 25 %; Bonnie y Clyde 23 %; Interstellar 23 %; Puñales por la espalda 15 %; Pulp Fiction 15 %; La guerra de las galaxias 15 %; El señor de los anillos: La comunidad del anillo 13 %.

Orientador más repetido en los duelos 1-3: **57 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.98 | 0.93 | 0.97 | 64 % | 36 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.98 | 0.92 | 0.95 | 51 % | 49 % | 0 % | 0 % | 0 % |
| 3 | 34 | 0.98 | 0.92 | 0.96 | 62 % | 38 % | 0 % | 0 % | 0 % |
| 4 | 33 | 0.80 | 0.55 | 0.65 | 23 % | 17 % | 14 % | 47 % | 0 % |
| 5 | 24 | 0.81 | 0.56 | 0.65 | 23 % | 10 % | 23 % | 44 % | 0 % |
| 6 | 21 | 0.83 | 0.57 | 0.69 | 26 % | 29 % | 29 % | 17 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.66**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Bonnie y Clyde 20 %; La La Land 20 %; El rey león 15 %; Shutter Island 15 %; Toy Story 15 %; Avatar 13 %; El caballero oscuro: La leyenda renace 13 %; Apocalypse Now 10 %; El padrino 10 %; Puñales por la espalda 10 %; Pulp Fiction 10 %; La guerra de las galaxias 10 %; Blade Runner 8 %; El resplandor 8 %; La herencia del viento 8 %.

Orientador más repetido en los duelos 1-3: **20 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 5 % | 38 % | 53 % | 5 % | 38 % | 53 % | 5 % | 38 % | 53 % | 5 % | 38 % | 53 % |
| 1 | 15 % | 32 % | 44 % | 15 % | 32 % | 44 % | 15 % | 32 % | 44 % | 5 % | 22 % | 58 % |
| 2 | 22 % | 35 % | 37 % | 22 % | 35 % | 37 % | 22 % | 35 % | 37 % | 3 % | 8 % | 56 % |
| 3 | 23 % | 43 % | 36 % | 23 % | 43 % | 36 % | 23 % | 42 % | 37 % | 5 % | 10 % | 53 % |
| 4 | 33 % | 43 % | 33 % | 32 % | 40 % | 35 % | 28 % | 38 % | 33 % | 8 % | 13 % | 47 % |
| 5 | 38 % | 52 % | 26 % | 35 % | 42 % | 32 % | 35 % | 42 % | 30 % | 8 % | 15 % | 47 % |
| 6 | 37 % | 52 % | 29 % | 32 % | 45 % | 37 % | 35 % | 43 % | 32 % | 5 % | 12 % | 45 % |

Solo `sabe`, entre lo que el usuario no ha visto: «acierto nuevo» = la propuesta está en su 10 % favorito de las obras que no ha visto y además no la ha visto; «propuesta ya vista» = % de propuestas que ya había visto.

| Duelos | acierto | acierto nuevo | propuesta ya vista |
|---|---|---|---|
| 0 | 5 % | 3 % | 20 % |
| 1 | 15 % | 3 % | 75 % |
| 2 | 22 % | 3 % | 68 % |
| 3 | 23 % | 7 % | 58 % |
| 4 | 33 % | 5 % | 67 % |
| 5 | 38 % | 13 % | 68 % |
| 6 | 37 % | 18 % | 60 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **73 %**; R media de la propuesta: **0.75**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo 0.11, mediana -0.01, mínimo -0.03.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 60 de 60 propuestas con dato): **67 %**.

### Series (1022 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.98 | 0.97 | 0.96 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.99 | 0.97 | 0.98 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 40 | 0.99 | 0.97 | 0.98 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 40 | 0.78 | 0.63 | 0.62 | 0 % | 11 % | 35 % | 54 % | 0 % |
| 5 | 39 | 0.84 | 0.63 | 0.71 | 0 % | 26 % | 35 % | 40 % | 0 % |
| 6 | 34 | 0.84 | 0.63 | 0.72 | 0 % | 31 % | 31 % | 38 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.68**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Bob Esponja 70 %; The Boys 53 %; El mentalista 45 %; Anatomía de Grey 35 %; Sexo en Nueva York 33 %; Sobrenatural 30 %; Crónicas vampíricas 30 %; American Horror Story 28 %; Juego de tronos 25 %; Mentes criminales 23 %; Friends 18 %; The Bear 18 %; Dexter 15 %; From 15 %; Ataque a los titanes 13 %.

Orientador más repetido en los duelos 1-3: **70 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.99 | 0.93 | 0.98 | 68 % | 33 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.99 | 0.93 | 0.97 | 59 % | 41 % | 0 % | 0 % | 0 % |
| 3 | 39 | 0.98 | 0.93 | 0.96 | 50 % | 50 % | 0 % | 0 % | 0 % |
| 4 | 38 | 0.80 | 0.56 | 0.64 | 16 % | 8 % | 24 % | 53 % | 0 % |
| 5 | 32 | 0.85 | 0.57 | 0.73 | 27 % | 17 % | 14 % | 42 % | 0 % |
| 6 | 27 | 0.84 | 0.57 | 0.71 | 22 % | 15 % | 28 % | 35 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.69**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Anatomía de Grey 23 %; Smallville 18 %; Crónicas vampíricas 18 %; Juego de tronos 15 %; The Boys 15 %; El mentalista 15 %; Urgencias 13 %; Las chicas Gilmore 13 %; Sobrenatural 13 %; American Horror Story 10 %; Dark 10 %; Homeland 10 %; The Walking Dead 10 %; True Detective 10 %; Dexter 8 %.

Orientador más repetido en los duelos 1-3: **23 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 % | 17 % | 69 % | 0 % | 17 % | 69 % | 0 % | 17 % | 69 % | 0 % | 17 % | 69 % |
| 1 | 27 % | 52 % | 28 % | 25 % | 50 % | 29 % | 25 % | 52 % | 28 % | 8 % | 25 % | 50 % |
| 2 | 37 % | 58 % | 25 % | 37 % | 58 % | 26 % | 38 % | 60 % | 25 % | 13 % | 18 % | 52 % |
| 3 | 37 % | 63 % | 25 % | 35 % | 62 % | 27 % | 38 % | 65 % | 25 % | 10 % | 23 % | 52 % |
| 4 | 45 % | 67 % | 19 % | 43 % | 67 % | 20 % | 50 % | 70 % | 20 % | 10 % | 27 % | 51 % |
| 5 | 42 % | 75 % | 20 % | 37 % | 68 % | 23 % | 42 % | 72 % | 21 % | 10 % | 23 % | 52 % |
| 6 | 45 % | 73 % | 19 % | 33 % | 73 % | 27 % | 40 % | 67 % | 22 % | 7 % | 27 % | 51 % |

Solo `sabe`, entre lo que el usuario no ha visto: «acierto nuevo» = la propuesta está en su 10 % favorito de las obras que no ha visto y además no la ha visto; «propuesta ya vista» = % de propuestas que ya había visto.

| Duelos | acierto | acierto nuevo | propuesta ya vista |
|---|---|---|---|
| 0 | 0 % | 0 % | 48 % |
| 1 | 27 % | 5 % | 58 % |
| 2 | 37 % | 17 % | 57 % |
| 3 | 37 % | 18 % | 52 % |
| 4 | 45 % | 23 % | 45 % |
| 5 | 42 % | 22 % | 47 % |
| 6 | 45 % | 22 % | 52 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **77 %**; R media de la propuesta: **0.77**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo 0.01, mediana 0.00, mínimo -0.01.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 60 de 60 propuestas con dato): **55 %**.

### Libros (971 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.98 | 0.97 | 0.96 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.97 | 0.93 | 0.94 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 37 | 0.97 | 0.92 | 0.94 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 29 | 0.86 | 0.62 | 0.74 | 0 % | 53 % | 17 % | 29 % | 0 % |
| 5 | 22 | 0.86 | 0.59 | 0.73 | 0 % | 48 % | 25 % | 27 % | 0 % |
| 6 | 14 | 0.81 | 0.63 | 0.64 | 0 % | 39 % | 14 % | 46 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.71**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Dune 90 %; El arte de la guerra 85 %; El hombre en busca de sentido 73 %; Drácula 68 %; El amor en los tiempos del cólera 68 %; Fahrenheit 451 35 %; Los tres mosqueteros 25 %; La casa de los espíritus 20 %; El conde de Montecristo 18 %; El extraño caso del doctor Jekyll y el señor Hyde 15 %; El Señor de los Anillos 15 %; Cien años de soledad 13 %; Siddhartha 13 %; El retrato de Dorian Gray 8 %; White Nights 8 %.

Orientador más repetido en los duelos 1-3: **90 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.99 | 0.92 | 0.98 | 75 % | 25 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.98 | 0.88 | 0.97 | 66 % | 34 % | 0 % | 0 % | 0 % |
| 3 | 33 | 0.98 | 0.91 | 0.96 | 64 % | 36 % | 0 % | 0 % | 0 % |
| 4 | 27 | 0.80 | 0.58 | 0.63 | 26 % | 13 % | 19 % | 43 % | 0 % |
| 5 | 19 | 0.80 | 0.59 | 0.65 | 18 % | 29 % | 13 % | 39 % | 0 % |
| 6 | 13 | 0.82 | 0.58 | 0.67 | 38 % | 12 % | 15 % | 35 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.64**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Dune 40 %; Drácula 35 %; El conde de Montecristo 18 %; The deerslayer 13 %; El extraño caso del doctor Jekyll y el señor Hyde 10 %; Los tres mosqueteros 10 %; Parménides 10 %; Anne of the Island 8 %; Dorothy and the Wizard in Oz 8 %; El gran Gatsby 8 %; Fahrenheit 451 8 %; Junkyard Planet 8 %; On the Beach 8 %; Orgullo y prejuicio 8 %; The Alhambra 8 %.

Orientador más repetido en los duelos 1-3: **40 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 18 % | 35 % | 34 % | 18 % | 35 % | 34 % | 18 % | 35 % | 34 % | 18 % | 35 % | 34 % |
| 1 | 43 % | 52 % | 28 % | 42 % | 50 % | 29 % | 42 % | 50 % | 28 % | 13 % | 32 % | 47 % |
| 2 | 17 % | 58 % | 34 % | 18 % | 57 % | 33 % | 18 % | 57 % | 33 % | 20 % | 35 % | 40 % |
| 3 | 37 % | 67 % | 26 % | 32 % | 65 % | 31 % | 33 % | 65 % | 28 % | 18 % | 32 % | 42 % |
| 4 | 50 % | 68 % | 21 % | 45 % | 65 % | 26 % | 45 % | 68 % | 25 % | 15 % | 42 % | 48 % |
| 5 | 48 % | 70 % | 21 % | 42 % | 67 % | 27 % | 45 % | 68 % | 25 % | 20 % | 38 % | 42 % |
| 6 | 50 % | 70 % | 20 % | 50 % | 63 % | 24 % | 50 % | 67 % | 23 % | 17 % | 40 % | 48 % |

Solo `sabe`, entre lo que el usuario no ha visto: «acierto nuevo» = la propuesta está en su 10 % favorito de las obras que no ha visto y además no la ha visto; «propuesta ya vista» = % de propuestas que ya había visto.

| Duelos | acierto | acierto nuevo | propuesta ya vista |
|---|---|---|---|
| 0 | 18 % | 12 % | 23 % |
| 1 | 43 % | 22 % | 33 % |
| 2 | 17 % | 15 % | 30 % |
| 3 | 37 % | 28 % | 28 % |
| 4 | 50 % | 37 % | 23 % |
| 5 | 48 % | 38 % | 22 % |
| 6 | 50 % | 37 % | 25 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **98 %**; R media de la propuesta: **0.89**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo 0.06, mediana -0.00, mínimo -0.02.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 60 de 60 propuestas con dato): **52 %**.

### Juegos (1095 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.91 | 0.75 | 0.83 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.86 | 0.74 | 0.74 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 40 | 0.83 | 0.74 | 0.70 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 40 | 0.69 | 0.58 | 0.48 | 0 % | 16 % | 84 % | 0 % | 0 % |
| 5 | 38 | 0.72 | 0.57 | 0.52 | 0 % | 34 % | 66 % | 0 % | 0 % |
| 6 | 34 | 0.73 | 0.58 | 0.54 | 0 % | 40 % | 60 % | 0 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.51**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Maracaibo 80 %; Risk Legacy 73 %; Risk 57 %; Monopoly 35 %; Bus 30 %; Coup 30 %; Friday 30 %; Barrage 28 %; Magic: The Gathering 28 %; Stella: Dixit Universe 25 %; Scrabble 23 %; Kingdomino 20 %; Automobile 18 %; QE 18 %; Cacao 15 %.

Orientador más repetido en los duelos 1-3: **80 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 1.00 | 0.74 | 0.99 | 95 % | 5 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.96 | 0.71 | 0.93 | 78 % | 23 % | 0 % | 0 % | 0 % |
| 3 | 37 | 0.96 | 0.71 | 0.93 | 81 % | 19 % | 0 % | 0 % | 0 % |
| 4 | 35 | 0.83 | 0.55 | 0.68 | 41 % | 17 % | 36 % | 6 % | 0 % |
| 5 | 29 | 0.85 | 0.55 | 0.73 | 52 % | 16 % | 22 % | 10 % | 0 % |
| 6 | 20 | 0.82 | 0.55 | 0.68 | 40 % | 20 % | 30 % | 10 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.70**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Robinson Crusoe: Adventures on the Cursed Island 15 %; Pandemic Legacy: Season 2 13 %; Coup 10 %; Gloomhaven: Jaws of the Lion 10 %; Imperial 10 %; Nemesis 10 %; Pandemic 10 %; Cryptid 8 %; Cyclades 8 %; Eldritch Horror 8 %; Frosthaven 8 %; Gloomhaven 8 %; Just One 8 %; Kemet 8 %; Maracaibo 8 %.

Orientador más repetido en los duelos 1-3: **15 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 13 % | 38 % | 43 % | 13 % | 38 % | 43 % | 13 % | 38 % | 43 % | 13 % | 38 % | 43 % |
| 1 | 17 % | 42 % | 40 % | 15 % | 40 % | 41 % | 17 % | 40 % | 40 % | 7 % | 28 % | 49 % |
| 2 | 22 % | 43 % | 37 % | 18 % | 42 % | 41 % | 20 % | 40 % | 38 % | 7 % | 25 % | 48 % |
| 3 | 27 % | 55 % | 31 % | 20 % | 47 % | 35 % | 27 % | 43 % | 32 % | 10 % | 18 % | 48 % |
| 4 | 42 % | 73 % | 22 % | 35 % | 48 % | 34 % | 38 % | 58 % | 26 % | 18 % | 30 % | 43 % |
| 5 | 62 % | 78 % | 18 % | 40 % | 50 % | 29 % | 45 % | 62 % | 23 % | 22 % | 33 % | 45 % |
| 6 | 55 % | 72 % | 16 % | 38 % | 53 % | 22 % | 52 % | 63 % | 20 % | 18 % | 28 % | 48 % |

Solo `sabe`, entre lo que el usuario no ha visto: «acierto nuevo» = la propuesta está en su 10 % favorito de las obras que no ha visto y además no la ha visto; «propuesta ya vista» = % de propuestas que ya había visto.

| Duelos | acierto | acierto nuevo | propuesta ya vista |
|---|---|---|---|
| 0 | 13 % | 7 % | 27 % |
| 1 | 17 % | 10 % | 35 % |
| 2 | 22 % | 12 % | 40 % |
| 3 | 27 % | 15 % | 42 % |
| 4 | 42 % | 17 % | 52 % |
| 5 | 62 % | 33 % | 40 % |
| 6 | 55 % | 32 % | 42 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **73 %**; R media de la propuesta: **0.58**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo 0.06, mediana -0.00, mínimo -0.02.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 60 de 60 propuestas con dato): **67 %**.

### Artistas (410 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.90 | 0.81 | 0.81 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.87 | 0.81 | 0.77 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 40 | 0.88 | 0.81 | 0.78 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 34 | 0.78 | 0.58 | 0.61 | 0 % | 35 % | 60 % | 4 % | 0 % |
| 5 | 34 | 0.77 | 0.56 | 0.59 | 0 % | 38 % | 41 % | 21 % | 0 % |
| 6 | 28 | 0.74 | 0.56 | 0.55 | 0 % | 36 % | 48 % | 16 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.59**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): AC/DC 73 %; The Beatles 70 %; Queen 55 %; Bruno Mars 33 %; Kiss 30 %; David Bowie 25 %; Elton John 25 %; Metallica 25 %; Bruce Springsteen 23 %; Lady Gaga 20 %; Wolfgang Amadeus Mozart 20 %; Bob Dylan 15 %; Led Zeppelin 15 %; Michael Jackson 15 %; Prince 15 %.

Orientador más repetido en los duelos 1-3: **73 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.95 | 0.78 | 0.90 | 54 % | 46 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.92 | 0.77 | 0.84 | 50 % | 50 % | 0 % | 0 % | 0 % |
| 3 | 25 | 0.93 | 0.77 | 0.87 | 54 % | 46 % | 0 % | 0 % | 0 % |
| 4 | 21 | 0.80 | 0.57 | 0.62 | 33 % | 5 % | 43 % | 19 % | 0 % |
| 5 | 14 | 0.81 | 0.57 | 0.65 | 36 % | 14 % | 32 % | 18 % | 0 % |
| 6 | 10 | 0.80 | 0.56 | 0.64 | 35 % | 10 % | 40 % | 15 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.63**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Amy Winehouse 18 %; Alejandro Sanz 15 %; Metallica 15 %; Avicii 13 %; Led Zeppelin 13 %; Michael Jackson 13 %; Queen 13 %; Shakira 13 %; The Rolling Stones 13 %; AC/DC 10 %; David Bowie 10 %; Gorillaz 10 %; Rosalía 10 %; Dua Lipa 8 %; Ludwig van Beethoven 8 %.

Orientador más repetido en los duelos 1-3: **18 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 7 % | 25 % | 56 % | 7 % | 25 % | 56 % | 7 % | 25 % | 56 % | 7 % | 25 % | 56 % |
| 1 | 20 % | 35 % | 34 % | 20 % | 33 % | 35 % | 18 % | 32 % | 36 % | 10 % | 32 % | 50 % |
| 2 | 15 % | 40 % | 30 % | 13 % | 38 % | 32 % | 18 % | 37 % | 30 % | 13 % | 30 % | 41 % |
| 3 | 20 % | 50 % | 32 % | 10 % | 40 % | 39 % | 18 % | 45 % | 33 % | 8 % | 35 % | 46 % |
| 4 | 20 % | 45 % | 30 % | 12 % | 40 % | 35 % | 20 % | 43 % | 30 % | 18 % | 35 % | 43 % |
| 5 | 18 % | 43 % | 28 % | 12 % | 42 % | 41 % | 22 % | 48 % | 29 % | 10 % | 33 % | 45 % |
| 6 | 18 % | 53 % | 29 % | 18 % | 42 % | 33 % | 20 % | 47 % | 30 % | 18 % | 33 % | 38 % |

Solo `sabe`, entre lo que el usuario no ha visto: «acierto nuevo» = la propuesta está en su 10 % favorito de las obras que no ha visto y además no la ha visto; «propuesta ya vista» = % de propuestas que ya había visto.

| Duelos | acierto | acierto nuevo | propuesta ya vista |
|---|---|---|---|
| 0 | 7 % | 0 % | 83 % |
| 1 | 20 % | 0 % | 82 % |
| 2 | 15 % | 0 % | 87 % |
| 3 | 20 % | 0 % | 88 % |
| 4 | 20 % | 0 % | 87 % |
| 5 | 18 % | 3 % | 78 % |
| 6 | 18 % | 3 % | 87 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **98 %**; R media de la propuesta: **0.80**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo -0.00, mediana -0.00, mínimo -0.00.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 0 de 60 propuestas con dato): **NaN %**.

