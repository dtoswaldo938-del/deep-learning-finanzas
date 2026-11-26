# Flujo de funcionamiento - Neural Finance

## Datos y analisis

1. MEXC proporciona datos publicos del mercado.
2. FastAPI recibe y procesa la informacion.
3. El sistema calcula indicadores descriptivos.
4. Los modelos LSTM generan estimaciones experimentales.
5. Las estimaciones se comparan con modelos de referencia.
6. React presenta los resultados mediante graficas.

## Agente de inteligencia artificial

1. El agente recibe informacion del modelo predictivo.
2. Ollama genera una interpretacion experimental.
3. El backend valida el estado y la respuesta del agente.
4. Los controles del entorno Paper limitan la simulacion.
5. SQLite conserva las decisiones y resultados.

## Laboratorio de simulacion

El simulador permite representar operaciones ficticias,
calcular posiciones y evaluar resultados financieros.

## Notificaciones

El centro de notificaciones presenta eventos de demostracion
y permite preparar borradores de correo manualmente.

Es un modulo independiente de demostracion.

## Seguridad

No se ejecutan ordenes financieras reales.
Las consultas a MEXC utilizan informacion publica.
