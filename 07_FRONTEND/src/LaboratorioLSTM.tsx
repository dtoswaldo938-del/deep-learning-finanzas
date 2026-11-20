import { API_BASE_URL } from './apiConfig'

import { useEffect, useState } from 'react'

const API = `${API_BASE_URL}`

type Metricas = {
  mae: number
  rmse: number
  sesgo: number
  precision_direccional: number | null
}

type Evaluacion = {
  status: string
  tipo: string
  activo: string
  modelo_seleccionado: string
  observaciones_test: number
  metricas: Record<string, Metricas>
  graficas: string[]
  capital_virtual_modificado: boolean
  operaciones_reales: boolean
}

const titulos = [
  'Rendimientos reales frente a predicciones',
  'Errores de predicción en el tiempo',
  'Comparación de MAE y RMSE',
]

export default function LaboratorioLSTM() {
  const [datos, setDatos] = useState<Evaluacion | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function consultar() {
      try {
        const respuesta = await fetch(
          `${API}/api/laboratorio-lstm/evaluacion`
        )

        if (!respuesta.ok) {
          throw new Error('No se pudo consultar el laboratorio')
        }

        const resultado: Evaluacion = await respuesta.json()

        if (
          resultado.status !== 'ok' ||
          resultado.operaciones_reales ||
          resultado.capital_virtual_modificado
        ) {
          throw new Error('Respuesta del laboratorio no válida')
        }

        setDatos(resultado)
        setError('')
      } catch {
        setError('No se pudieron cargar los resultados históricos.')
      } finally {
        setCargando(false)
      }
    }

    consultar()
  }, [])

  const lstm = datos?.metricas['LSTM_32']
  const cero = datos?.metricas['Cero']

  const mejora =
    lstm && cero && cero.rmse > 0
      ? ((cero.rmse - lstm.rmse) / cero.rmse) * 100
      : null

  return (
    <section className="dashboard-card">
      <h2>Laboratorio LSTM — Evaluación histórica</h2>

      <p>
        Comparación académica de una red LSTM experimental
        contra un modelo de referencia que predice
        rendimiento cero.
      </p>

      {cargando && <p>Cargando resultados del laboratorio...</p>}

      {error && (
        <p style={{ color: '#f87171' }}>{error}</p>
      )}

      {datos && lstm && cero && (
        <>
          <p>
            <strong>Activo:</strong> {datos.activo}
            {' | '}
            <strong>Modelo:</strong> {datos.modelo_seleccionado}
            {' | '}
            <strong>Observaciones TEST:</strong>{' '}
            {datos.observaciones_test}
          </p>

          <div style={{ overflowX: 'auto', marginTop: 20 }}>
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Métrica</th>
                  <th>LSTM-32</th>
                  <th>Modelo Cero</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>MAE</td>
                  <td>{lstm.mae.toFixed(8)}</td>
                  <td>{cero.mae.toFixed(8)}</td>
                </tr>

                <tr>
                  <td>RMSE</td>
                  <td>{lstm.rmse.toFixed(8)}</td>
                  <td>{cero.rmse.toFixed(8)}</td>
                </tr>

                <tr>
                  <td>Sesgo</td>
                  <td>{lstm.sesgo.toFixed(8)}</td>
                  <td>{cero.sesgo.toFixed(8)}</td>
                </tr>

                <tr>
                  <td>Precisión direccional</td>
                  <td>
                    {lstm.precision_direccional === null
                      ? 'No disponible'
                      : `${lstm.precision_direccional.toFixed(4)} %`}
                  </td>
                  <td>No aplica</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p style={{ marginTop: 20 }}>
            <strong>Mejora relativa del RMSE:</strong>{' '}
            {mejora === null
              ? 'No disponible'
              : `${mejora.toFixed(4)} %`}
          </p>

          <p style={{ fontSize: 13, opacity: 0.8 }}>
            Una mejora pequeña del RMSE no demuestra
            superioridad general ni garantiza mejores
            predicciones futuras.
          </p>

          <div
            style={{
              display: 'grid',
              gap: 24,
              marginTop: 28,
            }}
          >
            {datos.graficas.map((ruta, indice) => (
              <div key={ruta}>
                <h3>
                  {titulos[indice] ?? 'Gráfica histórica'}
                </h3>

                <img
                  src={`${API}${ruta}`}
                  alt={titulos[indice] ?? 'Gráfica del laboratorio'}
                  style={{
                    display: 'block',
                    width: '100%',
                    maxWidth: 1000,
                    height: 'auto',
                    margin: '12px auto',
                    borderRadius: 12,
                  }}
                />
              </div>
            ))}
          </div>

          <p style={{ fontSize: 13, opacity: 0.8 }}>
            Experimento con datos históricos. No modifica
            las predicciones actuales, la cuenta virtual
            ni realiza operaciones con dinero real.
          </p>
        </>
      )}
    </section>
  )
}
