# Títulos y años del catálogo: revisión de obras famosas

Fecha: 2026-11-15
Alcance: obras con `fameTier` 1 o 2, sin `hidden`, de las estanterías `book`, `movie` y `series`.
Fuentes de datos: `app/src/data/shelves/*.json` (leídos con un script de node, no con la herramienta de lectura).

## Resumen

| Estantería | Obras revisadas | Título mal | Año mal | Año dudoso |
|---|---|---|---|---|
| book | 120 | 37 (incluye 1 duplicado) | 6 | 2 |
| movie | 120 | 1 | 0 | 0 |
| series | 120 | 2 | 0 | 1 |

Criterio de título: se marca cuando el título mostrado está en otro idioma o alfabeto y existe un título habitual en España. Los títulos que en España se usan en inglés (Dune, Friends, Breaking Bad, Interstellar, Pulp Fiction, etc.) no se marcan.

Criterio de año: se marca cuando no corresponde a la primera publicación del libro o al estreno de la película o serie. "Dudoso" significa que el año está en el margen de fuentes distintas y conviene confirmarlo.

Las obras sin marca no aparecen en las tablas.

Columnas: id · título que se muestra hoy · título en español propuesto · fuente · año actual · año correcto · nivel de fama (`fameTier`).

Fuente «Wikidata»: etiqueta en español (`labels`, `languages=es`) de la entidad indicada. Fuente «sin fuente»: propuesta propia, sin comprobación externa.

## book (120 revisadas)

| id | Título mostrado hoy | Título en español propuesto | Fuente | Año actual | Año correcto | Fama |
|---|---|---|---|---|---|---|
| book:the-handmaid-s-tale-1985 | The Handmaid's Tale | El cuento de la criada | Wikidata (Q1541914) | 1985 | | 1 |
| book:animal-farm-1945 | Animal Farm | Rebelión en la granja | Wikidata (Q1396889) | 1945 | | 1 |
| book:lord-of-the-flies-1954 | Lord of the Flies | El señor de las moscas | Wikidata (Q271764) | 1954 | | 1 |
| book:romeo-and-juliet-1597 | Romeo and Juliet | Romeo y Julieta | Wikidata (Q83186) | 1597 | | 1 |
| book:the-merchant-of-venice-1600 | The Merchant of Venice | El mercader de Venecia | Wikidata (Q206400) | 1600 | | 2 |
| book:alice-s-adventures-in-wonderland-1865 | Alice's Adventures in Wonderland | Alicia en el país de las maravillas | Wikidata (Q92640) | 1865 | | 2 |
| book:of-mice-and-men-1937 | Of Mice and Men | De ratones y hombres | Wikidata (Q457977) | 1937 | | 2 |
| book:charlie-and-the-chocolate-factory-1964 | Charlie and the Chocolate Factory | Charlie y la fábrica de chocolate | Wikidata (Q466605) | 1964 | | 2 |
| book:sense-and-sensibility-1811 | Sense and Sensibility | Sentido y sensibilidad | sin fuente (la etiqueta de Wikidata está en inglés) | 1811 | | 2 |
| book:adventures-of-huckleberry-finn-1876 | Adventures of Huckleberry Finn | Las aventuras de Huckleberry Finn | Wikidata (Q215410) | 1876 | 1884 | 2 |
| book:the-stand-1978 | The Stand | La danza de la muerte | sin fuente (la etiqueta de Wikidata está en inglés) | 1978 | | 2 |
| book:the-wonderful-wizard-of-oz-1899 | The Wonderful Wizard of Oz | El maravilloso mago de Oz | Wikidata (Q130295) | 1899 | 1900 (dudoso; 1899 es el año de copyright en algunas fuentes) | 2 |
| book:the-five-love-languages-1992 | The Five Love Languages | Los 5 lenguajes del amor | Wikidata (Q786405) | 1992 | | 2 |
| book:treasure-island-1880 | Treasure Island | La isla del tesoro | sin fuente (sin wikidataId) | 1880 | 1883 | 2 |
| book:le-fantome-de-l-opera-1911 | Le fantôme de l'opéra | El fantasma de la ópera | Wikidata (Q272506) | 1911 | | 2 |
| book:a-christmas-carol-1843 | A Christmas Carol | Canción de Navidad | sin fuente (la etiqueta de Wikidata está en inglés) | 1843 | | 2 |
| book:tao-te-ching--400 | Tao te Ching | Tao Te King | sin fuente (la etiqueta de Wikidata es «Dào Dé Jing») | -400 | | 2 |
| book:the-canterbury-tales-1387 | The Canterbury Tales | Los cuentos de Canterbury | Wikidata (Q191663) | 1387 | | 2 |
| book:decamerone-1351 | Decamerone | El Decamerón | Wikidata (Q16438) | 1351 | | 2 |
| book:uncle-tom-s-cabin-1850 | Uncle Tom's Cabin | La cabaña del tío Tom | Wikidata (Q2222) | 1850 | 1852 | 2 |
| book:metamorfosi-8 | Metamorfosi | Las metamorfosis | Wikidata (Q184742) | 8 | | 2 |
| book:der-zauberberg-1924 | Der Zauberberg | La montaña mágica | Wikidata (Q212898) | 1924 | | 2 |
| book:der-proce-1925 | Der Proceß | El proceso | Wikidata (Q36097) | 1925 | | 2 |
| book:manifest-der-kommunistischen-partei-1848 | Manifest der Kommunistischen Partei | Manifiesto del Partido Comunista | Wikidata (Q40591) | 1848 | | 2 |
| book:jonathan-livingston-le-goeland-1970 | Jonathan Livingston Le Goeland | Juan Salvador Gaviota | Wikidata (Q373536) | 1970 | | 2 |
| book:the-left-hand-of-darkness-1969 | The Left Hand of Darkness | La mano izquierda de la oscuridad | Wikidata (Q2008211) | 1969 | | 2 |
| book:the-kite-runner-2003 | The Kite Runner | Cometas en el cielo | Wikidata (Q637839) | 2003 | | 2 |
| book:harry-potter-and-the-deathly-hallows-2007 | Harry Potter and the Deathly Hallows | Harry Potter y las reliquias de la muerte | Wikidata (Q46758) | 2007 | | 2 |
| book:harry-potter-and-the-cursed-child-2016 | Harry Potter and the Cursed Child | Harry Potter y el legado maldito | Wikidata (Q20711488) | 2016 | | 2 |
| book:sunrise-on-the-reaping-2025 | Sunrise on the Reaping | Amanecer en la cosecha | Wikidata (Q126390804) | 2025 | | 2 |
| book:how-to-win-friends-and-influence-people-1936 | How to Win Friends and Influence People | Cómo ganar amigos e influir sobre las personas | Wikidata (Q960077) | 1936 | | 2 |
| book:the-song-of-achilles-2011 | The Song of Achilles | La canción de Aquiles | Wikidata (Q21189971) | 2011 | | 2 |
| book:the-hunger-games-2008 | The Hunger Games | Los juegos del hambre (duplicado: ya existe `book:los-juegos-del-hambre-2008`, con el título en español, Q11679) | Wikidata (Q11678) | 2008 | | 2 |
| book:a-little-life-2008 | A Little Life | Tan poca vida | Wikidata (Q20709044) | 2008 | 2015 | 1 |
| book:white-nights-2016 | White nights (mostrado como «White Nights») | Noches blancas | sin fuente (sin wikidataId) | 2016 | 1848 | 1 |
| book:-1876 | Анна Каренина (alfabeto cirílico) | Ana Karenina | sin fuente (sin wikidataId) | 1876 | 1877 o 1878 (dudoso: la novela salió por entregas en 1875-1877 y en libro en 1878) | 1 |
| book:le-mythe-de-sisyphe-1941 | Le mythe de Sisyphe | El mito de Sísifo | sin fuente (sin wikidataId) | 1941 | 1942 | 1 |

Notas de book:
- «EL EXTRANJERO» y «ULISES» están en mayúsculas en la base. No es un problema de idioma y no se han marcado.
- La entrada `book:-1876` tiene un id con el año en negativo, lo que puede confundir búsquedas por id.
- El creador de `book:white-nights-2016` y de `book:-1876` está en alfabeto cirílico.

## movie (120 revisadas)

| id | Título mostrado hoy | Título en español propuesto | Fuente | Año actual | Año correcto | Fama |
|---|---|---|---|---|---|---|
| movie:gladiator | Gladiator (El gladiador) | Gladiator (título habitual en España; el paréntesis con el literal español no es habitual) | sin fuente (Wikidata Q128518 no tiene etiqueta en español) | 2000 | | 1 |

## series (120 revisadas)

| id | Título mostrado hoy | Título en español propuesto | Fuente | Año actual | Año correcto | Fama |
|---|---|---|---|---|---|---|
| series:person-of-interest | Vigilados, Person of Interest | Person of Interest | Wikidata (Q564345) | 2011 | | 1 |
| series:stargate-sg-1 | Stargate SG·1 (punto medio, no guion) | Stargate SG-1 (errata, no traducción) | Wikidata (Q187462) | 1997 | | 2 |
| series:columbo | Columbo | Sin cambio de título | sin fuente | 1968 | 1971 (dudoso: 1968 es el telefilme piloto; la serie empezó en 1971) | 2 |

## Qué no se ha comprobado

- Las etiquetas de Wikidata en español solo se consultaron para las obras marcadas con `wikidataId`. Las demás propuestas vienen de conocimiento propio y están marcadas como «sin fuente».
- Varias etiquetas de Wikidata en español siguen en inglés (Sense and Sensibility, The Stand, A Christmas Carol, Gladiator). Para esas, la propuesta es del autor del informe, no de una fuente externa.
- Los años se han contrastado con conocimiento propio, no con una fuente externa. Los años marcados como dudosos son los que cambian según la fuente.
- No se han revisado las obras de fama 3 y 4, ni los campos `notoriety` y `hidden` salvo para excluir las obras ocultas.
- No se ha hecho ninguna revisión visual de la interfaz.
- No se ha tocado ningún otro archivo del repositorio ni se ha hecho commit.
