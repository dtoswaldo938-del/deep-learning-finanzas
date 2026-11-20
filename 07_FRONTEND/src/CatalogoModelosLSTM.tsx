import { API_BASE_URL } from './apiConfig'
import { useEffect, useState } from 'react'

const API = `${API_BASE_URL}/api/modelos-multiactivo`

type Metricas = {
  observaciones?: number
  mae?: number
  rmse?: number
  precision_direccional_porcentaje?: number
  sesgo?: number
}
type Evaluacion = {
  status?: string
  simbolo?: string
  fecha_entrenamiento_utc?: string
  arquitectura?: { tipo?: string; input_size?: number; hidden_size?: number; num_layers?: number; ventana?: number }
  datos?: {
    muestras_totales?: number
    entrenamiento?: number
    validacion?: number
    prueba?: number
    fecha_inicio_entrenamiento?: string
    fecha_fin_entrenamiento?: string
    fecha_inicio_validacion?: string
    fecha_fin_validacion?: string
    fecha_inicio_prueba?: string
    fecha_fin_prueba?: string
  }
  entrenamiento?: { epocas_realizadas?: number; mejor_epoca?: number; semilla?: number }
  prueba?: { lstm?: Metricas; base_cero?: Metricas }
  advertencia?: string
}
type Fila = { simbolo: string; evaluacion?: Evaluacion; error?: string }
type Props = { revision?: number; onSeleccionar?: (simbolo: string) => void }

const tema = {
  fondo: '#0b172a', tarjeta: '#11223b', borde: '#2a4566', texto: '#e8f2ff',
  tenue: '#a7bbd6', azul: '#37c6ff', verde: '#45e0b3', rojo: '#ff9eaa',
}
const formato = (numero?: number, decimales = 6) =>
  typeof numero === 'number' && Number.isFinite(numero)
    ? numero.toLocaleString('es-MX', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
    : '—'
const entero = (numero?: number) => typeof numero === 'number' ? numero.toLocaleString('es-MX') : '—'
const fecha = (valor?: string) => {
  if (!valor) return '—'
  const d = new Date(valor)
  return Number.isNaN(d.getTime()) ? valor : d.toLocaleString('es-MX')
}

export default function CatalogoModelosLSTM({ revision = 0, onSeleccionar }: Props) {
  const [filas, setFilas] = useState<Fila[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [abierto, setAbierto] = useState<string | null>(null)
  const [recarga, setRecarga] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()
    async function cargar() {
      setCargando(true)
      setError('')
      try {
        const respuesta = await fetch(`${API}/disponibles`, { signal: controlador.signal })
        if (!respuesta.ok) throw new Error('No fue posible consultar los modelos registrados.')
        const listado: { simbolos?: string[] } = await respuesta.json()
        if (!Array.isArray(listado.simbolos)) throw new Error('El catálogo devolvió una respuesta inesperada.')
        const simbolos = listado.simbolos.filter(s => typeof s === 'string')
        const resultados = await Promise.all(simbolos.map(async (simbolo): Promise<Fila> => {
          try {
            const r = await fetch(`${API}/evaluacion?simbolo=${encodeURIComponent(simbolo)}`, { signal: controlador.signal })
            if (!r.ok) throw new Error(`HTTP ${r.status}`)
            const evaluacion: Evaluacion = await r.json()
            return { simbolo, evaluacion }
          } catch (e) {
            if (controlador.signal.aborted) throw e
            return { simbolo, error: e instanceof Error ? e.message : 'Error desconocido' }
          }
        }))
        if (!controlador.signal.aborted) setFilas(resultados)
      } catch (e) {
        if (!controlador.signal.aborted) setError(e instanceof Error ? e.message : 'No se pudo cargar el catálogo.')
      } finally {
        if (!controlador.signal.aborted) setCargando(false)
      }
    }
    void cargar()
    return () => controlador.abort()
  }, [revision, recarga])

  const etiqueta: React.CSSProperties = { color: tema.tenue, fontSize: 12, letterSpacing: '.7px', fontWeight: 700, textTransform: 'uppercase' }
  const boton: React.CSSProperties = { padding: '9px 12px', background: '#173454', color: tema.texto, border: `1px solid ${tema.borde}`, borderRadius: 9, fontWeight: 700, cursor: 'pointer' }

  return (
    <section style={{ background: tema.fondo, border: `1px solid ${tema.borde}`, borderRadius: 18, padding: 'clamp(18px, 3vw, 28px)', color: tema.texto, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <p style={{ ...etiqueta, color: tema.azul, margin: '0 0 8px' }}>NEURAL FINANCE / REGISTRO DE MODELOS</p>
          <h3 style={{ fontSize: 22, margin: '0 0 8px' }}>Catálogo de modelos LSTM</h3>
          <p style={{ color: tema.tenue, fontSize: 13, margin: 0 }}>Evaluaciones retrospectivas de los modelos independientes registrados.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: tema.verde, fontWeight: 800, fontSize: 13 }}>{filas.length} modelos</span>
          <button type="button" style={boton} onClick={() => setRecarga(n => n + 1)} disabled={cargando}>
            {cargando ? 'Consultando…' : 'Actualizar catálogo'}
          </button>
        </div>
      </div>
      {error && <p role="alert" style={{ color: tema.rojo }}>{error}</p>}
      {cargando && <p role="status" style={{ color: tema.tenue }}>Consultando modelos y evaluaciones del servidor…</p>}
      {!cargando && !error && filas.length === 0 && <p style={{ color: tema.tenue }}>No hay modelos registrados.</p>}
      {filas.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 660, fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tema.borde}`, textAlign: 'left' }}>
                {['Activo', 'MAE de prueba', 'RMSE de prueba', 'Acierto direccional', 'Muestras de prueba', 'Detalle'].map(t =>
                  <th key={t} scope="col" style={{ padding: '12px 10px', ...etiqueta }}>{t}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filas.map(fila => {
                const e = fila.evaluacion
                const m = e?.prueba?.lstm
                const expandido = abierto === fila.simbolo
                return (
                  <tr key={fila.simbolo} style={{ borderBottom: `1px solid ${tema.borde}` }}>
                    <td colSpan={6} style={{ padding: 0 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1.2fr) repeat(4, minmax(100px, 1fr)) minmax(100px, .8fr)', alignItems: 'center', minWidth: 660 }}>
                        <div style={{ padding: '14px 10px', fontWeight: 800, color: tema.azul }}>{fila.simbolo}</div>
                        <div style={{ padding: '14px 10px' }}>{formato(m?.mae)}</div>
                        <div style={{ padding: '14px 10px' }}>{formato(m?.rmse)}</div>
                        <div style={{ padding: '14px 10px' }}>{formato(m?.precision_direccional_porcentaje, 2)}{m?.precision_direccional_porcentaje != null ? ' %' : ''}</div>
                        <div style={{ padding: '14px 10px' }}>{entero(e?.datos?.prueba ?? m?.observaciones)}</div>
                        <div style={{ padding: '10px' }}><button type="button" style={boton} aria-expanded={expandido} onClick={() => setAbierto(expandido ? null : fila.simbolo)}>{expandido ? 'Ocultar' : 'Ver detalles'}</button></div>
                      </div>
                      {expandido && (
                        <div style={{ background: tema.tarjeta, borderTop: `1px solid ${tema.borde}`, padding: 18, borderRadius: 10, margin: '0 4px 12px' }}>
                          {fila.error ? <p role="alert" style={{ color: tema.rojo }}>No se pudo cargar la evaluación: {fila.error}</p> : (
                            <>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 16 }}>
                                <div><div style={etiqueta}>Entrenamiento realizado (UTC)</div><strong>{fecha(e?.fecha_entrenamiento_utc)}</strong></div>
                                <div><div style={etiqueta}>Periodo de entrenamiento</div><strong>{e?.datos?.fecha_inicio_entrenamiento ?? '—'} a {e?.datos?.fecha_fin_entrenamiento ?? '—'}</strong></div>
                                <div><div style={etiqueta}>Periodo de prueba</div><strong>{e?.datos?.fecha_inicio_prueba ?? '—'} a {e?.datos?.fecha_fin_prueba ?? '—'}</strong></div>
                                <div><div style={etiqueta}>Muestras (total / entrenamiento / validación / prueba)</div><strong>{entero(e?.datos?.muestras_totales)} / {entero(e?.datos?.entrenamiento)} / {entero(e?.datos?.validacion)} / {entero(e?.datos?.prueba)}</strong></div>
                                <div><div style={etiqueta}>Arquitectura</div><strong>{e?.arquitectura?.tipo ?? 'LSTM'} · {entero(e?.arquitectura?.hidden_size)} ocultas · {entero(e?.arquitectura?.num_layers)} capa(s) · ventana {entero(e?.arquitectura?.ventana)}</strong></div>
                                <div><div style={etiqueta}>Épocas realizadas / mejor época</div><strong>{entero(e?.entrenamiento?.epocas_realizadas)} / {entero(e?.entrenamiento?.mejor_epoca)}</strong></div>
                              </div>
                              <div style={{ borderTop: `1px solid ${tema.borde}`, paddingTop: 12 }}>
                                <strong>Comparación en prueba: LSTM frente a modelo base cero</strong>
                                <p style={{ color: tema.tenue, fontSize: 12, margin: '9px 0' }}>MAE: {formato(m?.mae)} frente a {formato(e?.prueba?.base_cero?.mae)} · RMSE: {formato(m?.rmse)} frente a {formato(e?.prueba?.base_cero?.rmse)}</p>
                                <p style={{ color: tema.tenue, fontSize: 12, margin: '0 0 12px' }}>Acierto direccional: {formato(m?.precision_direccional_porcentaje, 2)} % frente a {formato(e?.prueba?.base_cero?.precision_direccional_porcentaje, 2)} %</p>
                              </div>
                              {onSeleccionar && <button type="button" style={boton} onClick={() => onSeleccionar(fila.simbolo)}>Seleccionar {fila.simbolo} en Neural Finance</button>}
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ color: tema.tenue, fontSize: 13, lineHeight: 1.6, margin: '18px 0 0' }}>Las métricas corresponden a rendimientos diarios en el conjunto de prueba histórico. No garantizan precisión futura ni representan operaciones reales.</p>
    </section>
  )
}
