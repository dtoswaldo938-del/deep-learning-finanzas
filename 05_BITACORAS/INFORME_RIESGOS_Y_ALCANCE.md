# Riesgos y alcance - Neural Finance

## Finalidad

Neural Finance es una plataforma academica de analisis
financiero, aprendizaje profundo y simulacion.

No ejecuta operaciones financieras reales.

## Riesgos identificados

| Riesgo | Descripcion |
|---|---|
| Mercado | Los precios presentan variaciones e incertidumbre. |
| Modelo | Las predicciones pueden ser incorrectas. |
| Sobreajuste | Un modelo puede ajustarse demasiado a datos historicos. |
| Datos | La informacion puede llegar incompleta o desactualizada. |
| Tecnologico | Pueden existir fallos de red, API o servicios locales. |
| Inteligencia artificial | Ollama puede producir explicaciones incorrectas. |
| Costos | La simulacion sin comisiones puede sobreestimar resultados. |

## Controles identificados

- Uso de capital ficticio.
- Restriccion de operaciones reales.
- Control de acceso al agente Paper.
- Validacion de datos desactualizados.
- Prevencion de ciclos duplicados.
- Pausa del agente ante errores.
- Controles de exposicion en el agente Paper.
- Registro de resultados y decisiones.
- Evaluacion historica de modelos predictivos.

Estos controles corresponden a un prototipo academico.
No equivalen a una certificacion de seguridad financiera.

## Decisiones de alcance

### Operaciones reales

Se excluyeron por seguridad, finalidad academica y
las restricciones comunicadas sobre MEXC.

### Polymarket

Se selecciono MEXC como fuente principal de datos reales.
No fue necesario integrar un segundo proveedor.

### Apalancamiento

Se excluyo para evitar complejidad adicional y mantener
el alcance educativo del simulador.

### Sistema multiagente

Se eligio una arquitectura con un modelo de lenguaje
local mediante Ollama, adecuada para los recursos
computacionales y el alcance del proyecto.

### WebSocket

Se utiliza la consulta periodica de datos publicos.
Esta alternativa simplifica la integracion y permite
visualizar informacion actualizada del mercado.

## Supuestos financieros

- Capital completamente ficticio.
- Comisiones configuradas en cero.
- Los resultados simulados no equivalen a beneficios reales.
- Los costos de ejecucion reales pueden modificar el PnL.
