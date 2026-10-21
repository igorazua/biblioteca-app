# PROJECT_CONTEXT — Biblioteca (nombre provisional)

**Qué es:** app social para guardar, valorar y compartir todo lo que te ha formado (pelis, series, libros…), organizada en estanterías. Swipe de tres gestos para catalogar y descubrir, ranking por comparación A/B, caras de amigos con su nota, «¿qué vemos hoy?» y listas compartibles por link.

**Estado (21/10/2026):**
- **Git & GitHub:** `git@github.com:igorazua/biblioteca-app.git` (rama `main`).
- **Despliegue Vercel:** [https://biblioteca-social.vercel.app](https://biblioteca-social.vercel.app) (proyecto `biblioteca-app`, conectado a GitHub, SSO protection desactivada).
- **Backend Supabase:** Cuenta secundaria (`usamoneandoando@gmail.com`, proyecto `pvewnpemlwmvaduzhjso`). Tablas creadas con RLS: `biblio_profiles`, `biblio_entries`, `biblio_friends`, `biblio_invites`, `biblio_events`.
- **Demo funcional:** PWA navegable en `app/` lista para probar con amigos y móviles reales.

**Motor (16/10/2026):** decisiones de producto del motor (orden del mazo, Decidir, limpieza de guardados, métricas) en `docs/IDEA.md` §7b; diseño técnico por fases en `docs/MOTOR.md`. Se incorpora la fase previa de Backend Mínimo para conectar Supabase antes del cálculo de eventos.

**Objetivo (21/10/2026, Igor):** cero fricción y **los mejores tres motores que existan** (reconocibilidad R para los duelos, propuesta A de Decidir, mazo D de Descubrir), con **la ficha de obra con más metadatos que exista**. Se itera todo lo que haga falta, midiendo cada cambio (MOTOR §2b.6).

**El cerebro (21/10/2026, Igor):** el motor pasa a ser un espacio único que aprende: contenido (ficha de experiencia escrita por LLM) + comportamiento prestado (clickstream de Wikipedia y listas públicas raspadas) + vector de cada usuario + un modelo que aprende a ordenar. Se evalúa con perfiles públicos como usuarios de prueba. Diseño en `docs/MOTOR.md` §2c (con costes estimados); licencias aparcadas hasta que funcione con usuarios.

**Estado real del motor (21/10/2026 - T0 a T13 completados y verificados):**
- **Cerebro (Capas 1, 2 y 3):** MiniLM 384d + Grafo Clickstream Wikipedia (2.611 aristas PPMI) + Fusión de difusión y PCA Int8 48d (`cross.json` y `engine/<shelf>.json` todos <= 350 KB).
- **Motores R, A y D:**
  - **R (`recog.ts`):** Reconocibilidad unificada con ventana formativa [12, 25], social boost, inferencia de edad y décadas de éxito de artistas.
  - **A (`decide.ts`):** Orientadores sobre todo el pool, re-muestreo tras 3.er duelo / «Seguir buscando», parada adaptativa, tracking de latencia en ms.
  - **D (`deck.ts`):** Mazo Descubrir con ranker calibrado, señales `r` y `s`, y exploración adaptativa.
- **Capa 4 (`userVec.ts`, `ranker.ts`, `metrics.ts`):** Vector de usuario u en R^48 en Zustand store con decaimiento reactivo de 365 días; ranker logístico reentrenado sobre 56k eventos (AUC 0.795); métricas de AUC de R y latencia mediana de duelos en `/metricas`.
- **Registro de atributos y metadatos (T12 y T13):**
  - Libros: `schoolReading.ES` (100% cubierto, 53 curriculares contrastados con listas oficiales).
  - Series: TVmaze integrado al 91,7% (`seasons`, `episodes`, `network`, `ongoing`).
  - Juegos: `weight` (1.0-5.0), `minAge`, `cooperative`, `mechanics` al 100%.
  - Pelis: `cast` principal vía Wikidata SPARQL P161 (79,9% de películas).
  - Música: `peakDecades` al 100% de artistas.
- **Portadas alojadas (T1 completado):** 100 % de las 4.345 obras alojadas en Supabase Storage (`biblio-covers`) en formato WebP optimizado (342 px), eliminando enlaces externos rotos o bloqueados (0 dependencias externas, 100 % respuestas 200 OK).
- **Tests y compilación:** 19/19 archivos de tests y 125/125 tests en verde. PWA compila limpia sin errores.

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
11. `docs/antigravity/` — manifiesto previo hecho con Antigravity (`VISION_Y_FEATURES.md`) y mockup de UI.

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
