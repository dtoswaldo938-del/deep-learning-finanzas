# Neural Finance - Evidencia de replay historico

## Descripcion
Evaluacion academica retrospectiva de BTCUSDT mediante
un modelo LSTM, Ollama y una estrategia Buy & Hold.

## Metodologia
- Ciclos historicos: 20
- Decisiones validas de Ollama: 18
- Decisiones fallidas: 2
- Periodo: 2026-10-22 a 2026-11-10
- Capital inicial simulado: 50000
- Exposicion maxima: 10 %
- Sin operaciones reales

## Resultados

| Estrategia | Patrimonio final |
|---|---:|
| LSTM | 50000.0000 |
| LSTM + Ollama | 50000.0000 |
| Buy & Hold limitado | 49544.8733 |

## Evidencias
- REPLAY_20_CICLOS.csv
- RESUMEN_REPLAY_20_CICLOS.json
- RESULTADOS_PRUEBAS_201.txt

## Ejecucion
Desde la carpeta principal del proyecto, ejecutar
06_BACKEND/replay_20_ciclos.py con el entorno Python del backend.

Requiere Ollama y el modelo llama3.2:1b.

## Limitaciones
Esta es una evaluacion retrospectiva y no representa
20 dias de ejecucion autonoma en vivo.

El replay no implementa todas las reglas de riesgo del
agente principal, incluida la perdida maxima diaria.

No se incluyen comisiones ni deslizamiento.

La comparacion Buy & Hold utiliza una exposicion
limitada al 10 por ciento.

Si se recuperaron respuestas LLM despues del replay,
deben distinguirse de una trayectoria financiera
completamente recalculada.

Los resultados no garantizan rendimientos futuros.
