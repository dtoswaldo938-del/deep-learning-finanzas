import { API_BASE_URL } from './apiConfig'
import type {
  EstadoLab,
  PreciosLab,
} from './liveTradingEngine'

export function activosParaCotizar(
  seleccionado: string,
  estado: EstadoLab,
): string[] {
  const activos = new Set<string>()

  if (seleccionado) {
    activos.add(seleccionado)
  }

  for (const [simbolo, cantidad] of Object.entries(
    estado.posiciones,
  )) {
    if (cantidad > 0) {
      activos.add(simbolo)
    }
  }

  return [...activos]
}

export async function consultarPreciosLab(
  simbolos: string[],
  signal?: AbortSignal,
): Promise<PreciosLab> {
  const unicos = [...new Set(simbolos)]

  const resultados = await Promise.all(
    unicos.map(async simbolo => {
      if (!/^[A-Z0-9]{2,30}$/.test(simbolo)) {
        throw new Error(`Simbolo invalido: ${simbolo}`)
      }

      const respuesta = await fetch(
        `${API_BASE_URL}/api/mexc/precio-por-simbolo?simbolo=${encodeURIComponent(simbolo)}`,
        {
          cache: 'no-store',
          signal,
        },
      )

      if (!respuesta.ok) {
        throw new Error(`No se pudo cotizar ${simbolo}`)
      }

      const datos: unknown = await respuesta.json()

      if (
        typeof datos !== 'object' ||
        datos === null ||
        !('status' in datos) ||
        datos.status !== 'ok' ||
        !('activo' in datos) ||
        datos.activo !== simbolo ||
        !('precio' in datos)
      ) {
        throw new Error(`Respuesta invalida para ${simbolo}`)
      }

      const precio = Number(datos.precio)

      if (!Number.isFinite(precio) || precio <= 0) {
        throw new Error(`Precio invalido para ${simbolo}`)
      }

      return [simbolo, precio] as const
    }),
  )

  return Object.fromEntries(resultados)
}
