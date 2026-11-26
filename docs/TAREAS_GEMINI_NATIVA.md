# Encargos para Gemini mientras se construye la app nativa (10/11/2026)

> Tres tareas independientes entre sí. Se pueden hacer en cualquier orden.
> La app nativa se construye a la vez en otra rama (`native/fase-1`, carpeta `.claude/worktrees/native`) con agentes de Claude. Estas tareas **no la tocan**.
> Claude revisa cada entrega con los comandos de «Hecho cuando» antes de darla por buena.

## Reglas comunes

1. Lee antes `PROJECT_CONTEXT.md` y `CLAUDE.md`.
2. Trabaja en esta carpeta (`biblioteca-app`, rama `main`). **No toques nada dentro de `.claude/`.**
3. **No toques `app/src`.** La PWA está congelada como especificación de la app nativa (etiqueta `web-congelada-v1`): cualquier cambio ahí habría que trasladarlo a mano a la nativa.
4. **No hagas commits ni push.** Push a `main` publica en producción. Claude commitea lo que se dé por bueno.
5. Nada de navegador, capturas ni revisiones visuales.
6. **No digas «hecho» sin pegar la salida real de los comandos de comprobación.** Si algo no se cumple, dilo tal cual.

---

## G1 — Completar las medidas de las pantallas que faltan

**Por qué:** la app nativa copia la PWA 1:1 y los agentes construyen cada pantalla a partir de medidas sacadas del código. La primera tanda (`.claude/worktrees/native/docs/MEDIDAS_NATIVA.md`, solo lectura para ti) cubre las pantallas principales. Faltan las de las fases 2 a 4.

**Qué hacer:**
1. Lee `.claude/worktrees/native/docs/MEDIDAS_NATIVA.md` entero. Sigue **el mismo formato**: secciones por componente, cada dato con `archivo:línea`, Tailwind traducido a px (`p-4` = 16, `gap-3` = 12…), lo condicional marcado **(condicional)** y lo que el código no fija marcado **(no fijado)**. Sin `hover:`.
2. Escribe `docs/MEDIDAS_NATIVA_2.md` con estas piezas, en este orden:
   - **Flujos de la fase 2:** `components/AddFlow.tsx`, `RatingFlow.tsx`, `CleanupFlow.tsx`, `PlaceFlow.tsx`, `PairCompare.tsx`, `SwipePair.tsx`, `NudgeCard.tsx`, `Group.tsx`, `FriendBubbles` (en `ui.tsx`), `AskFriend.tsx`.
   - **Fase 3:** `screens/Onboarding.tsx`, `Profile.tsx`, `EditProfile.tsx` (+ `components/AvatarCropper.tsx`), `Settings.tsx`, `JoinInvite.tsx`, `Public.tsx`, `components/FindFriends.tsx`, `PhoneDiscovery.tsx`.
   - **Fase 4:** `screens/Connect.tsx`, `ConnectSpotify.tsx`, `Import.tsx` (+ `components/ImportFlowView.tsx`), `Metrics.tsx`, `components/PushPrompt.tsx`.
3. Para cada pantalla, además de las medidas: textos visibles literales, estados (vacío, cargando, error) y las animaciones con sus valores (duración, muelle, retardo).
4. Al final, una sección «Dudas» con lo que no se pueda saber leyendo el código.

**No hace falta:** `ListEditor.tsx` (listas aparcadas), el selector de variantes de `Discover.tsx` ni el de tamaño de duelos de `Settings.tsx` (no se portan: `docs/PLAN_NATIVO.md` §4).

**Hecho cuando:**
- están todas las piezas de la lista;
- cada dato numérico lleva `archivo:línea`. Claude comprobará 20 al azar contra el código: si falla más de uno, se rehace la pieza;
- no hay nada inventado: lo que no esté en el código va como **(no fijado)**.

---

## G2 — Fichas de experiencia del cerebro (C4)

**Por qué:** es el encargo C4 de `docs/TAREAS_CEREBRO_V3.md`, que ya estaba recomendado para Gemini. Lee C4 y sus reglas comunes, más `docs/TAREAS_MOTOR_V2.md` §T5 y `docs/MOTOR.md` §2c.1. Además, arregla el problema de los ejes falsos de `PROJECT_CONTEXT.md` (ejes con ruido pseudoaleatorio en `calibrate-axes.mjs`): los ejes de la ficha tienen que salir del LLM con su contexto, nunca de reglas ni de azar.

**Qué hacer:**
1. Mira lo que ya hay en `app/scripts/cache/llm/` (`sample.md`, `enriched/`). Si la muestra existente cumple C4 (20 por estantería, 6 apartados, contexto de E5, sin memoria), úsala. Si no, rehazla.
2. **⛔ Para y espera a Igor** con la muestra de 100 obras en `app/scripts/cache/llm/sample.md`. Si no hay respuesta de Igor sobre la muestra, no se hace el lote.
3. Con el visto bueno: lote completo, una estantería por sesión, con la prueba de deriva de `docs/ENRIQUECIMIENTO.md` §5b.3.
4. Vectoriza ficha + temas + momentos y mide con `cd app && PYTHONIOENCODING=utf-8 python scripts/brain/build_space.py --eval` frente al actual. Solo si mejora: `--eval --write`.

**Límites:**
- Solo scripts y datos (`app/scripts/**` y los datos que genera `npm run seed` / `npm run engine`). Nunca `app/src/lib` ni `app/src/store` (regla 3).
- Nadie edita `seed.json` a mano: todo cambio del catálogo entra por los scripts.
- Cada valor del LLM guarda procedencia, confianza y fecha, y nunca pisa un dato de fuente dura.

**Hecho cuando:**
- fichas para todo el catálogo, con los criterios de §T5: ningún eje con más del 60 % de valores en 3, `conf: 'baja'` ≤ 15 % por estantería y QA de parejas ≥ 85 %;
- tabla actual frente a nuevo de `build_space.py --eval` en las 5 estanterías;
- `npx tsc -p app/tsconfig.json --noEmit` limpio y `cd app && npx vitest run` igual que antes: 322 pasan, 17 fallos esperados y 6 saltados.

---

## G3 — Límite diario de búsqueda de contactos (0006), preparado y sin aplicar

**Por qué:** la app nativa leerá la agenda entera. Hoy `biblio_match_contacts` (`supabase/migrations/0006_biblio_invites_and_contacts.sql`) admite 500 números por llamada y 2.000 al día. Una agenda de más de 2.000 números falla siempre, y una de 1.200 falla si se repite el mismo día. Contexto: `docs/APP_NATIVA.md` §Bloqueantes 2.

**Diseño elegido** (no lo cambies sin avisar):
- Se mantienen las 500 por llamada y las 2.000 al día.
- Se añade una **cuota de primera vez de 10.000 números por cuenta**, para toda la vida de la cuenta. Se gasta antes que la diaria, así que la primera sincronización de una agenda grande cabe entera.
- **No se guarda ningún número de terceros** en el servidor, ni en claro ni con hash. Recordar qué números ya se han cruzado es cosa del móvil, que solo enviará los nuevos. Esa parte la hará la app nativa, no tú.
- El mensaje de error del límite no cambia, para que la PWA siga funcionando igual.

**Qué hacer:**
1. `supabase/migrations/0011_biblio_contacts_allowance.sql`: columna o tabla para la cuota de primera vez y `create or replace function public.biblio_match_contacts` con la nueva cuenta. Misma firma, mismo resultado, misma seguridad (`security definer`, `search_path = public` y permisos revocados como en 0006). Idempotente: se puede ejecutar dos veces sin error.
2. `docs/CONTACTOS_LIMITE.md`, corto, con:
   - qué cambia y por qué;
   - cómo probarlo en SQL con tres casos: agenda de 1.200 dos veces el mismo día, agenda de 6.000 la primera vez, y llamada de 501;
   - si el gateway de la API o los logs de Postgres pueden registrar el cuerpo de la llamada (los números), según la documentación de Supabase, con enlaces. Es la comprobación pendiente de `docs/APP_NATIVA.md` §RGPD.
3. **No la apliques.** El proyecto de Supabase es compartido con SEDAE y Riftbound: Igor la aplica tras revisarla.

**Hecho cuando:**
- existen la migración y el documento;
- la migración no cambia la firma ni el tipo de retorno de la función;
- Claude revisa el SQL y lo da por bueno antes de que Igor la aplique.
