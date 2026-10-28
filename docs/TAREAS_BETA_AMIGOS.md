# Lo que falta para la beta con amigos (28/10/2026)

Hecho el 28/10/2026 (Claude): tabla de eventos protegida (migración `0010`), tabla de duelos creada (`0009`), catálogo
más ligero en producción (archivo principal de 8 MB a 5,2 MB) y Spotify ofrece subir el historial cuando la conexión no
está configurada.

---

## 1. Para Igor: login (hoy no funciona; nadie ha podido entrar)

Estado comprobado en Supabase: proveedor de Google **desactivado**, URL del sitio `http://localhost:3000`, **ninguna**
redirección permitida y sin servidor de correo propio. Claude no puede cambiarlo (el proyecto es compartido con SEDAE y
Riftbound y la protección automática lo bloquea): son 4 pasos en paneles.

### 1.1 Supabase → Authentication → URL Configuration
- **Site URL:** `https://biblioteca-social.vercel.app`
- **Redirect URLs** (una por línea; sin comodines tipo `*.vercel.app`, que dejarían recibir sesiones a cualquier web de Vercel):
  ```
  https://biblioteca-social.vercel.app/**
  https://app-rho-lac-65.vercel.app/**
  http://localhost:5173/**
  http://192.168.1.55:5173/**
  ```
  Ojo: el proyecto lo comparten SEDAE y Riftbound. Hoy ninguna usa el login (0 usuarios), así que no les afecta.

### 1.2 Google Cloud → credenciales de OAuth (unos 10 min)
1. https://console.cloud.google.com → crea un proyecto «Biblioteca» (o usa uno tuyo).
2. *APIs y servicios → Pantalla de consentimiento de OAuth*: tipo **Externo**, nombre de la app, tu email de soporte,
   ámbitos por defecto (email, perfil). En «Usuarios de prueba» añade los emails de tus amigos **o** publícala:
   con solo email y perfil, Google no pide verificación.
3. *Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web*:
   - Orígenes autorizados: `https://biblioteca-social.vercel.app`, `https://app-rho-lac-65.vercel.app`
   - URI de redirección autorizado: `https://pvewnpemlwmvaduzhjso.supabase.co/auth/v1/callback`
4. Copia el **ID de cliente** y el **secreto**.

### 1.3 Supabase → Authentication → Providers → Google
Activa Google y pega el ID de cliente y el secreto. Guardar.

### 1.4 Correo para el código por email (recomendado)
Sin servidor propio, Supabase manda muy pocos correos por hora (el código por email falla en cuanto entran varios).
- Crea una cuenta gratuita en **Resend** (https://resend.com; 3.000 correos/mes gratis), verifica un dominio tuyo
  (p. ej. `canteraslife.com`, que ya usas en Hostinger) y crea una clave.
- Supabase → *Project Settings → Authentication → SMTP Settings*: host `smtp.resend.com`, puerto `465`, usuario
  `resend`, contraseña = la clave, remitente `biblioteca@tudominio`.

**Prueba:** en el móvil, entra con Google y con el código por email; en Supabase → Authentication → Users debe aparecer.

---

## 2. Para Igor: Spotify (opcional para la beta)

La subida del historial ya funciona sin nada de esto. La conexión directa:
1. https://developer.spotify.com/dashboard → *Create app*. Redirect URI: `https://biblioteca-social.vercel.app/conectar/spotify`
   (y `http://localhost:5173/conectar/spotify` para desarrollo). API: *Web API*.
2. Copia el **Client ID** (no hace falta el secreto: la app usa PKCE).
3. Vercel → proyecto `biblioteca-app` → *Settings → Environment Variables*: `VITE_SPOTIFY_CLIENT_ID` = el Client ID → redeploy.
4. *User Management* en el panel de Spotify: añade el nombre y email de Spotify de cada amigo (máximo 25 en modo desarrollo).

Salir del modo desarrollo (para todo el mundo) lo decide Spotify tras revisión, y hoy casi solo lo dan a empresas: no
contar con ello para el lanzamiento.

---

## 3. Para Gemini: catálogo por estanterías (primera carga rápida) · **Gemini**

**Por qué:** todo el catálogo (4.470 obras) va dentro del archivo principal: 5,2 MB (1,3 MB comprimido) que el móvil
descarga y lee antes de enseñar nada. Con 4G o un móvil modesto, la primera pantalla tarda varios segundos.

**Qué hacer:**
1. Sacar el catálogo del archivo principal: un JSON por estantería (como ya se hace con `src/data/engine/<shelf>.json`
   en `lib/engine/loadEngine.ts`), con los campos de `SEED_DROP` de `app/vite.config.ts` ya quitados.
2. `src/data/catalog.ts` hoy es síncrono (`items`, `getItem`, `itemsById`, `itemsOfType`) y lo usa casi toda la app.
   Propuesta: un pequeño índice siempre cargado (id, tipo, título, año, autor, póster, popularidad: lo que necesitan las
   listas y las fichas), y el resto de campos por estantería al abrirla. `getItem` devuelve lo que haya y la pantalla se
   repinta al llegar el detalle (igual que `useCatalog.ensureItems`).
3. Que la primera pantalla (Biblioteca) no espere a ninguna estantería entera.
4. Medir: tamaño del archivo principal comprimido (`gzip -c dist/assets/index-*.js | wc -c`) antes y después;
   objetivo < 300 KB.

**Reglas:** `npx tsc -p app/tsconfig.json --noEmit`, `cd app && npx vitest run` y `npm run build` en verde; sin commits;
sin revisiones visuales (Igor prueba en el móvil). Es un cambio grande: hazlo por pasos y dilo si algo no encaja.

**Hecho cuando:** la Biblioteca se pinta sin descargar el catálogo entero y el archivo principal comprimido baja de 300 KB.

---

## 4. Más adelante (no bloquea la beta)

- **Registro de errores:** guardar los errores de la app (`window.onerror`, promesas sin capturar) como eventos
  `app_error`, para enterarse cuando a alguien se le cuelga.
- **Aviso de privacidad** mínimo (emails y, si se usan, contactos).
- **Proyecto de Supabase propio** para Biblioteca antes del lanzamiento público (hoy lo comparte con SEDAE y Riftbound:
  usuarios de login, límites y cuota comunes).
