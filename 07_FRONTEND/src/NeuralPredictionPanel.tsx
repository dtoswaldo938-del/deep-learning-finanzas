
import { useEffect, useState } from 'react'
import './NeuralPredictionPanel.css'

type Prediccion = {
  id: number
  fecha_emision: string
  fecha_objetivo: string
  rendimiento_estimado_porcentaje: number
  direccion_estimacion: string
  estado_evaluacion: string
  rendimiento_observado_porcentaje: number | null
  direccion_correcta: boolean | null
}

type RespuestaEvaluaciones = {
  status: string
  modelo: string
  activo: string
  resumen: {
    total_predicciones: number
    total_evaluadas: number
    total_pendientes: number
    aciertos_direccion: number
    precision_direccion_porcentaje: number
  }
  predicciones: Prediccion[]
}

const API = 'http://127.0.0.1:8001'

export default function NeuralPredictionPanel() {
  const [datos, setDatos] =
    useState<RespuestaEvaluaciones | null>(null)

  const [error, setError] = useState(false)

  useEffect(() => {
    let activo = true

    async function consultarPredicciones() {
      try {
        const respuesta = await fetch(
          `${API}/api/mexc/evaluaciones-lstm`,
          { cache: 'no-store' }
        )

        if (!respuesta.ok) {
          throw new Error('Error de API')
        }

        const resultado: RespuestaEvaluaciones =
          await respuesta.json()

        if (activo) {
          setDatos(resultado)
          setError(false)
        }
      } catch {
        if (activo) setError(true)
      }
    }

    void consultarPredicciones()

    const intervalo = window.setInterval(
      consultarPredicciones,
      60000
    )

    return () => {
      activo = false
      window.clearInterval(intervalo)
    }
  }, [])

  const prediccion = datos?.predicciones?.[0]

  const porcentaje =
    prediccion?.rendimiento_estimado_porcentaje ?? null

  const formatearFecha = (fecha: string) => {
    const partes = fecha.split('-')

    if (partes.length !== 3) return fecha

    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }

  return (
    <section className="neural-prediction-panel">
      <div className="neural-prediction-heading">
        <div>
          <span className="neural-prediction-eyebrow">
            AI INFERENCE / DAILY HORIZON
          </span>

          <h3>LSTM Intelligence</h3>

          <p>
            Predicciones experimentales generadas
            por el modelo LSTM-A.
          </p>
        </div>

        <span className="neural-prediction-model">
          LSTM-A
        </span>
      </div>

      {error && (
        <p className="neural-prediction-error">
          No fue posible consultar las predicciones.
        </p>
      )}

      {!datos && !error && (
        <p className="neural-prediction-loading">
          Loading neural inference...
        </p>
      )}

      {datos && !prediccion && (
        <p className="neural-prediction-loading">
          No hay predicciones registradas.
        </p>
      )}

      {prediccion && (
        <>
          <div className="neural-prediction-main">
            <div>
              <span>EXPECTED DAILY RETURN</span>

              <strong
                className={
                  porcentaje !== null && porcentaje >= 0
                    ? 'prediction-up'
                    : 'prediction-down'
                }
              >
                {porcentaje === null
                  ? '---'
                  : `${porcentaje > 0 ? '+' : ''}${porcentaje.toFixed(4)}%`}
              </strong>

              <small>
                Dirección estimada:{' '}
                {prediccion.direccion_estimacion}
              </small>
            </div>

            <div className="neural-prediction-state">
              <span>STATUS</span>

              <strong>
                {prediccion.estado_evaluacion === 'pendiente'
                  ? 'PENDING EVALUATION'
                  : 'EVALUATED'}
              </strong>
            </div>
          </div>

          <div className="neural-prediction-details">
            <div>
              <span>ISSUED</span>
              <strong>
                {formatearFecha(prediccion.fecha_emision)}
              </strong>
            </div>

            <div>
              <span>TARGET DATE</span>
              <strong>
                {formatearFecha(prediccion.fecha_objetivo)}
              </strong>
            </div>

            <div>
              <span>RECORDED PREDICTIONS</span>
              <strong>
                {datos?.resumen.total_predicciones ?? 0}
              </strong>
            </div>

            <div>
              <span>EVALUATED</span>
              <strong>
                {datos?.resumen.total_evaluadas ?? 0}
              </strong>
            </div>
          </div>
        </>
      )}

      <p className="neural-prediction-disclaimer">
        Experimental daily prediction based on historical
        market data. Market prices update every second,
        but LSTM predictions follow a daily horizon.
        Virtual simulation only. No real trading.
      </p>
    </section>
  )
}
