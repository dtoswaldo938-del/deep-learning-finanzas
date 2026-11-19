
import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Modelo = {
  modelo: string
  mae: number
  rmse: number
  desv_rmse: number | null
}

function ComparacionModelos() {
  const [modelos, setModelos] = useState<Modelo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function cargarModelos() {
      try {
        const respuesta = await fetch(
          'http://127.0.0.1:8001/modelos/comparacion'
        )

        if (!respuesta.ok) {
          throw new Error('Error al consultar los modelos')
        }

        const datos = await respuesta.json()

        if (datos.status !== 'ok') {
          throw new Error(datos.mensaje || 'Datos no disponibles')
        }

        setModelos(datos.modelos)
      } catch {
        setError('No se pudo cargar la comparación de modelos.')
      } finally {
        setCargando(false)
      }
    }

    cargarModelos()
  }, [])

  return (
    <section className="dashboard-card">
      <h2>Comparación de modelos predictivos</h2>

      <p>
        Resultados del capítulo 8.
        Evaluación sobre el conjunto de validación.
      </p>

      {cargando && <p>Cargando resultados...</p>}

      {error && <p style={{ color: '#f87171' }}>{error}</p>}

      {!cargando && !error && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Posición</th>
                  <th>Modelo</th>
                  <th>MAE</th>
                  <th>RMSE</th>
                  <th>Desv. RMSE</th>
                </tr>
              </thead>

              <tbody>
                {modelos.map((modelo, indice) => (
                  <tr key={`${modelo.modelo}-${indice}`}>
                    <td>{indice + 1}</td>
                    <td>{modelo.modelo}</td>
                    <td>{modelo.mae.toFixed(10)}</td>
                    <td>{modelo.rmse.toFixed(10)}</td>
                    <td>
                      {modelo.desv_rmse === null
                        ? 'No disponible'
                        : modelo.desv_rmse.toExponential(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>


<h3>Comparación visual del RMSE</h3>

<p>
  Menor RMSE significa menor error de predicción
  en el conjunto de validación.
</p>

<div style={{ width: '100%', height: 330 }}>
  <ResponsiveContainer width="100%" height="100%">
    <BarChart
      data={modelos.map((modelo) => ({
        nombre: modelo.modelo.startsWith('LSTM')
          ? 'LSTM'
          : modelo.modelo.startsWith('MLP')
            ? 'MLP'
            : modelo.modelo,
        rmse: modelo.rmse,
      }))}
      margin={{ top: 20, right: 25, left: 15, bottom: 20 }}
    >
      <CartesianGrid strokeDasharray="3 3" />

      <XAxis dataKey="nombre" />

      <YAxis
        domain={[0, 'auto']}
        tickFormatter={(valor: number) => valor.toFixed(3)}
      />

      <Tooltip
        formatter={(valor) =>
          Number(valor).toFixed(10)
        }
      />

      <Bar
        dataKey="rmse"
        name="RMSE validación"
        fill="#38bdf8"
        radius={[6, 6, 0, 0]}
      />
    </BarChart>
  </ResponsiveContainer>
</div>


          {modelos.length > 0 && (
            <p style={{ marginTop: '20px' }}>
              <strong>Menor RMSE de validación:</strong>{' '}
              {modelos[0].modelo}
            </p>
          )}

          <p>
            Un error menor indica mejores resultados predictivos
            en este conjunto de datos. Estos resultados no
            representan rentabilidad financiera.
          </p>
        </>
      )}
    </section>
  )
}

export default ComparacionModelos
