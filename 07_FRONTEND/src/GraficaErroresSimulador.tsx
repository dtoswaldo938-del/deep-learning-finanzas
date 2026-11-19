
import { useEffect, useState } from 'react'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Escenario = {
  prediccion_id: number
  fecha_objetivo: string
  estado: string
  resultado_estimado_mxn: number
  resultado_observado_hipotetico_mxn: number | null
}

type RespuestaAPI = {
  status: string
  modo: string
  moneda: string
  total_escenarios: number
  escenarios: Escenario[]
  operaciones_reales: boolean
  saldo_sqlite_modificado: boolean
}

type PuntoGrafica = {
  fecha: string
  estimado: number
  observado: number
  diferencia: number
}

const API_URL =
  'http://127.0.0.1:8001/api/simulador/escenarios-lstm'

const INTERVALO_ACTUALIZACION = 60000

const COLOR_ESTIMADO = '#38bdf8'
const COLOR_OBSERVADO = '#f59e0b'

const formatoDinero = (valor: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor)

const formatoFecha = (fecha: string) => {
  const partes = fecha.split('-')

  if (partes.length !== 3) {
    return fecha
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function GraficaErroresSimulador() {
  const [datos, setDatos] = useState<PuntoGrafica[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [ultimaConsulta, setUltimaConsulta] =
    useState<Date | null>(null)

  useEffect(() => {
    let activo = true
    let consultando = false

    async function consultarDatos() {
      if (consultando) {
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

        const resultado: RespuestaAPI =
          await respuesta.json()

        if (
          resultado.status !== 'ok' ||
          resultado.operaciones_reales !== false ||
          resultado.saldo_sqlite_modificado !== false ||
          !Array.isArray(resultado.escenarios)
        ) {
          throw new Error('Respuesta inesperada de FastAPI.')
        }

        const puntos = resultado.escenarios
          .filter(
            (escenario) =>
              escenario.estado === 'evaluado' &&
              escenario.resultado_observado_hipotetico_mxn
                !== null &&
              Number.isFinite(
                escenario.resultado_estimado_mxn
              ) &&
              Number.isFinite(
                escenario.resultado_observado_hipotetico_mxn
              )
          )
          .map((escenario) => {
            const estimado =
              escenario.resultado_estimado_mxn

           const observado = Number(
  escenario.resultado_observado_hipotetico_mxn
)

            return {
              fecha: escenario.fecha_objetivo,
              estimado,
              observado,
              diferencia: Number(
                (observado - estimado).toFixed(2)
              ),
            }
          })
          .sort((a, b) =>
            a.fecha.localeCompare(b.fecha)
          )

        if (activo) {
          setDatos(puntos)
          setError('')
          setUltimaConsulta(new Date())
        }
      } catch {
        if (activo) {
          setError(
            'No se pudieron consultar los datos de la gráfica.'
          )
        }
      } finally {
        consultando = false

        if (activo) {
          setCargando(false)
        }
      }
    }

    void consultarDatos()

    const intervalo = window.setInterval(() => {
      void consultarDatos()
    }, INTERVALO_ACTUALIZACION)

    return () => {
      activo = false
      window.clearInterval(intervalo)
    }
  }, [])

  const ultimaEvaluacion =
    datos.length > 0
      ? datos[datos.length - 1]
      : null

  const barras = ultimaEvaluacion
    ? [
        {
          nombre: 'Estimado',
          resultado: ultimaEvaluacion.estimado,
          color: COLOR_ESTIMADO,
        },
        {
          nombre: 'Observado',
          resultado: ultimaEvaluacion.observado,
          color: COLOR_OBSERVADO,
        },
      ]
    : []

  return (
    <section className="dashboard-card">
      <h2>Gráfica de errores del simulador LSTM-A</h2>

      <p>
        Comparación del resultado hipotético estimado
        frente al observado en el escenario evaluado
        más reciente.
      </p>

      {cargando && (
        <p>Consultando datos de la gráfica...</p>
      )}

      {error && (
        <p style={{ color: '#f87171' }}>
          {error}
        </p>
      )}

      {!cargando && !error && datos.length === 0 && (
        <p>
          Todavía no existen escenarios evaluados
          para construir la gráfica.
        </p>
      )}

      {ultimaEvaluacion && (
        <>
          <p>
            <strong>Fecha objetivo:</strong>{' '}
            {formatoFecha(ultimaEvaluacion.fecha)}
          </p>

          <div
            style={{
              width: '100%',
              height: 340,
              marginTop: 24,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barras}
                margin={{
                  top: 15,
                  right: 15,
                  left: 10,
                  bottom: 10,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                />

                <XAxis
                  dataKey="nombre"
                  stroke="#94a3b8"
                />

                <YAxis
                  stroke="#94a3b8"
                  tickFormatter={(valor: number) =>
                    `$${valor}`
                  }
                />

                <Tooltip
                  formatter={(valor) =>
                    formatoDinero(Number(valor))
                  }
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: 8,
                    color: '#e2e8f0',
                  }}
                />

                <Legend />

                <ReferenceLine
                  y={0}
                  stroke="#cbd5e1"
                />

                <Bar
                  dataKey="resultado"
                  name="Resultado hipotético (MXN)"
                  radius={[4, 4, 0, 0]}
                >
                  {barras.map((barra) => (
                    <Cell
                      key={barra.nombre}
                      fill={barra.color}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16,
              marginTop: 20,
            }}
          >
            <div>
              <p>Resultado estimado</p>
              <h3>
                {formatoDinero(
                  ultimaEvaluacion.estimado
                )}
              </h3>
            </div>

            <div>
              <p>Resultado observado</p>
              <h3>
                {formatoDinero(
                  ultimaEvaluacion.observado
                )}
              </h3>
            </div>

            <div>
              <p>Diferencia</p>
              <h3>
                {formatoDinero(
                  ultimaEvaluacion.diferencia
                )}
              </h3>
            </div>
          </div>

          <p
            style={{
              fontSize: 12,
              opacity: 0.75,
              marginTop: 20,
            }}
          >
            Escenarios evaluados disponibles: {datos.length}.
            {' '}
            {ultimaConsulta && (
              <>
                Última consulta exitosa:{' '}
                {ultimaConsulta.toLocaleString('es-MX')}.
              </>
            )}
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
        Visualización académica. Los resultados se
        calculan con capital ficticio y no representan
        operaciones reales. La diferencia mostrada
        corresponde al resultado observado menos
        el resultado estimado.
      </p>
    </section>
  )
}

export default GraficaErroresSimulador
