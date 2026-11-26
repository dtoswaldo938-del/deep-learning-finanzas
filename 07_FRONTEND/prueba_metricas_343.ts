import {
  crearEstadoInicial,
  ejecutarOperacion,
  calcularMetricasPosicion,
} from './src/liveTradingEngine.ts'

function verificar(
  nombre: string,
  obtenido: number,
  esperado: number,
) {
  const correcto = Math.abs(obtenido - esperado) < 0.000001

  if (!correcto) {
    throw new Error(
      `${nombre}: esperado ${esperado}, obtenido ${obtenido}`,
    )
  }

  console.log(`OK: ${nombre} = ${obtenido.toFixed(4)}`)
}

let estado = crearEstadoInicial()

estado = ejecutarOperacion(
  estado, 'BTCUSDT', 'COMPRA', 1000, 50000,
)

estado = ejecutarOperacion(
  estado, 'BTCUSDT', 'COMPRA', 1200, 60000,
)

let m = calcularMetricasPosicion(
  estado, 'BTCUSDT', 57000,
)

verificar('Cantidad BTC', m.cantidad, 0.04)
verificar('Costo promedio', m.costoPromedio, 55000)
verificar('Costo pendiente', m.costoPendiente, 2200)
verificar('Valor actual', m.valorActual, 2280)
verificar('Resultado abierto', m.resultadoNoRealizado, 80)

estado = ejecutarOperacion(
  estado, 'BTCUSDT', 'VENTA', 570, 57000,
)

m = calcularMetricasPosicion(
  estado, 'BTCUSDT', 57000,
)

verificar('BTC restante', m.cantidad, 0.03)
verificar('Costo promedio restante', m.costoPromedio, 55000)
verificar('Resultado realizado', m.resultadoRealizado, 20)
verificar('Resultado abierto restante', m.resultadoNoRealizado, 60)
verificar('Efectivo disponible', estado.efectivo, 48370)

console.log('TODAS LAS PRUEBAS DE METRICAS PASARON')
