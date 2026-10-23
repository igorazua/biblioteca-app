# Biblioteca personal — Documento aclarativo de la idea

> Estado: **borrador v0.5** (16/10/2026, añade el motor: §7b). Recoge la idea de Igor y las conclusiones de los debates.
> Los puntos sin cerrar viven en la sección final **Debates abiertos**.
>
> **Antecedentes** (copiados en este proyecto):
> - `demo/mockup.html` — demo en navegador hecha con Antigravity («Legado Cultural - Prototipo»).
> - `docs/antigravity/` — manifiesto previo (`VISION_Y_FEATURES.md/.docx`), su generador y el mockup de UI.
>
> ⚠️ La carpeta original `scratch/carnaval-app/` mezclaba **dos proyectos**: este (solo `mockup.html` y los documentos) y otra app distinta, **«Coplas & Compás»** (`index.html`, `app.js`, `server.js`: reproductor de vídeos de carnaval). El Carnaval **no forma parte** de esta idea.

---

## 1. Visión y misión

- **Queremos ser tu biblioteca de todo, digital y analógico**: todo lo que ha hecho que tú seas tú.
- **Archivo y museo a la vez** ✅: el archivo lo incluye todo; **el orden lo dan las puntuaciones**, así que lo que más te marcó queda arriba. El perfil enseña primero el top de cada estantería.
- Es a la vez:
  1. **Herramienta de curación**: construir tu biblioteca sin esfuerzo.
  2. **Herramienta de valoración**: puntuar y ordenar lo que has visto, leído, jugado…
  3. **Herramienta de descubrimiento**: encontrar cosas nuevas y guardarlas en pendientes.
  4. **Red social**: lo que guardan y valoran tus amigos te ayuda a decidir. El valor social **ayuda pero no es indispensable**: la app tiene que servir aunque estés solo.
- Principio rector: **extremadamente práctica**. Ponérselo fácil al usuario, con importaciones y también sin ellas.
- Principio de datos ✅: **todo elemento tiene una identidad compartida** (una ficha de catálogo o un enlace). Así sabemos si otra persona también lo tiene. No hay contenido «manual» suelto.

---

## 2. Estanterías

- La biblioteca se organiza en **estanterías**, una por tipo de contenido.
- **Estanterías de catálogo** (definidas por la app, con contenido precargado: solo seleccionas):
  - Películas, series, documentales, anime, cortos
  - Canales de YouTube
  - Libros, cómics/manga
  - **Artistas** y **canciones**, como estanterías separadas (los álbumes, de momento, no)
  - Podcasts (unidad = el programa; ver D12)
  - Videojuegos, juegos de mesa
  - Restaurantes
  - Personas famosas (candidata)
- **Solo catálogo al principio** ✅. Nada de estanterías de enlace ni manuales de momento; «vamos viendo».
- **Los usuarios votan** qué categorías nuevas quieren ✅. Así decide la demanda real qué se añade.
- Objetivo final: **listas por categoría, ordenadas**.

---

## 3. Funcionalidad A — Swipe de curación y descubrimiento (estanterías de catálogo)

Aparece una tarjeta de la estantería en la que estés. Gestos:

| Gesto | Significado | Qué pasa |
|---|---|---|
| ⬅️ Izquierda | No la he visto y no me interesa | Pasa a la siguiente |
| ➡️ Derecha | ¡La he visto! | Sale un modal con **estrellas** + **cajita de comentario** + botón guardar. Se puede quitar rápido (botón o swipe): sin nada, solo con estrellas, solo con comentario o con ambos |
| ⬆️ Arriba | No la he visto, me interesa | Se guarda en **Pendientes** |
| 👆 Click | Más info | Ficha ampliada: información, comentarios de amigos, etc. |

- **En la tarjeta principal** aparecen **burbujas con las fotos de amigos** que la tienen, con su **puesto** en su ranking si la han visto. Para leer sus comentarios hay que entrar en la ficha.
- **Orden de las tarjetas**: primero lo más probable que el usuario haya visto (lo famoso en su región, lo de sus conexiones sociales; más detalle en D8).
- Sirve a la vez para **catalogar** y **descubrir**.
- **Tras guardar, sin interrupciones** ✅: solo un aviso breve «Guardada». Nada de «entró en el puesto X» ni duelos de colocación en mitad del swipe; la obra entra provisionalmente según sus estrellas y se afina después en las sesiones de ordenar.

### 3.1 Añadir a mano ✅
- Dentro de una estantería, el botón **+** abre un **buscador del catálogo** de esa estantería (por nombre). Al elegir: **vista** (hoja de valoración) o **pendiente**.
- **Solo aquí hay duelos de colocación** ✅: al añadir una obra vista de forma individual, tras la hoja (estrellas + comentario) vienen unos pocos duelos (2-4) de **esa obra contra otras que ya tienes** en la estantería, para colocarla y valorarla rápido. En Descubrir nunca, para no frenar el swipe.
- **Lista inicial al añadir** ✅: antes de escribir nada se muestran sugerencias (lo famoso, lo común entre tus amigos, lo de tu región y tu época), **sin nada que ya tengas guardado** (vistas ni pendientes).
- Desde un sitio neutro (botón + general), primero se **elige la estantería** y luego se busca.
- Sigue valiendo la regla de catálogo: lo que no está en el catálogo no se puede añadir (de momento).

---

## 4. Funcionalidad B — Valoración a pares (A/B)

- Se muestran **dos obras vistas** y el usuario elige cuál prefiere con swipe izquierda/derecha. **Siempre hay que elegir una** ✅ (no hay botón de empate).
- Aparece en **dos momentos**:
  1. **Al añadir una obra nueva**: pocas comparaciones para colocarla.
  2. **En sesiones de swipe a pares**: por ejemplo, tras importar un CSV con contenido visto sin puntuar.
- **Emparejamiento inteligente** ✅: primero se compara con sus **cercanos** en el ranking. Si gana muchas seguidas, se prueba contra una de **valor alto**; si gana, **sube mucho**. Lo mismo hacia abajo. La elección se fuerza **siempre**.
- **Nada de «sin ordenar» a la vista** ✅: lo importado o guardado sin valorar aparece en la estantería al final de tu ranking, sin etiqueta. En Comparar salen primero las obras **con menos comparaciones**, para que todo se vaya estabilizando solo.
- **Estrellas + A/B** ✅: las estrellas son **solo una primera valoración** para situar la obra. Después **no se vuelven a mostrar en ningún sitio**: solo se ve el **puesto** en tu ranking (D25).
- **Sesiones de unas 10 comparaciones** ✅, no infinitas. Al terminar: «Ver mi ranking» o «Seguir valorando».
- **Se elige con swipe** ✅ (izquierda o derecha). Tiene que quedar clarísimo qué lado es cada uno: pantalla partida en diagonal o con un color por lado que se ilumina en la tarjeta mientras deslizas.
- **Comentario** ✅: es importante, porque una obra puede tener un significado o una mini-reseña que queremos visible.
  - El comentario va **siempre a la ganadora**.
  - **Nada de cajita fija en medio de la pantalla.** Al elegir la ganadora sale una **hoja como la de Descubrir, pero sin estrellas**, con el comentario. Se cierra rápido y tiene un interruptor para dejar de preguntar (y se puede volver a activar).
- También sirve para estanterías de enlace (hay que decidir qué muestra la tarjeta).

---

## 5. Compartir

- **Notas públicas** ✅.
- Puedo **abrir mi perfil** para que otros lo vean.
- Puedo **enviar listas mediante un link** y crear **listas curadas** (eligiendo cosas de mis guardados).
- **Compartir desde cada estantería** ✅: botón compartir → **seleccionar todas** o ir marcando algunas → se crea la lista y su link.
- Los links se abren **dentro y fuera de la app** ✅: la versión web se ve sin instalar nada y desde ella se puede guardar en tu biblioteca (registro o instalación). Es el principal motor de crecimiento.
- **Listas** ✅: cada obra vive una sola vez en su estantería de tipo; una lista es una selección de punteros que **puede mezclar tipos** (ej.: «4 canciones y 3 pelis para ti», «Ruptura 2024») y **se puede guardar** en el perfil, además de enviarse.

---

## 6. Funcionalidad C — Asistente para elegir (antes «¿Qué vemos hoy?»)

- **Cambia de nombre** ✅: deja de ser «¿Qué vemos hoy?» porque sirve para cualquier categoría. Nombre provisional: **«Decidir»** (nombre definitivo pendiente, D22).
- **Primero se elige la categoría** ✅ (Pelis, Series, Libros…) y según cuál salen su test inicial y sus duelos. En Libros, el test del lector.
- **Unas 5 preguntas propias de cada categoría** ✅, que **avanzan solas al tocar** una respuesta (sin botón aceptar). Deben incluir el **mood** (ej. en pelis: acción, romántica, profunda, me da igual…). Las preguntas concretas se pulirán más adelante.
- **Las preguntas hablan de lo que quieres ahora**, no de quién eres ✅: en Libros, sobre la **siguiente lectura** (qué te apetece, extensión, ficción o no, ritmo, parecido a lo que te gusta o salir de tu zona), nada de «un sábado perfecto».
- **Después, duelos, nunca una recomendación directa** ✅: **mínimo 5 duelos**; luego «Te propongo esta». Si dices «Seguir buscando», más duelos y nueva propuesta, en bucle.
- **Duelos «orientadores»** ✅ (D19 cerrado): «¿Te apetece más **algo como esto** o **algo como esto**?». Siempre **obras concretas de la misma categoría** (si buscas libro, libros), **nunca tipos ni géneros**. Sirven para **orientar** lo que buscas; si uno de ellos acaba siendo la mejor propuesta, se propone (21/10/2026). Tienen que ser **muy reconocibles** desde el primer duelo; si aun así no conoce ninguna, a los 2,5 s aparece «No conozco ninguna» (D28, 23/10/2026). Con lo elegido, la app busca en el catálogo (primero tus pendientes).
- Futuro (D24): con un contexto global de cada obra (IA), los orientadores podrían cruzar categorías («para elegir libro: ¿algo tipo *Interstellar* o tipo *Asterios Polyp*?»).
- **Pendientes sin ordenar** ✅ (D26): no se ordenan a mano; para elegir entre ellas ya está el asistente. Se ven en cada estantería (acceso directo «N pendientes»).
- **Modo grupo**: futuro.

---

## 6b. Amigos y contacto

- **Afinidad con amigos** ✅ y **escribirles por WhatsApp desde la ficha** ✅ («Oye, vi que le pusiste un 9…»).
- Cada amigo puede tener **varios canales de contacto**; se usa el que exista (ver D20):
  - **WhatsApp** si tenemos su teléfono (agenda).
  - **Instagram** si vino de Instagram: abrir su chat con `ig.me/m/<usuario>` (Instagram no deja prellenar el texto: se copia al portapapeles para pegarlo).

## 7. Ingesta con IA (absorbe Smart Vault) ✅

- La ingesta de Smart Vault pasa a ser **una función dentro de la biblioteca**. Smart Vault era solo para uso personal; su motor se integra aquí.
- El usuario vuelca un chat donde guarda cosas y la **IA clasifica** lo que pueda y **propone estanterías**.
- Importar **guardados de Instagram, TikTok y X/Twitter** mediante las descargas de datos oficiales de cada plataforma.

---


> [!IMPORTANT]
> **Especificación Maestra de los Tres Motores (20/10/2026, Igor):** La arquitectura detallada de atributos requeridos en obras, usuarios y amigos para los tres cálculos (1. Reconocibilidad de Orientadores A/B, 2. Afinidad de Propuesta Ganadora, y 3. Mazo de Descubrir por Cupos) está fijada en **`docs/MOTOR.md` §2b**.

## 7b. El motor: el pegamento y el cerebro de la app (16/10/2026)

> Decisiones de producto tomadas en el chat. El diseño técnico está en `docs/MOTOR.md`.
> Los ejemplos son de pelis, pero vale para todas las categorías; cada categoría puede tener sus propios pesos y ejes.

### 7b.1 Base común: la red de obras (enriquecimiento por capas) ✅
- **Capa 1, recoger todo lo que hay** de fuentes abiertas o con licencia:
  - **TMDB** (pelis y series): géneros, **keywords**, reparto y dirección, sagas, idioma y país de origen, nota y nº de votos, popularidad y tendencia, estreno y calificación **por país**, dónde verla **por país** (datos de JustWatch, hay que citarlos) y sus relaciones `recommendations`/`similar`.
  - **Wikidata** (CC0, todas): «basada en», premios, tema, lugar y época, ids cruzados (TMDB, IMDb, Open Library, BGG, MusicBrainz), nº de Wikipedias y si tiene artículo en eswiki o euwiki (popularidad cultural y regional).
  - **Open Library / Google Books**: temas, descripciones y cuánta gente lo quiere leer, lo lee o lo ha leído.
  - **Música**: MusicBrainz y ListenBrainz (CC0). Spotify ya no sirve (cerró `related artists` y `audio features` en 2024); Last.fm, solo con cuidado por su licencia.
  - **Juegos**: Wikidata; BGG es solo no comercial.
- **Capa 2, un LLM procesa cada obra por lotes** (una vez, no en tiempo real) con todo lo anterior como base, para no inventar en obras nicho. Devuelve **ejes de sensación** del 1 al 5 propios de cada categoría (pelis: tono luminoso↔oscuro, ritmo, carga emocional, exigencia, humor, tensión o miedo, realismo↔fantasía, para toda la familia, reconfortante o para repetir…) y etiquetas de tema y de «para cuándo» (en pareja, con amigos, para desconectar…).
- **Capa 3, vectores de cercanía**: un embedding por obra → distancia entre dos obras cualesquiera, vecinos más cercanos (grafo de *alikeness*) y clústeres.
- **Capa 1b, asociaciones importadas** ✅ (16/10): antes de fabricar el parecido, se importa el que ya existe en otras fuentes (TMDB recommendations, Wikidata «basada en», sagas, influencias, mismo autor…). Cada asociación guarda su **fuente**, para poder quitarla si una licencia no vale al pasar a comercial. El LLM elige además los vecinos de cada obra de entre candidatas reales, con un motivo. Plan en `docs/ENRIQUECIMIENTO.md`.
- **Capa 4, colaborativo** («a quien le gusta A le gusta B») cuando haya usuarios; mientras, valen los amigos y las asociaciones importadas.
- **Lo social no depende de la escala** ✅: la opinión de un amigo es una señal directa que vale desde el primer amigo (la app es para pocos amigos bien elegidos). Lo que necesita volumen es solo el colaborativo estadístico.
- **Las listas compartidas no son señal del motor** ✅ de momento: son una función voluntaria.
- **MovieLens / Tag Genome**: la **idea** de describir cada obra con grados de sensación es libre y la usamos, pero con **vocabulario y valores propios**. Sus **datos** (las puntuaciones) son solo no comerciales: no entran en el producto. Para calibrar en local, solo con permiso de GroupLens (lo conceden a petición).
- **País y región** del usuario: se toman del idioma o el país del dispositivo; sin GPS.
- **Plataformas**: en Descubrir y en las recomendaciones **nunca filtran**, solo suben un poco (si no, no se descubre nada). En Decidir sí pesan mucho, porque es para ver ahora.

### 7b.2 Orden del mazo de Descubrir: cupos (cierra D8) ✅
- El mazo se construye **intercalando cupos**, no con una sola suma de pesos. Dentro de cada cupo se ordena por puntuación:
  - **Probablemente vista**: popular + tu región + tu época. Domina al principio y baja cuando la biblioteca ya tiene volumen.
  - **Social**: lo que tus amigos han visto **hace poco** (el peso cae con el tiempo) y tienen **alto en su ranking**. Pesan más los amigos con más afinidad contigo, los que dejaron comentario y también cuenta tenerla pendiente.
  - **Rareza de amigo**: obras nicho que nunca saldrían por popularidad, pero que un amigo tiene en lo alto de su ranking (en percentil), sobre todo si dejó comentario.
  - **Exploración**: algo fuera de tu zona.
- **Proporción**: rarezas y exploración suman **más o menos 1 de cada 8 tarjetas** de base, sin seguir un patrón fijo. Sube si las guardas o las marcas como vistas, y baja si las descartas.
- Lo que haces en el propio swipe ajusta el mazo: si dices «no la he visto» a todo lo de una época o un género, esa zona baja; si descartas mucho un género, ese género baja.
- **Diversidad**: nada de muchas seguidas de la misma saga o franquicia.
- **Los descartes vuelven con el tiempo**: un «no me interesa» puede reaparecer pasado bastante tiempo (orientativo: un año), o antes si pasa algo nuevo (un amigo la pone arriba de su ranking).
- **Burbuja de amigo con comentario** ✅: icono pequeño de **bocadillo 💬** en la esquina inferior derecha (un lápiz se confunde con «editar»). Los amigos con comentario van primero en la fila. Idea a probar: mantener pulsada la burbuja enseña la primera línea del comentario.

### 7b.3 Decidir: duelos y propuesta ✅
- **Orientadores reconocibles**: primero **obras que el usuario ya ha visto** (mejor si las tiene arriba en su ranking); si no hay en esa zona, **clásicos muy conocidos**. Las descartadas también valen: no le interesan, pero las conoce.
- **Sin botón «no conozco ninguna»** ✅: se elige por intuición.
- **De lo grueso a lo fino**: los primeros duelos enfrentan **zonas lejanas** (dentro de lo que encaja con el mood y las preguntas). Los siguientes, **dentro de la zona elegida**, con dos obras que se diferencian en uno o dos ejes (no *Toy Story* vs *Matrix*, sino *Toy Story* vs *El Rey León*). Criterio: elegir la pareja que **parte en dos** las candidatas que quedan (el duelo que más información da).
- **Cómo aprende**: el gusto de la sesión **se acerca a la ganadora y se aleja de la perdedora** en los ejes y en los vectores, no solo en los géneros.
- **Número de duelos adaptativo, a probar**: parar antes si hay una candidata clarísima y alargar si no la hay (hasta ahora: mínimo 5, D10).
- **Propuesta = siempre una** ✅. La puntuación mezcla:
  - **Encaje con la sesión** (lo que más pesa).
  - **Tu gusto general**: cercanía a tu top.
  - **Calidad**: nota global y, sobre todo, el puesto que le dan tus amigos, ponderado por afinidad. Aquí pesa más que en Descubrir, porque para ver ahora se quiere algo seguro.
  - **Filtros prácticos**: plataforma, duración, terminada o en emisión, jugadores…
  - **Empujones**: estar en tus pendientes, o que la tenga pendiente un amigo («veedla juntos»).
- Guardadas o catálogo entero: **la misma fórmula**; solo cambian la bolsa de partida y el empujón por ser pendiente. Ni «la mejor valorada» a secas ni «la más cercana» a secas: **encaje × calidad**.
- «Seguir buscando» **se aleja de la propuesta rechazada**: que no vuelva algo casi igual.
- **Motivo con datos reales**: «Porque elegiste *El Rey León* y *Up* · Ana la tiene de nº 2 · Está en Netflix».
- La **ficha de la propuesta enseña amigos, puestos y comentarios** ✅ (ayudan a decidir). Los duelos, no.

### 7b.4 Guardados olvidados: limpieza ✅
- En la pestaña **Pendientes** de cada estantería, botón **«Lanzar limpieza»**: un swipe solo de tus pendientes.
  - ➡️ **derecha**: ya la vi (pasa a vistas y entra en el ranking).
  - ⬆️ **arriba**: sigue guardada.
  - ⬅️ **izquierda**: la descartas.
- Futuro (con backend y notificaciones), avisos con motivo: «*X*, que tenías guardada, acaba de llegar a Netflix», «se va de Filmin», «Ana acaba de ver *X* y la ha puesto de nº 3», «nueva temporada de *X*».
- Decidir sigue siendo Decidir: su pregunta «¿de tus guardados?» y el empujón a pendientes ya cubren el resto.

### 7b.5 Métricas y monitorización ✅
Cada motor tiene que medirse para saber si va bien o hay que cambiar cosas. Ojo: hoy no se registra ningún evento, así que la recogida de eventos va antes que los cambios del motor. Qué medir:
- **Descubrir**:
  - % de «¡la vi!» en las primeras 20 tarjetas (que cataloga bien).
  - % de guardadas como pendiente (que descubre).
  - % de descartes.
  - Respuesta de cada cupo por separado (sobre todo rarezas y exploración).
  - Tarjetas por sesión y abandono.
- **Decidir**:
  - % de propuestas aceptadas a la primera.
  - Nº de «seguir buscando» hasta aceptar.
  - Duelos hasta la propuesta aceptada.
  - Abandono a medias.
  - **Lo más importante**: si la aceptada se acaba marcando como vista y en qué puesto queda en tu ranking.
- **Limpieza**: % de pendientes que pasan a vistas, siguen o se descartan; pendientes recuperadas que acaban vistas.
- **Calidad del mapa**: test fijo de parejas («¿se parecen?») para revisar los ejes y los vectores; puesto que acaban teniendo las obras que propusimos.
- Cambios importantes del motor, con **versión registrada** en cada evento para comparar antes y después (y A/B entre versiones cuando haya usuarios suficientes).

### 7b.6 Datos que faltan
- **Fecha** en las entradas de amigos (para «visto últimamente»).
- **País y región** del usuario.
- **Keywords, nº de votos y dónde verla por país** desde TMDB (la semilla de ahora solo trae géneros y popularidad).
- **Ejes de IA y vectores** por obra.
- **Eventos** para las métricas.

---

## 8. Más features (aparcadas)

Ver `docs/antigravity/VISION_Y_FEATURES.md`: validador previo «¿quién lo vio antes que yo?», trazabilidad `descubierto_por`, wishlist para regalos, Wrapped anual, dating por afinidad.

---

## 9. Debates

| # | Debate | Estado |
|---|---|---|
| D1 | Archivo vs. museo | ✅ El archivo incluye todo; el orden por puntuación muestra lo que más marcó |
| D2 | Colecciones mixtas | ✅ Listas de punteros, mezclan tipos, se pueden guardar |
| D3 | Niveles de estantería | ✅ Solo catálogo al principio; los usuarios votan nuevas categorías |
| D4-5 | Estrellas vs. A/B, modal tras swipe derecho | ✅ en principio (estrellas sitúan, A/B ordena); detalle por pulir, prioridad baja |
| D6 | Momento del comentario | ✅ Al elegir, en una hoja sin estrellas; va a la ganadora; se puede desactivar y reactivar |
| D7 | Pares en el A/B | ✅ Elección forzada siempre; emparejamiento inteligente (cercanos → si racha de victorias, contra una alta → sube mucho) |
| D8 | Orden del mazo (región, amigos, año de nacimiento, plataformas) | ✅ Cupos intercalados (probablemente vista / social / rareza de amigo / exploración, unas 1 de cada 8), ver §7b.2 |
| D9 | Links compartidos | ✅ Dentro y fuera de la app (web) |
| D10 | «¿Qué vemos hoy?» | ✅ Categoría = la estantería; ~5 preguntas propias que avanzan solas (con mood); mínimo 5 duelos; propuesta; «seguir buscando» = más duelos; modo grupo futuro |
| D11 | **Lanzamiento**: ¿qué estanterías al principio? (el Carnaval queda descartado ✅) | 🟡 abierto |
| D12 | Granularidad | ✅ Términos globales: la serie, no la temporada (aplica igual a podcasts: el programa) |
| D13 | Relación con Smart Vault | ✅ La ingesta de Smart Vault es una función de la biblioteca |
| D14 | Privacidad | ✅ Notas públicas |
| D15 | Catálogos y legalidad | ⏸️ Lo resuelve la parte técnica más adelante. Criterio: fuentes abiertas o con licencia (Wikidata, MusicBrainz, Open Library, TMDB…), no raspar webs, los CSV del usuario sí |
| D16 | Modelo de negocio | ⏸️ más adelante, por separado |
| D17 | **Nombre** | 🟡 abierto (primera ronda descartada: Canon, Poso, Acervo, Ex Libris, Huella, Baúl) |
| D18 | **Competencia y viabilidad** | 🟡 en debate |
| D19 | Duelos del asistente | ✅ Orientadores: obras concretas de la misma categoría, nunca tipos ni géneros. **21/10/2026:** un orientador **puede** acabar siendo la propuesta; lo que se evalúa es si orienta bien |
| D20 | **Agenda e Instagram**: importar contactos reales y escribir a amigos que vienen de Instagram | 🟡 abierto (ver §6b) |
| D21 | **Preguntas de cada categoría** para el asistente | ⏸️ se piensan más adelante |
| D22 | **Nombre del asistente** (provisional «Decidir»; candidatos: «Elige por mí», «¿Y ahora qué?», «Asistente») | 🟡 abierto |
| D23 | **Pulido visual**: que deje de parecer una maqueta (portadas reales, sistema visual, referencias) | 🟡 en marcha (ver DISENO_DEMO §13) |
| D24 | **Orientadores entre categorías** con contexto global de cada obra (IA) | ⏸️ futuro |
| D25 | ¿Nota o puesto? | ✅ **Puesto** en toda la interfaz («nº 3 de 42»); la nota 0-10 desaparece. Por dentro se usa el **percentil** (1º = 100, último = 0) para comparar rankings de distinto tamaño (afinidad, recomendaciones, orden del mazo) |
| D26 | ¿Ordenar los pendientes? | ✅ No; el asistente elige entre ellos |
| D27 | Red de obras: ¿con qué datos? | ✅ Por capas: fuentes abiertas → LLM con ejes de sensación propios → vectores de cercanía → colaborativo con usuarios (§7b.1) |
| D28 | Decidir: orientadores y propuesta | ✅ Vistas del usuario + obras de nivel de fama 1; un duelo por dimensión con obras opuestas y parecidas solo al final; preferencias explícitas; siempre una propuesta (encaje × calidad) (§7b.3). **23/10/2026: sí hay botón «No conozco ninguna», que aparece a los 2,5 s sin elegir** (decisión de Igor; detalle en `docs/TAREA_T17_DECIDIR.md` y `TAREA_T19_AJUSTES.md`) |
| D29 | Guardados olvidados | ✅ Botón «Lanzar limpieza» en Pendientes con swipe (§7b.4) |
| D30 | Métricas del motor | ✅ Cada motor con sus métricas y versión registrada (§7b.5) |

---

## Apéndice — Otras ideas surgidas del debate (15/10/2026)

> No forman parte de la biblioteca. Se guardan aquí hasta que alguna pase a desarrollo; entonces tendrá su propia carpeta.
> Análisis de competencia de cada una en `docs/COMPETENCIA.md` (secciones 1d y 1e).

### Idea 1 — App de juegos de mesa 🎲 (la más madura)

> ➡️ **Ya tiene su propia carpeta:** `scratch/juegos-mesa-app/` (documento completo en `docs/IDEA.md`). Lo de abajo es el resumen original.

- **Swipe** sobre los juegos populares con tres estados: **jugado / lo tengo / quiero jugarlo**. «Lo tengo» es nuevo respecto a la biblioteca.
- **Ranking A/B** de tus juegos, guardado en tu **perfil social** (las herramientas actuales de ranking por pares no lo guardan en un perfil y obligan a importar o meter listas).
- **Perfil de jugador con test**: un test te clasifica según el tipo de juego (cooperativo, estrategia, party, solitario…) y te dice cuáles te pueden ir mejor. Visto en apps existentes; hay que estudiarlo.
- **Caras de amigos en la tarjeta** = «¿quién de mis amigos tiene este juego?» → **pedir prestado** y decidir **en qué casa se juega**. Diferencial que nadie hace.
- **«¿A qué jugamos?»** en grupo: los presentes, los juegos que hay en esa casa, número de jugadores y tiempo disponible → propuesta.
- Hueco: todo pasa por BoardGameGeek, anticuada y en inglés; nada en español.
- ⚠️ **Catálogo**: la API de BGG es solo para uso no comercial y exige registro desde 2025; el uso comercial requiere licencia. Alternativa: catálogo propio con Wikidata + editoriales (Devir, Asmodee…).
- ⚠️ Nicho y uso semanal como mucho.

### Idea 2 — Valorador personal a pares → perfil de gustos ⚖️

- La app te propone **pares por categorías** (pelis, comidas, destinos, música, planes…) y vas eligiendo. **Sin importar nada ni meter listas.**
- Con cada elección se va completando tu **perfil de gustos y aficiones**, visible y compartible.
- Relación con las otras ideas: el **motor A/B y el perfil** son la pieza común de la biblioteca y de la app de juegos. Podría construirse una vez y reutilizarse en los tres productos.
- Pregunta abierta: ¿qué hace la gente con ese perfil? (compararse con amigos, afinidad, regalos, citas…). Sin respuesta clara, corre el riesgo de ser un test curioso de un solo uso.

### Idea 3 — Episodios de podcast 🎙️ (aparcada)

- Unidad = el **episodio suelto**; la gente ya se envía episodios concretos por WhatsApp.
- Uso **diario** (coche, gimnasio): «¿qué escucho hoy?».
- Encaja con la visión: «los episodios que me cambiaron la cabeza».
- Catálogo abierto (Podcast Index, incluye episodios). Competencia débil (Podchaser, Goodpods) y nada en español. Los podcasters podrían empujar a su audiencia a la app.
- ⚠️ Nadie recuerda qué episodios ha escuchado y no hay historial importable: el swipe sirve solo para **descubrir**, no para catalogar. La biblioteca se llenaría hacia delante.
