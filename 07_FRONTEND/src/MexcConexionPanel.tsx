import { useEffect, useState } from 'react'
import { API_BASE_URL } from './apiConfig'

type Cotizacion = {
  status: string
  fuente: string
  activo: string
  precio: number
  fecha_consulta_utc: string
  operaciones_reales: boolean
}

export default function MexcConexionPanel() {
  const [datos, setDatos] = useState<Cotizacion | null>(null)
  const [error, setError] = useState('')
  const [actualizando, setActualizando] = useState(false)

  useEffect(() => {
    let activo = true

    async function consultar() {
      setActualizando(true)

      try {
        const respuesta = await fetch(
          `${API_BASE_URL}/api/mexc/precio-por-simbolo?simbolo=BTCUSDT`,
          { cache: 'no-store' }
        )

        if (!respuesta.ok) {
          throw new Error(`HTTP ${respuesta.status}`)
        }

        const json = await respuesta.json() as Cotizacion

        if (
          json.status !== 'ok' ||
          json.fuente !== 'MEXC' ||
          json.operaciones_reales !== false ||
          !Number.isFinite(json.precio)
        ) {
          throw new Error('Respuesta de mercado no válida')
        }

        if (activo) {
          setDatos(json)
          setError('')
        }
      } catch {
        if (activo) {
          setError('No se pudo actualizar la conexión con MEXC.')
        }
      } finally {
        if (activo) setActualizando(false)
      }
    }

    void consultar()

    const intervalo = window.setInterval(() => {
      void consultar()
    }, 30000)

    return () => {
      activo = false
      window.clearInterval(intervalo)
    }
  }, [])

  const fecha = datos
    ? new Date(datos.fecha_consulta_utc).toLocaleString('es-MX')
    : 'Sin datos'

  return (
    <div className="agente-section">
      <div className="agente-table-title">
        <div>
          <h3>Conexión con MEXC API</h3>
          <p>Cotización pública de mercado · Actualización cada 30 segundos</p>
        </div>
        <span>
          {error ? 'SIN CONEXIÓN' : datos ? 'CONECTADO' : 'CONECTANDO'}
        </span>
      </div>

      <div className="agente-kpis">
        <div className="agente-kpi">
          <span>Exchange</span>
          <strong>MEXC</strong>
          <small>API pública</small>
        </div>

        <div className="agente-kpi">
          <span>Activo</span>
          <strong>BTCUSDT</strong>
          <small>Mercado de referencia</small>
        </div>

        <div className="agente-kpi">
          <span>Precio de mercado</span>
          <strong>
            {datos
              ? datos.precio.toLocaleString('es-MX', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })
              : '—'} <em>USDT</em>
          </strong>
          <small>{actualizando ? 'Consultando...' : 'Última cotización recibida'}</small>
        </div>

        <div className="agente-kpi">
          <span>Última actualización</span>
          <strong style={{ fontSize: '1rem' }}>{fecha}</strong>
          <small>Operaciones reales desactivadas</small>
        </div>
      </div>

      {error && (
        <p className="agente-alert" role="alert">
          {error}
        </p>
      )}

      <p className="agente-muted">
        Los precios provienen de MEXC. El capital y las operaciones
        pertenecen al simulador independiente de Neural Finance.
      </p>
    </div>
  )
}
