# Identidad visual: Taquilla (18/11/2026)

Elegida por Igor entre cuatro direcciones (tablero: `docs/identidad/tablero-4-direcciones.png`). Kit completo en `docs/identidad/taquilla/`: guía en PDF (`biblioteca-guidelines.pdf`), páginas en PNG, tokens (`tokens/tokens.css`, `tokens.dtcg.json`, `tailwind.palette.js`), fuentes (`fonts.md`) y la ficha (`identity.json`). Generado con la skill `brand-identity`.

## La idea

El cartel de cine pegado en la calle: letra estrecha y negrísima que llena el ancho, números de ranking como cifras de cartelera y dos tintas de imprenta (rojo tomate y cian) que son los dos lados del duelo. **Lo único ruidoso es la tipografía**: el color se queda en dos tintas planas.

## Tipografía

Una sola familia variable, **Archivo** (Google Fonts, OFL 1.1, uso comercial libre; cubre el español entero y tiene cifras tabulares).

| Rol | Fuente | Ajustes |
|---|---|---|
| Titulares, números de ranking, sellos | Archivo | `wght` 800, `wdth` 62 (condensada), MAYÚSCULAS, espaciado −0,01 em, cifras `tnum` |
| Texto y botones | Archivo | `wght` 400 y 600, `wdth` 100, cifras `tnum` en datos |

Sustituye a Fraunces (titulares y números huecos) e Inter (texto). La cursiva de Fraunces desaparece: el énfasis se hace con peso o con la versión condensada, no con cursiva.

**App nativa:** React Native no maneja bien los ejes variables. Hay que generar instancias estáticas desde el archivo variable (como se hizo con Fraunces en `make-fonts.py`): `Archivo-Condensed-ExtraBold` (wdth 62, wght 800), `Archivo-Regular` (400) y `Archivo-SemiBold` (600).

## Color

Se mantienen las **claridades de D30** (la paleta más clara que Igor aprobó el 12/11) y se cambia el tono del acento y de los lados del duelo. El kit propone un fondo más oscuro (`#16130f`); no se usa, para no deshacer D30.

| Token de la app | Hoy | Taquilla | Uso |
|---|---|---|---|
| `--color-bg` | `#1e1b17` | `#1e1b17` (igual, D30) | fondo |
| `--color-surface` | `#2a2620` | `#2a2620` (igual) | tarjetas y hojas |
| `--color-surface2` | `#36312a` | `#36312a` (igual) | paneles, chips |
| `--color-line` | `#4a433b` | `#4a433b` (igual) | filetes |
| `--color-ink` | `#f4efe6` | `#f4f3f1` | texto |
| `--color-mute` | `#bdb6a9` | `#bdb6a9` (igual) | texto secundario |
| `--color-accent` | `#f2b04a` ámbar | **`#ff5a3c` rojo cartel** | botón principal, número 1, enlaces |
| `--color-accent-ink` | `#100e0c` | `#120f0a` | texto sobre el rojo |
| lado izquierdo del duelo (hoy `stamp-blue`) | azul | **`#2ec4c8` cian taquilla** | borde D33, sellos de ese lado |
| lado derecho del duelo (hoy ámbar) | dorado | **`#ff5a3c` rojo cartel** | borde D33 |
| confirmación del duelo (hoy `stamp-green`) | verde | `#38c172` | borde verde con pulso |

Escalas completas (50-950) del rojo, el cian y el neutro en `docs/identidad/taquilla/tokens/tokens.css`.

**Avisos de la skill (orientativos):** el cian y el rojo no llegan a 4,5:1 como texto pequeño sobre algunos fondos. Úsalos en rellenos, bordes, cifras grandes y botones (con `accent-ink` encima), no en texto de párrafo.

## Reglas cortas

- El rojo es lo que más grita: poca superficie (un botón principal por pantalla, el número 1, el lado derecho del duelo).
- Cian y rojo nunca se mezclan en un mismo elemento salvo en el duelo, donde son los dos lados.
- Números de ranking: Archivo condensada 800, huecos (trazo) o macizos en el número 1; nunca en serif.
- Sellos («¡VISTA!», «¡SUBE 3!»): Archivo condensada 800 en mayúsculas, con el color del lado o el verde.
- Nada de cursivas de adorno ni de degradados de color de marca.

## Pendiente de aplicar

1. Web (`app/src/index.css` y las clases que usan Fraunces o `.rank-num`): fuentes, tokens y colores del duelo.
2. Nativa (`apps/native`): fuentes estáticas, `constants` de color y el borde del duelo (`DuelFan.tsx`).
3. Prototipo de escritorio con los patrones del vídeo de referencia (tarjeta carpeta, carrusel de foco, arco, anillo), ya con esta identidad.
