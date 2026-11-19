
import { useEffect, useState } from 'react'

type Escenario = {
  prediccion_id: number
  modelo: string
  activo: string
  fecha_emision: string
  fecha_objetivo: string
  porcentaje_asignado: number
  rendimiento_estimado_porcentaje: number
  resultado_estimado_mxn: number
  rendimiento_observado_porcentaje: number | null
  resultado_observado_hipotetico_mxn: number | null
  estado: string
  capital_referencia_mxn: number
  saldo_sqlite_modificado: boolean
  operaciones_reales: boolean
}

type RespuestaEscenarios = {
  status: string
  modo: string
  modelo: string
  activo: string
  moneda: string
  capital_referencia_mxn: number
  porcentaje_asignado: number
  total_escenarios: number
  escenarios: Escenario[]
  saldo_sqlite_modificado: boolean
  operaciones_reales: boolean
}

const API = 'http://127.0.0.1:8001'

// Actualizar los escenarios cada 60 segundos.
const INTERVALO_ACTUALIZACION = 60000

const formatoDinero = (valor: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor)

const formatoPorcentaje = (valor: number) =>
  `${valor.toFixed(4)} %`

const formatoFecha = (fecha: string) => {
  const partes = fecha.split('-')

  if (partes.length !== 3) {
    return fecha
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

const colorResultado = (valor: number) => {
  if (valor > 0) return '#4ade80'
  if (valor < 0) return '#f87171'
  return 'inherit'
}

function EscenariosLSTM() {
  const [datos, setDatos] = useState<RespuestaEscenarios | null>(
    null
  )

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [ultimaActualizacion, setUltimaActualizacion] =
    useState<Date | null>(null)

  useEffect(() => {
    let activo = true
    let consultando = false

    async function consultarEscenarios() {
      // Evita consultas simultáneas.
      if (consultando) {
        return
      }

      consultando = true

      try {
        const respuesta = await fetch(
          `${API}/api/simulador/escenarios-lstm`,
          {
            cache: 'no-store',
          }
        )

        if (!respuesta.ok) {
          throw new Error('Error al consultar FastAPI.')
        }

        const resultado: RespuestaEscenarios =
          await respuesta.json()

        // Comprobamos que seguimos en modo académico.
        if (
          resultado.status !== 'ok' ||
          resultado.operaciones_reales !== false ||
          resultado.saldo_sqlite_modificado !== false
        ) {
          throw new Error(
            'Respuesta inesperada de la API.'
          )
        }

        if (activo) {
          setDatos(resultado)
          setError('')
          setUltimaActualizacion(new Date())
        }
      } catch {
        if (activo) {
          setError(
            'No se pudieron actualizar los escenarios LSTM-A.'
          )
        }
      } finally {
        consultando = false

        if (activo) {
          setCargando(false)
        }
      }
    }

    // Primera consulta al abrir el componente.
    void consultarEscenarios()

    // Actualización automática cada 60 segundos.
    const intervalo = window.setInterval(() => {
      void consultarEscenarios()
    }, INTERVALO_ACTUALIZACION)

    // Detener las consultas al desmontar el componente.
    return () => {
      activo = false
      window.clearInterval(intervalo)
    }
  }, [])

  const totalEvaluados =
    datos?.escenarios.filter(
      (escenario) => escenario.estado === 'evaluado'
    ).length ?? 0

  return (
    <section className="dashboard-card">
      <h2>Escenarios hipotéticos basados en LSTM-A</h2>

      <p>
        Comparación entre rendimientos estimados por la red
        neuronal y rendimientos observados, utilizando capital
        completamente ficticio.
      </p>

      {cargando && (
        <p>Consultando escenarios LSTM-A...</p>
      )}

      {error && (
        <p style={{ color: '#f87171' }}>
          {error}
        </p>
      )}

      {datos && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(190px, 1fr))',
              gap: 16,
              marginTop: 20,
              marginBottom: 24,
            }}
          >
            <div>
              <p>Capital de referencia</p>
              <h3>
                {formatoDinero(
                  datos.capital_referencia_mxn
                )}
              </h3>
            </div>

            <div>
              <p>Asignación hipotética</p>
              <h3>
                {datos.porcentaje_asignado} %
              </h3>
            </div>

            <div>
              <p>Escenarios registrados</p>
              <h3>
                {datos.total_escenarios}
              </h3>
            </div>

            <div>
              <p>Escenarios evaluados</p>
              <h3>
                {totalEvaluados}
              </h3>
            </div>
          </div>

          <p>
            <strong>Modelo:</strong> {datos.modelo}
            {' | '}
            <strong>Activo:</strong> {datos.activo}
            {' | '}
            <strong>Moneda:</strong> {datos.moneda}
          </p>

          <div
            style={{
              overflowX: 'auto',
              marginTop: 20,
            }}
          >
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Fecha de emisión</th>
                  <th>Fecha objetivo</th>
                  <th>Rendimiento estimado</th>
                  <th>Resultado estimado</th>
                  <th>Rendimiento observado</th>
                  <th>Resultado observado</th>
                  <th>Estado</th>
                </tr>
              </thead>

              <tbody>
                {datos.escenarios.map(
                  (escenario) => (
                    <tr key={escenario.prediccion_id}>
                      <td>
                        {formatoFecha(
                          escenario.fecha_emision
                        )}
                      </td>

                      <td>
                        {formatoFecha(
                          escenario.fecha_objetivo
                        )}
                      </td>

                      <td
                        style={{
                          color: colorResultado(
                            escenario.rendimiento_estimado_porcentaje
                          ),
                        }}
                      >
                        {formatoPorcentaje(
                          escenario.rendimiento_estimado_porcentaje
                        )}
                      </td>

                      <td
                        style={{
                          color: colorResultado(
                            escenario.resultado_estimado_mxn
                          ),
                        }}
                      >
                        {formatoDinero(
                          escenario.resultado_estimado_mxn
                        )}
                      </td>

                      <td
                        style={{
                          color:
                            escenario.rendimiento_observado_porcentaje
                              !== null
                              ? colorResultado(
                                  escenario.rendimiento_observado_porcentaje
                                )
                              : 'inherit',
                        }}
                      >
                        {escenario.rendimiento_observado_porcentaje
                          !== null
                          ? formatoPorcentaje(
                              escenario.rendimiento_observado_porcentaje
                            )
                          : 'Pendiente'}
                      </td>

                      <td
                        style={{
                          color:
                            escenario.resultado_observado_hipotetico_mxn
                              !== null
                              ? colorResultado(
                                  escenario.resultado_observado_hipotetico_mxn
                                )
                              : 'inherit',
                        }}
                      >
                        {escenario.resultado_observado_hipotetico_mxn
                          !== null
                          ? formatoDinero(
                              escenario.resultado_observado_hipotetico_mxn
                            )
                          : 'Pendiente'}
                      </td>

                      <td>
                        {escenario.estado === 'evaluado'
                          ? 'Evaluado'
                          : 'Pendiente'}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {datos.total_escenarios === 0 && (
            <p>
              No existen escenarios registrados todavía.
            </p>
          )}

          {ultimaActualizacion && (
            <p
              style={{
                fontSize: 12,
                opacity: 0.75,
                marginTop: 16,
                textAlign: 'center',
              }}
            >
              Última consulta exitosa:{' '}
              {ultimaActualizacion.toLocaleString(
                'es-MX'
              )}
              {' | '}
              Actualización automática cada 60 segundos.
            </p>
          )}
        </>
      )}

      <p
        style={{
          fontSize: 13,
          opacity: 0.75,
          marginTop: 20,
        }}
      >
        Los resultados se calculan de manera independiente
        sobre un capital ficticio de referencia. No representan
        operaciones ejecutadas, ganancias realizadas ni
        modificaciones al saldo de SQLite.
      </p>
    </section>
  )
}

export default EscenariosLSTM
