# App nativa: qué hace falta (sea cual sea la tecnología)

> Estado (20/10/2026): **decidido que la app nativa se programa desde cero**, en React Native o en nativo iOS (Swift), por decidir. No se envuelve la PWA (Capacitor se probó y se descartó). La PWA de Vercel sigue siendo la versión web.
> Este documento recoge lo que vale para cualquiera de las dos opciones: permisos, tiendas, RGPD, login y límites del servidor. El motivo inmediato es que «Buscar en tus contactos» funcione como en cualquier app, pidiendo permiso para leer toda la agenda, también en iPhone.

## Resumen

- El backend no cambia: la app nativa usa el mismo Supabase (`pvewnpemlwmvaduzhjso`) y las mismas funciones de la migración 0006 (`biblio_match_contacts`, `biblio_set_phone`, `biblio_phone_status`).
- **Lo caro no es leer la agenda.** Lo caro es: cuentas de desarrollador, revisión de las tiendas, la nueva política de contactos de Google Play, el RGPD, el login nativo y el límite diario de 0006.
- Los números tienen que normalizarse **igual que en la web** (E.164, ver `app/src/lib/phone.ts`); si no, el cruce por HMAC no coincide. En React Native se puede reutilizar el fichero TS tal cual. En Swift hay que portarlo, y conviene probarlo con los mismos casos de `phone.test.ts`.

## Leer la agenda

| | iOS | Android |
|---|---|---|
| API | `CNContactStore` (Contacts framework). En React Native, `expo-contacts` o `react-native-contacts` | `ContactsContract`. En React Native, las mismas librerías |
| Permiso | `NSContactsUsageDescription` en `Info.plist` (obligatorio: si falta, la app se cierra al pedirlo) | `READ_CONTACTS` en `AndroidManifest.xml`. Solo lectura, **nunca** `WRITE_CONTACTS` |
| Texto del diálogo | Lo pone la app (ver abajo) | No se puede personalizar: el contexto lo da la pantalla previa (ver RGPD) |
| Acceso parcial | iOS 18: **acceso limitado** (la persona elige qué contactos ve la app). Hay que tratarlo como permitido y ofrecer ampliar la selección | Android 17 (API 37): nuevo Contact Picker del sistema (`Intent.ACTION_PICK_CONTACTS`) como alternativa al permiso completo |
| Si se deniega | Mensaje: «Sin permiso para ver tus contactos. Puedes activarlo en los ajustes del teléfono.» con botón a Ajustes. La app sigue funcionando con invitaciones por enlace | Igual |

**Texto iOS propuesto:** «Para decirte cuáles de tus contactos ya usan Biblioteca y a quién invitar. Los números se comparan en el servidor y no se guardan.»

Por cada contacto, quedarse con un único número válido (el móvil primero), sin duplicados. Los nombres **no** se envían al servidor: solo hacen falta en el móvil para pintar la lista.

## Bloqueantes antes de publicar

1. **Login.** El login web (`useAuth.ts`, con `redirectTo = window.location.origin`) no sirve tal cual en nativo.
   - **Google:** Google Sign-In nativo → `supabase.auth.signInWithIdToken`. En React Native existe `@react-native-google-signin/google-signin`; en Swift, el SDK GoogleSignIn junto a `supabase-swift`. Google no permite OAuth dentro de WebViews embebidos.
   - **Apple 4.8:** si la app de iOS ofrece login con Google, tiene que ofrecer también **Sign in with Apple** (u otro login equivalente en privacidad). Supabase lo soporta con `signInWithIdToken` (proveedor `apple`).
   - **Email (enlace mágico/OTP):** o se pide el código de 6 dígitos dentro de la app (lo más sencillo), o el enlace vuelve a la app por **Universal Links / App Links**. Para eso Vercel tiene que servir `apple-app-site-association` y `assetlinks.json` en `/.well-known/`.
   - Añadir el esquema o las URLs de vuelta a la allowlist de redirecciones de Supabase.
2. **Límites de 0006.** `biblio_match_contacts` admite **500 números por llamada** y **2000 al día por usuario**. Con la agenda entera, una de más de 2000 números falla, y una de 1200 falla la segunda vez del día. Antes de publicar: subir el límite (sin abrir la puerta a enumerar números), o cruzar solo los números nuevos desde la última vez (guardando en el móvil qué se ha cruzado ya).
3. **Invitaciones por enlace.** Los enlaces de invitación (`/unete/:code`) tienen que abrir la app si está instalada (Universal Links / App Links) y la web si no. Y `wa.me` se abre con el mecanismo nativo de abrir URL.
4. **Nombre y bundle ID.** El nombre del producto no está decidido y el identificador (`com.…` / `app.…`) **no se puede cambiar** después de publicar.

## Tiendas: coste y revisión

> Precios y plazos tomados de fuentes públicas en 10/2026. Comprobarlos al darse de alta.

| | Apple App Store | Google Play |
|---|---|---|
| Cuota | Apple Developer Program, **99 $/año** (≈ 99 € en España) | **25 $ una vez** |
| Requisitos | Mac con Xcode (o build en la nube: EAS de Expo, Codemagic, GitHub Actions con macOS). Cuenta con verificación de identidad | Cuenta **personal nueva**: prueba cerrada con **12 testers durante 14 días seguidos** antes de producción (las cuentas de empresa están exentas) |
| Revisión | 1–3 días normalmente. TestFlight para la beta | De horas a varios días, más la prueba cerrada |
| Riesgos | **5.1.1:** subir la agenda exige un propósito claro y consentimiento, y no se puede obligar a darla para usar la app. **4.8:** Sign in with Apple si hay login con Google. (Al ser código nativo, el riesgo de la 4.2, «solo es una web», es bajo) | **Política de permiso de contactos** (ver abajo) |

**Google Play y `READ_CONTACTS`** (política anunciada el 15/04/2026):
- Para apps con target Android 17 (API 37) o superior, solo se permite si el Contact Picker del sistema no basta. Hay que rellenar una declaración en Play Console con el caso de uso y por qué el picker no es suficiente.
- Según Google, Play Console avisa desde septiembre de 2026 y el cumplimiento es **obligatorio desde el 27/01/2027** (con 30 días de prórroga).
- **«Emparejar o buscar amigos, incluido el cruce en servidor»** está en la lista de usos permitidos: nuestro caso encaja. **Usarlo solo para invitar o recomendar** no se permite. Por eso la justificación es «descubrir qué contactos ya usan la app», y no «invitar».
- Play obliga a subir el target cada año, así que conviene diseñar para la API 37 desde el principio.
- También hacen falta: aviso destacado en la app *antes* del permiso, política de privacidad pública y el formulario de **Seguridad de los datos** (contactos: recogidos, no compartidos, tratados de forma efímera).
- Fuente: [Google Play — Contacts Permission policy](https://support.google.com/googleplay/android-developer/answer/16935362).

## RGPD y consentimiento

- **Qué pasa con los datos:** los números de la agenda (datos de terceros) salen del móvil hacia la función de Supabase, que los compara por HMAC con los de quien ha activado «que me encuentren por mi teléfono». La función no los guarda (falta comprobar que el gateway de la API y los logs de Postgres no registren el cuerpo de la llamada). Los nombres no salen del móvil.
- **Base legal (a validar con asesoría legal):** consentimiento de quien usa la app para subir su agenda. Para los números de terceros, interés legítimo del responsable, apoyado en que no se guardan y en que solo aparece quien ha activado que se le encuentre.
- **Pantalla antes del diálogo del sistema** (obligatoria en Google Play y recomendable en iOS):
  > **Encuentra a tus amigos**
  > Para decirte quién de tus contactos ya está en Biblioteca, enviaremos sus números de teléfono a nuestro servidor. Se comparan al momento y **no se guardan**. Los nombres no salen de tu móvil. Solo te aparecerán quienes hayan activado que se les encuentre por teléfono.
  > [Continuar] [Ahora no]
- «Ahora no» tiene que dejar usar la app igual (invitar con enlace) y no volver a pedirlo en bucle.
- La política de privacidad tiene que incluir este tratamiento. La app debe poder borrar la cuenta (Apple lo exige dentro de la app; en la web ya existe `deleteAccount`) y retirar el teléfono (`biblio_set_phone(null)`).

## Convivencia con la web

- La PWA de Vercel sigue igual y es la versión para quien no instale la app, para los enlaces compartidos y para el ordenador.
- Cada cambio en la app nativa llega con una versión nueva en las tiendas. Con React Native y Expo, los cambios de JS pueden ir por actualizaciones OTA (EAS Update) si no cambian el propósito de la app.
- Conviene que web y nativa hablen con las mismas funciones de Supabase. Los cambios de esquema tienen que ser compatibles hacia atrás mientras convivan versiones antiguas de la app.

## Siguientes pasos (en orden)

1. Elegir React Native o iOS nativo, y decidir el nombre y el bundle ID.
2. Resolver el límite diario de 0006 y comprobar que los logs no guardan los números.
3. Login nativo: Google, Sign in with Apple y email con código.
4. Pantalla de consentimiento, lectura de la agenda y cruce, probados de punta a punta en un móvil.
5. Universal Links / App Links para invitaciones y login.
6. Política de privacidad pública. Google Play: cuenta, prueba cerrada de 14 días y declaración de contactos. Apple: cuenta y TestFlight.
