
import { useEffect, useState } from 'react'

type Prediccion = {
  status: string
  modelo: string
  activo: string
  modo: string
  fecha_emision: string
  fecha_objetivo: string
  rendimiento_estimado: number
  rendimiento_observado: number
  error_absoluto: number
  direccion_estimacion: string
  operaciones_reales: boolean
}

function PrediccionLSTM() {
  const [datos, setDatos] = useState<Prediccion | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function consultarPrediccion() {
      try {
        const respuesta = await fetch(
          'http://127.0.0.1:8001/api/prediccion-lstm'
        )

        if (!respuesta.ok) {
          throw new Error('No se pudo consultar la predicción')
        }

        const resultado: Prediccion = await respuesta.json()

        setDatos(resultado)
        setError('')
      } catch {
        setError('No fue posible conectar con el modelo LSTM-A.')
      } finally {
        setCargando(false)
      }
    }

    consultarPrediccion()
  }, [])

  const porcentaje = (valor: number) =>
    `${(valor * 100).toFixed(4)}%`

  return (
    <section className="dashboard-card">
      <h2>Predicción histórica con LSTM-A</h2>

      <p>
        Inferencia académica utilizando el modelo de
        aprendizaje profundo entrenado previamente.
      </p>

      {cargando && <p>Consultando modelo LSTM-A...</p>}

      {error && (
        <p style={{ color: '#f87171' }}>{error}</p>
      )}

      {datos && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(190px, 1fr))',
              gap: '16px',
              marginTop: '24px',
              textAlign: 'left',
            }}
          >
            <div className="dashboard-card">
              <p>Rendimiento estimado</p>
              <h2>{porcentaje(datos.rendimiento_estimado)}</h2>
            </div>

            <div className="dashboard-card">
              <p>Rendimiento observado</p>
              <h2>{porcentaje(datos.rendimiento_observado)}</h2>
            </div>

            <div className="dashboard-card">
              <p>Error absoluto</p>
              <h2>{datos.error_absoluto.toFixed(10)}</h2>
            </div>

            <div className="dashboard-card">
              <p>Dirección estimada</p>
              <h2>
                {datos.direccion_estimacion === 'subida'
                  ? '↑ Subida'
                  : datos.direccion_estimacion === 'bajada'
                    ? '↓ Bajada'
                    : 'Sin cambio'}
              </h2>
            </div>
          </div>

          <div
            style={{
              marginTop: '24px',
              textAlign: 'left',
              lineHeight: '1.8',
            }}
          >
            <p><strong>Modelo:</strong> {datos.modelo}</p>
            <p><strong>Activo:</strong> {datos.activo}</p>
            <p>
              <strong>Fecha de emisión:</strong>{' '}
              {datos.fecha_emision}
            </p>
            <p>
              <strong>Fecha objetivo:</strong>{' '}
              {datos.fecha_objetivo}
            </p>
            <p>
              <strong>Modalidad:</strong> Evaluación histórica
            </p>
          </div>

          <p
            style={{
              marginTop: '20px',
              fontSize: '13px',
              opacity: 0.8,
            }}
          >
            Resultado retrospectivo con datos históricos.
            No representa un pronóstico actual ni una
            recomendación de inversión. No se ejecutan
            operaciones con dinero real.
          </p>
        </>
      )}
    </section>
  )
}

export default PrediccionLSTM
