import { API_BASE_URL } from './apiConfig'

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

const API = `${API_BASE_URL}`

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
            INFERENCIA DE IA / HORIZONTE DIARIO
          </span>

          <h3>Inteligencia LSTM</h3>

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
          Cargando inferencia neuronal...
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
              <span>RENDIMIENTO DIARIO ESTIMADO</span>

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
              <span>ESTADO</span>

              <strong>
                {prediccion.estado_evaluacion === 'pendiente'
                  ? 'PENDIENTE DE EVALUACIÓN'
                  : 'EVALUADA'}
              </strong>
            </div>
          </div>

          <div className="neural-prediction-details" aria-label="Resultado observado y comparación histórica">
            <div>
              <span>RENDIMIENTO OBSERVADO</span>
              <strong>
                {prediccion.rendimiento_observado_porcentaje === null
                  ? 'Pendiente de observación'
                  : `${prediccion.rendimiento_observado_porcentaje > 0 ? '+' : ''}${prediccion.rendimiento_observado_porcentaje.toFixed(4)} %`}
              </strong>
            </div>
            <div>
              <span>ERROR ABSOLUTO DE ESTA PREDICCIÓN</span>
              <strong>
                {prediccion.rendimiento_observado_porcentaje === null
                  ? 'No disponible'
                  : `${Math.abs(prediccion.rendimiento_estimado_porcentaje - prediccion.rendimiento_observado_porcentaje).toFixed(4)} puntos porcentuales`}
              </strong>
            </div>
            <div>
              <span>DIRECCIÓN ACERTADA</span>
              <strong>{prediccion.direccion_correcta === null ? 'Pendiente' : prediccion.direccion_correcta ? 'Sí' : 'No'}</strong>
            </div>
          </div>

          <div className="neural-prediction-details">
            <div>
              <span>FECHA DE EMISIÓN</span>
              <strong>
                {formatearFecha(prediccion.fecha_emision)}
              </strong>
            </div>

            <div>
              <span>FECHA OBJETIVO</span>
              <strong>
                {formatearFecha(prediccion.fecha_objetivo)}
              </strong>
            </div>

            <div>
              <span>PREDICCIONES REGISTRADAS</span>
              <strong>
                {datos?.resumen.total_predicciones ?? 0}
              </strong>
            </div>

            <div>
              <span>EVALUADA</span>
              <strong>
                {datos?.resumen.total_evaluadas ?? 0}
              </strong>
            </div>
          </div>
        </>
      )}

      <p className="neural-prediction-disclaimer">
        Predicción diaria experimental basada en datos históricos.
        Las cotizaciones pueden actualizarse con mayor frecuencia,
        pero las predicciones LSTM tienen horizonte diario.
        Simulación académica; no se realizan operaciones reales.
      </p>
    </section>
  )
}
