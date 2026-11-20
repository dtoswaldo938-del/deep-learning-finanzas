import { useEffect, useMemo, useState } from 'react'
import { API_BASE_URL } from './apiConfig'

type Activo = {
  simbolo: string
  precio: number
  cambio_24h: number
  volumen_usdt_24h: number
  estado: string
  senal: string
  explicacion: string
  modelo_lstm: boolean
}

type Respuesta = {
  status: string
  total: number
  actualizado_unix: number
  advertencia?: string
  activos: Activo[]
}

export default function MonitorGeneralMEXC() {
  const [datos, setDatos] = useState<Respuesta | null>(null)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [limite, setLimite] = useState(100)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let activo = true

    const cargar = async () => {
      try {
        const respuesta = await fetch(
          `${API_BASE_URL}/api/mexc/monitor-general`,
          { cache: 'no-store' }
        )
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
        const resultado: Respuesta = await respuesta.json()
        if (activo) {
          setDatos(resultado)
          setError('')
        }
      } catch (e) {
        if (activo) setError(String(e))
      }
    }

    void cargar()
    const intervalo = window.setInterval(() => void cargar(), 15000)

    return () => {
      activo = false
      window.clearInterval(intervalo)
    }
  }, [revision])

  const filas = useMemo(() => {
    return (datos?.activos ?? []).filter(a => {
      if (!a.simbolo.toLowerCase().includes(busqueda.toLowerCase())) return false
      if (filtro === 'lstm' && !a.modelo_lstm) return false
      if (filtro === 'alcista' && a.cambio_24h < 3) return false
      if (filtro === 'bajista' && a.cambio_24h > -3) return false
      return true
    })
  }, [datos, busqueda, filtro])

  const formatoPrecio = (n: number) =>
    n.toLocaleString('en-US', { maximumFractionDigits: n < 1 ? 8 : 4 })

  const formatoVolumen = (n: number) =>
    n.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 2 })

  return (
    <section className="dashboard-card" style={{ padding: 22, marginBottom: 24 }}>
      <h2 style={{ marginTop: 0 }}>Monitor comparativo MEXC</h2>
      <p style={{ color: '#9db1cf' }}>
        Cotizaciones publicas de pares USDT. Actualizacion automatica cada 15 segundos.
        Las tendencias describen el cambio de las ultimas 24 horas;
        no predicen el momento optimo de operar.
      </p>

      <div style={{
        display: 'flex', gap: 12, flexWrap: 'wrap',
        alignItems: 'center', marginBottom: 16
      }}>
        <input
          aria-label="Buscar activo"
          placeholder="Buscar BTC, ETH, SOL..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{
            padding: 10, background: '#101b2d', color: 'white',
            border: '1px solid #30415e', borderRadius: 8
          }}
        />
        <select
          aria-label="Filtrar activos"
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          style={{
            padding: 10, background: '#101b2d', color: 'white',
            border: '1px solid #30415e', borderRadius: 8
          }}
        >
          <option value="todos">Todos los activos</option>
          <option value="lstm">Con modelo LSTM</option>
          <option value="alcista">Tendencia alcista</option>
          <option value="bajista">Tendencia bajista</option>
        </select>
        <button className="monitor-mexc-button" onClick={() => setRevision(n => n + 1)}>
          Actualizar ahora
        </button>
      </div>

      {error && <p role="alert" style={{ color: '#ff9d9d' }}>
        Error de conexion: {error}
      </p>}

      {datos && (
        <p style={{ color: '#9db1cf' }}>
          {datos.total} pares USDT recibidos · {filas.length} coinciden con el filtro
          {' · '}Actualizado: {new Date(datos.actualizado_unix * 1000).toLocaleTimeString()}
          {datos.status === 'cache' ? ' · DATOS NO ACTUALIZADOS' : ''}
        </p>
      )}

      {datos?.advertencia && (
        <p style={{ color: '#ffcf80' }}>{datos.advertencia}</p>
      )}

      <div style={{ overflowX: 'auto', maxHeight: 540, overflowY: 'auto' }}>
        <table className="dashboard-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Activo</th>
              <th>Precio USDT</th>
              <th>Cambio 24h</th>
              <th>Volumen USDT 24h</th>
              <th>Estado tecnico</th>
              <th>Señal académica</th>
              <th>Justificación</th>
              <th>Deep Learning</th>
            </tr>
          </thead>
          <tbody>
            {filas.slice(0, limite).map(a => (
              <tr key={a.simbolo}>
                <td><strong>{a.simbolo}</strong></td>
                <td>{formatoPrecio(a.precio)}</td>
                <td style={{
                  color: a.cambio_24h > 0 ? '#4ade80'
                    : a.cambio_24h < 0 ? '#fb7185' : '#cbd5e1'
                }}>
                  {a.cambio_24h > 0 ? '+' : ''}{a.cambio_24h.toFixed(2)}%
                </td>
                <td>{formatoVolumen(a.volumen_usdt_24h)}</td>
                <td>{a.estado}</td>
                <td>
                  <span style={{
                    fontWeight: 700,
                    color: a.senal === 'VIGILAR COMPRA'
                      ? '#4ade80'
                      : a.senal === 'VIGILAR VENTA'
                        ? '#fb7185'
                        : '#facc15'
                  }}>
                    {a.senal}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: '#a8bad4' }}>
                  {a.explicacion}
                </td>
                <td>{a.modelo_lstm ? 'Modelo disponible' : 'Sin modelo'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filas.length > limite && (
        <button className="monitor-mexc-button" style={{ marginTop: 14 }}
          onClick={() => setLimite(n => n + 100)}>
          Mostrar 100 activos mas
        </button>
      )}

      <p style={{ color: '#8ca4c7', fontSize: 12, marginTop: 16 }}>
        Analisis descriptivo academico. Tendencia alcista: cambio de 24h
        mayor o igual a +3%; bajista: menor o igual a -3%;
        neutral: entre ambos umbrales. No constituye una recomendacion
        de compra o venta. No ejecuta operaciones reales.
      </p>
    </section>
  )
}
