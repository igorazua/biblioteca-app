# Obras repetidas en el catálogo

Fecha: 2026-11-15. Solo lectura: no se ha tocado ningún dato ni se ha fusionado nada.

Método: script sobre `app/src/data/shelves/*.json` (obras con `hidden: true` ignoradas). Coincidencia por `wikidataId`, `tmdbId`, `olid`, `bggId`, `mbid`, o por título normalizado / `originalTitle` / `local.es.title` con año ±1, o título contenido + mismo `creator`. Después, revisión a ojo y una pasada extra por mismo autor + mismo año + mismo título base (antes de los dos puntos), para cazar traducciones que el script no ve (p. ej. *Azul: Summer Pavilion* / *Pabellón de Verano*). `aliases.json` ya tiene 238 fusiones; ninguna de las parejas listas está pendiente de alias.

Grupos por estantería (detector automático, antes de revisión manual):

| Estantería | Grupos detectados | Seguras | Dudosas | No son repetidas |
|---|---|---|---|---|
| movie | 4 | 4 | 0 | 0 |
| series | 10 | 6 | 1 | 3 |
| book | 6 | 1 | 0 | 5 |
| boardgame | 18 (+1 subgrupo y +1 pareja añadidos a mano) | 10 | 0 | 9 |
| artist | 0 | 0 | 0 | 0 |

Total: 21 seguras, 1 dudosa. Ninguna pareja usa ids de obras ya ocultas.

## Películas (movie)

| Grupo | Conservar (id) | Fusionar en ella (id) | Clase | Motivo |
|---|---|---|---|---|
| La guerra de las galaxias / Star Wars: Una nueva esperanza (1977) | `movie:star-wars-1977` (wikidata Q17738, notoriety 0.98) | `movie:star-wars-una-nueva-esperanza-1977` | segura | Misma película de 1977, mismo director; una con título español y otra con subtítulo. Caso citado. |
| Del revés / Inside Out (2015) | `movie:del-reves-2015` (wikidata Q6144664, tmdb 150540) | `movie:inside-out-2015` | segura | `originalTitle` de la primera = «Inside Out»; mismo año y director. |
| El gran hotel Budapest / The Grand Budapest Hotel (2014) | `movie:el-gran-hotel-budapest-2014` (wikidata Q3521099, tmdb 120467) | `movie:the-grand-budapest-hotel-2014` | segura | `originalTitle` coincide con el título de la otra. |
| El truco final / El truco final (El prestigio) (2006) | `movie:the-prestige-2006` (wikidata Q46551, tmdb 1124, notoriety 0.97) | `movie:el-truco-final-el-prestigio-2006` | segura | Mismo título normalizado, mismo año y director. Caso citado. |

## Series (series)

| Grupo | Conservar (id) | Fusionar en ella (id) | Clase | Motivo |
|---|---|---|---|---|
| The Sopranos / Los Soprano (1999) | `series:los-soprano-1999` (wikidata Q23628, tmdb 1398, notoriety 0.88) | `series:the-sopranos-1999` | segura | `local.es.title` = «Los Soprano», mismo año, mismo título original. |
| The Office / The Office (EE. UU.) (2005) | `series:the-office-2005` (wikidata Q23829, tmdb 2996, notoriety 0.8) | `series:the-office-ee-uu-2005` | segura | Mismo título normalizado y año. Caso citado. |
| The IT Crowd / The IT Crowd (Los informáticos) (2006) | `series:the-it-crowd-2006` (wikidata Q61970204, notoriety 0.75) | `series:the-it-crowd-los-informaticos-2006` | segura | Mismo título sin el paréntesis, mismo año. Caso citado. |
| Pokémon / Pokémon (anime) (1997) | `series:pokemon-1997` (wikidata Q239937, tmdb 60572, notoriety 0.7) | `series:pokemon-anime-1997` | segura | Mismo título normalizado, mismo año. Caso citado. |
| Severance / Separación (2022) | `series:severance-2022` (wikidata Q101096725, tmdb 95396, notoriety 0.65) | `series:separacion-2022` | segura | `originalTitle` = «Severance»; mismo año y creador. |
| Evangelion / Neon Genesis Evangelion (1995) | `series:neon-genesis-evangelion-1995` (wikidata Q662, tmdb 890) | `series:evangelion-1995` | segura | Misma serie, mismo año y creador. Ojo: la que se fusiona tiene notoriety 0.5 y la conservada 0.01; se conserva la de wikidata/tmdb. |
| House / House M.D. (2004) | `series:house-2004` (wikidata Q20502, notoriety 0.77, póster) | `series:house-m-d-2004` (wikidata Q23558, tmdb 1408) | dudosa | Mismo creador y año, casi seguro la misma serie, pero los dos wikidataId son distintos y el tmdb solo está en la otra. Confirmar antes de fusionar. |

No son repetidas (series): Girlfriends (2000) / Girlfriends' Guide to Divorce (2014) (ver datos anómalos); Bachelor / Bachelorette; Naked and Afraid / Naked and Afraid: Uncensored (versión distinta de la serie).

## Libros (book)

| Grupo | Conservar (id) | Fusionar en ella (id) | Clase | Motivo |
|---|---|---|---|---|
| Sapiens / Sapiens: De animales a dioses (2011) | `book:sapiens-de-animales-a-dioses-2011` (wikidata Q12411055, olid OL17075811W, notoriety 0.81) | `book:sapiens-2011` (olid OL17075811W) | segura | Mismo olid, mismo autor y año; título español y título completo. Caso citado. |

No son repetidas (book): The Housemaid / The Housemaid's Secret (secuela); Shatter Me / Shatter Me Complete Collection (colección); Twisted Lies / Twisted Hate / recopilatorio «Twisted Love / Twisted Games / Twisted Hate / Twisted Lies» (volúmenes y recopilatorio); Foundation / The Foundation Trilogy (libro y recopilación); Henry V / Henry VI, Part 3 (obras distintas).

## Juegos de mesa (boardgame)

| Grupo | Conservar (id) | Fusionar en ella (id) | Clase | Motivo |
|---|---|---|---|---|
| Gloomhaven: Jaws of the Lion / Gloomhaven: Fauces del León (2020) | `boardgame:gloomhaven-jaws-of-the-lion-2020` (wikidata Q111680474, notoriety 0.5, póster) | `boardgame:gloomhaven-fauces-del-leon-2020` | segura | Traducción del título, mismo año y autor. Caso citado. |
| The Castles of Burgundy / Castillos de Borgoña (2011) | `boardgame:the-castles-of-burgundy-2011` (notoriety 0.5, póster) | `boardgame:castillos-de-borgona-2011` (wikidata Q1208572) | segura | El título español de la primera es «Los castillos de Borgoña». Se conserva la que tiene póster; la otra tiene wikidata. |
| Lost Ruins of Arnak / Las ruinas perdidas de Arnak (2020) | `boardgame:lost-ruins-of-arnak-2020` (wikidata Q107835072, bgg 312484, notoriety 0.54, póster) | `boardgame:las-ruinas-perdidas-de-arnak-2020` (wikidata Q104866045) | segura | `local.es.title` = «Las Ruinas Perdidas de Arnak». |
| Clank! / Clank!: A Deck-Building Adventure (2016) | `boardgame:clank-a-deck-building-adventure-2016` (wikidata Q94652962, bgg 201808, póster) | `boardgame:clank-2016` | segura | Mismo juego, mismo año y autor (título base igual). Caso citado. |
| Codenames / Código Secreto (2015) | `boardgame:codenames-2015` (wikidata Q25203543, bgg 178900, notoriety 0.74) | `boardgame:codigo-secreto-2015` (wikidata Q21175653) | segura | `local.es.title` = «Código secreto». Dos wikidata distintos (edición española). |
| Ticket to Ride / ¡Aventureros al tren! (2004) | `boardgame:ticket-to-ride-2004` (wikidata Q60608326, bgg 9209, notoriety 0.75, póster) | `boardgame:aventureros-al-tren-2004` (wikidata Q172535) | segura | `local.es.title` = «Aventureros al tren». Caso de la pasada extra. |
| Ticket to Ride: Europe / ¡Aventureros al tren! Europa (2005) | `boardgame:ticket-to-ride-europe-2005` (wikidata Q39405061, bgg 14996, notoriety 0.66, póster) | `boardgame:aventureros-al-tren-europa-2005` | segura | Título español de la misma edición, mismo año y autor. Sale en el mismo grupo que el anterior; son dos pares distintos. |
| Azul: Summer Pavilion / Azul: Pabellón de Verano (2019) | `boardgame:azul-summer-pavilion-2019` (wikidata Q140937460, notoriety 0.5, póster) | `boardgame:azul-pabellon-de-verano-2019` | segura | Traducción del título, mismo año y autor. Caso citado. El script no lo detectó (no hay título español en el dato); lo encontré por pasada de mismo autor. |
| The Resistance: Avalon / Avalon (2012) | `boardgame:the-resistance-avalon-2012` (wikidata Q139997598, bgg 128882, notoriety 0.25, póster) | `boardgame:avalon-2012` | segura | Mismo juego, mismo año y autor (título base). |
| Mansions of Madness / Mansiones de la Locura (2011) | `boardgame:mansions-of-madness-2011` (wikidata Q16213033, notoriety 0.47, póster) | `boardgame:mansiones-de-la-locura-2011` (wikidata Q6751765) | segura | `local.es.title` = «Las mansiones de la locura». |

No son repetidas (boardgame), con motivo: Too Many Bones / Undertow (expansión); Aeon's End / War Eternal (secuela); Dominion / Dominion: Intrigue (expansión); Codenames / Codenames: Pictures (variante, distinto juego); Star Realms / Colony Wars (expansión); 7 Wonders (Second Edition) / 7 Wonders: Architects (distinto juego); One Night Ultimate Werewolf / Daybreak (expansión); Smash Up / Awesome Level 9000 (expansión); MicroMacro: Crime City / Full House (distinto juego); Marvel United / X-Men (expansión); Ticket to Ride / Ticket to Ride: Märklin y Nordic Countries (expansiones); Libertalia / Winds of Galecrest (ver datos anómalos).

## Datos anómalos (no son repetidas, pero hay que revisarlos)

- `series:girlfriends-2000` y `series:girlfriends-guide-to-divorce-2014` comparten `tmdbId` 62187. Son series distintas: el id es de una de las dos y el otro está mal.
- `boardgame:libertalia-2012` y `boardgame:libertalia-winds-of-galecrest-2022` comparten `bggId` 356033. Son juegos distintos: el id del 2012 está mal.

## Qué no pude comprobar

- No hay acceso a Wikidata, TMDB, BGG ni a los títulos oficiales: las equivalencias son por el dato del catálogo, no contrastadas en fuentes externas.
- Las 21 seguras y la dudosa se basan en el dato de la obra; no se revisaron las fichas en la app (no aplica: no hay revisión visual).
- La pasada por autor y título base es manual sobre una lista; puede quedar alguna traducción sin título español que no aparezca.
- Estantería `artist`: sin grupos; no se comprobó con el criterio de traducciones porque el campo `creator` de artistas no sirve para ese cruce.
- No se han tocado `aliases.json` ni ningún otro archivo; no hay commit.
