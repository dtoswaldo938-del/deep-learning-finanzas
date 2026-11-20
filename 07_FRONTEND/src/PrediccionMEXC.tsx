import { API_BASE_URL } from './apiConfig'

import { useEffect, useState } from 'react'

type PrediccionMEXCData = {
  status: string
  fuente: string
  modelo: string
  activo: string
  modo: string
  fecha_emision: string
  fecha_objetivo: string
  rendimiento_estimado: number
  rendimiento_estimado_porcentaje: number
  direccion_estimacion: string
  rendimiento_observado: number | null
  operaciones_reales: boolean
}

const URL_API =
  `${API_BASE_URL}/api/mexc/prediccion-lstm`

function PrediccionMEXC() {
  const [prediccion, setPrediccion] =
    useState<PrediccionMEXCData | null>(null)

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true
    let controlador: AbortController | null = null

    async function consultarPrediccion() {
      controlador = new AbortController()

      try {
        const respuesta = await fetch(URL_API, {
          signal: controlador.signal,
        })

        if (!respuesta.ok) {
          throw new Error(
            'No se pudo consultar la predicción LSTM-A'
          )
        }

        const datos: PrediccionMEXCData =
          await respuesta.json()

        if (activo) {
          setPrediccion(datos)
          setError('')
        }
      } catch (err) {
        if (
          activo &&
          !(err instanceof DOMException &&
            err.name === 'AbortError')
        ) {
          setError(
            'No fue posible actualizar la predicción de MEXC.'
          )
        }
      } finally {
        if (activo) {
          setCargando(false)
        }
      }
    }

    consultarPrediccion()

    // Consultar periódicamente si existe una nueva vela cerrada.
    // La predicción NO se recalcula cada segundo.
    const intervalo = window.setInterval(
      consultarPrediccion,
      5 * 60 * 1000
    )

    return () => {
      activo = false
      controlador?.abort()
      window.clearInterval(intervalo)
    }
  }, [])

  const porcentaje =
    prediccion?.rendimiento_estimado_porcentaje ?? 0

  const direccion = prediccion?.direccion_estimacion

  const colorDireccion =
    direccion === 'subida'
      ? '#4ade80'
      : direccion === 'bajada'
        ? '#f87171'
        : '#e5e7eb'

  const textoDireccion =
    direccion === 'subida'
      ? 'Subida estimada'
      : direccion === 'bajada'
        ? 'Bajada estimada'
        : 'Sin cambio estimado'

  return (
    <section className="dashboard-card">
      <h2>Predicción LSTM-A con datos de MEXC</h2>

      <p>
        Inferencia experimental utilizando las últimas
        20 variaciones diarias de BTC/USDT.
      </p>

      {cargando && !prediccion && (
        <p>Consultando la red neuronal...</p>
      )}

      {error && (
        <p style={{ color: '#f87171' }}>
          {error}
          {prediccion && ' Se muestra la última consulta exitosa.'}
        </p>
      )}

      {prediccion && (
        <>
          <div
            style={{
              margin: '24px auto',
              padding: '22px',
              border: '1px solid #334155',
              borderRadius: '14px',
              maxWidth: '520px',
              backgroundColor: '#0f172a',
            }}
          >
            <p style={{ opacity: 0.8 }}>
              Rendimiento diario estimado
            </p>

            <h3
              style={{
                color: colorDireccion,
                fontSize: '36px',
                margin: '12px 0',
              }}
            >
              {porcentaje > 0 ? '+' : ''}
              {porcentaje.toFixed(4)} %
            </h3>

            <p
              style={{
                color: colorDireccion,
                fontWeight: 'bold',
              }}
            >
              {textoDireccion}
            </p>
          </div>

          <p>
            <strong>Modelo:</strong> {prediccion.modelo}
          </p>

          <p>
            <strong>Fecha de emisión:</strong>{' '}
            {prediccion.fecha_emision}
          </p>

          <p>
            <strong>Fecha objetivo:</strong>{' '}
            {prediccion.fecha_objetivo}
          </p>

          <p>
            <strong>Fuente:</strong> {prediccion.fuente}
          </p>

          <p>
            <strong>Rendimiento observado:</strong>{' '}
            {prediccion.rendimiento_observado === null
              ? 'No disponible en esta inferencia'
              : prediccion.rendimiento_observado}
          </p>

          <p style={{ fontSize: '13px', opacity: 0.8 }}>
            El modelo utiliza velas diarias cerradas.
            La consulta se actualiza cada cinco minutos
            mientras el dashboard permanece abierto.
            La predicción cambia cuando se incorpora
            una nueva vela cerrada.
          </p>

          <p style={{ fontSize: '13px', opacity: 0.8 }}>
            Resultado experimental. No garantiza
            movimientos futuros del mercado.
            No se realizan operaciones con dinero real.
          </p>
        </>
      )}
    </section>
  )
}

export default PrediccionMEXC
