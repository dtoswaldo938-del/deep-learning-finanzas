
import { useEffect, useState } from 'react'
import './LSTMArchitectureExplorer.css'

type ArchitectureData = {
  status: string
  modelo: string
  activo: string
  fecha_emision: string
  fecha_objetivo: string
  arquitectura: {
    tipo: string
    capas_lstm: number
    neuronas_ocultas: number
    longitud_secuencia: number
  }
  activaciones: number[]
  estado_celda: number[]
  rendimiento_estimado_porcentaje: number
}

type Stage = 'input' | 'lstm' | 'output'

const API = 'http://127.0.0.1:8001'

const stages: {
  id: Stage
  number: string
  title: string
  subtitle: string
}[] = [
  {
    id: 'input',
    number: '01',
    title: 'Secuencia de entrada',
    subtitle: '20 rendimientos diarios',
  },
  {
    id: 'lstm',
    number: '02',
    title: 'Procesamiento LSTM',
    subtitle: '32 unidades ocultas',
  },
  {
    id: 'output',
    number: '03',
    title: 'Salida de predicción',
    subtitle: '1 rendimiento estimado',
  },
]

function formatValue(value: number, digits = 6) {
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}`
}

export default function LSTMArchitectureExplorer({ simbolo = 'BTCUSDT' }: { simbolo?: string }) {
  const [stage, setStage] = useState<Stage>('lstm')
  const [data, setData] = useState<ArchitectureData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedUnit, setSelectedUnit] = useState(0)

  useEffect(() => {
    let active = true
    let requesting = false
    const controller = new AbortController()

    async function load() {
      if (!active || requesting) return
      requesting = true

      try {
        const response = await fetch(
          `${API}/api/modelos-multiactivo/inferencia?simbolo=${encodeURIComponent(simbolo)}`,
          {
            cache: 'no-store',
            signal: controller.signal,
          }
        )

        if (!response.ok) {
          throw new Error('API unavailable')
        }

        const result: ArchitectureData =
          await response.json()

        if (
          result.status !== 'ok' ||
          result.activo !== simbolo ||
          !Array.isArray(result.activaciones) ||
          !Array.isArray(result.estado_celda) ||
          result.activaciones.length !== 32 ||
          result.estado_celda.length !== 32 ||
          !result.activaciones.every(Number.isFinite) ||
          !result.estado_celda.every(Number.isFinite) ||
          !Number.isFinite(
            result.rendimiento_estimado_porcentaje
          )
        ) {
          throw new Error('Invalid architecture data')
        }

        if (active) {
          setData(result)
          setError('')
        }
      } catch {
        if (active && !controller.signal.aborted) {
          setError(
            'No se pudo consultar el modelo del activo seleccionado.'
          )
        }
      } finally {
        requesting = false
        if (active) setLoading(false)
      }
    }

    void load()

    const interval = window.setInterval(() => {
      void load()
    }, 60000)

    return () => {
      active = false
      window.clearInterval(interval)
      controller.abort()
    }
  }, [simbolo])

  const activations = data?.activaciones ?? []
  const cells = data?.estado_celda ?? []

  const maxMagnitude = Math.max(
    0.000001,
    ...activations.map((value) => Math.abs(value))
  )

  const selectedActivation = activations[selectedUnit]
  const selectedCell = cells[selectedUnit]

  return (
    <section className="architecture-explorer">
      <header className="architecture-header">
        <div>
          <span className="architecture-eyebrow">
            APRENDIZAJE PROFUNDO / ARQUITECTURA DEL MODELO
          </span>

          <h2>Explorador de arquitectura LSTM</h2>

          <p>
            Explora el recorrido de los datos a través
            del modelo LSTM-A entrenado.
          </p>
        </div>

        <span className="architecture-model-tag">
          PYTORCH · LSTM-A
        </span>
      </header>

      <div className="architecture-flow">
        {stages.map((item, index) => (
          <div className="architecture-flow-part" key={item.id}>
            <button
              type="button"
              className={
                stage === item.id
                  ? 'architecture-stage active'
                  : 'architecture-stage'
              }
              onClick={() => setStage(item.id)}
              aria-pressed={stage === item.id}
            >
              <span className="architecture-stage-number">
                STAGE {item.number}
              </span>

              <strong>{item.title}</strong>
              <small>{item.subtitle}</small>
            </button>

            {index < stages.length - 1 && (
              <span
                className="architecture-flow-arrow"
                aria-hidden="true"
              >
                →
              </span>
            )}
          </div>
        ))}
      </div>

      {loading && !data && (
        <p className="architecture-message">
          Loading trained model data...
        </p>
      )}

      {error && (
        <p className="architecture-error" role="alert">
          {error}
          {data && ' Se conservan los últimos datos recibidos.'}
        </p>
      )}

      {data && (
        <>
          <div className="architecture-overview">
            <div>
              <span>MODELO</span>
              <strong>{data.modelo}</strong>
            </div>
            <div>
              <span>INPUT STEPS</span>
              <strong>{data.arquitectura.longitud_secuencia}</strong>
            </div>
            <div>
              <span>UNIDADES OCULTAS</span>
              <strong>{data.arquitectura.neuronas_ocultas}</strong>
            </div>
            <div>
              <span>CAPAS LSTM</span>
              <strong>{data.arquitectura.capas_lstm}</strong>
            </div>
          </div>

          {stage === 'input' && (
            <div className="architecture-detail">
              <div className="architecture-detail-heading">
                <span>ETAPA 01 / ENTRADA</span>
                <h3>Temporal Secuencia de entrada</h3>
                <p>
                  El modelo recibe una secuencia de 20
                  rendimientos diarios escalados, cada
                  uno con una característica.
                </p>
              </div>

              <div className="architecture-timeline">
                {Array.from({ length: 20 }, (_, index) => (
                  <div
                    className="architecture-timestep"
                    key={index}
                  >
                    <span>
                      T{String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="architecture-timestep-bar" />
                    <small>1 característica</small>
                  </div>
                ))}
              </div>

              <div className="architecture-explanation">
                <strong>Tensor de entrada</strong>
                <code>(batch=1, steps=20, features=1)</code>
                <p>
                  Los bloques representan posiciones de
                  la secuencia, no los valores numéricos
                  de cada rendimiento. El endpoint actual
                  todavía no proporciona los 20 valores
                  escalados.
                </p>
              </div>
            </div>
          )}

          {stage === 'lstm' && (
            <div className="architecture-detail">
              <div className="architecture-detail-heading">
                <span>ETAPA 02 / PROCESAMIENTO RECURRENTE</span>
                <h3>Actividad de la capa oculta</h3>
                <p>
                  Una capa LSTM procesa la secuencia y
                  mantiene 32 componentes en sus estados
                  oculto y de celda.
                </p>
              </div>

              <div className="architecture-hidden-grid">
                {activations.map((value, index) => {
                  const magnitude =
                    Math.abs(value) / maxMagnitude

                  const color =
                    value >= 0 ? '34,211,238' : '168,85,247'

                  return (
                    <button
                      type="button"
                      key={index}
                      className={
                        selectedUnit === index
                          ? 'architecture-hidden-unit selected'
                          : 'architecture-hidden-unit'
                      }
                      style={{
                        background: `rgba(${color},${
                          0.12 + magnitude * 0.62
                        })`,
                      }}
                      onClick={() => setSelectedUnit(index)}
                      aria-pressed={selectedUnit === index}
                    >
                      <span>
                        H{String(index + 1).padStart(2, '0')}
                      </span>
                      <strong>{formatValue(value, 4)}</strong>
                    </button>
                  )
                })}
              </div>

              <div className="architecture-unit-inspector">
                <div>
                  <span>UNIDAD SELECCIONADA</span>
                  <strong>
                    H{String(selectedUnit + 1).padStart(2, '0')}
                  </strong>
                </div>

                <div>
                  <span>ESTADO OCULTO</span>
                  <strong>
                    {selectedActivation !== undefined
                      ? formatValue(selectedActivation, 8)
                      : '---'}
                  </strong>
                </div>

                <div>
                  <span>ESTADO DE CELDA</span>
                  <strong>
                    {selectedCell !== undefined
                      ? formatValue(selectedCell, 8)
                      : '---'}
                  </strong>
                </div>
              </div>

              <p className="architecture-disclaimer">
                Estos valores corresponden al último paso
                temporal de la inferencia. El mapa muestra
                las 32 componentes reales, no una
                reconstrucción de las conexiones internas
                de las puertas LSTM.
              </p>
            </div>
          )}

          {stage === 'output' && (
            <div className="architecture-detail">
              <div className="architecture-detail-heading">
                <span>ETAPA 03 / SALIDA</span>
                <h3>Rendimiento diario estimado</h3>
                <p>
                  La última salida oculta pasa por una
                  capa lineal que produce una estimación
                  escalar del rendimiento.
                </p>
              </div>

              <div className="architecture-output">
                <div className="architecture-output-node">
                  <span>32-DIMENSIONAL HIDDEN VECTOR</span>
                  <strong>h final</strong>
                </div>

                <div className="architecture-output-arrow">
                  →
                </div>

                <div className="architecture-output-node">
                  <span>CAPA LINEAL</span>
                  <strong>32 → 1</strong>
                </div>

                <div className="architecture-output-arrow">
                  →
                </div>

                <div className="architecture-output-result">
                  <span>RENDIMIENTO ESTIMADO</span>
                  <strong>
                    {formatValue(
                      data.rendimiento_estimado_porcentaje,
                      4
                    )}%
                  </strong>
                  <small>
                    {data.fecha_objetivo}
                  </small>
                </div>
              </div>

              <div className="architecture-explanation">
                <strong>Información de la predicción</strong>
                <p>
                  Emisión: {data.fecha_emision}
                  {' · '}
                  Objetivo: {data.fecha_objetivo}
                </p>
                <p>
                  La estimación es experimental y no
                  constituye una recomendación de
                  inversión ni una garantía de dirección
                  del mercado.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      <footer className="architecture-footer">
        <span>MODELO ENTRENADO · SOLO LECTURA</span>
        <span>INFERENCIA DIARIA · NO SE ACTUALIZA POR CADA OPERACIÓN</span>
        <span>SIMULACIÓN VIRTUAL</span>
      </footer>
    </section>
  )
}
