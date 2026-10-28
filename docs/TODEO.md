# Todeo (todeo.app) — qué tiene más limpio que nosotros

Revisión del 28/10/2026 en móvil (375 px), primero como invitado y después con una cuenta nueva y vacía (ver «Con cuenta» al final).

## Qué es
«Track what you watch, read & play». PWA + apps iOS/Android. Tres modos (Ver, Leer, Jugar: pelis/series, libros, videojuegos), cada uno con su propia biblioteca. Catálogo de TMDB (se nota en las notas ★ y los proveedores de streaming).

Barra inferior: **Descubrir · Para ti · Social · Mi lista · Vistas**. Arriba: logo, selector de modo (3 iconos), favoritos, avisos y avatar.

## Lo que hacen mejor (ordenado por lo que más nos aportaría)

1. **Un modo = un tema visual completo.** Cambiar a Leer pasa toda la app a papel crema con logo en serif y acento granate; Jugar, a morado. Las pestañas cambian de nombre (Mi lista → Por leer / Por jugar; Vistas → Terminados / Jugados). Nosotros solo tenemos un color por estantería en detalles; ellos hacen que cada estantería *se sienta* otra app sin cambiar de estructura.
2. **El swipe enseña sus gestos.** Debajo del mazo, una línea fija «← Pasar · ↑ Vista · Mi lista →» y cuatro botones redondos (deshacer, no, vista, guardar). Cero dudas. Además tiene un conmutador **Deslizar / Cuadrícula** en la misma pantalla para quien no quiere swipe.
3. **Se usa sin cuenta.** Entras directo a Descubrir; ves fichas, swipe, buscas, preguntas a la IA. La cuenta se pide solo al guardar («Inicia sesión para guardar» como botón flotante). Nosotros pedimos onboarding antes.
4. **Tour de 3 pasos encima de la app real** (Elige qué seguir · Busca o pregunta · Cambia de sección), con «Saltar tour». Corto, contextual, no bloquea.
5. **Un solo buscador que también es la IA.** «Busca o pregunta a la IA»: si lo escrito parece una pregunta aparece un botón de IA y devuelve «Sugerido por IA para "…"» con resultados normales. Probado: «ciencia ficción lenta que te deje pensando» → Primer, Arrival, Ex Machina, ¡Olvídate de mí!. Muy natural.
6. **Arranque en frío con 3 géneros.** «¿Qué te encanta ver? Elige hasta 3» + «Muéstramelo todo». Un toque y ya tienes mazo.
7. **Dónde verlo, en la tarjeta.** Logos de plataformas en la esquina de cada póster («Disponible en Netflix», «En cines», «Sin streaming»). Es lo primero que uno quiere saber.
8. **Ficha en hoja inferior (bottom sheet)** sobre la lista, con tráiler arriba, póster + metadatos en una línea («2005 · 23 temporadas · 466 episodios · Drama · ★ 8.2 · Creador …»), dos acciones grandes (Guardar / Debate), «Leer más», Dónde ver, progreso de episodios (0/466), reparto con fotos y «También te puede gustar». Todo plegado y ordenado.
9. **Estados vacíos que proponen algo.** Mi lista vacía ofrece tres salidas: Explorar, Importar desde Letterboxd, Test de 60 segundos.
10. **«Elegir por mí»**: botón flotante con destellos en Mi lista (su «¿qué vemos hoy?»), siempre a mano donde tiene sentido.
11. **Party con código de 6 caracteres**: «Decidan qué hacer juntos», nombre + crear o unirse. Sin amigos previos ni cuenta.
12. **Debate por obra** (icono de bocadillo en cada tarjeta y en la ficha): comentarios por título.

## Diferencias de gesto (ojo)
- Todeo: → guardar (Mi lista), ↑ vista, ← pasar.
- Nosotros: → visto, ↑ pendiente, ← no me interesa.
No es mejor ni peor, pero quien venga de Todeo (o de Tinder: derecha = «lo quiero») puede esperar que derecha sea «lo quiero ver». Merece una prueba con usuarios.

## Lo que hacemos nosotros mejor (no perder)
- Ranking por duelos A/B, caras de amigos con su nota en la tarjeta, cinco estanterías (incluye música y juegos de mesa), listas compartibles fuera de la app y el motor propio. Todeo no muestra nada de esto en invitado.
- Su Descubrir es una cuadrícula de «tendencias» genérica (Anatomía de Grey, Ley y orden…), poco personal. La nota ★ de TMDB y los «+1» de plataformas recargan la tarjeta.
- Sus títulos largos se cortan a dos líneas sobre el póster y a veces chocan con el logo del póster.

## Propuestas para nosotros (de más a menos impacto)
1. Leyenda fija de gestos bajo el mazo + botones redondos (incluido deshacer).
2. Dejar usar la app sin cuenta y pedirla al guardar lo primero.
3. Tema propio por estantería (fondo, acento y tipografía), no solo un color.
4. Buscador único con IA (podemos apoyarlo en el cerebro en lugar de un LLM por consulta).
5. Arranque en frío de un toque (3 géneros / «enséñamelo todo») antes del onboarding largo.
6. Ficha como hoja inferior, con metadatos en una línea y secciones plegables.
7. Conmutador Deslizar / Cuadrícula en Descubrir.
8. Estados vacíos con tres salidas (explorar, importar, test).
9. Party por código para «¿qué vemos hoy?» en grupo sin necesidad de ser amigos.

## Con cuenta (cuenta nueva y vacía)

- **El «test de 60 segundos» no es un test:** abre los 3 géneros y luego el swipe con una barra «0 de 5 añadidos» que se cierra con «Primeros 5 guardados. Todo listo.». Una meta corta y visible para el arranque: muy buena idea, barata de copiar.
- **Al marcar «vista» sale una hoja inferior para puntuar:** fecha («Vista el», hoy por defecto), 5 estrellas con «Opcional. Ayuda a generar recomendaciones», Omitir / Guardar valoración y «Quitar de vistos». Puntuar nunca es obligatorio. Al guardar en Mi lista, aviso abajo «Añadido a Mi lista» con **Deshacer**.
- **No tienen ranking ni duelos A/B.** Solo estrellas de 1 a 5. Esto sigue siendo lo que más nos diferencia.
- **Vistas = diario** (como Letterboxd): agrupado por día («HOY»), con la nota en estrellas; conmutador Diario / Cuadrícula y un acceso a «Ver tus estadísticas y tu Rewind».
- **Perfil:** cabecera con un collage de tus propios pósters de fondo y el avatar encima; contadores (amigos, registrados, comentarios); un carrusel de estadísticas (tiempo registrado, este año, % de series terminadas, racha en semanas, nota media) y tiras horizontales (vistas, para ver, tus listas, comentarios). Bien resuelto: el perfil se rellena solo con lo que haces.
- **«Elegir por mí»:** coge una al azar de tu lista y ofrece tres botones: **Verla · Otra · Ya vista**. Muy simple; nuestro «¿qué vemos hoy?» es más listo, pero el formato de tres botones es buena referencia.
- **Party en 3 pasos:** ¿qué vamos a elegir? (Ver/Leer/Jugar) → filtros (tipo, géneros, duración máxima 90/120/150 min) → crear. La sala muestra **código de 6 letras + QR**, copiar código o enlace, lista de jugadores con el anfitrión marcado, mínimo 2 para empezar y caduca en 1 h. (La creé y la cancelé.)
- **Amigos es opt-in:** el perfil es privado hasta que pulsas «Publicar» con un nombre visible; avisan claro de qué será público, y Party funciona sin eso. No lo activé.
- **Ajustes en hoja inferior con 6 grupos** (Cuenta, Perfil, Preferencias, Notificaciones, Datos, Acerca de), cada uno con su subtítulo, y «Los cambios se guardan automáticamente». En Preferencias: tema (auto/claro/oscuro), idioma, región, **tus plataformas de streaming** (para resaltar lo que puedes ver), regiones de viaje y plataformas de videojuegos.
- En las tarjetas, con cuenta, aparecen tres iconos (guardar, estrella, debate) y el número de comentarios: la tarjeta queda cargada.

### Añadidos a las propuestas
10. Meta de arranque visible («0 de 5») que termina en un «Todo listo».
11. Hoja de puntuar opcional al marcar visto, con fecha, y aviso con Deshacer en cada acción.
12. Perfil con collage de tus pósters de fondo y carrusel de estadísticas (racha, % terminado, tiempo).
13. Vista de diario por fechas para lo visto.
14. Party con QR además del código, y filtro de duración máxima.
15. Ajustes en grupos con subtítulo y guardado automático; marcar tus plataformas para resaltar «puedes verla».
