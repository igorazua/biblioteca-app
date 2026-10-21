# Plan y Estimación de Raspadores de Co-Consumo (T6)

> **AVISO**: Siguiendo las directrices de `docs/TAREAS_MOTOR_V2.md` (§ Bloque B - T6), **ningún raspador se ejecuta sin aprobación previa de Igor**. Este documento detalla las webs a consultar, el volumen de peticiones estimado, tiempos de ejecución y las garantías de privacidad y cortesía con los servidores.

---

## 1. Reglas estrictas de operación

1. **Cortesía de red**:
   - Tasa máxima: **$\le 1$ petición por segundo** por dominio (`delay = 1000ms + jitter aleatorio`).
   - Cabecera `User-Agent` explícita con contacto.
   - Respeto de códigos HTTP 429 / 503 con backoff exponencial.
2. **Sin autenticación ni sesiones**:
   - Solo se consulta contenido estrictamente público (listas públicas, listopias, relaciones públicas de API/páginas).
3. **Privacidad absoluta (Sólo agregados)**:
   - **NUNCA** se almacena qué usuario creó una lista o qué usuarios específicos coinciden.
   - Solo se registra la tupla agregada: `(obra_a, obra_b, fuente, n)` donde `n` es el recuento de co-apariciones.
4. **Aislamiento de evaluación (Anti-trampas)**:
   - Se excluyen estrictamente los IDs/perfiles utilizados en el benchmark de evaluación `test-users.jsonl`.
5. **Caché persistente y reanudable**:
   - Cada respuesta se guarda en `app/scripts/cache/graph/scrapers/<fuente>/`.
   - Si se interrumpe, se reanuda en el punto exacto sin repetir peticiones ya cacheadas.
6. **Candidatas fuera de catálogo**:
   - Obras recurrentes que no están en el catálogo se guardan en `app/scripts/cache/graph/outside.json` ordenadas por frecuencia, para sugerir ampliaciones a Igor.

---

## 2. Estimación por Fuente

| Fuente | Objetivo | Estrategia | Volumen de peticiones | Tiempo estimado (@ 1 req/s) |
|---|---|---|---|---|
| **Letterboxd (Cine/Series)** | Listas temáticas y populares públicas | Consultar las ~500 listas más populares y de directores/géneros clave | ~500 - 1.000 páginas | ~15 a 30 minutos |
| **Goodreads (Libros)** | Listas públicas "Listopia" y estanterías temáticas | Listas de premios, clásicos y géneros (ej: "Best Books of 20th Century") | ~300 - 600 páginas | ~10 a 20 minutos |
| **BGG (BoardGameGeek)** | API XML2 pública: "fans also like" y listas de colecciones | Llamadas a la API oficial de BGG para los 1.015 juegos del catálogo | ~1.015 peticiones API (con pausas de 2s) | ~35 minutos |
| **Last.fm (Música / Artistas)** | API pública `artist.getSimilar` | 410 artistas del catálogo consultados vía API oficial de Last.fm | 410 peticiones API (1 req/s) | ~7 minutos |
| **Wikipedia Clickstream** *(Ya implementado)* | Dumps mensuales oficiales de Wikimedia | Descarga de dumps estáticos mensuales (.tsv.gz), sin saturar servidores | 2 descargas HTTP directas | ~2 minutos |

---

## 3. Estado de Aprobación

- [ ] **Aprobación de Igor**: Esperando confirmación para ejecutar los raspadores externos según los límites indicados.
