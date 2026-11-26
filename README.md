# Neural Finance

### Plataforma académica de análisis financiero con Deep Learning e Inteligencia Artificial

**Neural Finance** es un proyecto académico que integra redes neuronales LSTM, datos de mercado, visualizaciones interactivas y un agente de inteligencia artificial para analizar criptomonedas y simular decisiones financieras.

El sistema utiliza datos de la API pública de MEXC, modelos predictivos experimentales y un modelo de lenguaje ejecutado localmente mediante Ollama.

> **Aviso:** Proyecto exclusivamente educativo y experimental. No ejecuta operaciones financieras reales ni garantiza rendimientos. Las predicciones no constituyen asesoramiento financiero.

## Tecnologías

| Componente | Tecnología |
| --- | --- |
| Backend | Python, FastAPI, Uvicorn |
| Frontend | React, TypeScript, Vite |
| Deep Learning | Redes neuronales LSTM, PyTorch |
| Inteligencia artificial | Ollama, `llama3.2:1b` |
| Persistencia | SQLite |
| Datos de mercado | API pública de MEXC |
| Pruebas | `unittest` de Python |

## Funcionalidades principales

- Consulta y visualización de precios e históricos de criptomonedas.
- Predicciones experimentales con redes neuronales LSTM.
- Evaluación y comparación de modelos por activo.
- Exploración visual de arquitecturas y activaciones neuronales.
- Agente de IA que combina análisis de modelos y Ollama.
- Simulación de decisiones **COMPRAR, MANTENER y VENDER** sin operaciones reales.
- Persistencia de decisiones y estado del agente en SQLite.
- Controles de inicio, pausa y detención del agente desde el dashboard.
- Planificador para revisar nuevas velas diarias cerradas cuando el agente está activo.
- Pruebas automatizadas aisladas de la lógica del agente.

## Activos

Entre los activos utilizados en los modelos multiactivo se encuentran `BTCUSDT`, `ETHUSDT`, `SOLUSDT`, `ADAUSDT`, `LINKUSDT` y `XRPUSDT`. El contenido disponible puede variar según los modelos y datos locales instalados.

## Arquitectura general

```text
                     NEURAL FINANCE
                            |
               +------------+------------+
               |                         |
         FRONTEND REACT            BACKEND FASTAPI
               |                         |
         Dashboard                 +------+------+
         Visualizaciones           |             |
         Panel del agente      Datos MEXC    Modelos LSTM
                                     |             |
                                     +------+------+
                                            |
                                         AGENTE IA
                                            |
                                     Ollama + reglas
                                            |
                                       PAPER TRADING
                                            |
                                          SQLite
```

## Requisitos previos

Estas instrucciones están orientadas a **Windows PowerShell**:

- Python **3.13** instalado y disponible mediante `py -3.13`.
- Node.js y npm instalados.
- Ollama instalado para habilitar el análisis del agente de IA.
- Acceso a internet para las consultas a la API pública de MEXC.

Los modelos entrenados necesarios deben estar disponibles en `06_BACKEND/modelos/`. Si faltan, algunas funciones de inferencia no estarán disponibles hasta generarlos o incorporarlos.

## Instalación

Clonar el repositorio y entrar en su carpeta:

```powershell
git clone -b integracion-mexc-demo https://github.com/dtoswaldo938-del/deep-learning-finanzas.git
cd deep-learning-finanzas
```

### 1. Backend

Crear un entorno virtual de Python:

```powershell
py -3.13 -m venv .\06_BACKEND\.venv313
```

Instalar las dependencias declaradas:

```powershell
.\06_BACKEND\.venv313\Scripts\python.exe -m pip install -r .\06_BACKEND\requirements.txt
```

Iniciar el servidor desde la **carpeta raíz** del proyecto:

```powershell
.\06_BACKEND\.venv313\Scripts\python.exe -m uvicorn app.main:app --app-dir .\06_BACKEND --host 127.0.0.1 --port 8001
```

API local: `http://127.0.0.1:8001`.

### 2. Frontend

En **otra terminal**, desde la carpeta raíz:

```powershell
npm.cmd --prefix .\07_FRONTEND ci
npm.cmd --prefix .\07_FRONTEND run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Abrir `http://127.0.0.1:5174` en el navegador.

Para comprobar la compilación de producción:

```powershell
npm.cmd --prefix .\07_FRONTEND run build
```

### 3. Ollama y agente de IA

Con Ollama instalado, descargar el modelo local:

```powershell
ollama pull llama3.2:1b
```

Verificar que Ollama esté en funcionamiento antes de utilizar las funciones del agente. La API del agente está diseñada para **simulación**, no para enviar órdenes reales a un exchange.

El agente de paper trading utiliza controles de autorización y un estado persistente. No se deben publicar sus claves locales, la base de datos personal ni archivos `.env`.

## Pruebas automatizadas

Desde la carpeta raíz del repositorio, ejecutar las pruebas aisladas del agente:

```powershell
.\06_BACKEND\.venv313\Scripts\python.exe -m unittest discover -s .\06_BACKEND\tests -p "test_agente_paper_aislado.py" -v
```

Las pruebas utilizan recursos temporales y simulaciones de dependencias externas. En la sesión de desarrollo se reportaron **14 pruebas aprobadas**; esto no equivale a una validación integral de todo el sistema en una instalación nueva.

Consultar también:

- `05_BITACORAS/INFORME_VALIDACION_AGENTE_179_7.md`
- `05_BITACORAS/pruebas_agente_179_6.txt`

## Organización del repositorio

```text
.
├── 05_BITACORAS/        # Informes y evidencias de validación
├── 06_BACKEND/          # API, entrenamiento, inferencia y pruebas
│   ├── app/
│   ├── modelos/
│   ├── tests/
│   └── requirements.txt
├── 07_FRONTEND/         # Interfaz React + TypeScript
│   ├── src/
│   ├── package.json
│   └── package-lock.json
├── .gitignore
└── README.md
```

## Alcance y limitaciones

- El sistema es un **prototipo académico** y sus modelos pueden presentar errores de predicción.
- Los resultados dependen de la disponibilidad y calidad de los datos externos.
- El agente no ejecuta compraventas reales; su actividad es una simulación (*paper trading*).
- La instalación desde cero en otra computadora debe verificarse por separado.
- Las pruebas unitarias reportadas no sustituyen pruebas de integración, seguridad o evaluación financiera.

## Autoría y finalidad

Proyecto académico de Deep Learning aplicado al análisis financiero. Su finalidad es explorar el uso de redes neuronales, visualización de datos, modelos de lenguaje y reglas deterministas de riesgo en un entorno experimental.

<!-- ENTREGA_FINAL_771 -->

## Evolucion del sistema

El historial de versiones y avances se encuentra en:

[Historial de versiones](CHANGELOG.md)

## Modulos principales

| Modulo | Funcion |
|---|---|
| Resumen general | Indicadores principales del sistema |
| Red neuronal | Visualizacion de la arquitectura LSTM |
| Mercado | Consulta de datos publicos |
| Predicciones | Resultados predictivos experimentales |
| Portafolio | Administracion de capital ficticio |
| Analisis | Evaluacion estadistica de modelos |
| Laboratorio | Experimentacion con modelos de IA |
| Agente IA | Explicacion y simulacion academica |
| Live Trading Lab | Simulacion multiactivo y PnL |
| Notificaciones | Historial de eventos academicos |

## Datos publicos de MEXC

El sistema contempla consultas de informacion publica
de mercado mediante la API de MEXC.

Las consultas externas de BTCUSDT, ETHUSDT y SOLUSDT
fueron verificadas durante las pruebas.

No se requiere modificar cuentas reales ni ejecutar
ordenes en el exchange.

## Operaciones y PnL

El simulador utiliza un capital inicial ficticio
de 50000 USDT.

Contempla:

- Historial de operaciones simuladas.
- Saldo disponible.
- Costo promedio.
- Patrimonio.
- PnL realizado.
- PnL no realizado.
- Rendimiento porcentual.

### Formulas principales

Patrimonio = Saldo + Valor de posiciones

PnL total = Patrimonio - Capital inicial

Rendimiento (%) = PnL total / Capital inicial * 100

### Ejemplo validado

| Indicador | Resultado ficticio |
|---|---:|
| Capital inicial | 50000 USDT |
| PnL realizado | 20 USDT |
| PnL no realizado | 60 USDT |
| PnL total | 80 USDT |
| Patrimonio final | 50080 USDT |
| Rendimiento | 0.16% |

Estos resultados corresponden a una prueba controlada,
no a rendimientos financieros reales.

## Centro de notificaciones

El sistema incluye un centro de eventos academicos con:

- Generacion de eventos de demostracion.
- Historial local de hasta 200 registros.
- Contador de eventos sin leer.
- Marcado de eventos como leidos.
- Preparacion de borradores de correo.

El modulo de correo utiliza mailto y requiere
intervencion manual del usuario.

No realiza envios automaticos ni integra WhatsApp.

## Evidencias de validacion

| Prueba | Resultado |
|---|---|
| Pruebas unitarias backend | 14 aprobadas |
| Comprobaciones del simulador | 16 aprobadas |
| Pruebas de notificaciones | 5 aprobadas |
| Pruebas de correo | 5 aprobadas |
| TypeScript | Sin errores |
| Compilacion Vite | 450 modulos |
| Consulta publica MEXC | Correcta |

[Consultar informe de validacion](05_BITACORAS/VALIDACION_ENTREGA_FINAL.md)

## Limitaciones y trabajo futuro

- Las operaciones son exclusivamente simuladas.
- Los resultados predictivos no garantizan rendimientos.
- El motor Live Trading Lab evaluado no contempla comisiones.
- Las notificaciones actuales son eventos de demostracion.
- El envio automatico de correo no esta implementado.
- La validacion visual completa permanece pendiente.
- No se realizan operaciones financieras reales.

<!-- DOCUMENTACION_777 -->

## Documentacion complementaria

- [Historial de versiones](CHANGELOG.md)
- [Arquitectura del sistema](05_BITACORAS/ARQUITECTURA_SISTEMA.md)
- [Informe de validacion](05_BITACORAS/VALIDACION_ENTREGA_FINAL.md)

## Laboratorio experimental independiente

Paper Research Lab es un entorno academico separado
del sistema principal.

Utiliza cuatro escenarios sinteticos y dos modelos
de referencia para comparar resultados predictivos.

Su API fue validada mediante diez consultas HTTP.

El entrenamiento del nuevo modelo LSTM experimental
permanece pendiente por limitaciones de memoria.

Este laboratorio no forma parte de la integracion
actual del frontend principal.


<!-- PRUEBAS_782 -->

## Pruebas adicionales del frontend

Desde el directorio 07_FRONTEND, ejecutar:

    node --experimental-strip-types prueba_live_lab_336.ts
    node --experimental-strip-types prueba_metricas_343.ts
    node --experimental-strip-types prueba_notificaciones_749.ts
    node --experimental-strip-types prueba_correo_760.ts

Para comprobar TypeScript:

    node_modules\.bin\tsc.cmd -b --pretty false

Para generar la compilacion:

    npm.cmd run build

Para abrir la vista previa:

    npm.cmd run preview -- --host 127.0.0.1 --port 4173

Las pruebas utilizan ejemplos controlados y operaciones
ficticias, sin modificar cuentas de exchanges.

<!-- EVIDENCIAS_849 -->

## Informes tecnicos de entrega

- [Evaluacion predictiva](05_BITACORAS/INFORME_MODELOS_PREDICTIVOS.md)
- [Riesgos y alcance](05_BITACORAS/INFORME_RIESGOS_Y_ALCANCE.md)
- [Informe financiero](05_BITACORAS/INFORME_FINANCIERO.md)
- [Flujo del sistema](05_BITACORAS/FLUJO_DEL_SISTEMA.md)
- [Replay historico](05_BITACORAS/INFORME_REPLAY_FINAL.md)

## Disponibilidad de modelos

El entorno de desarrollo cuenta con 35 modelos multiactivo.
La version publicada contiene 9 modelos.

## Indicadores tecnicos

El dashboard incluye SMA20, EMA20 y RSI14.

## Decisiones de alcance

- Operaciones reales: excluidas por seguridad y finalidad academica.
- Polymarket: se selecciono MEXC como proveedor principal.
- Apalancamiento: excluido para mantener el alcance educativo.
- Sistema multiagente: se utiliza Ollama como modelo local.
- WebSocket: se eligio la consulta periodica de datos publicos.

Las limitaciones y riesgos se explican en los informes
tecnicos correspondientes.

## Autoevaluacion del proyecto

- [Evaluacion de la rubrica](05_BITACORAS/EVALUACION_RUBRICA.md)

La evaluacion describe las funcionalidades disponibles,
sus evidencias y las limitaciones del prototipo academico.
