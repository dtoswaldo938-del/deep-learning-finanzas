import {
  crearEstadoInicial,
  ejecutarOperacion,
  calcularPatrimonio,
} from './src/liveTradingEngine.ts'

const comprobar = (nombre: string, condicion: boolean) => {
  if (!condicion) throw new Error(`FALLO: ${nombre}`)
  console.log(`OK: ${nombre}`)
}

let estado = crearEstadoInicial()

comprobar(
  'Capital inicial de 50000 USDT',
  estado.efectivo === 50000,
)

estado = ejecutarOperacion(
  estado,
  'BTCUSDT',
  'COMPRA',
  1000,
  50000,
)

comprobar(
  'Saldo despues de comprar: 49000',
  estado.efectivo === 49000,
)

comprobar(
  'Cantidad comprada: 0.02 BTC',
  Math.abs(estado.posiciones.BTCUSDT - 0.02) < 1e-10,
)

const patrimonio = calcularPatrimonio(estado, {
  BTCUSDT: 55000,
})

comprobar(
  'Patrimonio despues de subir BTC: 50100',
  Math.abs(patrimonio - 50100) < 1e-8,
)

estado = ejecutarOperacion(
  estado,
  'BTCUSDT',
  'VENTA',
  1100,
  55000,
)

comprobar(
  'Saldo final: 50100',
  Math.abs(estado.efectivo - 50100) < 1e-8,
)

comprobar(
  'Posicion cerrada',
  estado.posiciones.BTCUSDT === 0,
)

console.log('TODAS LAS PRUEBAS COMPLETADAS')
