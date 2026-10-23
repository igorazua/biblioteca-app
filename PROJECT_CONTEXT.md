# PROJECT_CONTEXT — Biblioteca (nombre provisional)

**Qué es:** app social para guardar, valorar y compartir todo lo que te ha formado (pelis, series, libros…), organizada en estanterías. Swipe de tres gestos para catalogar y descubrir, ranking por comparación A/B, caras de amigos con su nota, «¿qué vemos hoy?» y listas compartibles por link.

**Estado (23/10/2026):**
- **Git & GitHub:** `git@github.com:igorazua/biblioteca-app.git` (rama `main`).
- **Despliegue Vercel:** [https://app-rho-lac-65.vercel.app](https://app-rho-lac-65.vercel.app) (proyecto `biblioteca-app`, conectado a GitHub `main`, producción automática). Dominio secundario / alias: `biblioteca-social.vercel.app`.
- **Backend Supabase:** Cuenta secundaria (`usamoneandoando@gmail.com`, proyecto `pvewnpemlwmvaduzhjso`). Tablas creadas con RLS: `biblio_profiles`, `biblio_entries`, `biblio_friends`, `biblio_invites`, `biblio_events`.
- **Demo funcional:** PWA navegable en `app/` lista para probar con amigos y móviles reales.

**Motor (16/10/2026):** decisiones de producto del motor (orden del mazo, Decidir, limpieza de guardados, métricas) en `docs/IDEA.md` §7b; diseño técnico por fases en `docs/MOTOR.md`. Se incorpora la fase previa de Backend Mínimo para conectar Supabase antes del cálculo de eventos.

**Objetivo (21/10/2026, Igor):** cero fricción y **los mejores tres motores que existan** (reconocibilidad R para los duelos, propuesta A de Decidir, mazo D de Descubrir), con **la ficha de obra con más metadatos que exista**. Se itera todo lo que haga falta, midiendo cada cambio (MOTOR §2b.6).

**El cerebro (21/10/2026, Igor):** el motor pasa a ser un espacio único que aprende: contenido (ficha de experiencia escrita por LLM) + comportamiento prestado (clickstream de Wikipedia y listas públicas raspadas) + vector de cada usuario + un modelo que aprende a ordenar. Se evalúa con perfiles públicos como usuarios de prueba. Diseño en `docs/MOTOR.md` §2c (con costes estimados); licencias aparcadas hasta que funcione con usuarios.

**Estado real (23/10/2026, comprobado por Claude con `tsc`, `vitest` y `coverage.mjs`):**
- **Funciona y está probado:**
  - 142/142 tests en verde y compilación limpia.
  - Lista de oro de fama correcta en las 5 estanterías (*Titanic*, *Friends*, Monopoly, Queen… arriba; *Ra*, Slowdive… abajo).
  - Niveles de fama por cupo (40 de nivel 1 por estantería; revisión en `app/scripts/cache/attrs/nivel1.md`).
- **Decidir (T17-A y T19-A):**
  - duelos por fases F1-F3 (las primeras, solo con obras propias o de nivel 1);
  - dimensiones de contraste (`lib/engine/dimensions.ts`);
  - **botón «No conozco ninguna» a los 2,5 s** (decisión de Igor del 23/10, sustituye a D28).
- **Comparar (T16 y T19-C):**
  - portada única (próximo duelo + estanterías con su **% ordenado**);
  - duelo en abanico (diseño 3) en toda la app;
  - historial de duelos sin repetir parejas (tabla `biblio_duels`);
  - «completo» solo cuando no queda ninguna pareja.
- **Portadas (T14 y T19-B):** solo quedan sin imagen real 3 pelis, 7 series, 7 libros, 0 juegos y 0 artistas. El paso de meterlas en el catálogo no estaba hecho; lo arregló Claude el 23/10 (`attrs.mjs` + `build.mjs`, versión `?v=3`).
- **Sistema de diseño «Editorial sobria»:** aplicado en todas las pantallas (`docs/SISTEMA_DISENO.md`).
- **Conectar (T15; T18 en curso):** página con 26 servicios. Funcionan los archivos de Netflix, IMDb, Letterboxd, Goodreads y StoryGraph, y por usuario Open Library y AniList. Letterboxd y Goodreads por usuario dependen de la función `biblio-connect`. Spotify está apagado sin `VITE_SPOTIFY_CLIENT_ID`.
- **Pendiente (lo marca `coverage.mjs` como fallo):**
  - visitas de Wikipedia en libros (49 %), juegos (63 %) y artistas (1 %);
  - **ejes de sensación de relleno** en 35 ejes (sobre todo libros, juegos y artistas): T17 §B.1, rehacer T5.
- **Siguiente:** T18 (Conectar sin claves), la tarea D (textos de toda la app; guía por hacer) y lo pendiente de arriba. Las tareas están en `docs/TAREAS_MOTOR_V2.md` y `docs/TAREA_T16…T19`.
- **Aviso:** antes del 23/10, este apartado daba por «completados y verificados» T0-T13 y «100 % de portadas», y no era verdad. **Una tarea solo está hecha si `coverage.mjs` y los tests pasan.**

## Documentos (leer en este orden)
1. `docs/IDEA.md` — la idea, decisiones tomadas (✅) y debates abiertos. **Fuente de verdad.**
2. `docs/DISENO_DEMO.md` — especificación completa de la demo navegable (PWA, sin backend) para enseñar a amigos.
3. `docs/MOTOR.md` — diseño técnico del motor (mazo por cupos, Decidir, limpieza, enriquecimiento y métricas), por fases.
4. `docs/ENRIQUECIMIENTO.md` — plan de ejecución para enriquecer el catálogo de todas las categorías (fuentes y licencias, grafo importado, LLM, vectores, cobertura).
5. `docs/COMPETENCIA.md` — competidores, cifras, viabilidad y análisis de pivote.
6. `docs/ROADMAP_BETA.md` — hoja de ruta de la demo a la beta con amigos y, después, al lanzamiento público (17/10/2026).
7. `docs/SISTEMA_BETA.md` — diseño técnico de la beta, listo para construir: catálogo vivo, cuentas, aviso de versión, botón «Todas», imports, foto de perfil y mejora visual.
8. `docs/PLAN_MEJORAS.md` — mejoras tras revisar la app (19/10/2026): catálogo sin TMDB, portadas, onboarding, Perfil/Ajustes, recordatorios y notificaciones, animaciones.
9. `docs/APP_NATIVA.md` — lo que exige la app nativa sea cual sea la tecnología: permisos de contactos, tiendas y la política de contactos de Google Play, RGPD, login nativo y límites de 0006 (20/10/2026).
10. `docs/TAREAS_MOTOR_V2.md` — **encargo actual (21/10/2026)**: tareas detalladas para dejar los tres motores y la metadata al máximo nivel, con criterios de aceptación.
11. `docs/SISTEMA_DISENO.md` — sistema de diseño «Editorial sobria» (obligatorio en toda pantalla).
12. `docs/CONECTAR.md` — importar desde otras apps y mantenerlo al día.
13. `docs/REFERENCIAS_UI.md` — patrones de otras apps (Shelf, Popcorn, Achriom) y decisiones de Igor.
14. `docs/TAREA_T16_COMPARAR.md`, `TAREA_T17_DECIDIR.md`, `TAREA_T18_CONECTAR.md`, `TAREA_T19_AJUSTES.md` — encargos detallados.
15. `docs/antigravity/` — manifiesto previo hecho con Antigravity (`VISION_Y_FEATURES.md`) y mockup de UI.

## Estructura
- `demo/mockup.html` — demo antigua de Antigravity (solo referencia visual; no reutilizar).
- `app/` — la demo nueva: Vite + React + TS + Tailwind v4 + framer-motion + zustand. Ver `app/README.md` (arrancar, probar en móvil, regenerar `seed.json`). `npm run dev`, `npm test`, `npm run seed`.

## Reglas
- **Catálogo y portadas (21/10/2026, Igor; sustituye a la regla anterior de «no raspar webs»):** hasta tener un sistema mejor, **se permite raspar webs** para portadas y datos de obras. Condiciones:
  - **las imágenes se descargan, se redimensionan y se alojan nosotros** (bucket de Supabase Storage). Nunca se enlazan en caliente: Goodreads/Amazon ya devuelven 403;
  - cada dato e imagen guarda su procedencia (`src`, `imageSrc`) para poder sustituirlo con `purge-source.mjs`;
  - ritmo moderado (≤ 1 petición/s por dominio), sin iniciar sesión en ninguna web, con caché para no repetir descargas;
  - riesgo conocido: antes del lanzamiento público se revisa qué fuentes raspadas se sustituyen.
  - Las fuentes abiertas (Wikidata, TVmaze, Open Library, MusicBrainz, Wikipedia) siguen siendo la primera opción cuando tienen el dato.
- **Huecos de datos → LLM (21/10/2026, Igor):** cuando falta un dato, se detecta en el informe de cobertura y se rellena con un LLM (inferido o con búsqueda en internet), siempre con procedencia, confianza y fecha. Un valor del LLM nunca pisa uno de una fuente dura. Ver el registro de atributos en `docs/MOTOR.md` §2b.2.
- **Nadie edita `seed.json` a mano ni con scripts sueltos:** todo cambio del catálogo entra por `npm run seed` (y `npm run engine`) para que no se pierda al regenerar.
- **No hay API de TMDB**: no pedirla ni depender de ella.
- Claves en `app/.env.local`, nunca en el repositorio ni en el navegador.
- Desplegar solo con confirmación de Igor.
- **App nativa:** se programará desde cero en React Native o en nativo iOS (por decidir). No se envuelve la PWA (nada de Capacitor ni similares). La PWA sigue siendo la versión web. Requisitos en `docs/APP_NATIVA.md`.

## Proyectos relacionados
- `scratch/juegos-mesa-app/` — idea derivada: la misma mecánica aplicada a juegos de mesa.
- `scratch/smart-vault/` — su motor de ingesta se integrará aquí en el futuro (D13).
- `scratch/carnaval-app/` — **otro proyecto** («Coplas & Compás»); de ahí salió el mockup antiguo, pero no tiene relación.
