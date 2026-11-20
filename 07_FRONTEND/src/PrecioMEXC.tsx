import { API_BASE_URL } from './apiConfig'

import { useEffect, useState } from 'react'

type PrecioMEXCData = {
  status: string
  fuente: string
  activo: string
  precio: number
  fecha_consulta_utc: string
  operaciones_reales: boolean
}

type Props = {
  simbolo?: string
}

const API = `${API_BASE_URL}`

export default function PrecioMEXC({
  simbolo = 'BTCUSDT',
}: Props) {
  const [datos, setDatos] =
    useState<PrecioMEXCData | null>(null)

  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true
    let consultando = false
    let temporizador: ReturnType<typeof setTimeout>

    const controlador = new AbortController()

    setDatos(null)
    setError('')
    setCargando(true)

    async function actualizarPrecio() {
      if (!activo || consultando) return

      consultando = true

      try {
        const respuesta = await fetch(
          `${API}/api/mexc/precio-por-simbolo?simbolo=${encodeURIComponent(simbolo)}`,
          {
            signal: controlador.signal,
            cache: 'no-store',
          }
        )

        if (!respuesta.ok) {
          throw new Error(
            'No fue posible consultar el precio.'
          )
        }

        const resultado: PrecioMEXCData =
          await respuesta.json()

        if (
          resultado.status !== 'ok' ||
          resultado.activo !== simbolo ||
          !Number.isFinite(Number(resultado.precio))
        ) {
          throw new Error(
            'MEXC devolvió información inesperada.'
          )
        }

        if (activo) {
          setDatos(resultado)
          setError('')
        }
      } catch (err) {
        if (
          activo &&
          !(err instanceof Error &&
            err.name === 'AbortError')
        ) {
          setError(
            'No fue posible actualizar el precio desde MEXC.'
          )
        }
      } finally {
        consultando = false

        if (activo) {
          setCargando(false)

          temporizador = setTimeout(
            actualizarPrecio,
            1000
          )
        }
      }
    }

    void actualizarPrecio()

    return () => {
      activo = false
      controlador.abort()
      clearTimeout(temporizador)
    }
  }, [simbolo])

  const nombreActivo =
    simbolo.endsWith('USDT')
      ? `${simbolo.slice(0, -4)}/USDT`
      : simbolo

  return (
    <section
      style={{
        background: '#111827',
        color: '#ffffff',
        padding: 24,
        borderRadius: 16,
        marginBottom: 24,
        border: '1px solid #263954',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h2>
          Precio de {nombreActivo} · MEXC
        </h2>

        <span
          style={{
            color: error ? '#fca5a5' : '#7dd3fc',
            fontSize: 12,
          }}
        >
          {error
            ? 'Conexión interrumpida'
            : cargando
              ? 'Consultando...'
              : 'Datos de MEXC'}
        </span>
      </div>

      {datos && (
        <>
          <h1
            style={{
              color: '#38bdf8',
              fontSize: 36,
              margin: '14px 0',
              overflowWrap: 'anywhere',
            }}
          >
            {datos.precio.toLocaleString('es-MX', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 10,
            })}{' '}
            USDT
          </h1>

          <p>Activo: {datos.activo}</p>
          <p>Fuente: {datos.fuente}</p>

          <p>
            Última consulta:{' '}
            {new Date(
              datos.fecha_consulta_utc
            ).toLocaleString('es-MX')}
          </p>

          <p>
            Actualización aproximada cada segundo.
          </p>
        </>
      )}

      {cargando && !datos && (
        <p>Consultando el precio del activo...</p>
      )}

      {error && (
        <p style={{ color: '#f87171' }}>
          {error}
          {datos &&
            ' El último precio recibido podría estar desactualizado.'}
        </p>
      )}

      <small style={{ color: '#8ba8cf' }}>
        Información de mercado. No se realizan
        operaciones reales.
      </small>
    </section>
  )
}
