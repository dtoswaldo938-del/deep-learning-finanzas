
import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Resultado = {
  modelo: string
  mae: string
  rmse: string
  seleccionado_en_va?: string
}

type Protocolo = {
  modelo_seleccionado: string
  metrica_seleccion: string
  n_train: number
  n_val: number
  n_test: number
  seed: number
  indicadores: string[]
  caracteristicas_base: string[]
  regla: string
}

type DatosResultados = {
  status: string
  resultados: Resultado[]
}

type DatosProtocolo = {
  status: string
  protocolo: Protocolo
}

const API = 'http://127.0.0.1:8001'

function nombreModelo(nombre: string) {
  const nombres: Record<string, string> = {
    Cero: 'Pronóstico cero',
    Lineal_20lags: 'Regresión lineal',
    Ridge_indicadores: 'Ridge + indicadores',
    LSTM_A: 'LSTM-A',
  }

  return nombres[nombre] ?? nombre
}

function ResultadosCap11() {
  const [validacion, setValidacion] = useState<Resultado[]>([])
  const [evaluacion, setEvaluacion] = useState<Resultado[]>([])
  const [protocolo, setProtocolo] = useState<Protocolo | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function cargarDatos() {
      try {
        const respuestas = await Promise.all([
          fetch(`${API}/cap11/validacion`),
          fetch(`${API}/cap11/evaluacion`),
          fetch(`${API}/cap11/protocolo`),
        ])

        if (respuestas.some((respuesta) => !respuesta.ok)) {
          throw new Error('Error al consultar el capítulo 11')
        }

        const [datosVA, datosTE, datosProtocolo] =
          (await Promise.all(
            respuestas.map((respuesta) => respuesta.json())
          )) as [DatosResultados, DatosResultados, DatosProtocolo]

        if (
          datosVA.status !== 'ok' ||
          datosTE.status !== 'ok' ||
          datosProtocolo.status !== 'ok' ||
          !Array.isArray(datosVA.resultados) ||
          !Array.isArray(datosTE.resultados) ||
          !datosProtocolo.protocolo
        ) {
          throw new Error('Formato de respuesta incorrecto')
        }

        setValidacion(datosVA.resultados)
        setEvaluacion(datosTE.resultados)
        setProtocolo(datosProtocolo.protocolo)
        setError('')
      } catch {
        setError('No se pudieron cargar los resultados del capítulo 11.')
      } finally {
        setCargando(false)
      }
    }

    cargarDatos()
  }, [])

  const datosGrafica = evaluacion.map((resultado) => {
    const filaVA = validacion.find(
      (fila) => fila.modelo === resultado.modelo
    )

    return {
      modelo: nombreModelo(resultado.modelo),
      codigo: resultado.modelo,
      validacion: filaVA ? Number(filaVA.rmse) : null,
      test: Number(resultado.rmse),
    }
  })

  const rmseCero = evaluacion.find(
    (fila) => fila.modelo === 'Cero'
  )

  const rmseLstm = evaluacion.find(
    (fila) => fila.modelo === 'LSTM_A'
  )

  const ceroMejorEnTest =
    rmseCero &&
    rmseLstm &&
    Number(rmseCero.rmse) < Number(rmseLstm.rmse)

  return (
    <>
      <section className="dashboard-card">
        <h2>Capítulo 11: evaluación final de modelos</h2>

        <p>
          Comparación de cuatro modelos mediante validación
          temporal y una evaluación final sobre datos reservados.
        </p>

        {cargando && <p>Cargando evaluación final...</p>}

        {error && (
          <p style={{ color: '#f87171' }}>{error}</p>
        )}

        {!cargando && !error && (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Modelo</th>
                    <th>MAE TEST</th>
                    <th>RMSE TEST</th>
                    <th>Seleccionado en VA</th>
                  </tr>
                </thead>

                <tbody>
                  {evaluacion.map((fila) => (
                    <tr key={fila.modelo}>
                      <td>{nombreModelo(fila.modelo)}</td>

                      <td>{Number(fila.mae).toFixed(10)}</td>

                      <td>{Number(fila.rmse).toFixed(10)}</td>

                      <td>
                        {fila.modelo === protocolo?.modelo_seleccionado
                          ? 'Sí'
                          : 'No'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p style={{ marginTop: 20 }}>
              <strong>Modelo seleccionado en validación:</strong>{' '}
              {nombreModelo(protocolo?.modelo_seleccionado ?? '')}
            </p>

            {ceroMejorEnTest && (
              <p>
                En la evaluación final, el pronóstico cero obtuvo
                un RMSE ligeramente menor que LSTM-A. La selección
                de LSTM-A se realizó previamente utilizando
                exclusivamente los resultados de validación.
              </p>
            )}

            <p style={{ fontSize: 13 }}>
              Los resultados de TEST se presentan sin reentrenar
              modelos ni ajustar parámetros después de la
              evaluación final.
            </p>
          </>
        )}
      </section>

      {!cargando && !error && (
        <section className="dashboard-card">
          <h2>Comparación de RMSE: validación vs. TEST</h2>

          <p>
            Un RMSE menor representa un error de predicción
            más bajo en el conjunto correspondiente.
          </p>

          <div style={{ width: '100%', height: 420 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={datosGrafica}
                margin={{
                  top: 20,
                  right: 20,
                  left: 10,
                  bottom: 35,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="modelo"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={75}
                />

                <YAxis
                  domain={[0, 'auto']}
                  width={80}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(valor: number) =>
                    valor.toFixed(3)
                  }
                />

                <Tooltip
                  formatter={(valor) =>
                    Number(valor).toFixed(10)
                  }
                />

                <Legend verticalAlign="top" height={36} />

                <Bar
                  dataKey="validacion"
                  name="RMSE validación"
                  fill="#a78bfa"
                />

                <Bar
                  dataKey="test"
                  name="RMSE TEST"
                  fill="#38bdf8"
                >
                  {datosGrafica.map((dato) => (
                    <Cell
                      key={dato.codigo}
                      fill={
                        dato.codigo === protocolo?.modelo_seleccionado
                          ? '#34d399'
                          : '#38bdf8'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p style={{ fontSize: 13 }}>
            La barra verde identifica al modelo seleccionado
            antes de evaluar el conjunto TEST.
            Las diferencias de error son pequeñas y deben
            interpretarse con precaución.
          </p>
        </section>
      )}

      {!cargando && !error && protocolo && (
        <section className="dashboard-card">
          <h2>Protocolo congelado del experimento</h2>

          <p>
            Configuración registrada antes de la evaluación
            final del capítulo 11.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className="dashboard-table">
              <tbody>
                <tr>
                  <th>Entrenamiento</th>
                  <td>{protocolo.n_train} observaciones</td>
                </tr>

                <tr>
                  <th>Validación</th>
                  <td>{protocolo.n_val} observaciones</td>
                </tr>

                <tr>
                  <th>Prueba final</th>
                  <td>{protocolo.n_test} observaciones</td>
                </tr>

                <tr>
                  <th>Modelo seleccionado</th>
                  <td>
                    {nombreModelo(protocolo.modelo_seleccionado)}
                  </td>
                </tr>

                <tr>
                  <th>Métrica de selección</th>
                  <td>{protocolo.metrica_seleccion}</td>
                </tr>

                <tr>
                  <th>Semilla</th>
                  <td>{protocolo.seed}</td>
                </tr>

                <tr>
                  <th>Características base</th>
                  <td>{protocolo.caracteristicas_base.length}</td>
                </tr>

                <tr>
                  <th>Indicadores técnicos</th>
                  <td>{protocolo.indicadores.join(', ')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p style={{ marginTop: 20 }}>
            <strong>Regla del experimento:</strong>{' '}
            {protocolo.regla}
          </p>
        </section>
      )}
    </>
  )
}

export default ResultadosCap11
