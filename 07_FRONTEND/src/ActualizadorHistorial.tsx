import { useEffect, useState } from 'react'

type Vigencia = {
  status: string
  simbolo: string
  ultima_vela: string
  ultima_vela_esperada: string
  velas: number
  dias_atraso: number
  vigente: boolean
}
type Respuesta = { status: string; mensaje: string; velas_agregadas: number; vigencia: Vigencia }
const API = 'http://127.0.0.1:8001'

export default function ActualizadorHistorial({ simbolo, onActualizado }: { simbolo: string; onActualizado: () => void }) {
  const [datos, setDatos] = useState<Vigencia | null>(null)
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    setDatos(null); setMensaje(''); setError(''); setCargando(true)
    fetch(`${API}/api/modelos-multiactivo/vigencia?simbolo=${encodeURIComponent(simbolo)}`, { signal: controller.signal, cache: 'no-store' })
      .then(async r => { if (!r.ok) throw new Error('No se pudo consultar la vigencia.'); return r.json() as Promise<Vigencia> })
      .then(d => { if (!controller.signal.aborted) setDatos(d) })
      .catch(() => { if (!controller.signal.aborted) setError('No se pudo consultar el historial local.') })
      .finally(() => { if (!controller.signal.aborted) setCargando(false) })
    return () => controller.abort()
  }, [simbolo])

  const actualizar = async () => {
    setActualizando(true); setMensaje(''); setError('')
    try {
      const r = await fetch(`${API}/api/modelos-multiactivo/actualizar-historial?simbolo=${encodeURIComponent(simbolo)}`, { method: 'POST' })
      const cuerpo = await r.json() as Respuesta & { detail?: string }
      if (!r.ok) throw new Error(cuerpo.detail || 'No fue posible actualizar el historial.')
      setDatos(cuerpo.vigencia)
      setMensaje(cuerpo.mensaje)
      if (cuerpo.velas_agregadas > 0) onActualizado()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally { setActualizando(false) }
  }

  return <section style={{ background: '#101c30', color: '#d8e8fb', border: '1px solid #315575', borderRadius: 14, padding: 16, marginBottom: 18 }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <strong style={{ color: '#7dd3fc' }}>Vigencia del historial · {simbolo}</strong>
        <div style={{ fontSize: 13, marginTop: 6 }}>
          {cargando ? 'Consultando datos locales…' : datos ? `Última vela cerrada: ${datos.ultima_vela} (UTC) · ${datos.velas} velas · ${datos.vigente ? 'Actualizado' : `${datos.dias_atraso} día(s) de atraso`}` : 'Sin información de vigencia'}
        </div>
        {datos && <div style={{ fontSize: 12, color: '#9db1cf', marginTop: 4 }}>Última vela esperada: {datos.ultima_vela_esperada} · Modelo sin reentrenamiento automático</div>}
      </div>
      <button type="button" onClick={() => void actualizar()} disabled={actualizando || cargando || !datos} style={{ padding: '10px 14px', borderRadius: 8, cursor: actualizando ? 'wait' : 'pointer' }}>
        {actualizando ? 'Actualizando…' : 'Actualizar historial'}
      </button>
    </div>
    {mensaje && <p role="status" style={{ color: '#86efac', fontSize: 13 }}>{mensaje}</p>}
    {error && <p role="alert" style={{ color: '#fca5a5', fontSize: 13 }}>{error}</p>}
    <p style={{ color: '#9db1cf', fontSize: 12, marginBottom: 0 }}>Solo datos diarios cerrados de MEXC. No modifica los modelos, escaladores, evaluaciones históricas ni realiza operaciones financieras.</p>
  </section>
}
