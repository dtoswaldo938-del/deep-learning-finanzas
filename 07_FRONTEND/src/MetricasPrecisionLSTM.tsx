
import { useEffect, useState } from 'react'

type Metricas = {
  status: string
  modo: string
  modelo: string
  activo: string
  unidad_error: string
  total_evaluaciones: number
  mae: number | null
  rmse: number | null
  sesgo_medio: number | null
  aciertos_direccion: number
  total_con_direccion: number
  precision_direccion_porcentaje: number | null
  solo_lectura: boolean
  saldo_sqlite_modificado: boolean
  operaciones_reales: boolean
}

const API_URL =
  'http://127.0.0.1:8001/api/simulador/metricas-precision-lstm'

const INTERVALO_ACTUALIZACION = 60000

const formatoMetrica = (valor: number | null) =>
  valor === null ? 'Sin datos' : valor.toFixed(4)

function MetricasPrecisionLSTM() {
  const [datos, setDatos] = useState<Metricas | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [ultimaConsulta, setUltimaConsulta] =
    useState<Date | null>(null)

  useEffect(() => {
    let activo = true
    let consultando = false

    async function consultarMetricas() {
      if (!activo || consultando) {
        return
      }

      consultando = true

      try {
        const respuesta = await fetch(API_URL, {
          cache: 'no-store',
        })

        if (!respuesta.ok) {
          throw new Error('Error al consultar FastAPI.')
        }

        const resultado: Metricas = await respuesta.json()

        if (
          resultado.status !== 'ok' ||
          resultado.solo_lectura !== true ||
          resultado.operaciones_reales !== false ||
          resultado.saldo_sqlite_modificado !== false
        ) {
          throw new Error('Respuesta inesperada de la API.')
        }

        if (activo) {
          setDatos(resultado)
          setError('')
          setUltimaConsulta(new Date())
        }
      } catch {
        if (activo) {
          setError(
            'No se pudieron consultar las métricas de precisión.'
          )
        }
      } finally {
        consultando = false

        if (activo) {
          setCargando(false)
        }
      }
    }

    void consultarMetricas()

    const intervalo = window.setInterval(() => {
      void consultarMetricas()
    }, INTERVALO_ACTUALIZACION)

    return () => {
      activo = false
      window.clearInterval(intervalo)
    }
  }, [])

  const estiloCuadricula = {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 20,
    marginTop: 24,
    marginBottom: 24,
  }

  return (
    <section className="dashboard-card">
      <h2>Métricas de precisión del modelo LSTM-A</h2>

      <p>
        Evaluación estadística de los rendimientos
        estimados y observados de BTCUSDT.
      </p>

      {cargando && (
        <p>Consultando métricas de precisión...</p>
      )}

      {error && (
        <p style={{ color: '#f87171' }}>
          {error}
        </p>
      )}

      {datos && (
        <>
          <div style={estiloCuadricula}>
            <div>
              <p>Error absoluto medio (MAE)</p>
              <h3>{formatoMetrica(datos.mae)}</h3>
              <p style={{ fontSize: 12 }}>
                Puntos porcentuales
              </p>
            </div>

            <div>
              <p>Error cuadrático medio (RMSE)</p>
              <h3>{formatoMetrica(datos.rmse)}</h3>
              <p style={{ fontSize: 12 }}>
                Puntos porcentuales
              </p>
            </div>

            <div>
              <p>Sesgo medio</p>
              <h3
                style={{
                  color:
                    datos.sesgo_medio === null
                      ? 'inherit'
                      : Math.abs(datos.sesgo_medio) < 0.00005
                        ? '#4ade80'
                        : '#fbbf24',
                }}
              >
                {datos.sesgo_medio === null
                  ? 'Sin datos'
                  : `${
                      datos.sesgo_medio > 0 ? '+' : ''
                    }${formatoMetrica(datos.sesgo_medio)}`}
              </h3>
              <p style={{ fontSize: 12 }}>
                Puntos porcentuales
              </p>
            </div>

            <div>
              <p>Precisión direccional</p>
              <h3>
                {datos.precision_direccion_porcentaje === null
                  ? 'Sin datos'
                  : `${datos.precision_direccion_porcentaje.toFixed(2)} %`}
              </h3>
              <p style={{ fontSize: 12 }}>
                {datos.aciertos_direccion} aciertos de{' '}
                {datos.total_con_direccion}
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div>
              <p>Evaluaciones completas</p>
              <h3>{datos.total_evaluaciones}</h3>
            </div>

            <div>
              <p>Modelo</p>
              <h3>{datos.modelo}</h3>
            </div>

            <div>
              <p>Activo analizado</p>
              <h3>{datos.activo}</h3>
            </div>
          </div>

          {datos.total_evaluaciones < 30 && (
            <p
              style={{
                color: '#fbbf24',
                fontSize: 13,
                marginTop: 16,
              }}
            >
              Muestra limitada: actualmente existen{' '}
              {datos.total_evaluaciones} evaluaciones.
              Se requieren más observaciones para
              interpretar el desempeño del modelo
              con mayor confianza.
            </p>
          )}

          <p
            style={{
              fontSize: 12,
              opacity: 0.75,
              marginTop: 16,
            }}
          >
            {ultimaConsulta && (
              <>
                Última consulta exitosa:{' '}
                {ultimaConsulta.toLocaleString('es-MX')}.
                {' '}
              </>
            )}
            Actualización automática cada 60 segundos.
          </p>
        </>
      )}

      <p
        style={{
          fontSize: 13,
          opacity: 0.75,
          marginTop: 20,
        }}
      >
        MAE y RMSE miden la magnitud del error.
        El sesgo se calcula como estimado menos
        observado: un valor positivo indica
        sobreestimación promedio. Estas métricas
        son académicas y no representan ganancias
        ni pérdidas reales.
      </p>
    </section>
  )
}

export default MetricasPrecisionLSTM
