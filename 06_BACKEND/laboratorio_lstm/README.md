
# Laboratorio experimental LSTM

## Proyecto: Deep Learning para Finanzas

### 1. Objetivo

Evaluar arquitecturas de redes neuronales LSTM para estimar
rendimientos diarios de Bitcoin (BTCUSDT), utilizando datos
historicos y una metodologia de entrenamiento, validacion
y prueba.

El laboratorio es exclusivamente academico y no realiza
operaciones financieras reales.

### 2. Datos utilizados

- Activo: BTCUSDT
- Frecuencia: diaria
- Fuente historica del proyecto: MEXC
- Ventanas procesadas: 1978
- Rezagos por observacion: 20
- Variable objetivo: rendimiento del dia siguiente

Las secuencias LSTM se organizan desde el dato mas antiguo
hasta el mas reciente.

### 3. Division temporal

Se utilizo una division cronologica de los datos.

| Conjunto | Observaciones |
|---|---:|
| Entrenamiento | 1383 |
| Validacion | 295 |
| Prueba (TEST) | 298 |

Los escaladores se ajustaron utilizando exclusivamente
el conjunto de entrenamiento.

La seleccion de arquitectura se realizo utilizando
validacion, reservando TEST para la evaluacion final.

### 4. Arquitecturas experimentales

| Modelo | Capas LSTM | Unidades ocultas | Mejor epoca |
|---|---:|---:|---:|
| LSTM_16 | 1 | 16 | 13 |
| LSTM_32 | 1 | 32 | 19 |
| LSTM_64_2CAPAS | 2 | 64 | 1 |

Se utilizo una semilla experimental de 42.

La arquitectura seleccionada por RMSE de validacion
fue LSTM_32.

### 5. Evaluacion final

Resultados obtenidos en 298 observaciones TEST:

| Metrica | LSTM_32 | Modelo Cero |
|---|---:|---:|
| MAE | 0.01604515 | 0.01601228 |
| RMSE | 0.02350738 | 0.02355798 |
| Sesgo | 0.00140114 | 0.00056492 |

La reduccion relativa del RMSE fue aproximadamente 0.2148 %.

Esta mejora es pequena y no demuestra superioridad general.

### 6. Evaluacion direccional

- Predicciones de subida: 294
- Predicciones de bajada: 4
- Aciertos direccionales: 145
- Precision direccional: 48.6577 %
- Correlacion de Pearson: 0.131246

Comparacion con referencias:

| Referencia | Precision |
|---|---:|
| LSTM_32 | 48.6577 % |
| Siempre subida | 47.9866 % |
| Siempre bajada | 52.0134 % |

La red neuronal presenta una tendencia marcada a
pronosticar rendimientos positivos.

### 7. Principal limitacion observada

Las predicciones de LSTM_32 se concentran cerca del
rendimiento cero, incluso cuando existen variaciones
considerables en los rendimientos reales.

La red no demostro una capacidad direccional robusta
en el periodo historico evaluado.

### 8. Archivos principales

- `auditar_secuencias.py`: verifica el orden temporal.
- `preparar_entrenamiento.py`: prepara los conjuntos.
- `entrenar_experimentos.py`: entrena las arquitecturas.
- `guardar_escaladores.py`: conserva los escaladores.
- `evaluacion_final.py`: calcula las metricas TEST.
- `graficar_evaluacion.py`: genera graficas de evaluacion.
- `analisis_errores_lstm.py`: analiza errores y sesgos.
- `comparar_direcciones.py`: compara referencias direccionales.
- `auditoria_final.py`: verifica archivos y resultados.

### 9. Reproducibilidad

Desde la carpeta principal del proyecto, ejecutar:

```powershell
.\06_BACKEND\.venv313\Scripts\python.exe .\06_BACKEND\laboratorio_lstm\auditoria_final.py
```

El script comprueba la disponibilidad de los archivos
principales y la consistencia de las metricas guardadas.

Esta auditoria no constituye una demostracion de
reproducibilidad exacta del entrenamiento completo.

### 10. Integracion con el dashboard

Los resultados historicos se presentan mediante
FastAPI y React.

Se muestran:

- Evaluacion historica LSTM-32.
- Comparacion de MAE y RMSE.
- Analisis de errores y sesgo.
- Graficas de dispersion y distribucion.
- Comparacion de precision direccional.

El laboratorio se mantiene separado del sistema
de inferencia actual LSTM-A.

### 11. Seguridad del simulador

- Capital inicial ficticio: 100000 MXN.
- No se realizan compras ni ventas reales.
- No se modifican los saldos mediante el laboratorio.
- Los resultados son exclusivamente academicos.

### 12. Conclusion

LSTM_32 obtuvo el menor RMSE entre las arquitecturas
experimentales evaluadas en validacion.

En TEST, su RMSE fue ligeramente inferior al del
modelo Cero, aunque su MAE fue mayor.

La precision direccional y el sesgo hacia predicciones
positivas muestran limitaciones importantes.

El experimento demuestra la necesidad de comparar
modelos complejos con referencias sencillas y de
evaluar sus resultados fuera del entrenamiento.
```
