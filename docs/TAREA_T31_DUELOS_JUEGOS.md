# T31 — Duelos de juegos de mesa con cada carta de la forma de su portada (26/10/2026)

> Encargo escrito por Claude con la decisión de Igor del 26/10: *«para comparar juegos de mesa, que las tarjetas tengan tamaño adaptable: que no siempre se comparen rectangulares con la portada y los rellenos, sino solo la portada; para colocarlos, tener en cuenta el centro»*. Igor quiere **probar distintos tamaños** en el móvil antes de decidir. **Aún no se hace:** queda escrito para cuando Igor diga quién lo hace (Claude, un agente o Gemini).

## Normas
- Las de siempre: tocar solo los archivos de la tabla, un commit por paso (`T31: …`), registro con la salida real en `docs/registro/T31.md`, tsc limpio y sin revisión visual por tu parte (la hace Igor en el móvil).
- **Antes de empezar, `git status`:** no commitees cambios que no sean tuyos.

| Archivos |
|---|
| `app/src/lib/posterShape.ts` (helper de tamaños y su test `posterShape.test.ts`), `app/src/components/DuelVariants.tsx` (`fanLayout`, `FanCard`, `FanBackdrop`), `app/src/components/SwipePair.tsx` (pasar la proporción de cada lado), `app/src/screens/CompareSession.tsx` y `app/src/screens/WhatToWatch.tsx` (solo para pasar `posterRatio` en el `Side`), `app/src/screens/Settings.tsx` (selector de prueba, 31.3) |

## 31.1 Qué cambia
- **Solo juegos de mesa, y solo si las dos obras del duelo tienen `posterRatio`** (el 100 % de los juegos lo tiene desde T29). Pelis, series y libros siguen como ahora (verticales); artistas y canciones, cuadradas (T27).
- Cada carta del duelo **toma la forma de su portada:** la imagen se ve entera y **sin relleno difuminado**. El borde que se ilumina al elegir sigue el contorno de la carta.
- Cada carta se coloca **centrada en el centro de su mitad** (`cx.a` = 30 % y `cx.b` = 70 % del ancho, como ahora) y en el mismo centro vertical (`cy`).
- **Títulos:** debajo de cada carta, en una línea común justo debajo de la carta más alta, para que los dos títulos queden alineados.
- **Elegir** (la carta crece, se ilumina y se queda un instante): la elegida crece hasta ocupar la pantalla **con su propia forma** (`fitW` y `fitH` calculados con su proporción). Esto es lo más delicado: pruébalo con una vertical contra una apaisada en los dos sentidos.
- `Side` gana un campo opcional `ratio?: number`, que rellenan `CompareSession` y `WhatToWatch` con `item.posterRatio` cuando la obra es un juego de mesa.

## 31.2 Tres maneras de dar tamaño (Igor quiere probarlas)
Función pura en `posterShape.ts`:
```ts
export type DuelFit = 'alto' | 'area' | 'caja'
/** Tamaño de cada carta de un duelo de juegos de mesa dentro de su hueco (boxW × boxH). */
export function duelCardSize(ratio: number, other: number, boxW: number, boxH: number, fit: DuelFit): { w: number; h: number }
```
`ratio` es ancho / alto de esta carta y `other`, el de la otra. El hueco de cada mitad es `boxW = 0,48 × ancho` y `boxH = alto disponible − títulos`, el mismo que se usa ahora. Las tres maneras:
1. **`alto` (misma altura):** las dos cartas miden lo mismo de alto y el ancho sale de su proporción. Si una apaisada no cabe a lo ancho, **las dos** bajan de altura a la vez hasta que quepa.
2. **`area` (misma superficie):** las dos ocupan la misma superficie, que es la mayor posible sin salirse del hueco: `w = √(S·r)` y `h = √(S/r)`. Una caja apaisada sale más ancha y más baja; una vertical, más estrecha y más alta. Es la que Claude cree más equilibrada a la vista.
3. **`caja` (cada una en su hueco):** cada carta ocupa todo lo que puede de su hueco sin deformarse (como `object-contain`). Es lo más sencillo, pero una caja apaisada puede quedar mucho más pequeña que una vertical.

Ninguna carta pasa de un **20 % menos de ancho** que la otra en el modo `alto` si ambas caben. Si el resultado se ve desequilibrado en alguno de los modos, apúntalo en el registro, pero no lo corrijas por tu cuenta: es justo lo que Igor quiere ver.

**Test** (`posterShape.test.ts`, pocos casos): con `boxW = 180` y `boxH = 300`, comprueba para los tres modos estas tres parejas: vertical 0,7 contra apaisada 1,4, cuadrada contra cuadrada, y vertical contra vertical. En todos los casos tiene que pasar esto:
- ninguna carta se sale del hueco;
- se respeta la proporción de cada carta (con un margen de 0,01);
- en `area`, las dos superficies son iguales (con un margen del 1 %);
- en `alto`, las dos alturas son iguales.

## 31.3 Selector de prueba para Igor
- Para que Igor compare en el móvil sin tener que publicar tres veces, en **Ajustes** va una sección pequeña al final, **«Pruebas»**, con un selector **«Duelos de juegos: misma altura / misma superficie / cada una en su hueco»**.
- Se guarda en `localStorage` (`duelFit`). Por defecto, `area`.
- Va dentro de `try/catch`: si `localStorage` falla, se usa `area`.
- Cuando Igor elija una, se quita el selector y se deja fija la elegida (otro commit, `T31: …`).

## 31.4 Hecho cuando
- tsc limpio y el test de `posterShape.test.ts` en verde, pegados en el registro.
- En el registro, **qué tiene que mirar Igor en el móvil**, con 3 parejas de juegos concretas y sus ids para provocarlas (con «Duelos» de Juegos de mesa o con Decidir): vertical contra apaisada, cuadrada contra cuadrada, y vertical contra vertical. Para cada pareja, tiene que probar los tres modos del selector y elegir carta en los dos lados.
