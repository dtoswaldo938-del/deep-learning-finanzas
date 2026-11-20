import { API_BASE_URL } from './apiConfig'

import { useEffect, useState } from 'react'

const API_URL =
  `${API_BASE_URL}/api/mexc/estado-actualizacion-lstm`

type EstadoMonitor = {
  activo: boolean
  estado: string
  ultima_revision_utc: string | null
  ultima_revision_exitosa_utc: string | null
  proxima_revision_utc: string | null
  ultimo_resultado: {
    status: string
    predicciones_pendientes_revisadas: number
  } | null
  ultimo_error: string | null
}

type RespuestaMonitor = {
  status: string
  modelo: string
  activo: string
  intervalo_segundos: number
  monitor: EstadoMonitor
  operaciones_reales: boolean
}

function formatearFecha(fecha: string | null) {
  if (!fecha) {
    return 'No disponible'
  }

  const valor = new Date(fecha)

  if (Number.isNaN(valor.getTime())) {
    return 'Fecha no válida'
  }

  return valor.toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  })
}

function MonitorLSTM() {
  const [datos, setDatos] = useState<RespuestaMonitor | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true

    async function consultarMonitor() {
      try {
        const respuesta = await fetch(API_URL)

        if (!respuesta.ok) {
          throw new Error('No se pudo consultar el monitor')
        }

        const resultado: RespuestaMonitor = await respuesta.json()

        if (resultado.status !== 'ok') {
          throw new Error('Respuesta inesperada del servidor')
        }

        if (activo) {
          setDatos(resultado)
          setError('')
        }
      } catch {
        if (activo) {
          setError('No se pudo conectar con el monitor LSTM-A.')
        }
      } finally {
        if (activo) {
          setCargando(false)
        }
      }
    }

    consultarMonitor()

    const intervalo = window.setInterval(
      consultarMonitor,
      60 * 1000
    )

    return () => {
      activo = false
      window.clearInterval(intervalo)
    }
  }, [])

  const monitor = datos?.monitor

  return (
    <section className="dashboard-card">
      <h2>Monitor de actualización automática LSTM-A</h2>

      <p className="evaluaciones-descripcion">
        Supervisión de las evaluaciones automáticas
        de predicciones diarias.
      </p>

      {cargando && <p>Consultando monitor...</p>}

      {error && (
        <p className="evaluaciones-error" role="alert">
          {error}
        </p>
      )}

      {monitor && (
        <>
          <div className="evaluaciones-indicadores">
            <div className="evaluaciones-indicador">
              <span>Estado de la tarea</span>
              <strong>
                {monitor.activo
                  ? monitor.estado
                  : 'Detenido'}
              </strong>
            </div>

            <div className="evaluaciones-indicador">
              <span>Última revisión</span>
              <strong className="monitor-fecha">
                {formatearFecha(
                  monitor.ultima_revision_utc
                )}
              </strong>
            </div>

            <div className="evaluaciones-indicador">
              <span>Última revisión exitosa</span>
              <strong className="monitor-fecha">
                {formatearFecha(
                  monitor.ultima_revision_exitosa_utc
                )}
              </strong>
            </div>

            <div className="evaluaciones-indicador">
              <span>Próxima revisión prevista</span>
              <strong className="monitor-fecha">
                {formatearFecha(
                  monitor.proxima_revision_utc
                )}
              </strong>
            </div>
          </div>

          <p className="evaluaciones-nota">
            Frecuencia: cada{' '}
            {(datos?.intervalo_segundos ?? 1800) / 60}{' '}
            minutos mientras FastAPI esté funcionando.
          </p>

          {monitor.ultimo_error && (
            <p className="evaluaciones-error">
              Último error: {monitor.ultimo_error}
            </p>
          )}
        </>
      )}
    </section>
  )
}

export default MonitorLSTM
