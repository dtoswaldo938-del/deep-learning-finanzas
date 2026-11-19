
import { useEffect, useState } from 'react'

type Escenario = {
  prediccion_id: number
  estado: string
  resultado_estimado_mxn: number
  resultado_observado_hipotetico_mxn: number | null
}

type Respuesta = {
  status: string
  total_escenarios: number
  escenarios: Escenario[]
  operaciones_reales: boolean
  saldo_sqlite_modificado: boolean
}

const API = 'http://127.0.0.1:8001'
const INTERVALO = 60000

const formatoDinero = (valor: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(valor)

function ResumenEstadisticoLSTM() {
  const [datos, setDatos] = useState<Respuesta | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true
    let consultando = false

    async function actualizar() {
      if (consultando) return

      consultando = true

      try {
        const respuesta = await fetch(
          `${API}/api/simulador/escenarios-lstm`,
          { cache: 'no-store' }
        )

        if (!respuesta.ok) {
          throw new Error('Error al consultar FastAPI.')
        }

        const resultado: Respuesta = await respuesta.json()

        if (
          resultado.status !== 'ok' ||
          resultado.operaciones_reales !== false ||
          resultado.saldo_sqlite_modificado !== false
        ) {
          throw new Error('Respuesta inesperada.')
        }

        if (activo) {
          setDatos(resultado)
          setError('')
        }
      } catch {
        if (activo) {
          setError('No se pudieron consultar las estadísticas.')
        }
      } finally {
        consultando = false

        if (activo) {
          setCargando(false)
        }
      }
    }

    void actualizar()

    const intervalo = window.setInterval(() => {
      void actualizar()
    }, INTERVALO)

    return () => {
      activo = false
      window.clearInterval(intervalo)
    }
  }, [])

  const escenarios = datos?.escenarios ?? []

  const evaluados = escenarios.filter(
    (escenario) =>
      escenario.estado === 'evaluado' &&
      escenario.resultado_observado_hipotetico_mxn !== null
  )

  const pendientes = escenarios.length - evaluados.length

  const diferencias = evaluados.map(
    (escenario) =>
      escenario.resultado_observado_hipotetico_mxn! -
      escenario.resultado_estimado_mxn
  )

  const diferenciaPromedio =
    diferencias.length > 0
      ? diferencias.reduce(
          (total, diferencia) => total + diferencia,
          0
        ) / diferencias.length
      : null

  const errorAbsolutoMedio =
    diferencias.length > 0
      ? diferencias.reduce(
          (total, diferencia) =>
            total + Math.abs(diferencia),
          0
        ) / diferencias.length
      : null

  return (
    <section className="dashboard-card">
      <h2>Resumen estadístico del simulador LSTM-A</h2>

      <p>
        Estadísticas descriptivas de los escenarios
        académicos que ya cuentan con evaluación.
      </p>

      {cargando && <p>Consultando estadísticas...</p>}

      {error && (
        <p style={{ color: '#f87171' }}>{error}</p>
      )}

      {datos && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16,
              marginTop: 20,
            }}
          >
            <div>
              <p>Escenarios registrados</p>
              <h3>{datos.total_escenarios}</h3>
            </div>

            <div>
              <p>Evaluados</p>
              <h3>{evaluados.length}</h3>
            </div>

            <div>
              <p>Pendientes</p>
              <h3>{pendientes}</h3>
            </div>

            <div>
              <p>Diferencia promedio</p>
              <h3>
                {diferenciaPromedio !== null
                  ? formatoDinero(diferenciaPromedio)
                  : 'Sin datos'}
              </h3>
            </div>

            <div>
              <p>Error absoluto medio</p>
              <h3>
                {errorAbsolutoMedio !== null
                  ? formatoDinero(errorAbsolutoMedio)
                  : 'Sin datos'}
              </h3>
            </div>
          </div>

          <p
            style={{
              fontSize: 13,
              opacity: 0.75,
              marginTop: 20,
            }}
          >
            Las estadísticas utilizan únicamente escenarios
            evaluados. No representan ganancias reales.
            La interpretación de estas métricas requiere
            una cantidad suficiente de observaciones.
          </p>
        </>
      )}
    </section>
  )
}

export default ResumenEstadisticoLSTM
