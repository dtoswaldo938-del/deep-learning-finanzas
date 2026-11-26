# Informe de evaluacion predictiva - Neural Finance

## Objetivo

Evaluar experimentalmente la capacidad de una red LSTM
para estimar rendimientos diarios.

## Arquitectura del modelo BTCUSDT

- Tipo: LSTM.
- Variables de entrada: 1.
- Ventana temporal: 20 observaciones.
- Unidades ocultas: 32.
- Capas recurrentes: 1.
- Semilla: 42.
- Epocas realizadas: 17.
- Mejor epoca registrada: 7.

## Division temporal

| Conjunto | Muestras | Inicio | Fin |
|---|---:|---|---|
| Entrenamiento | 334 | 2025-07-29 | 2026-06-27 |
| Validacion | 72 | 2026-06-28 | 2026-09-07 |
| Prueba | 72 | 2026-09-08 | 2026-11-18 |

Total: 478 muestras.

## Resultados

| Metrica | LSTM | Modelo base cero |
|---|---:|---:|
| MAE validacion | 0.014067 | 0.013786 |
| RMSE validacion | 0.020547 | 0.020132 |
| MAE prueba | 0.014002 | 0.014007 |
| RMSE prueba | 0.020637 | 0.020802 |
| Precision direccional prueba | 54.17% | 54.17% |

## Interpretacion

La LSTM presenta una reduccion aproximada del 0.79%
en RMSE respecto al modelo base en el conjunto de prueba.

Sin embargo, no mejora la precision direccional y presenta
errores superiores al modelo base durante la validacion.

## Limitaciones

- Los resultados corresponden a una evaluacion retrospectiva.
- El comportamiento futuro puede diferir del historico.
- No se demuestra superioridad predictiva consistente.
- No se demuestra rentabilidad financiera.
- La division cronologica no acredita por si sola
  la ausencia de filtraciones de informacion.

## Catalogo

El entorno local contiene 35 modelos multiactivo.
El repositorio publicado contiene 9 modelos.

## Evidencia reproducible

06_BACKEND/modelos/multiactivo/BTCUSDT/evaluacion.json
