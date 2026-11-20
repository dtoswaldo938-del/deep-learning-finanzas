import { useCallback, useEffect, useState } from 'react'
import './AgentePaperPanel.css'

const API = 'http://127.0.0.1:8001/api/agente-paper'

type Modo = 'ACTIVO' | 'PAUSADO' | 'DETENIDO'
type Estado = { modo: Modo; saldo: number; unidades: number; simbolo: string; ultima_actualizacion: string }
type Decision = {
  id: number; fecha_utc: string; fecha_vela: string | null; simbolo: string
  accion: string; motivo: string; estado: string; precio: number | null
  unidades: number; saldo_final: number | null; equity_final: number | null; modelo: string | null
}
type Respuesta = {
  estado: Estado; historial: Decision[]; capital_inicial: number
  comision: number; exposicion_maxima: number; perdida_diaria_maxima: number
  intervalo_revision_segundos: number; operaciones_reales: boolean; modo_ejecucion: string
}

function numero(valor: number | null | undefined, decimales = 2) {
  return typeof valor === 'number' && Number.isFinite(valor)
    ? valor.toLocaleString('es-MX', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
    : '—'
}
function fecha(valor: string | null | undefined) {
  if (!valor) return '—'
  const d = new Date(valor)
  return Number.isNaN(d.getTime()) ? valor : d.toLocaleString('es-MX')
}

export default function AgentePaperPanel() {
  const [datos, setDatos] = useState<Respuesta | null>(null)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)

  const consultar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true)
    try {
      const r = await fetch(`${API}/estado`, { headers: { 'X-Neural-Local': 'dashboard-v1' }, cache: 'no-store' })
      if (!r.ok) throw new Error(r.status === 401 ? 'Acceso local no autorizado. Abre el dashboard en 127.0.0.1:5174.' : `Error HTTP ${r.status} al consultar el agente.`)
      const json = await r.json() as Respuesta
      if (json.operaciones_reales !== false) throw new Error('Respuesta inesperada: se requiere modo exclusivamente ficticio.')
      setDatos(json); setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo consultar el agente.')
    } finally {
      if (!silencioso) setCargando(false)
    }
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => { void consultar(true) }, 30000)
    return () => window.clearInterval(id)
  }, [consultar])

  async function accion(nombre: 'iniciar' | 'pausar' | 'detener') {
    if (cargando) return
    if (nombre === 'iniciar' && !window.confirm('¿Activar el agente automático de simulación? Puede procesar una vela pendiente con capital ficticio.')) return
    setCargando(true); setMensaje(''); setError('')
    try {
      const r = await fetch(`${API}/${nombre}`, { method: 'POST', headers: { 'X-Neural-Local': 'dashboard-v1' } })
      if (!r.ok) throw new Error(`No se pudo ${nombre}: HTTP ${r.status}`)
      const resultado = await r.json() as { modo?: string }
      setMensaje(`Comando realizado. Estado: ${resultado.modo ?? 'actualizado'}.`)
      await consultar(true)
    } catch (e) { setError(e instanceof Error ? e.message : 'Error de conexión.') }
    finally { setCargando(false) }
  }

  useEffect(() => { void consultar() }, [consultar])

  const estado = datos?.estado
  const ultima = datos?.historial?.[0]
  return (
    <section className="agente-panel">
      <div className="agente-hero">
        <div>
          <span className="agente-eyebrow">NEURAL FINANCE / AGENTE AUTÓNOMO</span>
          <h2>Agente IA · Paper Trading</h2>
          <p>Predicción LSTM + análisis Ollama + reglas deterministas de riesgo. Sin órdenes reales ni claves de exchange.</p>
        </div>
        <span className="agente-chip">● SIMULACIÓN ÚNICAMENTE</span>
      </div>

      <div className="agente-access">
        <div className="agente-access-copy">
          <strong>Demostración local · Sin contraseña</strong>
          <span>Los controles funcionan desde este dashboard local. El backend mantiene autenticación por clave para accesos externos.</span>
        </div>
        <div className="agente-access-form">
          <button type="button" className="agente-primary" disabled={cargando} onClick={() => void consultar()}>{cargando ? 'Cargando…' : 'Actualizar estado'}</button>
        </div>
      </div>

      {error && <p className="agente-alert" role="alert">{error}</p>}
      {mensaje && <p className="agente-message" role="status">{mensaje}</p>}
      {datos && estado && <>
        <div className="agente-kpis">
          <div className="agente-kpi"><span>Estado actual</span><strong className={`agente-status ${estado.modo.toLowerCase()}`}>{estado.modo}</strong><small>Revisión automática cada {datos.intervalo_revision_segundos / 60} minutos</small></div>
          <div className="agente-kpi"><span>Saldo disponible</span><strong>{numero(estado.saldo)} <em>USDT</em></strong><small>Cuenta ficticia independiente</small></div>
          <div className="agente-kpi"><span>Unidades BTC</span><strong>{numero(estado.unidades, 6)}</strong><small>Activo configurado: {estado.simbolo}</small></div>
          <div className="agente-kpi"><span>Patrimonio registrado</span><strong>{numero(ultima?.equity_final ?? datos.capital_inicial)} <em>USDT</em></strong><small>Último valor registrado; no cotización en vivo</small></div>
        </div>

        <div className="agente-section agente-actions">
          <div><h3>Control del agente</h3><p>El planificador solo trabaja cuando el estado es ACTIVO. Pausar o detener no liquida posiciones automáticamente.</p></div>
          <div className="agente-buttons">
            <button type="button" className="agente-start" disabled={cargando || estado.modo === 'ACTIVO'} onClick={() => void accion('iniciar')}>▶ Iniciar</button>
            <button type="button" disabled={cargando || estado.modo !== 'ACTIVO'} onClick={() => void accion('pausar')}>Ⅱ Pausar</button>
            <button type="button" className="agente-stop" disabled={cargando || estado.modo === 'DETENIDO'} onClick={() => void accion('detener')}>■ Detener</button>
            <button type="button" disabled={cargando} onClick={() => void consultar()}>↻ Actualizar</button>
          </div>
        </div>

        <div className="agente-section"><h3>Parámetros de simulación y riesgo</h3>
          <div className="agente-facts"><span>Capital inicial: <b>{numero(datos.capital_inicial)} USDT</b></span><span>Exposición máxima: <b>{numero(datos.exposicion_maxima * 100, 0)}%</b></span><span>Pérdida diaria máxima: <b>{numero(datos.perdida_diaria_maxima * 100, 0)}%</b></span><span>Comisión: <b>{numero(datos.comision, 0)}%</b></span></div>
          <p className="agente-muted">El historial de decisiones es académico. Los resultados pasados no garantizan rendimientos futuros.</p>
        </div>

        <div className="agente-section"><div className="agente-table-title"><div><h3>Historial de decisiones</h3><p>Últimas {datos.historial.length} decisiones guardadas en SQLite</p></div><span>{datos.modo_ejecucion.replaceAll('_', ' + ')}</span></div>
          <div className="agente-table-scroll"><table className="agente-table"><thead><tr><th>Fecha UTC</th><th>Vela</th><th>Activo</th><th>Decisión</th><th>Resultado</th><th>Precio USDT</th><th>Patrimonio USDT</th><th>Modelo</th></tr></thead>
            <tbody>{datos.historial.length === 0 ? <tr><td colSpan={8}>Aún no hay decisiones registradas.</td></tr> : datos.historial.map(d => <tr key={d.id}><td>{fecha(d.fecha_utc)}</td><td>{d.fecha_vela ?? '—'}</td><td>{d.simbolo}</td><td><b>{d.accion}</b></td><td>{d.estado}</td><td>{numero(d.precio)}</td><td>{numero(d.equity_final)}</td><td>{d.modelo ?? '—'}</td></tr>)}</tbody>
          </table></div>
          {ultima && <div className="agente-reason"><b>Última justificación:</b> {ultima.motivo}</div>}
        </div>
      </>}
      {!datos && !error && <div className="agente-empty">Cargando estado del agente local. Comprueba que el backend esté encendido en 127.0.0.1:8001.</div>}
    </section>
  )
}
