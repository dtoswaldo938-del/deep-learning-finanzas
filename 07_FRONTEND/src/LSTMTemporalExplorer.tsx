
import { useEffect, useMemo, useState } from 'react'
import './LSTMTemporalExplorer.css'

type ResumenPaso = {
  paso: number
  entrada_escalada: number
  magnitud_media: number
  magnitud_maxima: number
  activaciones_positivas: number
  activaciones_negativas: number
}

type DatosTemporales = {
  status: string
  modelo: string
  activo: string
  fecha_emision: string
  fecha_objetivo: string
  arquitectura: {
    longitud_secuencia: number
    neuronas_ocultas: number
    capas_lstm: number
  }
  activaciones: number[]
  estado_celda: number[]
  secuencia_oculta: number[][]
  entrada_escalada: number[]
  resumen_temporal: ResumenPaso[]
  rendimiento_estimado_porcentaje: number
}

const API = 'http://127.0.0.1:8001'

function validarDatos(
  valor: unknown
): valor is DatosTemporales {
  if (!valor || typeof valor !== 'object') {
    return false
  }

  const datos = valor as Partial<DatosTemporales>

  return (
    datos.status === 'ok' &&
    Array.isArray(datos.secuencia_oculta) &&
    datos.secuencia_oculta.length === 20 &&
    datos.secuencia_oculta.every(
      (fila) =>
        Array.isArray(fila) &&
        fila.length === 32 &&
        fila.every(
          (numero) =>
            typeof numero === 'number' &&
            Number.isFinite(numero)
        )
    ) &&
    Array.isArray(datos.entrada_escalada) &&
    datos.entrada_escalada.length === 20 &&
    datos.entrada_escalada.every(Number.isFinite) &&
    Array.isArray(datos.resumen_temporal) &&
    datos.resumen_temporal.length === 20 &&
    datos.resumen_temporal.every(
      (resumen) =>
        Number.isFinite(resumen.paso) &&
        Number.isFinite(resumen.magnitud_media) &&
        Number.isFinite(resumen.magnitud_maxima)
    )
  )
}

function formato(
  valor: number,
  decimales = 6
): string {
  return `${valor > 0 ? '+' : ''}${valor.toFixed(decimales)}`
}

function etiquetaUnidad(indice: number): string {
  return `H${String(indice + 1).padStart(2, '0')}`
}

export default function LSTMTemporalExplorer({ simbolo = 'BTCUSDT' }: { simbolo?: string }) {
  const [datos, setDatos] =
    useState<DatosTemporales | null>(null)

  const [paso, setPaso] = useState(1)
  const [unidad, setUnidad] = useState(0)

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true
    let consultando = false

    const controlador = new AbortController()

    async function consultar() {
      if (!activo || consultando) return

      consultando = true

      try {
        const respuesta = await fetch(
          `${API}/api/modelos-multiactivo/inferencia?simbolo=${encodeURIComponent(simbolo)}`,
          {
            cache: 'no-store',
            signal: controlador.signal,
          }
        )

        if (!respuesta.ok) {
          throw new Error(
            `Error HTTP ${respuesta.status}`
          )
        }

        const resultado: unknown =
          await respuesta.json()

        // La API entrega 20 x 32 estados; el resumen se deriva localmente.
        if (resultado && typeof resultado === 'object') {
          const r = resultado as Partial<DatosTemporales>
          if (r.activo === simbolo && Array.isArray(r.secuencia_oculta) && Array.isArray(r.entrada_escalada)) {
            r.resumen_temporal = r.secuencia_oculta.map((fila, indice) => ({
              paso: indice + 1,
              entrada_escalada: r.entrada_escalada![indice],
              magnitud_media: fila.reduce((total, v) => total + Math.abs(v), 0) / fila.length,
              magnitud_maxima: Math.max(...fila.map(Math.abs)),
              activaciones_positivas: fila.filter(v => v > 0).length,
              activaciones_negativas: fila.filter(v => v < 0).length,
            }))
          }
        }

        if (!validarDatos(resultado) || resultado.activo !== simbolo) {
          throw new Error(
            'La API todavía no entrega la secuencia temporal completa.'
          )
        }

        if (activo) {
          setDatos(resultado)
          setError('')
        }
      } catch (problema) {
        if (
          activo &&
          !controlador.signal.aborted
        ) {
          setError(
            problema instanceof Error
              ? problema.message
              : 'No se pudieron consultar los datos.'
          )
        }
      } finally {
        consultando = false

        if (activo) {
          setCargando(false)
        }
      }
    }

    void consultar()

    const intervalo = window.setInterval(() => {
      void consultar()
    }, 60000)

    return () => {
      activo = false
      window.clearInterval(intervalo)
      controlador.abort()
    }
  }, [simbolo])

  const secuencia = datos?.secuencia_oculta ?? []

  const activacionesPaso = secuencia[paso - 1] ?? []

  const resumen = datos?.resumen_temporal[paso - 1]

  const valorSeleccionado = activacionesPaso[unidad]

  const maximoGlobal = useMemo(() => {
    return Math.max(
      0.000001,
      ...secuencia.flat().map(Math.abs)
    )
  }, [secuencia])

  const magnitudMaximaMedia = useMemo(() => {
    return Math.max(
      0.000001,
      ...(datos?.resumen_temporal.map(
        (elemento) => elemento.magnitud_media
      ) ?? [])
    )
  }, [datos])

  const magnitudRelativa =
    valorSeleccionado !== undefined
      ? Math.abs(valorSeleccionado) /
        maximoGlobal * 100
      : 0

  function cambiarPaso(nuevoPaso: number) {
    setPaso(
      Math.max(1, Math.min(20, nuevoPaso))
    )
  }

  return (
    <section className="temporal-explorer">
      <header className="temporal-header">
        <div>
          <span className="temporal-eyebrow">
            APRENDIZAJE PROFUNDO / ANÁLISIS TEMPORAL
          </span>

          <h2>Explorador temporal LSTM</h2>

          <p>
            Explora las activaciones ocultas reales
            del modelo durante sus 20 pasos de entrada.
          </p>
        </div>

        <span className="temporal-model-badge">
          PYTORCH · 20 × 32
        </span>
      </header>

      {cargando && !datos && (
        <p className="temporal-message">
          Consultando activaciones temporales...
        </p>
      )}

      {error && (
        <p className="temporal-error" role="alert">
          {error}
          {datos &&
            ' Se muestran los últimos datos recibidos.'}
        </p>
      )}

      {datos && (
        <>
          <div className="temporal-summary">
            <div>
              <span>MODELO</span>
              <strong>{datos.modelo}</strong>
            </div>

            <div>
              <span>PASOS TEMPORALES</span>
              <strong>20</strong>
            </div>

            <div>
              <span>UNIDADES OCULTAS</span>
              <strong>32</strong>
            </div>

            <div>
              <span>FECHA DEL MODELO</span>
              <strong>{datos.fecha_emision}</strong>
            </div>
          </div>

          <div className="temporal-workspace">
            <div className="temporal-section-heading">
              <div>
                <span>NAVEGACIÓN TEMPORAL</span>
                <h3>Explorador de secuencias</h3>
              </div>

              <strong>
                PASO {String(paso).padStart(2, '0')}
                {' / 20'}
              </strong>
            </div>

            <div className="temporal-steps">
              {Array.from(
                { length: 20 },
                (_, indice) => indice + 1
              ).map((numero) => (
                <button
                  key={numero}
                  type="button"
                  className={
                    numero === paso
                      ? 'temporal-step active'
                      : numero < paso
                        ? 'temporal-step completed'
                        : 'temporal-step'
                  }
                  onClick={() => cambiarPaso(numero)}
                  aria-pressed={numero === paso}
                  aria-label={`Paso temporal ${numero}`}
                >
                  {String(numero).padStart(2, '0')}
                </button>
              ))}
            </div>

            <div className="temporal-slider-row">
              <span>PASO 01</span>

              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={paso}
                onChange={(evento) =>
                  cambiarPaso(
                    Number(evento.target.value)
                  )
                }
                aria-label="Seleccionar paso temporal"
              />

              <span>PASO 20</span>
            </div>

            <div className="temporal-navigation">
              <button
                type="button"
                disabled={paso === 1}
                onClick={() => cambiarPaso(paso - 1)}
              >
                ← Paso anterior
              </button>

              <button
                type="button"
                disabled={paso === 20}
                onClick={() => cambiarPaso(paso + 1)}
              >
                Paso siguiente →
              </button>
            </div>
          </div>

          <div className="temporal-workspace">
            <div className="temporal-section-heading">
              <div>
                <span>ESTADO OCULTO MATRIX</span>
                <h3>
                  Actividad neuronal · Paso {paso}
                </h3>
              </div>

              <span className="temporal-live-tag">
                SALIDA REAL DEL MODELO
              </span>
            </div>

            <div className="temporal-neuron-grid">
              {activacionesPaso.map(
                (valor, indice) => {
                  const intensidad =
                    Math.abs(valor) / maximoGlobal

                  const positivo = valor >= 0

                  const color = positivo
                    ? '34, 211, 238'
                    : '168, 85, 247'

                  return (
                    <button
                      type="button"
                      key={indice}
                      className={
                        unidad === indice
                          ? 'temporal-neuron selected'
                          : 'temporal-neuron'
                      }
                      style={{
                        background: `rgba(${color}, ${
                          0.12 + intensidad * 0.7
                        })`,
                      }}
                      onClick={() => setUnidad(indice)}
                      aria-pressed={unidad === indice}
                    >
                      <span>
                        {etiquetaUnidad(indice)}
                      </span>

                      <strong>
                        {formato(valor, 4)}
                      </strong>
                    </button>
                  )
                }
              )}
            </div>

            <div className="temporal-inspector">
              <div>
                <span>PASO SELECCIONADO</span>
                <strong>
                  {String(paso).padStart(2, '0')}
                </strong>
              </div>

              <div>
                <span>UNIDAD SELECCIONADA</span>
                <strong>
                  {etiquetaUnidad(unidad)}
                </strong>
              </div>

              <div>
                <span>ACTIVACIÓN OCULTA</span>
                <strong>
                  {valorSeleccionado !== undefined
                    ? formato(valorSeleccionado, 8)
                    : '---'}
                </strong>
              </div>

              <div>
                <span>MAGNITUD RELATIVA</span>
                <strong>
                  {magnitudRelativa.toFixed(2)} %
                </strong>
              </div>
            </div>
          </div>

          <div className="temporal-workspace">
            <div className="temporal-section-heading">
              <div>
                <span>ANÁLISIS DE LA SECUENCIA</span>
                <h3>Evolución de la magnitud de activación</h3>
              </div>
            </div>

            <p className="temporal-chart-description">
              Magnitud absoluta media de las 32
              activaciones en cada paso temporal.
            </p>

            <div className="temporal-chart">
              {datos.resumen_temporal.map(
                (elemento, indice) => {
                  const altura =
                    elemento.magnitud_media /
                    magnitudMaximaMedia * 100

                  return (
                    <button
                      type="button"
                      key={elemento.paso}
                      className={
                        paso === elemento.paso
                          ? 'temporal-chart-column active'
                          : 'temporal-chart-column'
                      }
                      onClick={() =>
                        cambiarPaso(elemento.paso)
                      }
                      title={
                        `Paso ${elemento.paso}: ` +
                        elemento.magnitud_media.toFixed(8)
                      }
                      aria-label={
                        `Paso ${elemento.paso}, ` +
                        `magnitud media ${elemento.magnitud_media.toFixed(8)}`
                      }
                    >
                      <div className="temporal-chart-track">
                        <div
                          className="temporal-chart-bar"
                          style={{
                            height: `${altura}%`,
                          }}
                        />
                      </div>

                      <span>
                        {String(indice + 1).padStart(2, '0')}
                      </span>
                    </button>
                  )
                }
              )}
            </div>

            <div className="temporal-statistics">
              <div>
                <span>ENTRADA ESCALADA</span>
                <strong>
                  {formato(
                    datos.entrada_escalada[paso - 1],
                    6
                  )}
                </strong>
              </div>

              <div>
                <span>ACTIVACIÓN ABSOLUTA MEDIA</span>
                <strong>
                  {resumen
                    ? resumen.magnitud_media.toFixed(8)
                    : '---'}
                </strong>
              </div>

              <div>
                <span>ACTIVACIÓN ABSOLUTA MÁXIMA</span>
                <strong>
                  {resumen
                    ? resumen.magnitud_maxima.toFixed(8)
                    : '---'}
                </strong>
              </div>

              <div>
                <span>POSITIVAS / NEGATIVAS</span>
                <strong>
                  {resumen
                    ? `${resumen.activaciones_positivas} / ${resumen.activaciones_negativas}`
                    : '---'}
                </strong>
              </div>
            </div>
          </div>

          <div className="temporal-explanation">
            <strong>About this visualization</strong>

            <p>
              Los 20 pasos muestran salidas ocultas
              reales extraídas del modelo LSTM-A.
              Cada paso contiene 32 componentes.
              Los colores indican el signo y la
              intensidad representa la magnitud
              absoluta relativa.
            </p>

            <p>
              Los pasos siguen el orden de entrada
              utilizado por la inferencia original.
              No se asignan fechas individuales hasta
              verificar la cronología de los rezagos.
              Estos valores no son probabilidades,
              recomendaciones de inversión ni
              predicciones independientes por paso.
            </p>
          </div>

          <footer className="temporal-footer">
            <span>LSTM-A ENTRENADA · SOLO LECTURA</span>
            <span>20 PASOS × 32 UNIDADES OCULTAS</span>
            <span>SIN OPERACIONES REALES</span>
          </footer>
        </>
      )}
    </section>
  )
}
