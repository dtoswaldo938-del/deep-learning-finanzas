# Backend - Neural Finance

Backend desarrollado con Python y FastAPI para un proyecto
academico de Deep Learning aplicado a finanzas.

## Componentes

- Modelos LSTM entrenados con PyTorch.
- Predicciones experimentales de activos financieros.
- Integracion local con Ollama.
- Agente autonomo de Paper Trading.
- Persistencia mediante SQLite.
- Controles de riesgo y registro de decisiones.
- Simulacion historica de 20 ciclos.

## Instalacion

Desde la carpeta 06_BACKEND:

1. Crear un entorno virtual de Python.
2. Instalar las dependencias de requirements.txt.
3. Instalar Ollama y descargar llama3.2:1b.
4. Ejecutar FastAPI.

Comando de inicio desde la raiz del proyecto:

.\06_BACKEND\.venv313\Scripts\python.exe -m uvicorn app.main:app --app-dir .\06_BACKEND --host 127.0.0.1 --port 8001

## Servicios

Backend: http://127.0.0.1:8001

Documentacion API: http://127.0.0.1:8001/docs

Ollama: http://127.0.0.1:11434

## Seguridad

El agente opera exclusivamente con capital virtual.
No se realizan operaciones financieras reales.

La API debe mantenerse en localhost para esta demostracion.
No publicar tokens, archivos .env ni bases SQLite privadas.

## Pruebas

Desde la carpeta 06_BACKEND:

python -m unittest discover -s tests -p "test_agente_paper_aislado.py" -v

## Replay historico

Archivo: replay_20_ciclos.py

Las evidencias estan en 05_BITACORAS.

La evaluacion retrospectiva no sustituye los ciclos
autonomos en vivo ni replica todas sus reglas de riesgo.
