
import { useEffect, useState } from 'react'

const API = 'http://127.0.0.1:8001'

type MayorError = {
  fecha: string
  rendimiento_real_porcentaje: number
  prediccion_porcentaje: number
  error_absoluto_puntos_porcentuales: number
}

type Analisis = {
  status: string
  modelo: string
  activo: string
  observaciones: number
  predicciones_subida: number
  predicciones_bajada: number
  predicciones_sin_cambio: number
  porcentaje_subida: number
  porcentaje_bajada: number
  aciertos_direccionales: number
  precision_direccional: number
  mae: number
  rmse: number
  sesgo: number
  desviacion_errores: number
  correlacion_pearson: number | null
  mayor_error: MayorError
  graficas: string[]
  operaciones_reales: boolean
  capital_virtual_modificado: boolean
}

export default function AnalisisErroresLSTM() {
  const [datos, setDatos] = useState<Analisis | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function consultar() {
      try {
        const respuesta = await fetch(
          `${API}/api/laboratorio-lstm/analisis-errores`
        )

        if (!respuesta.ok) {
          throw new Error('Error al consultar el laboratorio')
        }

        const resultado: Analisis = await respuesta.json()

        if (
          resultado.status !== 'ok' ||
          resultado.operaciones_reales ||
          resultado.capital_virtual_modificado
        ) {
          throw new Error('Respuesta no válida')
        }

        setDatos(resultado)
        setError('')
      } catch {
        setError(
          'No se pudo cargar el análisis avanzado de errores.'
        )
      } finally {
        setCargando(false)
      }
    }

    consultar()
  }, [])

  return (
    <section className="dashboard-card">
      <h2>Análisis avanzado de errores LSTM-32</h2>

      <p>
        Evaluación histórica del comportamiento direccional,
        los errores y la relación entre rendimientos reales
        y estimados.
      </p>

      {cargando && <p>Cargando análisis...</p>}

      {error && (
        <p style={{ color: '#f87171' }}>{error}</p>
      )}

      {datos && (
        <>
          <p>
            <strong>Activo:</strong> {datos.activo}
            {' | '}
            <strong>Observaciones:</strong> {datos.observaciones}
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 14,
              marginTop: 22,
            }}
          >
            {[
              {
                titulo: 'Predicciones de subida',
                valor: `${datos.porcentaje_subida.toFixed(4)} %`,
                detalle: `${datos.predicciones_subida} predicciones`,
              },
              {
                titulo: 'Predicciones de bajada',
                valor: `${datos.porcentaje_bajada.toFixed(4)} %`,
                detalle: `${datos.predicciones_bajada} predicciones`,
              },
              {
                titulo: 'Precisión direccional',
                valor: `${datos.precision_direccional.toFixed(4)} %`,
                detalle: `${datos.aciertos_direccionales} aciertos`,
              },
              {
                titulo: 'Correlación de Pearson',
                valor:
                  datos.correlacion_pearson === null
                    ? 'No definida'
                    : datos.correlacion_pearson.toFixed(6),
                detalle: 'Relación lineal entre predicción y realidad',
              },
            ].map((indicador) => (
              <div
                key={indicador.titulo}
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: 12,
                  padding: 18,
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    opacity: 0.8,
                    margin: 0,
                  }}
                >
                  {indicador.titulo}
                </p>

                <h3
                  style={{
                    fontSize: 23,
                    margin: '12px 0',
                    color: '#38bdf8',
                  }}
                >
                  {indicador.valor}
                </h3>

                <p
                  style={{
                    fontSize: 12,
                    opacity: 0.7,
                    margin: 0,
                  }}
                >
                  {indicador.detalle}
                </p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 26 }}>
            <h3>Mayor error absoluto registrado</h3>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: 12,
                padding: 20,
              }}
            >
              <p>
                <strong>Fecha:</strong>{' '}
                {datos.mayor_error.fecha}
              </p>

              <p>
                <strong>Rendimiento real:</strong>{' '}
                {datos.mayor_error.rendimiento_real_porcentaje.toFixed(4)} %
              </p>

              <p>
                <strong>Predicción LSTM:</strong>{' '}
                {datos.mayor_error.prediccion_porcentaje.toFixed(4)} %
              </p>

              <p>
                <strong>Error absoluto:</strong>{' '}
                {datos.mayor_error.error_absoluto_puntos_porcentuales.toFixed(4)}
                {' '}puntos porcentuales
              </p>
            </div>
          </div>

          <div style={{ marginTop: 26 }}>
            <h3>Interpretación de los resultados</h3>

            <p>
              La red neuronal predijo rendimientos positivos
              en {datos.porcentaje_subida.toFixed(4)} % de los casos.
              Esto indica una marcada tendencia a anticipar
              subidas durante el periodo evaluado.
            </p>

            <p>
              La precisión direccional fue de{' '}
              {datos.precision_direccional.toFixed(4)} %.
              Por lo tanto, el modelo no demostró una
              capacidad direccional consistentemente acertada
              en esta muestra histórica.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gap: 28,
              marginTop: 30,
            }}
          >
            <div>
              <h3>Dispersión de predicciones</h3>

              <img
                src={`${API}${datos.graficas[0]}`}
                alt="Dispersión de rendimientos reales y predicciones LSTM"
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: 12,
                  marginTop: 12,
                }}
              />
            </div>

            <div>
              <h3>Distribución de errores</h3>

              <img
                src={`${API}${datos.graficas[1]}`}
                alt="Histograma de errores LSTM"
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: 12,
                  marginTop: 12,
                }}
              />
            </div>
          </div>

          <p
            style={{
              fontSize: 13,
              opacity: 0.75,
              marginTop: 24,
            }}
          >
            Análisis académico basado en datos históricos.
            No constituye una predicción de resultados futuros
            ni modifica el simulador de capital virtual.
          </p>
        </>
      )}
    </section>
  )
}
