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
git clone https://github.com/dtoswaldo938-del/deep-learning-finanzas.git
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
