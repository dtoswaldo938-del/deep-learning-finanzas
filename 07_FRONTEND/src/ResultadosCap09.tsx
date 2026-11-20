import { API_BASE_URL } from './apiConfig'

import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const API = `${API_BASE_URL}`

type Modelo = {
  modelo: string
  rmse_promedio: string
  rmse_desv: string
  mae_promedio: string
}

type Fold = {
  fold: string
  modelo: string
  mae: string
  rmse: string
  mejor_epoca_lstm?: string
}

type Simulacion = {
  modelo: string
  capital_inicial: string
  capital_final_virtual: string
  rendimiento_total_virtual: string
  cambios_posicion: string
  max_drawdown_virtual: string
}

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
  `${formatoNumero(valor * 100, 4)}%`

function ResultadosCap09() {
  const [modelos, setModelos] = useState<Modelo[]>([])
  const [folds, setFolds] = useState<Fold[]>([])
  const [simulaciones, setSimulaciones] = useState<Simulacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function cargarResultados() {
      try {
        const rutas = [
          `${API}/cap09/modelos`,
          `${API}/cap09/folds`,
          `${API}/cap09/simulacion`,
        ]

        const respuestas = await Promise.all(
          rutas.map((ruta) => fetch(ruta))
        )

        if (respuestas.some((respuesta) => !respuesta.ok)) {
          throw new Error('Error al consultar los resultados')
        }

        const [datosModelos, datosFolds, datosSimulacion] =
          await Promise.all(
            respuestas.map((respuesta) => respuesta.json())
          )

        setModelos(datosModelos.modelos ?? [])
        setFolds(datosFolds.folds ?? [])
        setSimulaciones(datosSimulacion.resultados ?? [])
        setError('')
      } catch {
        setError(
          'No se pudieron cargar los resultados del capítulo 9. ' +
          'Comprueba que el backend esté encendido.'
        )
      } finally {
        setCargando(false)
      }
    }

    cargarResultados()
  }, [])

  const modelosOrdenados = [...modelos].sort(
    (a, b) =>
      numero(a.rmse_promedio) - numero(b.rmse_promedio)
  )

  const mejorModelo = modelosOrdenados[0]

  const nombresFolds = [...new Set(
    folds.map((fila) => numero(fila.fold))
  )].sort((a, b) => a - b)

  const datosFolds = nombresFolds.map((fold) => {
    const resultado: Record<string, string | number> = {
      fold: `Fold ${fold}`,
    }

    folds
      .filter((fila) => numero(fila.fold) === fold)
      .forEach((fila) => {
        resultado[fila.modelo] = numero(fila.rmse)
      })

    return resultado
  })

  const nombresModelos = [...new Set(
    folds.map((fila) => fila.modelo)
  )]

  const datosCapital = simulaciones.map((fila) => ({
    modelo: fila.modelo,
    capital: numero(fila.capital_final_virtual),
  }))

  if (cargando) {
    return (
      <section className="dashboard-card">
        <h2>Resultados del capítulo 9</h2>
        <p>Cargando resultados...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="dashboard-card">
        <h2>Resultados del capítulo 9</h2>
        <p style={{ color: '#f87171' }}>{error}</p>
      </section>
    )
  }

  return (
    <>
      {/* COMPARACIÓN DE MODELOS */}

      <section className="dashboard-card">
        <h2>Capítulo 9: validación temporal</h2>

        <p>
          Comparación de modelos mediante ventanas
          expansivas y evaluación histórica.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Posición</th>
                <th>Modelo</th>
                <th>RMSE promedio</th>
                <th>Desv. RMSE</th>
                <th>MAE promedio</th>
              </tr>
            </thead>

            <tbody>
              {modelosOrdenados.map((modelo, indice) => (
                <tr key={modelo.modelo}>
                  <td>{indice + 1}</td>
                  <td>{modelo.modelo}</td>
                  <td>
                    {formatoNumero(
                      numero(modelo.rmse_promedio),
                      10
                    )}
                  </td>
                  <td>
                    {formatoNumero(
                      numero(modelo.rmse_desv),
                      10
                    )}
                  </td>
                  <td>
                    {formatoNumero(
                      numero(modelo.mae_promedio),
                      10
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {mejorModelo && (
          <p style={{ marginTop: 20 }}>
            <strong>Menor RMSE promedio:</strong>{' '}
            {mejorModelo.modelo}
          </p>
        )}
      </section>

      {/* RMSE POR FOLD */}

      <section className="dashboard-card">
        <h2>Comparación del RMSE por fold</h2>

        <p>
          Evaluación de los modelos en tres ventanas
          temporales. Un RMSE menor indica un error
          predictivo más bajo.
        </p>

        {datosFolds.length > 0 && (
          <div style={{ width: '100%', height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datosFolds}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="fold" />

                <YAxis
                  domain={['auto', 'auto']}
                  width={80}
                  tickFormatter={(valor) =>
                    Number(valor).toFixed(4)
                  }
                />

                <Tooltip
                  formatter={(valor, nombre) => [
                    formatoNumero(Number(valor), 10),
                    String(nombre),
                  ]}
                />

                <Legend />

                {nombresModelos.map((nombre, indice) => {
                  const colores = [
                    '#38bdf8',
                    '#a78bfa',
                    '#fbbf24',
                    '#34d399',
                  ]

                  return (
                    <Line
                      key={nombre}
                      type="monotone"
                      dataKey={nombre}
                      stroke={colores[indice % colores.length]}
                      strokeWidth={3}
                      dot={{ r: 5 }}
                      name={nombre}
                      connectNulls={false}
                    />
                  )
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <p>
          Los folds respetan el orden temporal.
          Estos resultados corresponden a validación
          histórica, no a predicciones futuras garantizadas.
        </p>
      </section>

      {/* SIMULACIÓN VIRTUAL */}

      <section className="dashboard-card">
        <h2>Simulación histórica con capital virtual</h2>

        <p>
          Comparación del capital final obtenido por
          cada estrategia en el experimento académico.
        </p>

        {datosCapital.length > 0 && (
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosCapital}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="modelo" />

                <YAxis
                  domain={[0, 'auto']}
                  width={90}
                  tickFormatter={(valor) =>
                    formatoCapital(Number(valor))
                  }
                />

                <Tooltip
                  formatter={(valor) => [
                    `${formatoCapital(Number(valor))} USDT`,
                    'Capital final virtual',
                  ]}
                />

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
                <th>Modelo</th>
                <th>Capital inicial</th>
                <th>Capital final</th>
                <th>Rendimiento</th>
                <th>Cambios de posición</th>
                <th>Drawdown máximo</th>
              </tr>
            </thead>

            <tbody>
              {simulaciones.map((fila) => (
                <tr key={fila.modelo}>
                  <td>{fila.modelo}</td>

                  <td>
                    {formatoCapital(
                      numero(fila.capital_inicial)
                    )}
                  </td>

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

        <p style={{ marginTop: 20, fontSize: 14 }}>
          Simulación exclusivamente académica.
          Se utiliza capital virtual y datos históricos.
          No se realizan operaciones con dinero real.
        </p>
      </section>
    </>
  )
}

export default ResultadosCap09
