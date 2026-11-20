import { useCallback, useEffect, useState } from 'react'
import { API_BASE_URL } from './apiConfig'
import './RendimientoPaperPanel.css'

type Operacion = {
  id: number
  fecha: string
  activo: string
  tipo: string
  cantidad: number
  precio: number
  importe: number
  saldo_final: number | null
  patrimonio_registrado: number | null
  ganancia_realizada: number | null
}

type Resumen = {
  capital_inicial: number
  saldo_disponible: number
  patrimonio_actual: number | null
  ganancia_total: number | null
  rendimiento_porcentaje: number | null
  ganancia_realizada: number
  ganancia_no_realizada: number | null
  posicion: {
    activo: string
    unidades: number
    precio_actual: number | null
    valor_actual: number | null
    costo_contable: number
  }
  numero_compras: number
  numero_ventas: number
  total_operaciones: number
  operaciones: Operacion[]
  curva_historica: { fecha: string; patrimonio: number }[]
  fuente_precio: string
  operaciones_reales: boolean
}

function formato(n: number | null | undefined, decimales = 2) {
  return typeof n === 'number' && Number.isFinite(n)
    ? n.toLocaleString('es-MX', {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
      })
    : 'N/D'
}

function fecha(valor: string) {
  const d = new Date(valor)
  return Number.isNaN(d.getTime()) ? valor : d.toLocaleString('es-MX')
}

export default function RendimientoPaperPanel() {
  const [datos, setDatos] = useState<Resumen | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const r = await fetch(
        `${API_BASE_URL}/api/agente-paper/rendimiento`,
        {
          headers: { 'X-Neural-Local': 'dashboard-v1' },
          cache: 'no-store'
        }
      )
      if (!r.ok) throw new Error(`Error HTTP ${r.status}`)
      const json = await r.json() as Resumen
      if (json.operaciones_reales !== false) {
        throw new Error('Solo se permite simulacion.')
      }
      setDatos(json)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexion')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
    const id = window.setInterval(() => void cargar(), 30000)
    return () => window.clearInterval(id)
  }, [cargar])

  if (!datos) {
    return (
      <div className="rp-section">
        <h3>Operaciones y rendimiento</h3>
        <p>{error || 'Cargando datos de la simulacion...'}</p>
      </div>
    )
  }

  const puntos = datos.curva_historica
  const valores = puntos.map(p => p.patrimonio)
  const minimo = Math.min(...valores, datos.capital_inicial) - 1
  const maximo = Math.max(...valores, datos.capital_inicial) + 1
  const rango = Math.max(1, maximo - minimo)
  const coordenadas = puntos.map((p, i) => {
    const x = 20 + (i / Math.max(1, puntos.length - 1)) * 760
    const y = 185 - ((p.patrimonio - minimo) / rango) * 150
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="rp-contenedor">
      <div className="rp-section">
        <div className="rp-encabezado">
          <div>
            <h3>Resumen de operaciones y rendimiento</h3>
            <p>Cuenta ficticia independiente · BTC/USDT · Sin operaciones reales</p>
          </div>
          <button type="button" onClick={() => void cargar()} disabled={cargando}>
            {cargando ? 'Actualizando...' : 'Actualizar rendimiento'}
          </button>
        </div>

        {error && <p className="rp-error">{error}</p>}

        <div className="rp-kpis">
          <div className="rp-kpi">
            <span>Capital inicial</span>
            <strong>{formato(datos.capital_inicial)}</strong>
            <small>USDT · Referencia fija</small>
          </div>
          <div className="rp-kpi">
            <span>Saldo disponible</span>
            <strong>{formato(datos.saldo_disponible)}</strong>
            <small>USDT · Efectivo ficticio</small>
          </div>
          <div className="rp-kpi">
            <span>Patrimonio actual</span>
            <strong>{formato(datos.patrimonio_actual)}</strong>
            <small>USDT · {datos.fuente_precio}</small>
          </div>
          <div className="rp-kpi">
            <span>Ganancia / perdida total</span>
            <strong className={
              datos.ganancia_total === null ? '' :
              datos.ganancia_total >= 0 ? 'rp-positivo' : 'rp-negativo'
            }>
              {formato(datos.ganancia_total)}
            </strong>
            <small>USDT · Respecto al capital inicial</small>
          </div>
          <div className="rp-kpi">
            <span>Rendimiento total</span>
            <strong className={
              datos.rendimiento_porcentaje === null ? '' :
              datos.rendimiento_porcentaje >= 0 ? 'rp-positivo' : 'rp-negativo'
            }>
              {formato(datos.rendimiento_porcentaje)}%
            </strong>
            <small>Variacion del patrimonio</small>
          </div>
          <div className="rp-kpi">
            <span>Ganancia realizada</span>
            <strong>{formato(datos.ganancia_realizada)}</strong>
            <small>USDT · Ventas ejecutadas</small>
          </div>
          <div className="rp-kpi">
            <span>Ganancia no realizada</span>
            <strong>{formato(datos.ganancia_no_realizada)}</strong>
            <small>USDT · Posicion abierta</small>
          </div>
          <div className="rp-kpi">
            <span>Operaciones ejecutadas</span>
            <strong>{datos.total_operaciones}</strong>
            <small>{datos.numero_compras} compras · {datos.numero_ventas} ventas</small>
          </div>
        </div>
      </div>

      <div className="rp-grid">
        <div className="rp-section">
          <h3>Evolucion del patrimonio</h3>
          <p>Valores registrados al finalizar cada decision del agente</p>
          <svg
            className="rp-grafica"
            viewBox="0 0 800 220"
            role="img"
            aria-label="Grafica historica del patrimonio simulado"
          >
            <line x1="20" y1="185" x2="780" y2="185" stroke="#38506d" />
            <line x1="20" y1="35" x2="20" y2="185" stroke="#38506d" />
            <polyline
              points={coordenadas}
              fill="none"
              stroke="#36d6e7"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {puntos.length === 1 && (
              <circle cx="20" cy="110" r="5" fill="#36d6e7" />
            )}
            <text x="20" y="210" fill="#9db6d4" fontSize="14">
              Inicio
            </text>
            <text x="780" y="210" textAnchor="end" fill="#9db6d4" fontSize="14">
              {puntos.length - 1} decisiones
            </text>
          </svg>
          <p className="rp-nota">
            La grafica utiliza el patrimonio registrado historicamente.
            No representa cotizaciones continuas en vivo.
          </p>
        </div>

        <div className="rp-section">
          <h3>Posicion abierta</h3>
          <p>Valoracion de las unidades que mantiene la simulacion</p>
          <div className="rp-detalle">
            <div><span>Activo</span><b>{datos.posicion.activo}</b></div>
            <div><span>Unidades</span><b>{formato(datos.posicion.unidades, 6)}</b></div>
            <div><span>Precio de referencia</span><b>{formato(datos.posicion.precio_actual)} USDT</b></div>
            <div><span>Valor de la posicion</span><b>{formato(datos.posicion.valor_actual)} USDT</b></div>
            <div><span>Costo contable</span><b>{formato(datos.posicion.costo_contable)} USDT</b></div>
          </div>
          <p className="rp-nota">
            {datos.posicion.unidades === 0
              ? 'Actualmente no hay posiciones abiertas.'
              : `Fuente de precio: ${datos.fuente_precio}.`}
          </p>
        </div>
      </div>

      <div className="rp-section">
        <div className="rp-encabezado">
          <div>
            <h3>Historial de operaciones</h3>
            <p>Compras y ventas simuladas guardadas en SQLite</p>
          </div>
          <span className="rp-etiqueta">PAPER TRADING</span>
        </div>

        <div className="rp-tabla-scroll">
          <table className="rp-tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Activo</th>
                <th>Operacion</th>
                <th>Cantidad</th>
                <th>Precio USDT</th>
                <th>Importe USDT</th>
                <th>Ganancia realizada</th>
                <th>Saldo final</th>
              </tr>
            </thead>
            <tbody>
              {datos.operaciones.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    Todavia no se han ejecutado compras ni ventas simuladas.
                    Las decisiones MANTENER no se cuentan como operaciones.
                  </td>
                </tr>
              ) : datos.operaciones.map(op => (
                <tr key={op.id}>
                  <td>{fecha(op.fecha)}</td>
                  <td>{op.activo}</td>
                  <td>
                    <span className={
                      op.tipo === 'COMPRA' ? 'rp-positivo' : 'rp-negativo'
                    }>{op.tipo}</span>
                  </td>
                  <td>{formato(op.cantidad, 6)}</td>
                  <td>{formato(op.precio, 4)}</td>
                  <td>{formato(op.importe)}</td>
                  <td>{op.ganancia_realizada === null
                    ? '—'
                    : `${formato(op.ganancia_realizada)} USDT`}</td>
                  <td>{formato(op.saldo_final)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
