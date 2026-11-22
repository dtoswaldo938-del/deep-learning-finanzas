import { API_BASE_URL } from './apiConfig'

export type ParMercado = {
  simbolo: string
  nombre: string
  activo_base: string
  moneda_cotizacion: string
}

export type CatalogoLab = {
  pares: ParMercado[]
  modelos: string[]
}

function simboloValido(valor: unknown): valor is string {
  return (
    typeof valor === 'string' &&
    /^[A-Z0-9]{2,30}$/.test(valor)
  )
}

export async function cargarCatalogoLab(
  signal?: AbortSignal,
): Promise<CatalogoLab> {
  const [respuestaMexc, respuestaModelos] = await Promise.all([
    fetch(`${API_BASE_URL}/api/mexc/catalogo`, {
      cache: 'no-store',
      signal,
    }),
    fetch(`${API_BASE_URL}/api/modelos-multiactivo/disponibles`, {
      cache: 'no-store',
      signal,
    }),
  ])

  if (!respuestaMexc.ok || !respuestaModelos.ok) {
    throw new Error('No fue posible cargar los catalogos.')
  }

  const mexc: unknown = await respuestaMexc.json()
  const modelos: unknown = await respuestaModelos.json()

  if (
    typeof mexc !== 'object' ||
    mexc === null ||
    !('status' in mexc) ||
    mexc.status !== 'ok' ||
    !('pares' in mexc) ||
    !Array.isArray(mexc.pares)
  ) {
    throw new Error('El catalogo MEXC tiene un formato invalido.')
  }

  if (
    typeof modelos !== 'object' ||
    modelos === null ||
    !('status' in modelos) ||
    modelos.status !== 'ok' ||
    !('simbolos' in modelos) ||
    !Array.isArray(modelos.simbolos)
  ) {
    throw new Error('El catalogo de modelos tiene un formato invalido.')
  }

  const pares: ParMercado[] = mexc.pares
    .filter((par: unknown): par is ParMercado => {
      if (typeof par !== 'object' || par === null) return false
      if (!('simbolo' in par) || !simboloValido(par.simbolo)) return false
      if (!('nombre' in par) || typeof par.nombre !== 'string') return false
      if (!('activo_base' in par) || typeof par.activo_base !== 'string') return false
      if (!('moneda_cotizacion' in par) || par.moneda_cotizacion !== 'USDT') return false
      return true
    })

  const simbolosMercado = new Set(pares.map(par => par.simbolo))

  const modelosValidos: string[] = modelos.simbolos
    .filter(simboloValido)
    .filter((simbolo: string) => simbolosMercado.has(simbolo))

  return {
    pares,
    modelos: [...new Set(modelosValidos)],
  }
}
