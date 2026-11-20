import { API_BASE_URL } from './apiConfig'

import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const API = `${API_BASE_URL}`

type Politica = {
  politica: string
  capital_final_virtual: string
  rendimiento_total_virtual: string
  cambios_posicion: string
  max_drawdown_virtual: string
}

type Recompensa = {
  episodio: string
  recompensa_tr: string
}

type Configuracion = Record<string, unknown>

const numero = (valor: string | number | undefined) => {
  const resultado = Number(valor)
  return Number.isFinite(resultado) ? resultado : 0
}

const formatoNumero = (valor: number, decimales = 4) =>
  valor.toLocaleString('es-MX', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })

const formatoCapital = (valor: number) =>
  valor.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const formatoPorcentaje = (valor: number) =>
  `${formatoNumero(valor * 100)}%`

function ResultadosCap10() {
  const [politicas, setPoliticas] = useState<Politica[]>([])
  const [recompensas, setRecompensas] = useState<Recompensa[]>([])
  const [configuracion, setConfiguracion] =
    useState<Configuracion | null>(null)

  const [totalTrayectorias, setTotalTrayectorias] =
    useState<number | null>(null)

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function cargarDatos() {
      try {
        const rutas = [
          `${API}/cap10/politicas`,
          `${API}/cap10/recompensas`,
          `${API}/cap10/trayectorias`,
          `${API}/cap10/configuracion`,
        ]

        const respuestas = await Promise.all(
          rutas.map((ruta) => fetch(ruta))
        )

        if (respuestas.some((respuesta) => !respuesta.ok)) {
          throw new Error('Error al consultar el capítulo 10')
        }

        const [
          datosPoliticas,
          datosRecompensas,
          datosTrayectorias,
          datosConfiguracion,
        ] = await Promise.all(
          respuestas.map((respuesta) => respuesta.json())
        )

        setPoliticas(datosPoliticas.politicas ?? [])
        setRecompensas(datosRecompensas.recompensas ?? [])
        setTotalTrayectorias(datosTrayectorias.total ?? 0)
        setConfiguracion(datosConfiguracion.configuracion ?? {})
        setError('')
      } catch {
        setError(
          'No se pudieron cargar los resultados del capítulo 10. ' +
          'Comprueba que FastAPI esté funcionando.'
        )
      } finally {
        setCargando(false)
      }
    }

    cargarDatos()
  }, [])

  const datosRecompensas = recompensas
    .map((fila) => ({
      episodio: numero(fila.episodio),
      recompensa: Number(fila.recompensa_tr),
    }))
    .filter(
      (fila) =>
        Number.isFinite(fila.episodio) &&
        Number.isFinite(fila.recompensa)
    )
    .sort((a, b) => a.episodio - b.episodio)

  const datosCapital = politicas.map((fila) => ({
    politica: fila.politica,
    capital: numero(fila.capital_final_virtual),
  }))

  const politicasOrdenadas = [...politicas].sort(
    (a, b) =>
      numero(b.capital_final_virtual) -
      numero(a.capital_final_virtual)
  )

  if (cargando) {
    return (
      <section className="dashboard-card">
        <h2>Capítulo 10: aprendizaje por refuerzo</h2>
        <p>Cargando experimentos...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="dashboard-card">
        <h2>Capítulo 10: aprendizaje por refuerzo</h2>
        <p style={{ color: '#f87171' }}>{error}</p>
      </section>
    )
  }

  return (
    <>
      {/* INTRODUCCIÓN */}

      <section className="dashboard-card">
        <h2>Capítulo 10: aprendizaje por refuerzo</h2>

        <p>
          Experimento académico de Q-learning y comparación
          de políticas mediante simulaciones históricas.
        </p>

        <p>
          Episodios registrados: {datosRecompensas.length}
        </p>

        <p>
          Registros de trayectorias virtuales:{' '}
          {totalTrayectorias ?? 'No disponible'}
        </p>

        <p>
          Modalidad: simulación con capital virtual.
        </p>
      </section>

      {/* RECOMPENSAS */}

      <section className="dashboard-card">
        <h2>Evolución de las recompensas</h2>

        <p>
          Recompensa registrada durante cada episodio
          de entrenamiento del agente.
        </p>

        {datosRecompensas.length > 0 ? (
          <div style={{ width: '100%', height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datosRecompensas}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="episodio"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tick={{ fontSize: 12 }}
                />

                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 12 }}
                  width={75}
                />

                <Tooltip />

                <Legend />

                <ReferenceLine
                  y={0}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                />

                <Line
                  type="monotone"
                  dataKey="recompensa"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={false}
                  name="Recompensa de entrenamiento"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p>No hay recompensas disponibles.</p>
        )}

        <p style={{ fontSize: 14 }}>
          Las recompensas pueden fluctuar entre episodios.
          Su evolución no garantiza una política rentable.
        </p>
      </section>

      {/* COMPARACIÓN DE POLÍTICAS */}

      <section className="dashboard-card">
        <h2>Comparación de políticas</h2>

        <p>
          Capital final virtual de cada política
          en el experimento de validación histórica.
        </p>

        {datosCapital.length > 0 && (
          <div style={{ width: '100%', height: 380 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={datosCapital}
                margin={{
                  top: 15,
                  right: 15,
                  bottom: 45,
                  left: 10,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="politica"
                  interval={0}
                  tick={{ fontSize: 11 }}
                  angle={-12}
                  textAnchor="end"
                  height={75}
                />

                <YAxis
                  domain={[0, 'auto']}
                  width={90}
                  tickFormatter={(valor) =>
                    formatoCapital(Number(valor))
                  }
                />

                <Tooltip />

                <Bar
                  dataKey="capital"
                  fill="#38bdf8"
                  name="Capital final virtual"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Política</th>
                <th>Capital final</th>
                <th>Rendimiento</th>
                <th>Cambios de posición</th>
                <th>Drawdown máximo</th>
              </tr>
            </thead>

            <tbody>
              {politicasOrdenadas.map((fila) => (
                <tr key={fila.politica}>
                  <td>{fila.politica}</td>

                  <td>
                    {formatoCapital(
                      numero(fila.capital_final_virtual)
                    )}
                  </td>

                  <td>
                    {formatoPorcentaje(
                      numero(fila.rendimiento_total_virtual)
                    )}
                  </td>

                  <td>{fila.cambios_posicion}</td>

                  <td>
                    {formatoPorcentaje(
                      numero(fila.max_drawdown_virtual)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {politicasOrdenadas.length > 0 && (
          <p style={{ marginTop: 20 }}>
            <strong>
              Mayor capital final en esta simulación:
            </strong>{' '}
            {politicasOrdenadas[0].politica}
          </p>
        )}

        <p style={{ fontSize: 14 }}>
          Los resultados corresponden exclusivamente
          al periodo histórico evaluado.
          No constituyen rendimientos garantizados.
        </p>
      </section>

      {/* CONFIGURACIÓN */}

      <section className="dashboard-card">
        <h2>Configuración del experimento</h2>

        <p>
          Parámetros guardados durante la ejecución
          del capítulo 10.
        </p>

        {configuracion && (
          <pre
            style={{
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              background: '#111827',
              color: '#e2e8f0',
              padding: '20px',
              borderRadius: '10px',
              fontSize: '13px',
              lineHeight: 1.7,
              overflowX: 'auto',
            }}
          >
            {JSON.stringify(configuracion, null, 2)}
          </pre>
        )}
      </section>
    </>
  )
}

export default ResultadosCap10
