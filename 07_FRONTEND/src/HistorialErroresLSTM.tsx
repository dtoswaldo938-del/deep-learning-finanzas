import { API_BASE_URL } from './apiConfig'

import { useEffect, useState } from 'react'

import {
  CartesianGrid,
  Line,
  LineChart,
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
  escenarios: Escenario[]
  operaciones_reales: boolean
  saldo_sqlite_modificado: boolean
}

type PuntoHistorico = {
  fecha: string
  diferencia: number
}

const API_URL =
  `${API_BASE_URL}/api/simulador/escenarios-lstm`

const INTERVALO_ACTUALIZACION = 60000

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

  return `${partes[2]}/${partes[1]}`
}

function HistorialErroresLSTM() {
  const [datos, setDatos] = useState<PuntoHistorico[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [ultimaConsulta, setUltimaConsulta] =
    useState<Date | null>(null)

  useEffect(() => {
    let activo = true
    let consultando = false

    async function consultarHistorial() {
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

        const resultado: RespuestaAPI =
          await respuesta.json()

        if (
          resultado.status !== 'ok' ||
          resultado.operaciones_reales !== false ||
          resultado.saldo_sqlite_modificado !== false ||
          !Array.isArray(resultado.escenarios)
        ) {
          throw new Error(
            'Respuesta inesperada de FastAPI.'
          )
        }

        const puntos: PuntoHistorico[] =
          resultado.escenarios
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
            'No se pudo consultar el historial de errores.'
          )
        }
      } finally {
        consultando = false

        if (activo) {
          setCargando(false)
        }
      }
    }

    // Primera consulta al abrir el componente.
    void consultarHistorial()

    // Actualización automática cada 60 segundos.
    const intervalo = window.setInterval(() => {
      void consultarHistorial()
    }, INTERVALO_ACTUALIZACION)

    // Limpieza al desmontar el componente.
    return () => {
      activo = false
      window.clearInterval(intervalo)
    }
  }, [])

  return (
    <section className="dashboard-card">
      <h2>
        Historial de diferencias del simulador LSTM-A
      </h2>

      <p>
        Evolución temporal de la diferencia entre
        resultados hipotéticos observados y estimados.
      </p>

      {cargando && (
        <p>Consultando historial de errores...</p>
      )}

      {error && (
        <p style={{ color: '#f87171' }}>
          {error}
        </p>
      )}

      {!cargando && !error && datos.length === 0 && (
        <p>
          Todavía no existen evaluaciones disponibles.
        </p>
      )}

      {datos.length > 0 && (
        <>
          <div
            style={{
              width: '100%',
              height: 340,
              marginTop: 24,
            }}
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={datos}
                margin={{
                  top: 20,
                  right: 20,
                  left: 10,
                  bottom: 10,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                />

                <XAxis
                  dataKey="fecha"
                  stroke="#94a3b8"
                  tickFormatter={formatoFecha}
                />

                <YAxis
                  stroke="#94a3b8"
                  tickFormatter={(valor: number) =>
                    `$${valor}`
                  }
                  domain={[
                    (minimo: number) =>
                      Math.min(minimo, 0) - 50,
                    (maximo: number) =>
                      Math.max(maximo, 0) + 50,
                  ]}
                />

                <Tooltip
                  formatter={(valor) =>
                    formatoDinero(Number(valor))
                  }
                  labelFormatter={(fecha) =>
                    `Fecha: ${String(fecha)}`
                  }
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: 8,
                    color: '#e2e8f0',
                  }}
                />

                <ReferenceLine
                  y={0}
                  stroke="#cbd5e1"
                />

                <Line
                  type="monotone"
                  dataKey="diferencia"
                  name="Diferencia (MXN)"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  dot={{
                    r: 6,
                    fill: '#38bdf8',
                    stroke: '#e2e8f0',
                    strokeWidth: 1,
                  }}
                  activeDot={{
                    r: 8,
                  }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {datos.length === 1 && (
            <p
              style={{
                textAlign: 'center',
                fontSize: 13,
                opacity: 0.8,
              }}
            >
              Actualmente existe una sola evaluación.
              Se necesitan al menos dos puntos para
              visualizar una línea histórica.
            </p>
          )}

          <p
            style={{
              fontSize: 12,
              opacity: 0.75,
              marginTop: 20,
            }}
          >
            Evaluaciones representadas: {datos.length}.
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
        Diferencia = resultado observado hipotético
        menos resultado estimado. Los valores no
        representan ganancias o pérdidas reales
        y no modifican el capital virtual.
      </p>
    </section>
  )
}

export default HistorialErroresLSTM
