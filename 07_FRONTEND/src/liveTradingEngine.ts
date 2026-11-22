export type ActivoLab = string
export type TipoOperacion = 'COMPRA' | 'VENTA'

export type PosicionesLab = Record<ActivoLab, number>
export type PreciosLab = Record<ActivoLab, number>

export type OperacionLab = {
  id: string
  fecha: string
  activo: ActivoLab
  tipo: TipoOperacion
  cantidad: number
  precio: number
  importe: number
}

export type EstadoLab = {
  efectivo: number
  posiciones: PosicionesLab
  operaciones: OperacionLab[]
}

export const CAPITAL_INICIAL = 50000

export const ACTIVOS_LAB: ActivoLab[] = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
]

export function crearEstadoInicial(): EstadoLab {
  return {
    efectivo: CAPITAL_INICIAL,
    posiciones: {},
    operaciones: [],
  }
}

export function calcularPatrimonio(
  estado: EstadoLab,
  precios: Partial<PreciosLab>,
): number {
  return Object.entries(estado.posiciones).reduce((total, [activo, cantidad]) => {
    const precio = precios[activo]

    if (cantidad > 0 && (
      precio === undefined ||
      !Number.isFinite(precio) ||
      precio <= 0
    )) {
      throw new Error(
        `Falta un precio valido para ${activo}.`,
      )
    }

    return total + cantidad * (precio ?? 0)
  }, estado.efectivo)
}

export function ejecutarOperacion(
  estado: EstadoLab,
  activo: ActivoLab,
  tipo: TipoOperacion,
  importe: number,
  precio: number,
): EstadoLab {
  if (!Number.isFinite(importe) || importe <= 0) {
    throw new Error('El importe debe ser mayor que cero.')
  }

  if (!Number.isFinite(precio) || precio <= 0) {
    throw new Error('El precio del activo no es valido.')
  }

  const cantidad = importe / precio

  if (tipo === 'COMPRA' && importe > estado.efectivo + 1e-8) {
    throw new Error('Saldo ficticio insuficiente.')
  }

  if (
    tipo === 'VENTA' &&
    cantidad > (estado.posiciones[activo] ?? 0) + 1e-10
  ) {
    throw new Error('No tienes suficiente activo para vender.')
  }

  const nuevoEfectivo =
    tipo === 'COMPRA'
      ? estado.efectivo - importe
      : estado.efectivo + importe

  const nuevaCantidad =
    tipo === 'COMPRA'
      ? (estado.posiciones[activo] ?? 0) + cantidad
      : (estado.posiciones[activo] ?? 0) - cantidad

  const operacion: OperacionLab = {
    id: crypto.randomUUID(),
    fecha: new Date().toISOString(),
    activo,
    tipo,
    cantidad,
    precio,
    importe,
  }

  return {
    efectivo: Math.max(0, nuevoEfectivo),
    posiciones: {
      ...estado.posiciones,
      [activo]: Math.max(0, nuevaCantidad),
    },
    operaciones: [
      operacion,
      ...estado.operaciones,
    ],
  }
}

export type MetricasPosicion = {
  cantidad: number
  costoPromedio: number
  costoPendiente: number
  valorActual: number
  resultadoNoRealizado: number
  resultadoRealizado: number
}

export function calcularMetricasPosicion(
  estado: EstadoLab,
  activo: ActivoLab,
  precioActual: number,
): MetricasPosicion {
  let cantidad = 0
  let costoPendiente = 0
  let resultadoRealizado = 0

  const operaciones = [...estado.operaciones].reverse()

  for (const op of operaciones) {
    if (op.activo !== activo) continue

    if (op.tipo === 'COMPRA') {
      cantidad += op.cantidad
      costoPendiente += op.importe
    } else {
      const promedio =
        cantidad > 0 ? costoPendiente / cantidad : 0

      const costoVendido = promedio * op.cantidad

      resultadoRealizado += op.importe - costoVendido
      cantidad -= op.cantidad
      costoPendiente -= costoVendido

      if (cantidad < 1e-10) {
        cantidad = 0
        costoPendiente = 0
      }
    }
  }

  const costoPromedio =
    cantidad > 0 ? costoPendiente / cantidad : 0

  const valorActual = cantidad * precioActual

  return {
    cantidad,
    costoPromedio,
    costoPendiente,
    valorActual,
    resultadoNoRealizado: valorActual - costoPendiente,
    resultadoRealizado,
  }
}
