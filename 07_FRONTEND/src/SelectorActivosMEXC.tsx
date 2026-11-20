
import { useEffect, useMemo, useState } from 'react'

type ParMEXC = {
  simbolo: string
  activo_base: string
  moneda_cotizacion: string
  nombre: string
}

type RespuestaCatalogo = {
  status: string
  total: number
  pares: ParMEXC[]
}

type Props = {
  simbolo: string
  onCambiar: (simbolo: string) => void
}

const API = 'http://127.0.0.1:8001'

export default function SelectorActivosMEXC({
  simbolo,
  onCambiar,
}: Props) {
  const [pares, setPares] = useState<ParMEXC[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controlador = new AbortController()

    async function cargarCatalogo() {
      try {
        const respuesta = await fetch(
          `${API}/api/mexc/catalogo`,
          { signal: controlador.signal }
        )

        if (!respuesta.ok) {
          throw new Error('No se pudo consultar el catálogo.')
        }

        const datos: RespuestaCatalogo =
          await respuesta.json()

        if (
          datos.status !== 'ok' ||
          !Array.isArray(datos.pares)
        ) {
          throw new Error('El catálogo no es válido.')
        }

        setPares(datos.pares)
        setError('')
      } catch (err) {
        if (
          err instanceof Error &&
          err.name === 'AbortError'
        ) {
          return
        }

        setError(
          'No se pudo cargar el catálogo de MEXC.'
        )
      } finally {
        if (!controlador.signal.aborted) {
          setCargando(false)
        }
      }
    }

    void cargarCatalogo()

    return () => controlador.abort()
  }, [])

  const resultados = useMemo(() => {
    const texto = busqueda.trim().toUpperCase()

    if (!texto) {
      return pares.slice(0, 100)
    }

    return pares
      .filter((par) =>
        par.simbolo.toUpperCase().includes(texto) ||
        par.nombre.toUpperCase().includes(texto)
      )
      .slice(0, 100)
  }, [pares, busqueda])

  const parSeleccionado = pares.find(
    (par) => par.simbolo === simbolo
  )

  const opciones = [...resultados]

  if (
    parSeleccionado &&
    !opciones.some(
      (par) => par.simbolo === simbolo
    )
  ) {
    opciones.unshift(parSeleccionado)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
        minWidth: 220,
      }}
    >
      <label
        htmlFor="busqueda-activo-mexc"
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 1.4,
          color: '#8ba8cf',
        }}
      >
        SELECCIONAR CRIPTOMONEDA
      </label>

      <input
        id="busqueda-activo-mexc"
        type="search"
        value={busqueda}
        onChange={(evento) =>
          setBusqueda(evento.target.value)
        }
        placeholder="Buscar BTC, ETH, SOL..."
        disabled={cargando || !!error}
        style={{
          padding: '10px 12px',
          borderRadius: 9,
          border: '1px solid #29415e',
          background: '#101c30',
          color: '#e6f2ff',
          outlineColor: '#38bdf8',
          width: '100%',
        }}
      />

      <select
        aria-label="Activo seleccionado de MEXC"
        value={simbolo}
        onChange={(evento) =>
          onCambiar(evento.target.value)
        }
        disabled={cargando || !!error}
        style={{
          padding: '10px 12px',
          borderRadius: 9,
          border: '1px solid #315575',
          background: '#11263e',
          color: '#7dd3fc',
          fontWeight: 700,
          width: '100%',
          cursor: 'pointer',
        }}
      >
        {opciones.length === 0 && (
          <option value={simbolo}>
            Sin resultados
          </option>
        )}

        {opciones.map((par) => (
          <option
            key={par.simbolo}
            value={par.simbolo}
          >
            {par.nombre}
          </option>
        ))}

        {pares.length === 0 && (
          <option value="BTCUSDT">
            BTC/USDT
          </option>
        )}
      </select>

      <span
        style={{
          fontSize: 10,
          color: error ? '#fca5a5' : '#829bbd',
        }}
      >
        {error ||
          (cargando
            ? 'Cargando criptomonedas...'
            : `${pares.length.toLocaleString('es-MX')} pares disponibles`)}
      </span>
    </div>
  )
}
