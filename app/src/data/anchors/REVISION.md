# Revisión de anclas (T22) — pendiente del OK de Igor

Las anclas son las obras que salen en los **3 primeros duelos** de Decidir. Tienen que conocerlas todos en España y separar gustos de verdad. Quita o cambia las que no te convenzan: editas `app/src/data/anchors/<estantería>.json` y se regenera el árbol con

```
REGEN_TREES=1 npx vitest run src/lib/engine/anchors.test.ts
```

> **Aviso importante:** el objetivo era 60 pelis, 60 series, 60 libros, 40 juegos y 40 artistas, pero el catálogo no permite llegar. Cada estantería tiene como mucho ~40 obras de nivel de fama 1 (cupo fijo de `build.mjs` paso 4e) y solo una parte llega a R ≥ 0,85. Detalle y cifras en `docs/registro/T22.md`.

Sobre las claves: `sides` usa claves neutras provisionales (luminoso=`light`, oscuro=`dark`, etc.). Se alinearán con T21 cuando exista.

## Pelis (33 de 60 previstas)

| Obra | Año | Franja | Extremos | Por qué |
|---|---|---|---|---|
| Psicosis | 1960 | <1980 | tono: oscuro · humor: sin humor · intensidad: de tensión · realismo: realista · publico: adultos | Hitchcock; la ducha la conoce todo el mundo. Clásico oscuro y de tensión pura, sin humor |
| Bonnie y Clyde | 1967 | <1980 | realismo: realista · publico: adultos | Clásico del cine de atracos, basado en hechos reales y violento para su época |
| 2001: Una odisea del espacio | 1968 | <1980 | realismo: fantasía · exigencia: exigente | Kubrick; ciencia ficción lenta y abstracta que se conoce hasta sin haberla visto |
| El padrino | 1972 | <1980 | tono: oscuro · humor: sin humor · realismo: realista · publico: adultos | Mafia seria y realista, para adultos; la conoce todo el mundo |
| La guerra de las galaxias | 1977 | <1980 | tono: luminoso · realismo: fantasía · exigencia: ligera · publico: para todos | La guerra de las galaxias: aventura de fantasía espacial para toda la familia, fácil de seguir |
| Apocalypse Now | 1979 | <1980 | tono: oscuro · humor: sin humor · intensidad: de tensión · realismo: realista · exigencia: exigente · publico: adultos | Guerra de Vietnam, oscura y exigente; un clásico muy citado |
| El resplandor | 1980 | 1980-1994 | tono: oscuro · humor: sin humor · intensidad: de tensión · publico: adultos | Terror psicológico de Kubrick; las gemelas y «Aquí está Johnny» las conoce todo el mundo |
| Blade Runner | 1982 | 1980-1994 | tono: oscuro · realismo: fantasía · exigencia: exigente · publico: adultos | Ciencia ficción oscura y pausada; referente de todo el género |
| Regreso al futuro | 1985 | 1980-1994 | tono: luminoso · humor: comedia · realismo: fantasía · exigencia: ligera · publico: para todos | Aventura y comedia con viajes en el tiempo; luminosa y familiar |
| Parque Jurásico | 1993 | 1980-1994 | realismo: fantasía · exigencia: ligera · publico: para todos | Dinosaurios y aventura de Spielberg; la ve todo el mundo de niño |
| Pulp Fiction | 1994 | 1980-1994 | tono: oscuro · realismo: realista · publico: adultos | Tarantino; crimen con violencia para adultos, de las más famosas de los 90 |
| Forrest Gump | 1994 | 1980-1994 | tono: luminoso · intensidad: tranquila · realismo: realista · exigencia: ligera · publico: para todos | Drama amable y sentimental, muy fácil de ver; para casi todos los públicos |
| Cadena perpetua | 1994 | 1980-1994 | humor: sin humor · realismo: realista | Drama carcelario serio y realista; suele estar la primera en los rankings |
| El rey león | 1994 | 1980-1994 | tono: luminoso · intensidad: tranquila · realismo: fantasía · exigencia: ligera · publico: para todos | Disney de animación; lo ha visto toda una generación de niños |
| Toy Story | 1995 | 1995-2004 | tono: luminoso · humor: comedia · intensidad: tranquila · realismo: fantasía · exigencia: ligera · publico: para todos | Pixar, la conoce todo el mundo; extremo luminoso y familiar |
| Titanic | 1997 | 1995-2004 | realismo: realista · exigencia: ligera | Romance histórico con naufragio real; de las más vistas de todos los tiempos |
| Torrente, el brazo tonto de la ley | 1998 | 1995-2004 | humor: comedia · exigencia: ligera · publico: adultos | Comedia española grosera para adultos; fenómeno nacional |
| La milla verde | 1999 | 1995-2004 | tono: oscuro · humor: sin humor · publico: adultos | Drama carcelario con un toque sobrenatural, duro y emotivo |
| Gladiator | 2000 | 1995-2004 | tono: oscuro · humor: sin humor · realismo: realista · publico: adultos | Péplum épico, violento y serio; Oscar a la mejor película |
| El señor de los anillos: La comunidad del anillo | 2001 | 1995-2004 | realismo: fantasía | Fantasía épica de referencia, con mundos y criaturas inventados |
| Harry Potter y la piedra filosofal | 2001 | 1995-2004 | tono: luminoso · realismo: fantasía · exigencia: ligera · publico: para todos | Magia y colegio; la ha visto toda una generación desde niños |
| No es país para viejos | 2007 | 2005-2014 | tono: oscuro · humor: sin humor · intensidad: de tensión · realismo: realista · publico: adultos | Thriller seco de los Coen con Bardem; Oscar a la mejor película |
| Avatar | 2009 | 2005-2014 | realismo: fantasía · exigencia: ligera | La más taquillera de la historia; mundo de fantasía espacial y argumento sencillo |
| Origen | 2010 | 2005-2014 | realismo: fantasía · intensidad: de tensión · exigencia: exigente | Sueños dentro de sueños; ciencia ficción que obliga a pensar |
| Shutter Island | 2010 | 2005-2014 | tono: oscuro · humor: sin humor · intensidad: de tensión · publico: adultos | Thriller psicológico oscuro de Scorsese con giro final famoso |
| El lobo de Wall Street | 2013 | 2005-2014 | humor: comedia · realismo: realista · exigencia: ligera · publico: adultos | Comedia negra y excesos reales de Wall Street, solo para adultos |
| Interstellar | 2014 | 2005-2014 | realismo: fantasía · exigencia: exigente | Ciencia ficción espacial y científica; exigente y muy comentada |
| La La Land | 2016 | 2015+ | tono: luminoso · intensidad: tranquila · exigencia: ligera | Musical romántico y luminoso; fácil de ver, sin tensión |
| Vengadores: Endgame | 2019 | 2015+ | realismo: fantasía · exigencia: ligera · publico: para todos | Superhéroes de Marvel, el evento de cine más grande reciente; para casi todos |
| Puñales por la espalda | 2019 | 2015+ | humor: comedia · realismo: realista · exigencia: ligera | Comedia de misterio con asesino, ligera y de actualidad |
| Érase una vez en... Hollywood | 2019 | 2015+ | intensidad: tranquila · realismo: realista · publico: adultos | Tarantino pausado y nostálgico; Hollywood de 1969, para adultos |
| Dune | 2021 | 2015+ | tono: oscuro · realismo: fantasía · intensidad: de tensión | Ciencia ficción épica y sombría; estreno masivo reciente |
| Todo a la vez en todas partes | 2022 | 2015+ | humor: comedia · realismo: fantasía · publico: adultos | Multiverso y comedia absurda; arrasó en los Oscar |

### Descartadas por criterio (nivel 1 con R ≥ 0,85 pero no valen como ancla)

| Obra | Motivo |
|---|---|
| Terminator (1984) | Ya hay 2 de James Cameron (Titanic y Avatar, ambas obligatorias por la lista de oro); regla 4 |
| Brazil (1985) | El dato dice 1,00 pero no la conoce el público general; el id/fama parece un error del catálogo |
| Mystic River (2003) | Poco conocida por el público general aunque el dato dice 0,98 |
| Pozos de ambición (2007) | Poco conocida por el público general aunque el dato dice 0,98 |
| Malditos bastardos (2009) | Ya hay 2 de Tarantino (Pulp Fiction y Érase una vez en Hollywood); regla 4 |
| El caballero oscuro: La leyenda renace (2012) | Ya hay 2 de Nolan (Origen e Interstellar, obligatorias por labels-gold); regla 4 |
| Oppenheimer (2023) | Ya hay 2 de Nolan (Origen e Interstellar, obligatorias por labels-gold); regla 4 |

### Obras de labels-gold.json que no entran (regla 1 pesa más que la 5)

| Obra | Nivel de fama | R |
|---|---|---|
| movie:seven-1995 | 2 | 0.85 |
| movie:finding-nemo-2003 | 3 | 0.78 |
| movie:la-red-social-2010 | 3 | 0.77 |
| movie:ocho-apellidos-vascos-2014 | 3 | 0.59 |
| movie:airplane-1980 | 4 | 0.43 |
| movie:up-2009 | 3 | 0.78 |
| movie:mad-max-furia-en-la-carretera-2015 | 3 | 0.81 |
| movie:coco-2017 | 4 | 0.07 |

## Series (30 de 60 previstas)

| Obra | Año | Franja | Extremos | Por qué |
|---|---|---|---|---|
| Los Simpson | 1989 | 1980-1994 | tono: luminoso · humor: comedia · exigencia: ligera · publico: para todos | La comedia de animación más famosa de la tele; la conoce toda España |
| Twin Peaks | 1990 | 1980-1994 | tono: oscuro · realismo: fantasía · exigencia: exigente · publico: adultos | Misterio surrealista de Lynch; serie de culto que casi todos conocen de nombre |
| Friends | 1994 | 1980-1994 | tono: luminoso · humor: comedia · intensidad: tranquila · realismo: realista · exigencia: ligera | La comedia de situación por excelencia; extremo luminoso y cotidiano |
| Urgencias | 1994 | 1980-1994 | realismo: realista · intensidad: de tensión · publico: adultos | Urgencias; drama médico realista, un clásico de la tele de los 90 |
| Sexo en Nueva York | 1998 | 1995-2004 | tono: luminoso · humor: comedia · realismo: realista · exigencia: ligera · publico: adultos | Comedia romántica y moda en Nueva York; dirigida a adultos |
| Bob Esponja | 1999 | 1995-2004 | tono: luminoso · humor: comedia · intensidad: tranquila · realismo: fantasía · exigencia: ligera · publico: para todos | Bob Esponja; la conocen niños y adultos, humor absurdo y luminoso |
| Las chicas Gilmore | 2000 | 1995-2004 | tono: luminoso · humor: comedia · intensidad: tranquila · realismo: realista · exigencia: ligera | Las chicas Gilmore; comedia dramática cálida y cotidiana |
| Sobrenatural | 2005 | 2005-2014 | tono: oscuro · intensidad: de tensión · realismo: fantasía | Sobrenatural; demonios y cazadores, durante años en la tele en abierto |
| Anatomía de Grey | 2005 | 2005-2014 | realismo: realista | Anatomía de Grey; drama médico que ha visto medio mundo |
| Mentes criminales | 2005 | 2005-2014 | tono: oscuro · humor: sin humor · intensidad: de tensión · realismo: realista · publico: adultos | Mentes criminales; policíaca oscura y de tensión, muy emitida en España |
| Aída | 2005 | 2005-2014 | tono: luminoso · humor: comedia · intensidad: tranquila · realismo: realista · exigencia: ligera | Aída; comedia española de barrio que vio toda España |
| Dexter | 2006 | 2005-2014 | tono: oscuro · humor: sin humor · intensidad: de tensión · realismo: realista · publico: adultos | Dexter; un asesino en serie como protagonista, oscura y para adultos |
| El mentalista | 2008 | 2005-2014 | realismo: realista · exigencia: ligera | El mentalista; policíaca ligera y de episodios cerrados |
| The Walking Dead | 2010 | 2005-2014 | tono: oscuro · humor: sin humor · intensidad: de tensión · realismo: fantasía · publico: adultos | Zombis y supervivencia; oscura y violenta |
| Juego de tronos | 2011 | 2005-2014 | tono: oscuro · realismo: fantasía · publico: adultos | Fantasía épica y cruda; el fenómeno de la década |
| Black Mirror | 2011 | 2005-2014 | tono: oscuro · humor: sin humor · realismo: fantasía · exigencia: exigente · publico: adultos | Tecnología y distopía en episodios sueltos; oscura y para pensar |
| American Horror Story | 2011 | 2005-2014 | tono: oscuro · humor: sin humor · intensidad: de tensión · realismo: fantasía · publico: adultos | Terror antológico, para adultos |
| Peaky Blinders | 2013 | 2005-2014 | tono: oscuro · humor: sin humor · realismo: realista · publico: adultos | Gánsteres en la Inglaterra de 1919, seria y estilizada |
| Ataque a los titanes | 2013 | 2005-2014 | tono: oscuro · humor: sin humor · intensidad: de tensión · realismo: fantasía · publico: adultos | Ataque a los titanes; el anime más comentado, crudo y de acción |
| Fargo | 2014 | 2005-2014 | tono: oscuro · realismo: realista · publico: adultos | Fargo; crimen con humor negro y frío, para adultos |
| True Detective | 2014 | 2005-2014 | tono: oscuro · humor: sin humor · intensidad: de tensión · realismo: realista · exigencia: exigente · publico: adultos | True Detective; policíaca oscura y densa |
| Dark | 2017 | 2015+ | tono: oscuro · humor: sin humor · intensidad: de tensión · realismo: fantasía · exigencia: exigente · publico: adultos | Dark; viajes en el tiempo, complicada de seguir y muy oscura |
| La casa de papel | 2017 | 2015+ | intensidad: de tensión · realismo: realista | La casa de papel; atraco español que se hizo famoso en todo el mundo |
| Yellowstone | 2018 | 2015+ | realismo: realista · publico: adultos | Yellowstone; drama western de rancheros, para adultos |
| Demon Slayer: Kimetsu no Yaiba | 2019 | 2015+ | realismo: fantasía · exigencia: ligera | Demon Slayer; anime de fantasía y combates, muy popular entre jóvenes |
| The Boys | 2019 | 2015+ | tono: oscuro · humor: comedia · realismo: fantasía · publico: adultos | Superhéroes gamberros y violentos, humor negro |
| Euphoria | 2019 | 2015+ | tono: oscuro · humor: sin humor · realismo: realista · publico: adultos | Euphoria; drama crudo sobre adolescentes, para adultos |
| Ted Lasso | 2020 | 2015+ | tono: luminoso · humor: comedia · intensidad: tranquila · realismo: realista · exigencia: ligera · publico: para todos | Ted Lasso; comedia amable y optimista |
| The White Lotus | 2021 | 2015+ | humor: comedia · realismo: realista · publico: adultos | The White Lotus; sátira de ricos de vacaciones |
| The Bear | 2022 | 2015+ | intensidad: de tensión · realismo: realista · publico: adultos | The Bear; cocina frenética y agobiante, muy comentada |

### Descartadas por criterio (nivel 1 con R ≥ 0,85 pero no valen como ancla)

| Obra | Motivo |
|---|---|
| Roma (2005) | Es la serie de HBO sobre la Roma antigua, no la película de Cuarón; poco conocida |
| Planet Earth (2006) | Documental de naturaleza; no separa gustos en las dimensiones de series |
| Vigilados: Person of Interest (2011) | Poco conocida por el público general aunque el dato dice 0,98 |
| Homeland (2011) | Poco conocida por el público general aunque el dato dice 0,99 |
| Shameless (2011) | Poco conocida por el público general aunque el dato dice 0,99 |
| Slow Horses (2022) | Poco conocida por el público general aunque el dato dice 0,98 |
| From (2022) | Poco conocida por el público general aunque el dato dice 1,00 |
| The Wire (2002) | Serie de culto pero no «conocidísima» en España |
| Smallville (2001) | Límite de 2 por creador: el catálogo guarda «The CW» como creador de 4 series; se dejan Las chicas Gilmore y Sobrenatural (regla 4) |
| Crónicas vampíricas (2009) | Límite de 2 por creador («The CW»); regla 4 |

### Obras de labels-gold.json que no entran (regla 1 pesa más que la 5)

| Obra | Nivel de fama | R |
|---|---|---|
| series:breaking-bad-2008 | 2 | 0.88 |
| series:stranger-things-2016 | 3 | 0.75 |
| series:the-office-ee-uu-2005 | 4 | 0.50 |
| series:narcos-2015 | 2 | 0.83 |
| series:chernobil-2019 | 2 | 0.81 |

## Libros (29 de 60 previstas)

| Obra | Año | Franja | Extremos | Por qué |
|---|---|---|---|---|
| Macbeth | 1508 | <1980 | tono: oscuro · humor: sin humor · densidad: exigente | Shakespeare; tragedia oscura de ambición y poder |
| Don Quijote de la Mancha | 1605 | <1980 | humor: comedia · ritmo: pausado · densidad: exigente | La novela de los españoles; larga, cómica y de lenguaje antiguo |
| Orgullo y prejuicio | 1813 | <1980 | tono: luminoso · realismo: realista · ritmo: pausado | Jane Austen; romance irónico y luminoso del siglo XIX |
| El conde de Montecristo | 1844 | <1980 | realismo: realista | Aventuras y venganza, un clásico que casi todos conocen |
| Los tres mosqueteros | 1844 | <1980 | tono: luminoso · realismo: realista · ritmo: trepidante · densidad: ligera | Aventura de capa y espada, ágil y divertida |
| Cumbres borrascosas | 1847 | <1980 | tono: oscuro · humor: sin humor · realismo: realista · ritmo: pausado | Pasión y venganza en los páramos; oscura y atormentada |
| Madame Bovary | 1857 | <1980 | tono: oscuro · humor: sin humor · realismo: realista · ritmo: pausado | Novela realista y trágica del siglo XIX |
| Los miserables | 1862 | <1980 | tono: oscuro · realismo: realista · ritmo: pausado · densidad: exigente | Victor Hugo; larguísima y dura, con musical y películas muy famosas |
| La isla del tesoro | 1883 | <1980 | tono: luminoso · realismo: realista · ritmo: trepidante · densidad: ligera | Piratas y aventura juvenil; lectura ágil |
| El extraño caso del doctor Jekyll y el señor Hyde | 1886 | <1980 | tono: oscuro · humor: sin humor · realismo: fantasía · ritmo: trepidante · densidad: ligera | Jekyll y Hyde; terror breve y rápido |
| El retrato de Dorian Gray | 1890 | <1980 | tono: oscuro · realismo: fantasía | Wilde; pacto sobrenatural y decadencia |
| Drácula | 1897 | <1980 | tono: oscuro · humor: sin humor · realismo: fantasía | El vampiro por excelencia; terror gótico |
| La metamorfosis | 1915 | <1980 | tono: oscuro · humor: sin humor · realismo: fantasía · densidad: ligera | Kafka; un hombre convertido en insecto, breve y angustiosa |
| El gran Gatsby | 1925 | <1980 | realismo: realista · ritmo: pausado | Fitzgerald; los felices años 20 y un amor imposible |
| Un mundo feliz | 1932 | <1980 | tono: oscuro · realismo: fantasía | Huxley; distopía de manual |
| La casa de Bernarda Alba | 1936 | <1980 | tono: oscuro · humor: sin humor · realismo: realista | Lorca; lectura escolar en España, drama rural y opresivo |
| El extranjero | 1942 | <1980 | tono: oscuro · humor: sin humor · realismo: realista · ritmo: pausado · densidad: ligera | Camus; breve, seca y existencialista |
| El principito | 1943 | <1980 | tono: luminoso · realismo: fantasía · ritmo: pausado · densidad: ligera | La fábula más leída; corta y para todas las edades |
| El hombre en busca de sentido | 1946 | <1980 | realismo: realista · densidad: ligera | Frankl; testimonio real de un campo de concentración, el ensayo más conocido |
| 1984 | 1949 | <1980 | tono: oscuro · humor: sin humor · ritmo: pausado | Orwell; la distopía por excelencia, muy citada |
| El guardián entre el centeno | 1951 | <1980 | realismo: realista · ritmo: pausado | Salinger; adolescente rebelde, lectura clásica de instituto |
| Fahrenheit 451 | 1953 | <1980 | tono: oscuro · realismo: fantasía · ritmo: trepidante · densidad: ligera | Bradbury; distopía breve y ágil de libros quemados |
| El Señor de los Anillos | 1954 | <1980 | realismo: fantasía · ritmo: pausado · densidad: exigente | Tolkien; fantasía épica larguísima |
| Matar a un ruiseñor | 1960 | <1980 | realismo: realista · ritmo: pausado | Harper Lee; drama social del sur de EE. UU., clásico de instituto |
| Dune | 1965 | <1980 | realismo: fantasía · ritmo: pausado · densidad: exigente | Frank Herbert; la gran saga de ciencia ficción, densa |
| Cien años de soledad | 1967 | <1980 | densidad: exigente | García Márquez; el clásico español-latinoamericano, de lectura exigente |
| El amor en los tiempos del cólera | 1985 | 1980-1994 | ritmo: pausado | García Márquez; romance de toda una vida, pausado |
| The Handmaid's Tale | 1985 | 1980-1994 | tono: oscuro · humor: sin humor · ritmo: pausado | Atwood; distopía opresiva que se hizo serie famosa |
| Harry Potter y la piedra filosofal | 1997 | 1995-2004 | tono: luminoso · realismo: fantasía · ritmo: trepidante · densidad: ligera | Rowling; el libro que enganchó a toda una generación, fácil de leer |

### Descartadas por criterio (nivel 1 con R ≥ 0,85 pero no valen como ancla)

| Obra | Motivo |
|---|---|
| El arte de la guerra (-500) | Se conoce de nombre pero casi nadie lo ha leído; no separa gustos |
| Romeo and Juliet (1597) | El catálogo lo titula en inglés («Romeo and Juliet»); en España se conoce como «Romeo y Julieta» |
| Le mythe de Sisyphe (1941) | Título en francés; poco conocida en España |
| Анна Каренина (1876) | Título en cirílico y id vacío en el catálogo («Анна Каренина»); error de datos |
| Siddhartha (1922) | Sin un extremo claro y menos conocida que el resto |
| Animal Farm (1945) | El catálogo lo titula en inglés («Animal Farm»); en España es «Rebelión en la granja» |
| Lord of the Flies (1954) | El catálogo lo titula en inglés («Lord of the Flies»); en España es «El señor de las moscas» |
| Pedro Páramo (1955) | Mexicana y poco conocida en España |
| La casa de los espíritus (1982) | Realismo mágico: sin ningún extremo claro en las dimensiones de libros |
| A Little Life (2008) | Fenómeno de lectores, no «conocidísima» |
| White Nights (2016) | Error de datos: año 2016 y título en inglés (son «Noches blancas» de Dostoievski, de 1848) |

### Obras de labels-gold.json que no entran (regla 1 pesa más que la 5)

| Obra | Nivel de fama | R |
|---|---|---|
| book:sin-noticias-de-gurb-1991 | 3 | 0.75 |
| book:el-codigo-da-vinci-2003 | 2 | 0.83 |
| book:it-1986 | 3 | 0.76 |
| book:moby-dick-1851 | 4 | 0.60 |

## Juegos (9 de 40 previstas)

| Obra | Año | Franja | Extremos | Por qué |
|---|---|---|---|---|
| Ajedrez | 1475 | <1980 | peso: de pensar · ambiente: serio · azar: sin azar · tematico: abstracto | Ajedrez; sin azar, abstracto y para pensar |
| Parchís | 1900 | <1980 | peso: ligero · azar: mucho azar · tematico: abstracto | Parchís; el clásico de las casas españolas, mucho dado y sin tema |
| Monopoly | 1935 | <1980 | peso: ligero · interaccion: todo el rato con los demás · azar: mucho azar | Monopoly; negociar y comprar con mucho dado, conocidísimo |
| Scrabble | 1948 | <1980 | interaccion: cada uno a lo suyo · tematico: abstracto | Scrabble; juego de palabras abstracto, cada uno con sus fichas |
| Cluedo | 1949 | <1980 | peso: ligero · tematico: muy temático | Cluedo; misterio de asesinato con mucho ambiente |
| Risk | 1959 | <1980 | interaccion: todo el rato con los demás · azar: mucho azar · tematico: muy temático | Risk; conquista del mundo con dados y mucho enfrentamiento |
| UNO | 1971 | <1980 | peso: ligero · ambiente: de risas · azar: mucho azar · tematico: abstracto | UNO; cartas de risas y azar, lo conoce todo el mundo |
| Trivial Pursuit | 1981 | 1980-1994 | peso: ligero · ambiente: de risas · tematico: abstracto | Trivial Pursuit; preguntas de cultura general para reunir a la familia |
| Catan | 1995 | 1995-2004 | interaccion: todo el rato con los demás | Catan; el juego moderno más famoso, negociación constante |

### Descartadas por criterio (nivel 1 con R ≥ 0,85 pero no valen como ancla)

| Obra | Motivo |
|---|---|
| Go (-2200) | Se conoce de nombre pero casi nadie lo juega en España |
| Magic: The Gathering (1993) | Juego de cartas coleccionables, no de mesa para todos |
| Risk Legacy (2011) | Variante de Risk (2 por saga como máximo) y poco conocida |
| Chinatown (1999) | Juego de aficionados; el público general no lo conoce |
| Coup (2012) | Juego de aficionados; el público general no lo conoce |
| Kingdomino (2016) | Juego de aficionados; el público general no lo conoce |
| Automobile (2009) | Juego de aficionados; el público general no lo conoce |
| Bora Bora (2013) | Juego de aficionados; el público general no lo conoce |
| Rococo (2013) | Juego de aficionados; el público general no lo conoce |
| Maracaibo (2019) | Juego de aficionados; el público general no lo conoce |
| Pan Am (2020) | Juego de aficionados; el público general no lo conoce |

### Nivel 1 pero con R < 0,85 para un usuario nuevo (la regla 1 las deja fuera)

Barrage (2019, R=0.75) · Yokohama (2016, R=0.75) · Village (2011, R=0.74) · Ticket to Ride (2004, R=0.75) · Coimbra (2018, R=0.75) · Santorini (2016, R=0.84) · Imperial (2006, R=0.74) · Bus (1999, R=0.75) · The Great Wall (2021, R=0.75) · Friday (2011, R=0.74) · QE (2019, R=0.74) · Cacao (2015, R=0.75) · Maquis (2013, R=0.74) · Belfort (2011, R=0.74) · Stella: Dixit Universe (2021, R=0.75)

### Obras de labels-gold.json que no entran (regla 1 pesa más que la 5)

| Obra | Nivel de fama | R |
|---|---|---|
| boardgame:exploding-kittens-2015 | 2 | 0.72 |

## Artistas (21 de 40 previstas)

| Obra | Año | Franja | Extremos | Por qué |
|---|---|---|---|---|
| Wolfgang Amadeus Mozart | 1761 | <1980 | energia: tranquilo · bailable: nada bailable · sonido: acústico | Mozart; música clásica, tranquila y acústica; lo conoce todo el mundo |
| The Beatles | 1960 | <1980 | sonido: acústico | The Beatles; la banda más famosa de la historia, sonido de guitarras y voces |
| Bob Dylan | 1962 | <1980 | energia: tranquilo · bailable: nada bailable · sonido: acústico | Bob Dylan; folk de guitarra y armónica, Nobel de Literatura |
| Queen | 1970 | <1980 | energia: de energía · sonido: acústico | Queen; rock de estadio con Freddie Mercury, la conoce todo el mundo |
| Michael Jackson | 1971 | <1980 | energia: de energía · animo: alegre · bailable: para bailar | Michael Jackson; el rey del pop, para bailar |
| Bruce Springsteen | 1972 | <1980 | bailable: nada bailable · sonido: acústico | Bruce Springsteen; rock de guitarras de estadio |
| AC/DC | 1973 | <1980 | energia: de energía · bailable: nada bailable · sonido: acústico | AC/DC; hard rock a todo volumen, guitarras de verdad |
| Prince | 1978 | <1980 | energia: de energía · animo: alegre · bailable: para bailar | Prince; funk y pop de pista de baile |
| Madonna | 1982 | 1980-1994 | energia: de energía · animo: alegre · bailable: para bailar · sonido: electrónico | Madonna; la reina del pop de baile, sonido de sintetizadores |
| George Michael | 1982 | 1980-1994 | bailable: para bailar | George Michael; pop de baile de los 80 y baladas |
| Tupac Shakur | 1989 | 1980-1994 | energia: de energía | Tupac; el rap de los 90, intenso y reivindicativo |
| Alejandro Sanz | 1989 | 1980-1994 | energia: tranquilo · animo: melancólico · bailable: nada bailable · sonido: acústico | Alejandro Sanz; baladas en español de guitarra, el artista más reconocido de España |
| Shakira | 1990 | 1980-1994 | energia: de energía · animo: alegre · bailable: para bailar | Shakira; pop latino de baile conocido en todo el mundo |
| Katy Perry | 2001 | 1995-2004 | energia: de energía · animo: alegre · bailable: para bailar · sonido: electrónico | Katy Perry; pop de colores, alegre y de baile |
| Amy Winehouse | 2003 | 1995-2004 | energia: tranquilo · animo: melancólico · bailable: nada bailable · sonido: acústico | Amy Winehouse; soul triste con banda de verdad |
| Lady Gaga | 2008 | 2005-2014 | energia: de energía · bailable: para bailar · sonido: electrónico | Lady Gaga; pop electrónico de pista de baile |
| Bruno Mars | 2010 | 2005-2014 | energia: de energía · animo: alegre · bailable: para bailar | Bruno Mars; funk y pop alegre para bailar |
| Dua Lipa | 2015 | 2015+ | energia: de energía · animo: alegre · bailable: para bailar · sonido: electrónico | Dua Lipa; pop disco de baile |
| Billie Eilish | 2015 | 2015+ | energia: tranquilo · animo: melancólico · bailable: nada bailable · sonido: electrónico | Billie Eilish; pop susurrado, oscuro y electrónico |
| Bad Bunny | 2016 | 2015+ | energia: de energía · bailable: para bailar · sonido: electrónico | Bad Bunny; reguetón y trap, el artista más escuchado |
| Rosalía | 2017 | 2015+ | energia: de energía · bailable: para bailar | Rosalía; flamenco y urbano, la artista española más conocida fuera de España |

### Descartadas por criterio (nivel 1 con R ≥ 0,85 pero no valen como ancla)

| Obra | Motivo |
|---|---|
| David Bowie (1967) | Sin un extremo claro en las dimensiones de artistas (muy variado) |
| Whitney Houston (1985) | Sin un extremo claro en las dimensiones de artistas |
| Taylor Swift (2006) | Sin un extremo claro en las dimensiones de artistas (cambia de sonido en cada disco) |
| Harry Styles (2010) | Sin un extremo claro en las dimensiones de artistas |
| Tame Impala (2007) | Sin año en el catálogo y menos conocido por el público general |

### Nivel 1 pero con R < 0,85 para un usuario nuevo (la regla 1 las deja fuera)

Led Zeppelin (1968, R=0.83) · The Rolling Stones (1962, R=0.83) · Kiss (1973, R=0.81) · Fleetwood Mac (1967, R=0.82) · Metallica (1981, R=0.81) · Linkin Park (1996, R=0.83) · Gorillaz (1998, R=0.82) · Elton John (1969, R=0.83) · Lana Del Rey (2011, R=0.81) · Ed Sheeran (2011, R=0.83) · Eminem (1996, R=0.83) · Avicii (2008, R=0.82) · Ricky Martin (1984, R=0.82) · Ludwig van Beethoven (1792, R=0.82)

### Obras de labels-gold.json que no entran (regla 1 pesa más que la 5)

| Obra | Nivel de fama | R |
|---|---|---|
| artist:ludovico-einaudi-1980 | 3 | 0.58 |
| artist:daft-punk-1993 | 2 | 0.75 |
| artist:metallica-1981 | 1 | 0.81 |
| artist:radiohead-1985 | 2 | 0.75 |

