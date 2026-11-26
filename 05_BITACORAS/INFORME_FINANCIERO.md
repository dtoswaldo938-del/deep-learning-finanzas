# Informe financiero - Neural Finance

## Indicadores tecnicos

- SMA de 20 periodos.
- EMA de 20 periodos.
- RSI de 14 periodos mediante el metodo de Wilder.
- Drawdown disponible en resultados historicos.

## Metricas del simulador

- Saldo disponible.
- Cantidad de activos ficticios.
- Costo promedio.
- Valor de posiciones.
- PnL realizado.
- PnL no realizado.
- Patrimonio.
- Rendimiento porcentual.

## Formulas

Patrimonio = Efectivo + Valor de posiciones

PnL total = PnL realizado + PnL no realizado

Rendimiento = PnL total / Capital inicial * 100

## Caso de prueba con precios ficticios

| Indicador | Resultado |
|---|---:|
| Capital inicial | 50000 USDT |
| Efectivo final | 48370 USDT |
| Valor de posicion restante | 1710 USDT |
| PnL realizado | 20 USDT |
| PnL no realizado | 60 USDT |
| PnL total | 80 USDT |
| Patrimonio final | 50080 USDT |
| Rendimiento | 0.16% |

## Costos de simulacion

El motor evaluado no descuenta comisiones ni deslizamiento.

Por ejemplo, si los costos ficticios acumulados fueran
de 5 USDT, el PnL neto del caso anterior seria de 75 USDT.

Este ejemplo es ilustrativo y no representa una funcion
de comisiones implementada en el motor.

## Evidencias

- 07_FRONTEND/prueba_metricas_343.ts
- 07_FRONTEND/prueba_live_lab_336.ts
- 05_BITACORAS/INFORME_REPLAY_FINAL.md

Las operaciones son exclusivamente simuladas.
