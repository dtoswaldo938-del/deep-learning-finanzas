
import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const API_URL =
  'http://127.0.0.1:8001/api/mexc/evaluaciones-lstm'

const COLOR_ESTIMADO = '#38bdf8'
const COLOR_OBSERVADO = '#f59e0b'

type Prediccion = {
  id: number
  fecha_objetivo: string
  estado_evaluacion: string
  rendimiento_estimado_porcentaje: number
  rendimiento_observado_porcentaje: number | null
}

type RespuestaAPI = {
  status: string
  predicciones: Prediccion[]
}

type PuntoGrafica = {
  fecha: string
  estimado: number
  observado: number
}

type BarraComparativa = {
  tipo: string
  rendimiento: number
  color: string
}

function GraficaEvaluacionesLSTM() {
  const [datos, setDatos] = useState<PuntoGrafica[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let montado = true

    async function cargarDatos() {
      try {
        const respuesta = await fetch(API_URL)

        if (!respuesta.ok) {
          throw new Error('Error de conexión con FastAPI')
        }

        const resultado: RespuestaAPI = await respuesta.json()

        if (
          resultado.status !== 'ok' ||
          !Array.isArray(resultado.predicciones)
        ) {
          throw new Error('Respuesta inesperada de FastAPI')
        }

        const puntos = resultado.predicciones
          .filter(
            (prediccion) =>
              prediccion.estado_evaluacion === 'evaluada' &&
              prediccion.rendimiento_observado_porcentaje !== null &&
              Number.isFinite(
                prediccion.rendimiento_estimado_porcentaje
              ) &&
              Number.isFinite(
                prediccion.rendimiento_observado_porcentaje
              )
          )
          .map((prediccion) => ({
            fecha: prediccion.fecha_objetivo,
            estimado:
              prediccion.rendimiento_estimado_porcentaje,
            observado:
              prediccion.rendimiento_observado_porcentaje as number,
          }))
          .sort((a, b) => a.fecha.localeCompare(b.fecha))

        if (montado) {
          setDatos(puntos)
          setError('')
        }
      } catch {
        if (montado) {
          setError(
            'No se pudieron cargar los datos de la gráfica.'
          )
        }
      } finally {
        if (montado) {
          setCargando(false)
        }
      }
    }

    cargarDatos()

    const intervalo = window.setInterval(
      cargarDatos,
      60_000
    )

    return () => {
      montado = false
      window.clearInterval(intervalo)
    }
  }, [])

  const unaEvaluacion = datos.length === 1
  const multiplesEvaluaciones = datos.length >= 2

  const barras: BarraComparativa[] = unaEvaluacion
    ? [
        {
          tipo: 'Estimado LSTM-A',
          rendimiento: datos[0].estimado,
          color: COLOR_ESTIMADO,
        },
        {
          tipo: 'Observado MEXC',
          rendimiento: datos[0].observado,
          color: COLOR_OBSERVADO,
        },
      ]
    : []

  const estiloTooltip = {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#f8fafc',
  }

  return (
    <section className="dashboard-card">
      <h2>Predicción LSTM-A vs. rendimiento observado</h2>

      <p className="evaluaciones-descripcion">
        Comparación de rendimientos porcentuales diarios
        estimados y observados en BTC/USDT.
      </p>

      {cargando && <p>Cargando gráfica...</p>}

      {error && (
        <p className="evaluaciones-error" role="alert">
          {error}
        </p>
      )}

      {!cargando && !error && datos.length === 0 && (
        <p>
          Todavía no hay predicciones evaluadas.
          La gráfica aparecerá cuando exista al menos
          un resultado observado.
        </p>
      )}

      {!error && unaEvaluacion && (
        <>
          <p className="evaluaciones-nota">
            Visualización de barras porque actualmente
            existe una sola predicción evaluada.
            Fecha objetivo: {datos[0].fecha}.
          </p>

          <div style={{ width: '100%', height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barras}
                margin={{
                  top: 20,
                  right: 25,
                  left: 5,
                  bottom: 20,
                }}
              >
                <CartesianGrid
                  stroke="#334155"
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="tipo"
                  stroke="#94a3b8"
                  tick={{ fontSize: 12 }}
                />

                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(valor: number) =>
                    `${valor.toFixed(1)}%`
                  }
                  width={65}
                />

                <Tooltip
                  formatter={(valor) =>
                    `${Number(valor).toFixed(4)} %`
                  }
                  contentStyle={estiloTooltip}
                />

                <ReferenceLine
                  y={0}
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                />

                <Bar
                  dataKey="rendimiento"
                  name="Rendimiento diario"
                  maxBarSize={110}
                  radius={[5, 5, 0, 0]}
                >
                  {barras.map((barra) => (
                    <Cell
                      key={barra.tipo}
                      fill={barra.color}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {!error && multiplesEvaluaciones && (
        <>
          <p className="evaluaciones-nota">
            Visualización temporal de predicciones
            evaluadas, ordenadas por fecha objetivo.
          </p>

          <div style={{ width: '100%', height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={datos}
                margin={{
                  top: 20,
                  right: 25,
                  left: 5,
                  bottom: 20,
                }}
              >
                <CartesianGrid
                  stroke="#334155"
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="fecha"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                />

                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(valor: number) =>
                    `${valor.toFixed(1)}%`
                  }
                  width={65}
                />

                <Tooltip
                  formatter={(valor, nombre) => [
                    `${Number(valor).toFixed(4)} %`,
                    String(nombre),
                  ]}
                  contentStyle={estiloTooltip}
                />

                <Legend />

                <ReferenceLine
                  y={0}
                  stroke="#64748b"
                  strokeDasharray="4 4"
                />

                <Line
                  type="monotone"
                  dataKey="estimado"
                  name="Estimado LSTM-A"
                  stroke={COLOR_ESTIMADO}
                  strokeWidth={2.5}
                  dot={{ r: 5 }}
                  activeDot={{ r: 7 }}
                  connectNulls={false}
                />

                <Line
                  type="monotone"
                  dataKey="observado"
                  name="Observado MEXC"
                  stroke={COLOR_OBSERVADO}
                  strokeWidth={2.5}
                  dot={{ r: 5 }}
                  activeDot={{ r: 7 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {!error && datos.length > 0 && (
        <p className="evaluaciones-nota">
          Predicciones evaluadas: {datos.length}.
          Los resultados son experimentales y
          no representan recomendaciones de inversión.
        </p>
      )}
    </section>
  )
}

export default GraficaEvaluacionesLSTM
