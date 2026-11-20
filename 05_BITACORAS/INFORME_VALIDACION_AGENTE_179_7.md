# Neural Finance â€” Informe de validaciÃ³n del agente IA

**Fecha de ejecuciÃ³n reportada:** 19 de noviembre de 2026 (hora local, segÃºn la sesiÃ³n de pruebas).
**Alcance:** Agente LSTM + Ollama `llama3.2:1b` para paper trading; no hay Ã³rdenes reales ni claves de exchange.

## Arquitectura resumida

- Frontend: React + TypeScript + Vite, panel Â«Agente IA Â· Paper TradingÂ».
- Backend: FastAPI; endpoints `/api/agente-paper/estado`, `/iniciar`, `/pausar`, `/detener` y `/ciclo`.
- Modelo predictivo: LSTM experimental; modelo de lenguaje: Ollama `llama3.2:1b`.
- Persistencia: SQLite. Capital inicial independiente: **50,000 USDT ficticios**; comisiÃ³n configurada: **0 %**; exposiciÃ³n mÃ¡xima configurada: **10 %**; pÃ©rdida diaria mÃ¡xima configurada: **3 %**.
- Planificador: revisiÃ³n cada 1,800 segundos mientras el proceso backend estÃ¡ en ejecuciÃ³n; su funcionamiento completo en un ciclo real todavÃ­a requiere evidencia adicional.

## Evidencia observada

1. `python -m py_compile` de `main.py` y `rutas_agente_paper.py`: correcto.
2. `npm run build` del frontend: correcto, 432 mÃ³dulos transformados, compilaciÃ³n Vite exitosa.
3. FastAPI: arranque correcto en `127.0.0.1:8001`; Vite: `127.0.0.1:5174`.
4. Panel: muestra `PAUSADO`, saldo 50,000 USDT, 0 BTC, patrimonio registrado 50,000 USDT, una decisiÃ³n `MANTENER` del 18 de noviembre de 2026, modelo `llama3.2:1b`.
5. Control de pausa desde la interfaz: mensaje Â«Comando realizado. Estado: PAUSADOÂ».
6. Suite aislada `test_agente_paper_aislado.py`: **14 pruebas ejecutadas, 14 correctas, 0 fallidas**, tiempo reportado en segunda ejecuciÃ³n: 0.738 s.

## Pruebas unitarias aprobadas

| N.Âº | Prueba | Resultado |
|---:|---|---|
| 01 | AutenticaciÃ³n obligatoria | OK |
| 02 | Rechazo de clave incorrecta | OK |
| 03 | No opera detenido | OK |
| 04 | Pausa bloquea ciclo | OK |
| 05 | Mantener y persistencia | OK |
| 06 | Vela duplicada rechazada | OK |
| 07 | Vela obsoleta pausa | OK |
| 08 | AcciÃ³n invÃ¡lida pausa | OK |
| 09 | Precio no disponible pausa | OK |
| 10 | Compra respeta exposiciÃ³n | OK |
| 11 | Venta sin posiciÃ³n | OK |
| 12 | Planificador no revisa pausado | OK |
| 13 | Planificador no repite vela | OK |
| 14 | SÃ­mbolo distinto rechazado | OK |

Las pruebas usan SQLite temporal y mocks; no prueban la disponibilidad real de MEXC/Ollama ni garantizan resultados financieros.

## Advertencias observadas

- `SyntaxWarning: invalid escape sequence '\\.'` en el texto inicial del archivo de pruebas: advertencia cosmÃ©tica, no invalida los resultados.
- En Windows PowerShell, `unittest` escribe su progreso en `stderr`, lo que puede aparecer como `NativeCommandError` cuando se redirige con `2>&1`, incluso con resultado `OK`.

## Pendientes y lÃ­mites de la entrega

- Demostrar con registro un **ciclo automÃ¡tico completo** de nueva vela, con backend encendido.
- Registrar 20 ciclos de decisiÃ³n vÃ¡lidos, distinguiendo replay histÃ³rico de ejecuciÃ³n en vivo, si lo exige el protocolo.
- Completar la matriz de fallos exigida por el protocolo y contrastar agente LLM con polÃ­tica determinista y comprar/mantener.
- Verificar rigurosamente que la regla de pÃ©rdida diaria del 3 % y el estado de pausa se respeten ante carreras y procesos concurrentes; no basta con que aparezcan en la UI.
- Documentar diferencias respecto del protocolo de entrenamiento: ~499 velas disponibles frente a 1,500 exigidas; entrenamiento local CPU frente a Colab T4.
- Preparar GitHub con exclusiÃ³n de `.env`, tokens, bases de datos, entornos virtuales y respaldos.

## Comandos de reproducciÃ³n

Desde la raÃ­z `PROYECTO_DL_FINANZAS`:

```powershell
$env:PYTHONPATH = (Resolve-Path '.\06_BACKEND').Path
.\06_BACKEND\.venv313\Scripts\python.exe -m unittest discover -s '.\06_BACKEND\tests' -p 'test_agente_paper_aislado.py' -v
npm.cmd --prefix .\07_FRONTEND run build
```

**Uso exclusivamente acadÃ©mico y simulado.** Ninguna predicciÃ³n constituye asesoramiento de inversiÃ³n.
