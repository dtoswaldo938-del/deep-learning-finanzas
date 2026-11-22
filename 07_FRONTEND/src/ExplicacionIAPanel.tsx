import { useState } from 'react'
import { API_BASE_URL } from './apiConfig'

type Analisis = {
  estado: string
  simbolo: string
  fecha_vela: string
  rendimiento_estimado: number
  modelo_predictivo: string
  modelo_lenguaje: string
  propuesta: {
    accion: string
    motivo: string
    confianza: string
  }
  datos_vigentes: boolean
  ejecucion: string
  operaciones_reales: boolean
}

export default function ExplicacionIAPanel() {
  const [analisis, setAnalisis] = useState<Analisis | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function consultar() {
    if (cargando) return
    setCargando(true)
    setError('')
    setAnalisis(null)

    try {
      const respuesta = await fetch(
        `${API_BASE_URL}/api/agente-ia/analizar?simbolo=BTCUSDT`,
        { cache: 'no-store' }
      )

      if (!respuesta.ok) {
        throw new Error(`No se pudo completar el analisis: HTTP ${respuesta.status}`)
      }

      const datos = await respuesta.json() as Analisis

      if (datos.operaciones_reales !== false || datos.ejecucion !== 'NO_EJECUTADA') {
        throw new Error('Respuesta inesperada: el analisis debe ser exclusivamente academico.')
      }

      setAnalisis(datos)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexion.')
    } finally {
      setCargando(false)
    }
  }

  const porcentaje = analisis
    ? (analisis.rendimiento_estimado * 100).toFixed(4)
    : null

  return (
    <section style={{
      padding: '22px',
      borderRadius: '16px',
      border: '1px solid #334155',
      background: '#0f172a',
      color: '#e2e8f0',
      marginTop: '20px'
    }}>
      <h3 style={{ marginTop: 0 }}>¿Por qué tomó esta decisión la IA?</h3>
      <p style={{ color: '#94a3b8' }}>
        Consulta la predicción LSTM y la propuesta de Ollama.
        Este análisis no ejecuta operaciones.
      </p>

      <button
        type="button"
        onClick={() => void consultar()}
        disabled={cargando}
        style={{
          padding: '10px 18px',
          borderRadius: '8px',
          background: '#2563eb',
          color: '#fff',
          border: 'none',
          cursor: cargando ? 'wait' : 'pointer'
        }}
      >
        {cargando ? 'Analizando...' : 'Analizar con IA'}
      </button>

      {error && <p role="alert" style={{ color: '#fca5a5' }}>{error}</p>}

      {analisis && (
        <div style={{ marginTop: '20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px'
          }}>
            <div style={{ padding: '15px', background: '#1e293b', borderRadius: '10px' }}>
              <small>Predicción LSTM</small>
              <h2>{porcentaje}%</h2>
            </div>

            <div style={{ padding: '15px', background: '#1e293b', borderRadius: '10px' }}>
              <small>Propuesta de Ollama</small>
              <h2>{analisis.propuesta.accion}</h2>
            </div>

            <div style={{ padding: '15px', background: '#1e293b', borderRadius: '10px' }}>
              <small>Confianza declarada</small>
              <h2>{analisis.propuesta.confianza}</h2>
            </div>
          </div>

          <h4>Explicación de la IA</h4>
          <p>{analisis.propuesta.motivo}</p>

          <p style={{ color: '#94a3b8', fontSize: '13px' }}>
            Activo: {analisis.simbolo} · Vela: {analisis.fecha_vela}
          </p>
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>
            Modelos: {analisis.modelo_predictivo} + {analisis.modelo_lenguaje}
          </p>
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>
            Datos vigentes: {analisis.datos_vigentes ? 'Sí' : 'No'}
          </p>

          <small style={{ color: '#94a3b8' }}>
            Simulación académica. No constituye asesoría financiera.
            No se ejecutaron operaciones reales.
          </small>
        </div>
      )}
    </section>
  )
}
