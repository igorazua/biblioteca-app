# Registro de Auditoría y Cambios de Textos (Tarea D / T20.8)

De acuerdo con la guía editorial de `docs/TAREA_T20_CIERRE.md` §T20.8:

## Principios aplicados
- **Tú, cercano y directo:** Frases cortas y transparentes, sin tecnicismos («duelo» → «comparar», «ítem» → «obra», «descartar» → «No me interesa»).
- **Verbos de acción:** Botones con verbos directos de 1 a 3 palabras («Enviar enlace», «Deshacer», etc.).
- **Unificación de términos clave:**
  - cada elemento de catálogo → **obra** (o término específico «peli», «libro»).
  - cada categoría → **estantería**.
  - los tres gestos → **«La vi» / «La leí» / «Lo jugué» / «Lo escuché»**, **«Pendiente»**, **«No me interesa»**.
  - ordenar por parejas → **comparar** / «¿Cuál te gustó más?».
  - lista ordenada → **tu ranking** o **tu top**.
  - propuestas de Decidir → **«Te proponemos…»**.
- **Sin emojis en interfaz** y sin signos de exclamación innecesarios.

## Cambios realizados (antes → después)

1. **`app/src/screens/Onboarding.tsx`**
   - *Antes:* `Poner un 7 o un 8 no define tu gusto. En los duelos eliges entre dos y tu ranking se ordena solo.`
   - *Después:* `Poner un 7 o un 8 no define tu gusto. Al comparar eliges entre dos y tu top se ordena solo.`

2. **`app/src/screens/CompareSession.tsx`**
   - *Antes:* `aria-label="Deshacer el último duelo"`
   - *Después:* `aria-label="Deshacer la última elección"`

3. **`app/src/screens/Settings.tsx`**
   - *Antes:* `{emailSent ? 'Enviado ✓' : 'Enviar'}`
   - *Después:* `{emailSent ? 'Enviado' : 'Enviar enlace'}`
   - *Antes:* `sub="Ofrece escribir una nota breve tras cada duelo"`
   - *Después:* `sub="Ofrece escribir una nota breve tras comparar dos obras"`

4. **`app/src/components/CleanupFlow.tsx`**
   - *Antes:* `aria-label="Fuera (descartar)"`
   - *Después:* `aria-label="No me interesa"`
