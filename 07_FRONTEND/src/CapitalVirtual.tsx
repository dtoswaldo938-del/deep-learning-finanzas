import { API_BASE_URL } from './apiConfig'

import { useEffect, useState } from 'react'

type Capital = {
  status: string
  nombre: string
  moneda: string
  capital_inicial: number
  saldo_actual: number
  rendimiento_acumulado_porcentaje: number
  operaciones_reales: boolean
}

type Movimiento = {
  id: number
  fecha_utc: string
  tipo_movimiento: string
  descripcion: string
  monto: number
  saldo_resultante: number
  origen: string
}

type Historial = {
  status: string
  total_movimientos: number
  movimientos: Movimiento[]
}

const API = `${API_BASE_URL}`

function CapitalVirtual() {
  const [capital, setCapital] = useState<Capital | null>(null)
  const [historial, setHistorial] = useState<Historial | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true

    async function consultarDatos() {
      try {
        const [respuestaCapital, respuestaHistorial] =
          await Promise.all([
            fetch(`${API}/api/simulador/capital`),
            fetch(`${API}/api/simulador/historial`),
          ])

        if (!respuestaCapital.ok || !respuestaHistorial.ok) {
          throw new Error('No se pudieron consultar los datos.')
        }

        const datosCapital: Capital =
          await respuestaCapital.json()

        const datosHistorial: Historial =
          await respuestaHistorial.json()

        if (
          datosCapital.status !== 'ok' ||
          datosHistorial.status !== 'ok'
        ) {
          throw new Error('La API devolvió un estado inesperado.')
        }

        if (activo) {
          setCapital(datosCapital)
          setHistorial(datosHistorial)
          setError('')
        }
      } catch {
        if (activo) {
          setError('No se pudo consultar el simulador virtual.')
        }
      } finally {
        if (activo) {
          setCargando(false)
        }
      }
    }

    consultarDatos()

    return () => {
      activo = false
    }
  }, [])

  const formatoDinero = (valor: number) =>
    new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor)

  return (
    <section className="dashboard-card">
      <h2>Simulador académico de capital virtual</h2>

      <p>
        Cuenta ficticia para evaluar estrategias experimentales
        sin utilizar dinero real.
      </p>

      {cargando && <p>Consultando capital virtual...</p>}

      {error && (
        <p style={{ color: '#f87171' }}>{error}</p>
      )}

      {capital && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              marginTop: 20,
              marginBottom: 24,
            }}
          >
            <div>
              <p>Capital inicial</p>
              <h3>{formatoDinero(capital.capital_inicial)}</h3>
            </div>

            <div>
              <p>Saldo actual</p>
              <h3>{formatoDinero(capital.saldo_actual)}</h3>
            </div>

            <div>
              <p>Rendimiento acumulado</p>
              <h3>
                {capital.rendimiento_acumulado_porcentaje.toFixed(4)} %
              </h3>
            </div>

            <div>
              <p>Modo de operación</p>
              <h3>
                {capital.operaciones_reales
                  ? 'Verificar configuración'
                  : '100 % virtual'}
              </h3>
            </div>
          </div>

          <p>
            <strong>Cuenta:</strong> {capital.nombre}
          </p>

          <p>
            <strong>Moneda:</strong> {capital.moneda}
          </p>
        </>
      )}

      {historial && (
        <>
          <h3>Historial de movimientos virtuales</h3>

          <p>
            Total de movimientos: {historial.total_movimientos}
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Movimiento</th>
                  <th>Descripción</th>
                  <th>Monto</th>
                  <th>Saldo resultante</th>
                </tr>
              </thead>

              <tbody>
                {historial.movimientos.map((movimiento) => (
                  <tr key={movimiento.id}>
                    <td>
                      {new Date(
                        movimiento.fecha_utc
                      ).toLocaleString('es-MX')}
                    </td>

                    <td>{movimiento.tipo_movimiento}</td>

                    <td>{movimiento.descripcion}</td>

                    <td>{formatoDinero(movimiento.monto)}</td>

                    <td>
                      {formatoDinero(
                        movimiento.saldo_resultante
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {historial.total_movimientos === 0 && (
            <p>No hay movimientos registrados todavía.</p>
          )}
        </>
      )}

      <p style={{ fontSize: 13, opacity: 0.75, marginTop: 20 }}>
        Simulación académica. No se realizan operaciones
        con dinero real.
      </p>
    </section>
  )
}

export default CapitalVirtual
