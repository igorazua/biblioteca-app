# DECISIONES NATIVA — lo que estaba abierto, cerrado

> **Decidido por Claude por encargo de Igor (05/11/2026).** Igor puede vetar cualquier línea: cada una tiene un número para poder decir «cambia la D7».
> Especificación: la PWA en la etiqueta `web-congelada-v1` (commit `520462e`). El objetivo sigue siendo 1:1, así que aquí solo se cierra lo que la web deja abierto o no define.
> Los agentes implementan estas decisiones y no toman otras de diseño. Si algo no está aquí ni en la PWA, lo anotan en su informe y eligen lo más parecido a la PWA.

## Producto

- **D1. Descubrir: variante `hub`** (pantalla de categorías antes del mazo). Es la que la PWA muestra por defecto. El selector de variantes y las otras tres no se portan.
- **D2. Gestos del mazo sin cambios:** → visto, ↑ pendiente, ← no me interesa. Cambiarlos es una prueba con usuarios, no una decisión de la versión nativa.
- **D3. Leyenda de gestos bajo el mazo:** una línea fija `text-meta` con las tres direcciones, solo hasta que la persona haya hecho 10 gestos. El botón de deshacer ya existe y se mantiene. Es el único añadido respecto a la PWA y se lleva también a la web cuando se descongele.
- **D4. Duelos: tamaño `area`**, el de la PWA por defecto. No se portan el selector de Ajustes (`duelFit`) ni la variante de textos de prueba (`useDuelCopy`).
- **D5. Listas aparcadas:** `LISTS_ENABLED = false`, como en la PWA. No se portan `ListEditor` ni «Compartir» de la estantería.
- **D6. Propuestas de `docs/TODEO.md` (ficha en hoja inferior, tema por estantería, buscador con IA, party, diario, conmutador de cuadrícula): al backlog de las dos apps.** Meterlas solo en nativo rompería el 1:1 y la PWA como especificación.
- **D7. Sin cuenta en la fase 1.** Login y sincronización llegan en la fase 3.

## Efectos y estilo

- **D8. Se cierra la revisión de «sin efectos» de `SISTEMA_DISENO.md` a favor de lo que hoy muestra la PWA:** barra inferior de cristal, grano al 5 %, número de ranking hueco, sombras en hojas y oscurecido sobre pósteres. Nada más: ni resplandores ni degradados decorativos nuevos.
- **D9. Cristal de la barra inferior:** `expo-blur` en iOS. En Android, fondo opaco `rgb(15 14 13 / 0.96)`, porque el desenfoque allí es irregular y caro.
- **D10. Grano:** PNG de 160×160 px en mosaico, al 5 % de opacidad, encima de todo y sin capturar toques. Sin `mix-blend`: no existe en React Native.
- **D11. Número de ranking hueco:** texto SVG con trazo de 1,5 px (`react-native-svg`). Sin Skia, para no añadir esa dependencia.
- **D12. Póster que vuela a la ficha:** hecho a mano con Reanimated (se mide el origen y el póster viaja en una capa encima). La transición compartida de Reanimated sigue siendo experimental. Si la prueba no llega a 60 fps en gama media, se cambia por un fundido.
- **D13. Títulos largos:** sin equivalente de `text-wrap: balance`. Se acepta el corte de línea normal.
- **D14. Estilos: `StyleSheet` con `@biblioteca/tokens`, sin NativeWind.** La versión estable (4.2) está a punto de sustituirse por la 5, aún candidata. Brutox, ya publicada, funciona con tokens. Y como se escribe de cero, no hace falta traducir las clases de Tailwind línea a línea.
- **D15. Fuentes:** instancias estáticas de los archivos variables de la PWA. Fraunces con `opsz` 72 (y 144 para el número de ranking) e Inter, con los pesos que se usan de verdad (400, 500, 600, 700 y 900 si hace falta). Tamaños, interlineado y `letterSpacing` de `index.css`, pasando `em` a puntos.

## Usabilidad nativa

- **D16. Gesto de volver en iOS:** activo en pantallas de la pila (ficha, estantería, ajustes) y desactivado en la sesión de duelos y en cualquier pantalla con un mazo o un abanico, para que no choque con el swipe.
- **D17. Botón atrás de Android:** primero cierra la hoja abierta, después la pantalla. En una sesión de duelos sale sin pedir confirmación, porque cada duelo ya está guardado. En la pestaña inicial deja salir de la app.
- **D18. Tamaño de letra del sistema:** se respeta hasta 1,2× (`maxFontSizeMultiplier`). Etiquetas de la barra inferior y títulos sobre pósteres, tope de 1,0× para no romper las proporciones.
- **D19. Pestañas:** se quedan montadas y conservan scroll, mazo y duelo en curso. Tocar la pestaña activa sube al principio. Es mejor que la PWA, que las reconstruye, y no cambia nada visible más allá de eso.
- **D20. Teclado:** los campos siguen visibles al escribir (`KeyboardAvoidingView`, y hojas que suben con el teclado). Tocar fuera lo cierra.
- **D21. Estado pulsado:** los `hover:` no se portan. Todo lo pulsable baja a opacidad 0,7 en 100 ms. Las tarjetas grandes, además, a escala 0,98.
- **D22. Vibración:** ligera al confirmar un swipe, de selección al elegir en un duelo y de éxito al terminar una sesión. Nada al hacer scroll ni al abrir pantallas. Si el sistema tiene reducir movimiento, sigue vibrando pero se quitan los vuelos y rebotes.
- **D23. Orientación y tamaños:** solo vertical y sin tablet en iOS (como Brutox). El ancho de referencia es 390 pt; se comprueba también con 360 × 640 y 430 × 932. Los tamaños en px de la PWA pasan tal cual a puntos: no se escala por ancho. Los duelos sí se calculan con la caja medida (`duelCardSize`), igual que en la web.
- **D24. Listas e imágenes:** listas largas virtualizadas (`FlatList`, y `FlashList` si no llega), `expo-image` con caché en disco y las dos cartas siguientes del mazo precargadas.

## Técnica

- **D25. Motores: traslado fiel, no reinvención.** «De cero» se aplica a la app y a sus pantallas. Los motores son unas 14.000 líneas ajustadas a base de medir, y reescribirlos cambiaría sus resultados. Se trasladan a `packages/core` sin navegador y sin capas intermedias: lo que antes leía `localStorage` pasa a recibirlo como parámetro. **Cuando la PWA se retire, este será el único motor.**
- **D26. Procedencia:** cada módulo trasladado sale de `web-congelada-v1`. Si la PWA cambia después, `git diff web-congelada-v1 main -- app/src/lib/...` dice qué falta llevar.
- **D27. Catálogo en la fase 1:** los archivos ya generados (`catalog-index.json`, `shelves/*`, `engine/*`, `anchors/*`) se copian a `apps/native/assets/data` con un script y se cargan como assets, no dentro del JS. Es lo más cercano a la PWA, funciona sin red y no pide cambios en el servidor. Pasar más al servidor (`docs/ARQUITECTURA.md`) se decide cuando el cerebro corra allí.
- **D28. Fase 1 sin compilación propia:** Expo SDK 58 y solo módulos que funcionan en Expo Go, con `AsyncStorage` en lugar de MMKV. Igor la abre con `npx expo start` por la red local. MMKV, Google y Apple llegan en la fase 3 con un dev build. **Ningún agente ejecuta `eas build`.**
- **D29. Nombre y bundle ID provisionales:** «Biblioteca», `app.biblioteca.dev`. Cambiarlos sigue siendo posible hasta publicar.

## Tras la primera prueba en el móvil (11/11/2026)

- **D30. Paleta más clara que la PWA:** fondo `#1e1b17`, `surface` `#2a2620`, `surface2` `#36312a`, `line` `#4a433b` y `mute` `#bdb6a9` (segunda subida, 11/11) (antes `#100e0c`, `#1a1816`, `#25221f`, `#2c2824` y `#a39d92`). Igor veía todo negro y las tarjetas no se distinguían del fondo. Se lleva a la PWA si la aprueba.
- **D31. Aviso de iniciar sesión:** dice «Entrar con tu correo» y abre `LoginSheet` sin salir de la pantalla. La PWA iba a Perfil para entrar con Google, que aún no existe en nativo.
- **D32. Elegir en un duelo:** un borde que recorre la carta elegida (como la serpiente) y un destello al cerrarse para confirmar. Cartas del duelo más centradas en vertical. Petición de Igor.
- **D33. Borde del duelo ligado al arrastre (sustituye a la animación de D32):** al arrastrar una carta hacia el centro, su borde se va dibujando en proporción al recorrido. Al superar el umbral se completa y le recorre un destello sobre el propio borde, sin halo exterior. El borde es metálico (degradado del acento) y se ajusta exactamente al contorno de la carta. Petición de Igor tras probarlo.
- **D34. Cabecera de la sesión de duelos:** baja hacia el contenido y el botón de volver pasa abajo a la izquierda, como «Categorías» en Descubrir. «Terminar» se ve más claro y su texto dice lo que hace: ir al resumen de la sesión.
