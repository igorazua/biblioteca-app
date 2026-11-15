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


## 2026-11-15 · commit 7bd0033

Banco `decide2.bench.test.ts` (BENCH=1). Usuario nuevo: 40 sesiones; curvas: 60 usuarios simulados; semillas fijas.

### Resumen

| Medida | Pelis | Series | Libros | Juegos | Artistas |
|---|---|---|---|---|---|
| Acierto tras 6 duelos, modo sabe | 43 % | 48 % | 47 % | 53 % | 20 % |
| Acierto tras 6 duelos, modo azar | 40 % | 42 % | 33 % | 33 % | 23 % |
| Acierto tras 6 duelos, modo pasa | 40 % | 53 % | 42 % | 47 % | 17 % |
| Acierto tras 6 duelos, modo ruido | 15 % | 12 % | 15 % | 20 % | 12 % |
| Acierto nuevo tras 6 duelos (sabe, entre lo no visto) | 15 % | 20 % | 35 % | 38 % | 0 % |
| Propuesta ya vista tras 6 duelos (sabe) | 62 % | 48 % | 27 % | 28 % | 82 % |
| Media de rA·rB, duelos 4-6 (usuario nuevo) | 0.65 | 0.65 | 0.68 | 0.49 | 0.65 |
| Sesiones con el orientador más repetido en los duelos 1-3 (usuario nuevo) | 88 % | 78 % | 90 % | 83 % | 100 % |
| La propuesta es un orientador enseñado (sabe) | 85 % | 93 % | 100 % | 60 % | 100 % |
| R media de la propuesta (sabe) | 0.77 | 0.85 | 0.81 | 0.53 | 0.88 |
| Calidad media de la propuesta (percentil de voteAvg) | 88 % | 56 % | 81 % | 85 % | — |
| Peso de la previa: rango de st.base (máx − mín) | 0.62 | 0.49 | 0.59 | 0.61 | 0.66 |

### Pelis (935 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.98 | 0.98 | 0.97 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.99 | 0.97 | 0.97 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 39 | 0.98 | 0.97 | 0.97 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 39 | 0.79 | 0.58 | 0.62 | 0 % | 14 % | 36 % | 50 % | 0 % |
| 5 | 34 | 0.81 | 0.58 | 0.65 | 0 % | 21 % | 34 % | 46 % | 0 % |
| 6 | 24 | 0.83 | 0.61 | 0.68 | 0 % | 27 % | 31 % | 42 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.65**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Toy Story 88 %; El lobo de Wall Street 57 %; El caballero oscuro: La leyenda renace 48 %; La guerra de las galaxias 48 %; El rey león 45 %; Parque Jurásico 43 %; Avatar 33 %; Vengadores: Endgame 28 %; Dune 20 %; El señor de los anillos: La comunidad del anillo 20 %; El padrino 15 %; Harry Potter y la piedra filosofal 15 %; Regreso al futuro 15 %; Todo a la vez en todas partes 15 %; Malditos bastardos 13 %.

Orientador más repetido en los duelos 1-3: **88 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.98 | 0.92 | 0.96 | 60 % | 40 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.98 | 0.92 | 0.95 | 53 % | 48 % | 0 % | 0 % | 0 % |
| 3 | 37 | 0.98 | 0.92 | 0.96 | 54 % | 46 % | 0 % | 0 % | 0 % |
| 4 | 37 | 0.78 | 0.55 | 0.60 | 19 % | 11 % | 28 % | 42 % | 0 % |
| 5 | 29 | 0.84 | 0.56 | 0.70 | 31 % | 17 % | 21 % | 31 % | 0 % |
| 6 | 22 | 0.85 | 0.57 | 0.71 | 34 % | 18 % | 14 % | 34 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.66**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): El caballero oscuro: La leyenda renace 20 %; El resplandor 20 %; Shutter Island 20 %; El rey león 18 %; Toy Story 18 %; Parque Jurásico 15 %; Psicosis 13 %; Todo a la vez en todas partes 13 %; El padrino 10 %; El señor de los anillos: La comunidad del anillo 10 %; Forrest Gump 10 %; La La Land 10 %; Pulp Fiction 10 %; La ventana indiscreta 10 %; Blade Runner 8 %.

Orientador más repetido en los duelos 1-3: **20 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 5 % | 33 % | 53 % | 5 % | 33 % | 53 % | 5 % | 33 % | 53 % | 5 % | 33 % | 53 % |
| 1 | 32 % | 40 % | 35 % | 32 % | 40 % | 35 % | 32 % | 40 % | 35 % | 10 % | 20 % | 45 % |
| 2 | 35 % | 43 % | 35 % | 35 % | 45 % | 36 % | 35 % | 43 % | 35 % | 12 % | 25 % | 49 % |
| 3 | 42 % | 47 % | 30 % | 43 % | 48 % | 30 % | 40 % | 45 % | 31 % | 15 % | 25 % | 46 % |
| 4 | 40 % | 50 % | 26 % | 38 % | 53 % | 29 % | 42 % | 48 % | 29 % | 12 % | 22 % | 50 % |
| 5 | 42 % | 52 % | 23 % | 35 % | 48 % | 30 % | 38 % | 42 % | 27 % | 17 % | 23 % | 45 % |
| 6 | 43 % | 57 % | 23 % | 40 % | 53 % | 31 % | 40 % | 48 % | 28 % | 15 % | 22 % | 46 % |

Solo `sabe`, entre lo que el usuario no ha visto: «acierto nuevo» = la propuesta está en su 10 % favorito de las obras que no ha visto y además no la ha visto; «propuesta ya vista» = % de propuestas que ya había visto.

| Duelos | acierto | acierto nuevo | propuesta ya vista |
|---|---|---|---|
| 0 | 5 % | 3 % | 20 % |
| 1 | 32 % | 12 % | 62 % |
| 2 | 35 % | 15 % | 62 % |
| 3 | 42 % | 25 % | 55 % |
| 4 | 40 % | 15 % | 67 % |
| 5 | 42 % | 15 % | 67 % |
| 6 | 43 % | 15 % | 62 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **85 %**; R media de la propuesta: **0.77**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo 0.42, mediana -0.03, mínimo -0.20.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 57 de 60 propuestas con dato): **88 %**.

### Series (1022 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.98 | 0.97 | 0.96 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.99 | 0.97 | 0.98 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 34 | 0.99 | 0.97 | 0.97 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 34 | 0.83 | 0.64 | 0.68 | 0 % | 19 % | 38 % | 43 % | 0 % |
| 5 | 28 | 0.82 | 0.63 | 0.67 | 0 % | 27 % | 29 % | 45 % | 0 % |
| 6 | 23 | 0.76 | 0.63 | 0.58 | 0 % | 15 % | 20 % | 65 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.65**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Bob Esponja 78 %; Anatomía de Grey 48 %; Sobrenatural 48 %; Crónicas vampíricas 45 %; The Boys 43 %; Mentes criminales 38 %; Juego de tronos 28 %; Sexo en Nueva York 28 %; El mentalista 25 %; American Horror Story 18 %; Smallville 18 %; Urgencias 15 %; Friends 15 %; The Bear 15 %; Demon Slayer: Kimetsu no Yaiba 13 %.

Orientador más repetido en los duelos 1-3: **78 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.99 | 0.93 | 0.98 | 53 % | 48 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.98 | 0.93 | 0.96 | 51 % | 49 % | 0 % | 0 % | 0 % |
| 3 | 36 | 0.99 | 0.93 | 0.98 | 65 % | 35 % | 0 % | 0 % | 0 % |
| 4 | 36 | 0.81 | 0.56 | 0.66 | 11 % | 13 % | 33 % | 43 % | 0 % |
| 5 | 30 | 0.85 | 0.57 | 0.73 | 25 % | 25 % | 20 % | 30 % | 0 % |
| 6 | 19 | 0.82 | 0.56 | 0.69 | 24 % | 18 % | 11 % | 47 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.69**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): El mentalista 25 %; Dexter 18 %; Smallville 18 %; Bob Esponja 18 %; Crónicas vampíricas 18 %; True Detective 18 %; Las chicas Gilmore 15 %; Sexo en Nueva York 15 %; Sobrenatural 13 %; The Boys 13 %; Urgencias 10 %; Friends 10 %; Planet Earth 10 %; Arrow 8 %; Beauty & the Beast 8 %.

Orientador más repetido en los duelos 1-3: **25 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 % | 17 % | 69 % | 0 % | 17 % | 69 % | 0 % | 17 % | 69 % | 0 % | 17 % | 69 % |
| 1 | 28 % | 53 % | 27 % | 27 % | 52 % | 29 % | 27 % | 53 % | 28 % | 7 % | 22 % | 51 % |
| 2 | 37 % | 58 % | 24 % | 35 % | 57 % | 24 % | 35 % | 57 % | 24 % | 7 % | 20 % | 55 % |
| 3 | 43 % | 60 % | 23 % | 42 % | 58 % | 23 % | 43 % | 60 % | 23 % | 8 % | 18 % | 54 % |
| 4 | 58 % | 72 % | 16 % | 53 % | 65 % | 18 % | 53 % | 65 % | 18 % | 13 % | 22 % | 54 % |
| 5 | 57 % | 78 % | 17 % | 47 % | 70 % | 20 % | 53 % | 68 % | 19 % | 13 % | 27 % | 56 % |
| 6 | 48 % | 77 % | 18 % | 42 % | 63 % | 23 % | 53 % | 75 % | 18 % | 12 % | 25 % | 54 % |

Solo `sabe`, entre lo que el usuario no ha visto: «acierto nuevo» = la propuesta está en su 10 % favorito de las obras que no ha visto y además no la ha visto; «propuesta ya vista» = % de propuestas que ya había visto.

| Duelos | acierto | acierto nuevo | propuesta ya vista |
|---|---|---|---|
| 0 | 0 % | 0 % | 48 % |
| 1 | 28 % | 7 % | 63 % |
| 2 | 37 % | 12 % | 58 % |
| 3 | 43 % | 18 % | 53 % |
| 4 | 58 % | 32 % | 47 % |
| 5 | 57 % | 28 % | 45 % |
| 6 | 48 % | 20 % | 48 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **93 %**; R media de la propuesta: **0.85**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo 0.27, mediana -0.01, mínimo -0.23.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 60 de 60 propuestas con dato): **56 %**.

### Libros (971 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.98 | 0.97 | 0.96 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.98 | 0.93 | 0.96 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 30 | 0.98 | 0.92 | 0.96 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 30 | 0.80 | 0.59 | 0.65 | 0 % | 27 % | 35 % | 38 % | 0 % |
| 5 | 27 | 0.85 | 0.59 | 0.71 | 0 % | 43 % | 30 % | 28 % | 0 % |
| 6 | 20 | 0.84 | 0.59 | 0.70 | 0 % | 35 % | 40 % | 25 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.68**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Dune 90 %; El hombre en busca de sentido 90 %; El arte de la guerra 60 %; El Señor de los Anillos 43 %; Animal Farm 30 %; El amor en los tiempos del cólera 23 %; El retrato de Dorian Gray 20 %; La casa de los espíritus 20 %; Un mundo feliz 20 %; Don Quijote de la Mancha 15 %; El conde de Montecristo 15 %; Fahrenheit 451 13 %; Matar a un ruiseñor 13 %; El guardián entre el centeno 10 %; Harry Potter y la piedra filosofal 10 %.

Orientador más repetido en los duelos 1-3: **90 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.98 | 0.92 | 0.97 | 63 % | 38 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.97 | 0.88 | 0.95 | 50 % | 50 % | 0 % | 0 % | 0 % |
| 3 | 30 | 0.97 | 0.90 | 0.95 | 52 % | 48 % | 0 % | 0 % | 0 % |
| 4 | 20 | 0.88 | 0.57 | 0.76 | 38 % | 28 % | 20 % | 15 % | 0 % |
| 5 | 12 | 0.83 | 0.59 | 0.68 | 21 % | 29 % | 21 % | 29 % | 0 % |
| 6 | 8 | 0.83 | 0.55 | 0.69 | 25 % | 31 % | 19 % | 25 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.72**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Dune 53 %; El extraño caso del doctor Jekyll y el señor Hyde 30 %; El conde de Montecristo 25 %; Los tres mosqueteros 25 %; El hombre en busca de sentido 23 %; Cumbres borrascosas 20 %; El Señor de los Anillos 15 %; Picasso 10 %; A Fighting Man Of Mars 8 %; Agnes Grey 8 %; Anne of the Island 8 %; Orgullo y prejuicio 8 %; The warlord of Mars #3 8 %; Мы 5 %; Alice's Adventures in Wonderland / Through the Looking Glass 5 %.

Orientador más repetido en los duelos 1-3: **53 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 2 % | 35 % | 44 % | 2 % | 35 % | 44 % | 2 % | 35 % | 44 % | 2 % | 35 % | 44 % |
| 1 | 50 % | 53 % | 25 % | 48 % | 52 % | 26 % | 48 % | 53 % | 25 % | 20 % | 38 % | 51 % |
| 2 | 47 % | 60 % | 24 % | 45 % | 58 % | 25 % | 43 % | 58 % | 26 % | 22 % | 32 % | 37 % |
| 3 | 33 % | 52 % | 32 % | 30 % | 48 % | 33 % | 30 % | 48 % | 32 % | 25 % | 33 % | 43 % |
| 4 | 48 % | 53 % | 22 % | 42 % | 50 % | 27 % | 42 % | 53 % | 26 % | 20 % | 35 % | 45 % |
| 5 | 47 % | 63 % | 22 % | 32 % | 52 % | 29 % | 42 % | 58 % | 25 % | 17 % | 32 % | 46 % |
| 6 | 47 % | 65 % | 23 % | 33 % | 57 % | 28 % | 42 % | 58 % | 28 % | 15 % | 28 % | 45 % |

Solo `sabe`, entre lo que el usuario no ha visto: «acierto nuevo» = la propuesta está en su 10 % favorito de las obras que no ha visto y además no la ha visto; «propuesta ya vista» = % de propuestas que ya había visto.

| Duelos | acierto | acierto nuevo | propuesta ya vista |
|---|---|---|---|
| 0 | 2 % | 0 % | 18 % |
| 1 | 50 % | 28 % | 32 % |
| 2 | 47 % | 28 % | 30 % |
| 3 | 33 % | 22 % | 32 % |
| 4 | 48 % | 37 % | 27 % |
| 5 | 47 % | 38 % | 23 % |
| 6 | 47 % | 35 % | 27 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **100 %**; R media de la propuesta: **0.81**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo 0.39, mediana -0.03, mínimo -0.20.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 51 de 60 propuestas con dato): **81 %**.

### Juegos (1095 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.91 | 0.75 | 0.83 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.86 | 0.74 | 0.73 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 38 | 0.84 | 0.74 | 0.71 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 38 | 0.70 | 0.58 | 0.49 | 0 % | 17 % | 83 % | 0 % | 0 % |
| 5 | 35 | 0.69 | 0.58 | 0.47 | 0 % | 17 % | 83 % | 0 % | 0 % |
| 6 | 33 | 0.72 | 0.57 | 0.51 | 0 % | 33 % | 67 % | 0 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.49**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Maracaibo 83 %; Risk Legacy 73 %; Risk 48 %; Barrage 45 %; Monopoly 45 %; Magic: The Gathering 35 %; Scrabble 35 %; Stella: Dixit Universe 30 %; Friday 28 %; Bus 18 %; QE 18 %; Automobile 13 %; Coup 13 %; Santorini 13 %; Coimbra 10 %.

Orientador más repetido en los duelos 1-3: **83 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 1.00 | 0.87 | 1.00 | 95 % | 5 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.95 | 0.70 | 0.90 | 70 % | 30 % | 0 % | 0 % | 0 % |
| 3 | 37 | 0.97 | 0.74 | 0.93 | 76 % | 24 % | 0 % | 0 % | 0 % |
| 4 | 35 | 0.79 | 0.55 | 0.62 | 36 % | 13 % | 40 % | 11 % | 0 % |
| 5 | 31 | 0.79 | 0.55 | 0.62 | 34 % | 16 % | 45 % | 5 % | 0 % |
| 6 | 24 | 0.82 | 0.55 | 0.66 | 38 % | 25 % | 25 % | 13 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.63**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Maracaibo 18 %; Robinson Crusoe: Adventures on the Cursed Island 15 %; Coup 13 %; Gloomhaven 10 %; Pandemic Legacy: Season 2 10 %; Risk Legacy 10 %; Wonderland's War 10 %; Barrage 8 %; Belfort 8 %; Eldritch Horror 8 %; Food Chain Magnate 8 %; Gloomhaven: Jaws of the Lion 8 %; Imperial 8 %; Just One 8 %; Kemet 8 %.

Orientador más repetido en los duelos 1-3: **18 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 13 % | 20 % | 43 % | 13 % | 20 % | 43 % | 13 % | 20 % | 43 % | 13 % | 20 % | 43 % |
| 1 | 8 % | 28 % | 49 % | 8 % | 30 % | 47 % | 10 % | 25 % | 45 % | 5 % | 32 % | 52 % |
| 2 | 13 % | 32 % | 38 % | 17 % | 38 % | 41 % | 17 % | 35 % | 40 % | 8 % | 25 % | 51 % |
| 3 | 18 % | 38 % | 36 % | 20 % | 42 % | 40 % | 20 % | 40 % | 38 % | 8 % | 20 % | 52 % |
| 4 | 43 % | 52 % | 26 % | 38 % | 53 % | 30 % | 32 % | 50 % | 31 % | 18 % | 32 % | 45 % |
| 5 | 50 % | 70 % | 23 % | 35 % | 58 % | 31 % | 43 % | 55 % | 26 % | 18 % | 38 % | 42 % |
| 6 | 53 % | 67 % | 23 % | 33 % | 52 % | 31 % | 47 % | 58 % | 25 % | 20 % | 37 % | 41 % |

Solo `sabe`, entre lo que el usuario no ha visto: «acierto nuevo» = la propuesta está en su 10 % favorito de las obras que no ha visto y además no la ha visto; «propuesta ya vista» = % de propuestas que ya había visto.

| Duelos | acierto | acierto nuevo | propuesta ya vista |
|---|---|---|---|
| 0 | 13 % | 7 % | 27 % |
| 1 | 8 % | 5 % | 43 % |
| 2 | 13 % | 13 % | 27 % |
| 3 | 18 % | 13 % | 25 % |
| 4 | 43 % | 28 % | 37 % |
| 5 | 50 % | 37 % | 30 % |
| 6 | 53 % | 38 % | 28 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **60 %**; R media de la propuesta: **0.53**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo 0.41, mediana -0.04, mínimo -0.20.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 56 de 60 propuestas con dato): **85 %**.

### Artistas (410 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.98 | 0.98 | 0.97 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.92 | 0.81 | 0.85 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 33 | 0.88 | 0.81 | 0.77 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 30 | 0.81 | 0.58 | 0.65 | 0 % | 52 % | 45 % | 3 % | 0 % |
| 5 | 26 | 0.81 | 0.57 | 0.65 | 0 % | 56 % | 37 % | 8 % | 0 % |
| 6 | 17 | 0.80 | 0.57 | 0.64 | 0 % | 47 % | 50 % | 3 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.65**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Rosalía 100 %; Queen 85 %; The Beatles 68 %; Michael Jackson 65 %; Bad Bunny 35 %; Bruno Mars 25 %; Elton John 20 %; Prince 20 %; Harry Styles 18 %; Katy Perry 18 %; Kiss 18 %; Amy Winehouse 15 %; David Bowie 10 %; Alejandro Sanz 8 %; Lady Gaga 8 %.

Orientador más repetido en los duelos 1-3: **100 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.96 | 0.78 | 0.91 | 54 % | 46 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.92 | 0.78 | 0.84 | 46 % | 54 % | 0 % | 0 % | 0 % |
| 3 | 25 | 0.94 | 0.77 | 0.88 | 56 % | 44 % | 0 % | 0 % | 0 % |
| 4 | 20 | 0.81 | 0.57 | 0.66 | 35 % | 15 % | 40 % | 10 % | 0 % |
| 5 | 14 | 0.83 | 0.55 | 0.68 | 36 % | 18 % | 29 % | 18 % | 0 % |
| 6 | 10 | 0.84 | 0.55 | 0.69 | 45 % | 15 % | 30 % | 10 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.67**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Michael Jackson 20 %; Rosalía 20 %; Led Zeppelin 18 %; Queen 18 %; The Rolling Stones 18 %; Amy Winehouse 15 %; The Beatles 13 %; AC/DC 10 %; Alejandro Sanz 10 %; Kiss 10 %; Prince 10 %; Ricky Martin 10 %; Avicii 8 %; Bad Bunny 8 %; Calvin Harris 8 %.

Orientador más repetido en los duelos 1-3: **20 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 15 % | 20 % | 38 % | 15 % | 20 % | 38 % | 15 % | 20 % | 38 % | 15 % | 20 % | 38 % |
| 1 | 12 % | 35 % | 37 % | 12 % | 35 % | 37 % | 12 % | 35 % | 37 % | 7 % | 25 % | 56 % |
| 2 | 13 % | 37 % | 34 % | 13 % | 37 % | 36 % | 13 % | 38 % | 34 % | 7 % | 23 % | 54 % |
| 3 | 20 % | 37 % | 34 % | 18 % | 32 % | 34 % | 18 % | 35 % | 33 % | 8 % | 23 % | 52 % |
| 4 | 23 % | 43 % | 31 % | 18 % | 40 % | 35 % | 23 % | 38 % | 35 % | 12 % | 20 % | 50 % |
| 5 | 22 % | 42 % | 29 % | 23 % | 38 % | 31 % | 20 % | 40 % | 31 % | 10 % | 23 % | 50 % |
| 6 | 20 % | 48 % | 32 % | 23 % | 38 % | 30 % | 17 % | 37 % | 31 % | 12 % | 30 % | 46 % |

Solo `sabe`, entre lo que el usuario no ha visto: «acierto nuevo» = la propuesta está en su 10 % favorito de las obras que no ha visto y además no la ha visto; «propuesta ya vista» = % de propuestas que ya había visto.

| Duelos | acierto | acierto nuevo | propuesta ya vista |
|---|---|---|---|
| 0 | 15 % | 0 % | 92 % |
| 1 | 12 % | 0 % | 78 % |
| 2 | 13 % | 0 % | 85 % |
| 3 | 20 % | 2 % | 77 % |
| 4 | 23 % | 0 % | 82 % |
| 5 | 22 % | 0 % | 85 % |
| 6 | 20 % | 0 % | 82 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **100 %**; R media de la propuesta: **0.88**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo 0.35, mediana 0.01, mínimo -0.31.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 0 de 60 propuestas con dato): **NaN %**.


## 2026-11-15 · commit 6e62455

Banco `decide2.bench.test.ts` (BENCH=1). Usuario nuevo: 40 sesiones; curvas: 60 usuarios simulados; semillas fijas.

### Resumen

| Medida | Pelis | Series | Libros | Juegos | Artistas |
|---|---|---|---|---|---|
| Acierto tras 6 duelos, modo sabe | 38 % | 40 % | 35 % | 57 % | 27 % |
| Acierto tras 6 duelos, modo azar | 33 % | 27 % | 28 % | 42 % | 17 % |
| Acierto tras 6 duelos, modo pasa | 35 % | 33 % | 33 % | 43 % | 8 % |
| Acierto tras 6 duelos, modo ruido | 18 % | 13 % | 10 % | 12 % | 7 % |
| Acierto nuevo tras 6 duelos (sabe, entre lo no visto) | 33 % | 27 % | 32 % | 50 % | 13 % |
| Propuesta ya vista tras 6 duelos (sabe) | 22 % | 38 % | 20 % | 8 % | 53 % |
| Media de rA·rB, duelos 4-6 (usuario nuevo) | 0.78 | 0.76 | 0.60 | 0.53 | 0.59 |
| Sesiones con el orientador más repetido en los duelos 1-3 (usuario nuevo) | 75 % | 60 % | 85 % | 70 % | 100 % |
| La propuesta es un orientador enseñado (sabe) | 0 % | 0 % | 0 % | 0 % | 0 % |
| R media de la propuesta (sabe) | 0.31 | 0.60 | 0.53 | 0.23 | 0.49 |
| Calidad media de la propuesta (percentil de voteAvg) | 85 % | 56 % | 82 % | 81 % | — |
| Peso de la previa: rango de st.base (máx − mín) | 0.62 | 0.49 | 0.59 | 0.61 | 0.66 |

### Pelis (935 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.98 | 0.98 | 0.97 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.99 | 0.98 | 0.97 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 31 | 0.99 | 0.97 | 0.97 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 28 | 0.87 | 0.61 | 0.76 | 0 % | 30 % | 41 % | 29 % | 0 % |
| 5 | 25 | 0.89 | 0.59 | 0.79 | 0 % | 40 % | 32 % | 28 % | 0 % |
| 6 | 18 | 0.89 | 0.59 | 0.80 | 0 % | 42 % | 36 % | 22 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.78**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): El caballero oscuro: La leyenda renace 75 %; Puñales por la espalda 55 %; El rey león 50 %; Forrest Gump 45 %; Parque Jurásico 40 %; Titanic 33 %; Bonnie y Clyde 25 %; Érase una vez en... Hollywood 25 %; Toy Story 23 %; Mystic River 18 %; Shutter Island 18 %; Vengadores: Endgame 18 %; 2001: Una odisea del espacio 13 %; Brazil 13 %; Interstellar 10 %.

Orientador más repetido en los duelos 1-3: **75 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.98 | 0.92 | 0.97 | 69 % | 31 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.98 | 0.92 | 0.97 | 69 % | 31 % | 0 % | 0 % | 0 % |
| 3 | 36 | 0.98 | 0.92 | 0.96 | 57 % | 43 % | 0 % | 0 % | 0 % |
| 4 | 29 | 0.86 | 0.56 | 0.73 | 31 % | 19 % | 14 % | 36 % | 0 % |
| 5 | 24 | 0.90 | 0.57 | 0.82 | 52 % | 19 % | 13 % | 17 % | 0 % |
| 6 | 17 | 0.85 | 0.57 | 0.72 | 38 % | 18 % | 18 % | 26 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.75**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Shutter Island 28 %; El rey león 15 %; El resplandor 13 %; Psicosis 13 %; Bonnie y Clyde 10 %; El caballero oscuro: La leyenda renace 10 %; Puñales por la espalda 10 %; La La Land 10 %; Pulp Fiction 10 %; La guerra de las galaxias 10 %; Toy Story 10 %; 12 Years a Slave 8 %; Amélie 8 %; Apocalypse Now 8 %; Dil Chahta Hai 8 %.

Orientador más repetido en los duelos 1-3: **28 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 3 % | 33 % | 54 % | 3 % | 33 % | 54 % | 3 % | 33 % | 54 % | 3 % | 33 % | 54 % |
| 1 | 5 % | 27 % | 49 % | 5 % | 27 % | 49 % | 5 % | 27 % | 49 % | 7 % | 27 % | 53 % |
| 2 | 20 % | 30 % | 41 % | 20 % | 30 % | 42 % | 20 % | 30 % | 41 % | 8 % | 27 % | 50 % |
| 3 | 25 % | 40 % | 42 % | 27 % | 42 % | 43 % | 25 % | 42 % | 42 % | 13 % | 28 % | 50 % |
| 4 | 30 % | 47 % | 35 % | 28 % | 42 % | 36 % | 27 % | 47 % | 36 % | 18 % | 32 % | 43 % |
| 5 | 33 % | 50 % | 32 % | 27 % | 43 % | 36 % | 28 % | 47 % | 35 % | 18 % | 25 % | 45 % |
| 6 | 38 % | 53 % | 30 % | 33 % | 45 % | 36 % | 35 % | 52 % | 32 % | 18 % | 28 % | 50 % |

Solo `sabe`, entre lo que el usuario no ha visto: «acierto nuevo» = la propuesta está en su 10 % favorito de las obras que no ha visto y además no la ha visto; «propuesta ya vista» = % de propuestas que ya había visto.

| Duelos | acierto | acierto nuevo | propuesta ya vista |
|---|---|---|---|
| 0 | 3 % | 8 % | 22 % |
| 1 | 5 % | 5 % | 13 % |
| 2 | 20 % | 18 % | 18 % |
| 3 | 25 % | 22 % | 18 % |
| 4 | 30 % | 28 % | 17 % |
| 5 | 33 % | 30 % | 17 % |
| 6 | 38 % | 33 % | 22 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **0 %**; R media de la propuesta: **0.31**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo 0.42, mediana -0.03, mínimo -0.20.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 60 de 60 propuestas con dato): **85 %**.

### Series (1022 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.99 | 0.98 | 0.98 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.99 | 0.97 | 0.98 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 39 | 0.99 | 0.97 | 0.98 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 39 | 0.88 | 0.65 | 0.78 | 0 % | 41 % | 36 % | 23 % | 0 % |
| 5 | 35 | 0.87 | 0.63 | 0.76 | 0 % | 44 % | 27 % | 29 % | 0 % |
| 6 | 24 | 0.85 | 0.65 | 0.72 | 0 % | 25 % | 38 % | 38 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.76**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): The Boys 60 %; The Bear 50 %; Dark 48 %; Peaky Blinders 40 %; Bob Esponja 30 %; American Horror Story 25 %; Smallville 25 %; El mentalista 25 %; The Wire 25 %; Ataque a los titanes 23 %; The White Lotus 23 %; True Detective 23 %; Urgencias 20 %; From 20 %; Juego de tronos 15 %.

Orientador más repetido en los duelos 1-3: **60 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.98 | 0.93 | 0.97 | 63 % | 38 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.98 | 0.93 | 0.96 | 55 % | 45 % | 0 % | 0 % | 0 % |
| 3 | 31 | 0.99 | 0.93 | 0.97 | 68 % | 32 % | 0 % | 0 % | 0 % |
| 4 | 27 | 0.88 | 0.70 | 0.78 | 39 % | 11 % | 24 % | 26 % | 0 % |
| 5 | 24 | 0.91 | 0.61 | 0.83 | 38 % | 23 % | 19 % | 21 % | 0 % |
| 6 | 18 | 0.90 | 0.56 | 0.81 | 33 % | 33 % | 14 % | 19 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.80**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): True Detective 38 %; The Boys 18 %; Smallville 15 %; The Wire 15 %; Bob Esponja 13 %; El mentalista 13 %; Gene Roddenberry's Andromeda 10 %; Anatomía de Grey 10 %; Peaky Blinders 10 %; CSI: Las Vegas 8 %; Friends 8 %; Las chicas Gilmore 8 %; Hércules: sus viajes legendarios 8 %; Juego de tronos 8 %; Los Simpson 8 %.

Orientador más repetido en los duelos 1-3: **38 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 18 % | 32 % | 41 % | 18 % | 32 % | 41 % | 18 % | 32 % | 41 % | 18 % | 32 % | 41 % |
| 1 | 20 % | 52 % | 34 % | 20 % | 52 % | 34 % | 20 % | 52 % | 34 % | 17 % | 38 % | 41 % |
| 2 | 23 % | 52 % | 29 % | 23 % | 52 % | 30 % | 23 % | 52 % | 28 % | 8 % | 38 % | 48 % |
| 3 | 18 % | 52 % | 29 % | 17 % | 53 % | 30 % | 20 % | 55 % | 28 % | 13 % | 35 % | 49 % |
| 4 | 28 % | 53 % | 23 % | 25 % | 53 % | 24 % | 28 % | 52 % | 24 % | 18 % | 37 % | 45 % |
| 5 | 33 % | 65 % | 19 % | 25 % | 60 % | 22 % | 27 % | 53 % | 23 % | 17 % | 33 % | 48 % |
| 6 | 40 % | 62 % | 16 % | 27 % | 50 % | 23 % | 33 % | 53 % | 20 % | 13 % | 25 % | 50 % |

Solo `sabe`, entre lo que el usuario no ha visto: «acierto nuevo» = la propuesta está en su 10 % favorito de las obras que no ha visto y además no la ha visto; «propuesta ya vista» = % de propuestas que ya había visto.

| Duelos | acierto | acierto nuevo | propuesta ya vista |
|---|---|---|---|
| 0 | 18 % | 18 % | 30 % |
| 1 | 20 % | 22 % | 32 % |
| 2 | 23 % | 22 % | 35 % |
| 3 | 18 % | 18 % | 23 % |
| 4 | 28 % | 20 % | 38 % |
| 5 | 33 % | 20 % | 47 % |
| 6 | 40 % | 27 % | 38 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **0 %**; R media de la propuesta: **0.60**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo 0.27, mediana -0.01, mínimo -0.23.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 60 de 60 propuestas con dato): **56 %**.

### Libros (971 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.97 | 0.97 | 0.95 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.98 | 0.92 | 0.95 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 30 | 0.98 | 0.91 | 0.95 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 28 | 0.78 | 0.59 | 0.61 | 0 % | 18 % | 43 % | 39 % | 0 % |
| 5 | 26 | 0.77 | 0.59 | 0.60 | 0 % | 23 % | 29 % | 48 % | 0 % |
| 6 | 16 | 0.77 | 0.60 | 0.61 | 0 % | 25 % | 25 % | 50 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.60**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): El hombre en busca de sentido 85 %; A Little Life 75 %; El arte de la guerra 70 %; El principito 48 %; Siddhartha 35 %; Dune 33 %; El Señor de los Anillos 25 %; El conde de Montecristo 20 %; White Nights 20 %; El extranjero 15 %; Pedro Páramo 15 %; Lord of the Flies 13 %; Los miserables 13 %; The Handmaid's Tale 13 %; Fahrenheit 451 10 %.

Orientador más repetido en los duelos 1-3: **85 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 1.00 | 0.91 | 0.99 | 95 % | 5 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.99 | 0.92 | 0.98 | 79 % | 21 % | 0 % | 0 % | 0 % |
| 3 | 20 | 0.98 | 0.91 | 0.96 | 70 % | 30 % | 0 % | 0 % | 0 % |
| 4 | 12 | 0.86 | 0.55 | 0.73 | 38 % | 29 % | 4 % | 29 % | 0 % |
| 5 | 9 | 0.94 | 0.60 | 0.89 | 56 % | 33 % | 0 % | 11 % | 0 % |
| 6 | 7 | 0.90 | 0.62 | 0.82 | 50 % | 21 % | 7 % | 21 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.80**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): El arte de la guerra 10 %; The deerslayer 10 %; A Fighting Man Of Mars 8 %; Anne of the Island 8 %; Harry Potter y la piedra filosofal 8 %; Lord of the Flies 8 %; Los tres mosqueteros 8 %; The Alhambra 8 %; The Enchanted Castle 8 %; The Thirty-Nine Steps 8 %; Анна Каренина 5 %; Agnes Grey 5 %; Book of common prayer 5 %; Cartas a Lucilio 5 %; Dorothy and the Wizard in Oz 5 %.

Orientador más repetido en los duelos 1-3: **10 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 18 % | 48 % | 28 % | 18 % | 48 % | 28 % | 18 % | 48 % | 28 % | 18 % | 48 % | 28 % |
| 1 | 28 % | 52 % | 25 % | 28 % | 52 % | 25 % | 28 % | 52 % | 25 % | 18 % | 37 % | 37 % |
| 2 | 22 % | 50 % | 28 % | 20 % | 48 % | 29 % | 25 % | 52 % | 26 % | 13 % | 30 % | 45 % |
| 3 | 28 % | 55 % | 22 % | 30 % | 57 % | 24 % | 28 % | 62 % | 24 % | 15 % | 33 % | 40 % |
| 4 | 37 % | 55 % | 24 % | 30 % | 53 % | 29 % | 28 % | 58 % | 25 % | 10 % | 30 % | 45 % |
| 5 | 42 % | 58 % | 24 % | 37 % | 53 % | 25 % | 30 % | 58 % | 25 % | 12 % | 27 % | 40 % |
| 6 | 35 % | 62 % | 23 % | 28 % | 58 % | 28 % | 33 % | 60 % | 23 % | 10 % | 30 % | 41 % |

Solo `sabe`, entre lo que el usuario no ha visto: «acierto nuevo» = la propuesta está en su 10 % favorito de las obras que no ha visto y además no la ha visto; «propuesta ya vista» = % de propuestas que ya había visto.

| Duelos | acierto | acierto nuevo | propuesta ya vista |
|---|---|---|---|
| 0 | 18 % | 18 % | 15 % |
| 1 | 28 % | 25 % | 18 % |
| 2 | 22 % | 17 % | 15 % |
| 3 | 28 % | 23 % | 18 % |
| 4 | 37 % | 27 % | 25 % |
| 5 | 42 % | 35 % | 23 % |
| 6 | 35 % | 32 % | 20 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **0 %**; R media de la propuesta: **0.53**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo 0.39, mediana -0.03, mínimo -0.20.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 59 de 60 propuestas con dato): **82 %**.

### Juegos (1095 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.90 | 0.84 | 0.81 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.86 | 0.74 | 0.73 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 40 | 0.87 | 0.74 | 0.75 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 40 | 0.72 | 0.58 | 0.51 | 0 % | 20 % | 80 % | 0 % | 0 % |
| 5 | 39 | 0.75 | 0.58 | 0.56 | 0 % | 49 % | 51 % | 0 % | 0 % |
| 6 | 39 | 0.73 | 0.57 | 0.53 | 0 % | 40 % | 60 % | 0 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.53**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Automobile 70 %; Scrabble 63 %; Santorini 53 %; Maracaibo 50 %; Ajedrez 38 %; Imperial 38 %; Kingdomino 33 %; Risk Legacy 33 %; UNO 33 %; Bora Bora 20 %; Coup 18 %; Magic: The Gathering 18 %; Barrage 15 %; Belfort 15 %; Bus 15 %.

Orientador más repetido en los duelos 1-3: **70 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 1.00 | 0.87 | 1.00 | 98 % | 3 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.98 | 0.71 | 0.96 | 85 % | 15 % | 0 % | 0 % | 0 % |
| 3 | 34 | 0.95 | 0.71 | 0.90 | 71 % | 29 % | 0 % | 0 % | 0 % |
| 4 | 28 | 0.86 | 0.55 | 0.73 | 59 % | 7 % | 23 % | 11 % | 0 % |
| 5 | 21 | 0.86 | 0.56 | 0.73 | 52 % | 14 % | 31 % | 2 % | 0 % |
| 6 | 16 | 0.90 | 0.55 | 0.81 | 63 % | 16 % | 16 % | 6 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.75**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Coup 18 %; Pandemic Legacy: Season 2 13 %; Robinson Crusoe: Adventures on the Cursed Island 13 %; Eldritch Horror 10 %; Gloomhaven 10 %; Gloomhaven: Jaws of the Lion 10 %; Nemesis: Retaliation 10 %; So Clover! 10 %; Belfort 8 %; Frosthaven 8 %; Imperial 8 %; ISS Vanguard 8 %; Just One 8 %; Nemesis 8 %; Risk Legacy 8 %.

Orientador más repetido en los duelos 1-3: **18 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 2 % | 17 % | 58 % | 2 % | 17 % | 58 % | 2 % | 17 % | 58 % | 2 % | 17 % | 58 % |
| 1 | 10 % | 28 % | 47 % | 12 % | 30 % | 49 % | 10 % | 30 % | 48 % | 5 % | 22 % | 51 % |
| 2 | 17 % | 42 % | 36 % | 15 % | 32 % | 38 % | 15 % | 33 % | 40 % | 12 % | 23 % | 56 % |
| 3 | 22 % | 53 % | 34 % | 15 % | 48 % | 40 % | 17 % | 40 % | 36 % | 5 % | 15 % | 58 % |
| 4 | 50 % | 63 % | 22 % | 32 % | 48 % | 34 % | 42 % | 55 % | 27 % | 17 % | 38 % | 48 % |
| 5 | 57 % | 65 % | 22 % | 38 % | 45 % | 35 % | 40 % | 57 % | 27 % | 15 % | 28 % | 49 % |
| 6 | 57 % | 78 % | 17 % | 42 % | 55 % | 33 % | 43 % | 63 % | 25 % | 12 % | 30 % | 49 % |

Solo `sabe`, entre lo que el usuario no ha visto: «acierto nuevo» = la propuesta está en su 10 % favorito de las obras que no ha visto y además no la ha visto; «propuesta ya vista» = % de propuestas que ya había visto.

| Duelos | acierto | acierto nuevo | propuesta ya vista |
|---|---|---|---|
| 0 | 2 % | 2 % | 20 % |
| 1 | 10 % | 12 % | 7 % |
| 2 | 17 % | 18 % | 12 % |
| 3 | 22 % | 20 % | 12 % |
| 4 | 50 % | 43 % | 13 % |
| 5 | 57 % | 48 % | 10 % |
| 6 | 57 % | 50 % | 8 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **0 %**; R media de la propuesta: **0.23**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo 0.41, mediana -0.04, mínimo -0.20.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 60 de 60 propuestas con dato): **81 %**.

### Artistas (410 obras visibles)

#### Censo de orientadores, usuario nuevo (40 sesiones, respuestas al azar)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.88 | 0.82 | 0.77 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.87 | 0.81 | 0.75 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 3 | 37 | 0.86 | 0.81 | 0.74 | 0 % | 100 % | 0 % | 0 % | 0 % |
| 4 | 34 | 0.78 | 0.57 | 0.61 | 0 % | 28 % | 65 % | 7 % | 0 % |
| 5 | 25 | 0.76 | 0.57 | 0.58 | 0 % | 30 % | 58 % | 12 % | 0 % |
| 6 | 20 | 0.77 | 0.57 | 0.58 | 0 % | 33 % | 57 % | 10 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.59**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Tame Impala 100 %; Bad Bunny 55 %; Rosalía 55 %; George Michael 35 %; Wolfgang Amadeus Mozart 33 %; Elton John 30 %; Shakira 25 %; Gorillaz 23 %; Taylor Swift 23 %; Ludwig van Beethoven 20 %; Harry Styles 18 %; Tupac Shakur 15 %; Alejandro Sanz 13 %; Avicii 13 %; Eminem 13 %.

Orientador más repetido en los duelos 1-3: **100 %** de las sesiones.

#### Censo de orientadores, usuario con 30 obras propias (40 sesiones)

| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 0.98 | 0.78 | 0.97 | 88 % | 13 % | 0 % | 0 % | 0 % |
| 2 | 40 | 0.95 | 0.78 | 0.89 | 66 % | 34 % | 0 % | 0 % | 0 % |
| 3 | 25 | 0.95 | 0.79 | 0.89 | 66 % | 34 % | 0 % | 0 % | 0 % |
| 4 | 19 | 0.89 | 0.56 | 0.77 | 58 % | 11 % | 21 % | 11 % | 0 % |
| 5 | 10 | 0.82 | 0.59 | 0.67 | 40 % | 5 % | 45 % | 10 % | 0 % |
| 6 | 5 | 0.84 | 0.68 | 0.71 | 40 % | 10 % | 50 % | 0 % | 0 % |
| 7 | 0 | — | — | — | 0 % | 0 % | 0 % | 0 % | 0 % |

Media de rA·rB en los duelos 4-6: **0.73**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): Amy Winehouse 18 %; Led Zeppelin 13 %; Ludwig van Beethoven 13 %; Whitney Houston 13 %; Avicii 10 %; Claude Debussy 10 %; Dua Lipa 10 %; Alaska y Dinarama 8 %; Alizzz 8 %; Dire Straits 8 %; George Michael 8 %; Herbie Hancock 8 %; Kiss 8 %; Ricky Martin 8 %; Tame Impala 8 %.

Orientador más repetido en los duelos 1-3: **18 %** de las sesiones.

#### Curva de acierto (60 usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)

| Duelos | sabe acierto | sabe en 3 | sabe percentil | azar acierto | azar en 3 | azar percentil | pasa acierto | pasa en 3 | pasa percentil | ruido acierto | ruido en 3 | ruido percentil |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 5 % | 23 % | 70 % | 5 % | 23 % | 70 % | 5 % | 23 % | 70 % | 5 % | 23 % | 70 % |
| 1 | 12 % | 32 % | 49 % | 8 % | 27 % | 51 % | 10 % | 30 % | 54 % | 5 % | 22 % | 60 % |
| 2 | 10 % | 28 % | 50 % | 5 % | 23 % | 52 % | 12 % | 30 % | 51 % | 3 % | 17 % | 63 % |
| 3 | 12 % | 32 % | 47 % | 10 % | 22 % | 51 % | 12 % | 33 % | 47 % | 8 % | 20 % | 60 % |
| 4 | 25 % | 50 % | 35 % | 13 % | 35 % | 43 % | 10 % | 32 % | 43 % | 8 % | 22 % | 61 % |
| 5 | 30 % | 53 % | 35 % | 8 % | 33 % | 46 % | 12 % | 28 % | 42 % | 7 % | 23 % | 55 % |
| 6 | 27 % | 50 % | 32 % | 17 % | 37 % | 47 % | 8 % | 27 % | 42 % | 7 % | 20 % | 53 % |

Solo `sabe`, entre lo que el usuario no ha visto: «acierto nuevo» = la propuesta está en su 10 % favorito de las obras que no ha visto y además no la ha visto; «propuesta ya vista» = % de propuestas que ya había visto.

| Duelos | acierto | acierto nuevo | propuesta ya vista |
|---|---|---|---|
| 0 | 5 % | 3 % | 40 % |
| 1 | 12 % | 8 % | 47 % |
| 2 | 10 % | 8 % | 45 % |
| 3 | 12 % | 10 % | 38 % |
| 4 | 25 % | 13 % | 62 % |
| 5 | 30 % | 12 % | 57 % |
| 6 | 27 % | 13 % | 53 % |

#### Propuesta = orientador y peso de la previa (modo sabe, tras 6 duelos)

- La propuesta es una obra enseñada en un duelo de la sesión: **0 %**; R media de la propuesta: **0.49**.
- `st.base` al iniciar (log de la previa, 300 obras): máximo 0.35, mediana 0.01, mínimo -0.31.
- Calidad media de la propuesta (percentil de `voteAvg` en su estantería, 0 de 60 propuestas con dato): **NaN %**.

