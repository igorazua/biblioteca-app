# Informe de Calibración del Ranker Logístico (MOTOR §2c.4 / T11.3)

Fecha de ajuste: 2026-10-21
Ejemplos evaluados: 56347 (Entrenamiento: 45077, Prueba: 11270)

## Rendimiento en Validación (Prueba 20%)

| Métrica | Pesos a mano (Base) | Pesos ajustados (Fit) | Diferencia |
|---|---|---|---|
| **AUC** | **0.666** | **0.795** | **+12.9%** |

## Comparativa de Parámetros

| Parámetro / Señal | Peso a mano (Base) | Peso propuesto (Fit) | Variación |
|---|---|---|---|
| **bias** | -1.2 | 0.551 | 1.751 |
| **cosUser** | 2.2 | 0.735 | -1.465 |
| **recog** | 1.8 | 0.262 | -1.538 |
| **quality** | 1.5 | 0.331 | -1.169 |
| **social** | 1.2 | 0.153 | -1.047 |
| **popPct** | 0.3 | 0.173 | -0.127 |
| **trend** | 0.4 | 0.074 | -0.326 |
| **moodFit** | 0.8 | 0.287 | -0.513 |
| **platformFit** | 0.5 | 0.417 | -0.083 |
| **novelty** | 0.9 | 0.453 | -0.447 |

> **Nota:** Según la especificación de MOTOR §2c.4 / T11.3, este script **no modifica `params.ts` automáticamente**. Propone los pesos ajustados para que Igor decida si aplicarlos o mantener los de partida.
