# PROJECT_CONTEXT — Biblioteca (nombre provisional)

**Qué es:** app social para guardar, valorar y compartir todo lo que te ha formado (pelis, series, libros…), organizada en estanterías. Swipe de tres gestos para catalogar y descubrir, ranking por comparación A/B, caras de amigos con su nota, «¿qué vemos hoy?» y listas compartibles por link.

**Estado (16/10/2026):**
- **Git & GitHub:** `git@github.com:igorazua/biblioteca-app.git` (rama `main`).
- **Despliegue Vercel:** [https://biblioteca-social.vercel.app](https://biblioteca-social.vercel.app) (proyecto `biblioteca-app`, conectado a GitHub, SSO protection desactivada).
- **Backend Supabase:** Cuenta secundaria (`usamoneandoando@gmail.com`, proyecto `pvewnpemlwmvaduzhjso`). Tablas creadas con RLS: `biblio_profiles`, `biblio_entries`, `biblio_friends`, `biblio_invites`, `biblio_events`.
- **Demo funcional:** PWA navegable en `app/` lista para probar con amigos y móviles reales.

**Motor (16/10/2026):** decisiones de producto del motor (orden del mazo, Decidir, limpieza de guardados, métricas) en `docs/IDEA.md` §7b; diseño técnico por fases en `docs/MOTOR.md`. Se incorpora la fase previa de Backend Mínimo para conectar Supabase antes del cálculo de eventos.

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
10. `docs/antigravity/` — manifiesto previo hecho con Antigravity (`VISION_Y_FEATURES.md`) y mockup de UI.

## Estructura
- `demo/mockup.html` — demo antigua de Antigravity (solo referencia visual; no reutilizar).
- `app/` — la demo nueva: Vite + React + TS + Tailwind v4 + framer-motion + zustand. Ver `app/README.md` (arrancar, probar en móvil, regenerar `seed.json`). `npm run dev`, `npm test`, `npm run seed`.

## Reglas
- Catálogo solo de fuentes abiertas o con licencia (Wikidata, TVmaze, Open Library, MusicBrainz); no raspar webs.
- **No hay API de TMDB**: no pedirla ni depender de ella.
- Claves en `app/.env.local`, nunca en el repositorio ni en el navegador.
- Desplegar solo con confirmación de Igor.
- **App nativa:** se programará desde cero en React Native o en nativo iOS (por decidir). No se envuelve la PWA (nada de Capacitor ni similares). La PWA sigue siendo la versión web. Requisitos en `docs/APP_NATIVA.md`.

## Proyectos relacionados
- `scratch/juegos-mesa-app/` — idea derivada: la misma mecánica aplicada a juegos de mesa.
- `scratch/smart-vault/` — su motor de ingesta se integrará aquí en el futuro (D13).
- `scratch/carnaval-app/` — **otro proyecto** («Coplas & Compás»); de ahí salió el mockup antiguo, pero no tiene relación.
