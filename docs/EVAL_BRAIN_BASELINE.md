# Línea Base de Evaluación del Cerebro (T4)

Fecha de medición: 2026-10-21
Versión de catálogo: 4345 obras (4345 vectores iniciales)

> **Nota:** Esta medición representa la línea base inicial antes de aplicar la ficha de experiencia LLM (T5), el grafo de co-consumo (T6) y la fusión de espacios vectoriales (T7).

## Métricas Offline (Línea Base)

| Plataforma | Usuarios evaluados | Hit@10 | Hit@20 | NDCG@20 | Diversidad | Sorpresa / Serendipia |
|---|---|---|---|---|---|---|
| **letterboxd** | 500 | 33.2% | 57.6% | 0.045 | 0.345 | 85.6% |
| **goodreads** | 500 | 39.2% | 67.0% | 0.062 | 0.343 | 100.0% |

### Criterios y Definiciones
- **Hit@K**: Porcentaje de usuarios en los que al menos una obra oculta del conjunto de prueba (20% más reciente) aparece en el top K recomendado.
- **NDCG@20**: Calidad del ordenamiento dando más peso a las obras con valoración alta (≥ 4★).
- **Diversidad**: Distancia coseno media ($1 - \cos$) entre todas las parejas del top 20.
- **Sorpresa / Serendipia**: Porcentaje de aciertos que no pertenecen al top 10% de popularidad (`popPct < 90`).
