import { API_BASE_URL } from './apiConfig'
import { useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip,
  XAxis, YAxis,
} from 'recharts'

const API = `${API_BASE_URL}/api/modelos-multiactivo`
const AZUL = '#37c6ff'
const VIOLETA = '#a78bfa'
const VERDE = '#45e0b3'
const FONDO = '#0b172a'
const BORDE = '#2a4566'

type Metrica = { mae?: number; rmse?: number; precision_direccional_porcentaje?: number; observaciones?: number }
type Evaluacion = {
  simbolo?: string
  datos?: { prueba?: number; fecha_inicio_prueba?: string; fecha_fin_prueba?: string }
  prueba?: { lstm?: Metrica; base_cero?: Metrica }
}
type Fila = { simbolo: string; evaluacion?: Evaluacion; error?: string }
type Indicador = 'mae' | 'rmse' | 'precision_direccional_porcentaje'

const etiquetas: Record<Indicador, string> = {
  mae: 'Error absoluto medio (MAE)',
  rmse: 'Raíz del error cuadrático medio (RMSE)',
  precision_direccional_porcentaje: 'Acierto direccional (%)',
}
const definiciones: Record<Indicador, string> = {
  mae: 'MAE: promedio del valor absoluto de los errores de rendimiento diario. Menor es mejor.',
  rmse: 'RMSE: raíz del promedio de errores al cuadrado; penaliza más los errores grandes. Menor es mejor.',
  precision_direccional_porcentaje: 'Acierto direccional: porcentaje de observaciones cuya dirección estimada coincidió con la observada. Mayor es mejor.',
}
const formato = (v: number | undefined, decimales = 6) =>
  typeof v === 'number' && Number.isFinite(v)
    ? v.toLocaleString('es-MX', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
    : '—'

export default function ComparadorModelosMultiactivo() {
  const [filas, setFilas] = useState<Fila[]>([])
  const [seleccionados, setSeleccionados] = useState<string[]>([])
  const [indicador, setIndicador] = useState<Indicador>('mae')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()
    const cargar = async () => {
      setCargando(true)
      setError('')
      try {
        const respuesta = await fetch(`${API}/disponibles`, { signal: controlador.signal })
        if (!respuesta.ok) throw new Error('No fue posible consultar los modelos disponibles.')
        const listado: { simbolos?: string[] } = await respuesta.json()
        if (!Array.isArray(listado.simbolos)) throw new Error('El servidor devolvió un catálogo inesperado.')
        const simbolos = listado.simbolos.filter(s => typeof s === 'string')
        const resultados = await Promise.all(simbolos.map(async (simbolo): Promise<Fila> => {
          try {
            const r = await fetch(`${API}/evaluacion?simbolo=${encodeURIComponent(simbolo)}`, { signal: controlador.signal })
            if (!r.ok) throw new Error(`Error HTTP ${r.status}`)
            return { simbolo, evaluacion: await r.json() as Evaluacion }
          } catch (e) {
            if (controlador.signal.aborted) throw e
            return { simbolo, error: e instanceof Error ? e.message : 'Error desconocido' }
          }
        }))
        if (!controlador.signal.aborted) {
          setFilas(resultados)
          setSeleccionados(prev => prev.length ? simbolos.filter(s => prev.includes(s)) : simbolos)
        }
      } catch (e) {
        if (!controlador.signal.aborted) setError(e instanceof Error ? e.message : 'Error de conexión')
      } finally {
        if (!controlador.signal.aborted) setCargando(false)
      }
    }
    void cargar()
    return () => controlador.abort()
  }, [revision])

  const datos = useMemo(() => filas.filter(f => seleccionados.includes(f.simbolo) && f.evaluacion?.prueba?.lstm).map(f => ({
    activo: f.simbolo.replace(/USDT$/, ''),
    lstm: f.evaluacion?.prueba?.lstm?.[indicador] ?? null,
    base: f.evaluacion?.prueba?.base_cero?.[indicador] ?? null,
    muestras: f.evaluacion?.datos?.prueba ?? f.evaluacion?.prueba?.lstm?.observaciones,
    inicio: f.evaluacion?.datos?.fecha_inicio_prueba,
    fin: f.evaluacion?.datos?.fecha_fin_prueba,
  })), [filas, seleccionados, indicador])

  const interpretaciones = datos.map(d => {
    if (typeof d.lstm !== 'number' || typeof d.base !== 'number' || !Number.isFinite(d.lstm) || !Number.isFinite(d.base)) {
      return { activo: d.activo, texto: 'No hay métricas suficientes para comparar este activo.', favorable: false }
    }
    const menorEsMejor = indicador !== 'precision_direccional_porcentaje'
    const diferencia = menorEsMejor ? d.base - d.lstm : d.lstm - d.base
    const tolerancia = 1e-10
    const favorable = diferencia > tolerancia
    const empate = Math.abs(diferencia) <= tolerancia
    const unidad = menorEsMejor ? 'de rendimiento decimal' : 'puntos porcentuales'
    const magnitud = formato(Math.abs(diferencia), menorEsMejor ? 6 : 2)
    const porcentajeRelativo = menorEsMejor && d.base > 0
      ? ` (${formato(Math.abs(diferencia) / d.base * 100, 2)} % respecto a la base)`
      : ''
    const texto = empate
      ? `La LSTM y el modelo base cero obtuvieron prácticamente el mismo resultado en ${etiquetas[indicador]}.`
      : favorable
        ? `La LSTM ${menorEsMejor ? 'redujo el error' : 'aumentó el acierto direccional'} en ${magnitud} ${unidad}${porcentajeRelativo} frente al modelo base cero.`
        : `La LSTM ${menorEsMejor ? 'presentó un error mayor' : 'tuvo un acierto direccional menor'} por ${magnitud} ${unidad}${porcentajeRelativo} frente al modelo base cero.`
    return { activo: d.activo, texto, favorable }
  })

  const estiloBoton: React.CSSProperties = { background: '#173454', color: '#e8f2ff', border: `1px solid ${BORDE}`, borderRadius: 9, padding: '9px 12px', cursor: 'pointer', fontWeight: 700 }
  return (
    <section style={{ background: FONDO, border: `1px solid ${BORDE}`, borderRadius: 18, padding: 'clamp(18px, 3vw, 28px)', color: '#e8f2ff', marginBottom: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
        <div>
          <p style={{ fontSize: 12, color: AZUL, fontWeight: 800, letterSpacing: 1, margin: '0 0 8px' }}>NEURAL FINANCE / ANÁLISIS MULTIACTIVO</p>
          <h3 style={{ fontSize: 22, margin: '0 0 8px' }}>Comparador visual de modelos LSTM</h3>
          <p style={{ color: '#a7bbd6', fontSize: 13, margin: 0 }}>Comparación retrospectiva de cada LSTM con su modelo base de rendimiento cero.</p>
        </div>
        <button type="button" style={estiloBoton} disabled={cargando} onClick={() => setRevision(n => n + 1)}>{cargando ? 'Consultando…' : 'Actualizar comparador'}</button>
      </div>
      {error && <p role="alert" style={{ color: '#ff9eaa' }}>{error}</p>}
      {cargando && <p role="status" style={{ color: '#a7bbd6' }}>Consultando las evaluaciones de FastAPI…</p>}
      {!cargando && !error && filas.length === 0 && <p>No hay modelos registrados.</p>}
      {filas.length > 0 && <>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
          {filas.map(f => <label key={f.simbolo} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 12px', background: '#11223b', border: `1px solid ${BORDE}`, borderRadius: 9, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={seleccionados.includes(f.simbolo)} onChange={e => setSeleccionados(prev => e.target.checked ? [...prev, f.simbolo] : prev.filter(s => s !== f.simbolo))} />
            {f.simbolo}
          </label>)}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {(Object.keys(etiquetas) as Indicador[]).map(clave => <button key={clave} type="button" onClick={() => setIndicador(clave)} aria-pressed={indicador === clave} style={{ ...estiloBoton, borderColor: indicador === clave ? AZUL : BORDE, background: indicador === clave ? '#123a56' : '#173454' }}>{etiquetas[clave]}</button>)}
        </div>
        <div style={{ background: '#11243c', border: `1px solid ${BORDE}`, borderRadius: 12, padding: '13px 16px', marginBottom: 14 }}>
          <strong style={{ color: AZUL, fontSize: 14 }}>¿Cómo interpretar {etiquetas[indicador]}?</strong>
          <p style={{ margin: '7px 0 0', color: '#c5d7ed', fontSize: 13, lineHeight: 1.65 }}>{definiciones[indicador]}</p>
          <p style={{ margin: '6px 0 0', color: '#9db1cf', fontSize: 12 }}>Cada comparación utiliza las muestras de prueba históricas del mismo activo. No indica cuál criptomoneda tendrá mejores resultados futuros.</p>
        </div>
        {datos.length > 0 ? <>
          <div style={{ height: Math.max(300, datos.length * 62 + 90), width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datos} layout="vertical" margin={{ top: 12, right: 25, left: 4, bottom: 8 }}>
                <CartesianGrid stroke="#263b57" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 'auto']} tick={{ fill: '#a7bbd6', fontSize: 13 }} tickFormatter={v => indicador === 'precision_direccional_porcentaje' ? `${v}%` : Number(v).toFixed(3)} />
                <YAxis type="category" dataKey="activo" width={58} tick={{ fill: '#e8f2ff', fontSize: 13 }} />
                <Tooltip contentStyle={{ background: '#11223b', border: `1px solid ${BORDE}`, borderRadius: 10, color: '#e8f2ff' }} formatter={(value, name) => [formato(typeof value === 'number' ? value : undefined, indicador === 'precision_direccional_porcentaje' ? 2 : 6) + (indicador === 'precision_direccional_porcentaje' ? ' %' : ''), name === 'lstm' ? 'Red LSTM' : 'Modelo base cero']} />
                <Legend wrapperStyle={{ fontSize: 13 }} formatter={v => v === 'lstm' ? 'Red LSTM' : 'Modelo base cero'} />
                <Bar dataKey="lstm" fill={AZUL} radius={[0, 5, 5, 0]} maxBarSize={20} />
                <Bar dataKey="base" fill={VIOLETA} radius={[0, 5, 5, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 570, fontSize: 14 }}>
              <thead><tr style={{ textAlign: 'left', borderBottom: `1px solid ${BORDE}` }}><th style={{ padding: 10 }}>Activo</th><th>LSTM</th><th>Base cero</th><th>Muestras de prueba</th><th>Periodo de prueba</th></tr></thead>
              <tbody>{datos.map(d => <tr key={d.activo} style={{ borderBottom: `1px solid ${BORDE}` }}><td style={{ padding: 10, color: VERDE, fontWeight: 700 }}>{d.activo}</td><td>{formato(d.lstm ?? undefined, indicador === 'precision_direccional_porcentaje' ? 2 : 6)}</td><td>{formato(d.base ?? undefined, indicador === 'precision_direccional_porcentaje' ? 2 : 6)}</td><td>{d.muestras ?? '—'}</td><td>{d.inicio ?? '—'} a {d.fin ?? '—'}</td></tr>)}</tbody>
            </table>
          </div>
          <div style={{ marginTop: 20 }}>
            <h4 style={{ fontSize: 17, margin: '0 0 10px', color: '#e8f2ff' }}>Interpretación automática de los resultados</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 10 }}>
              {interpretaciones.map(item => <div key={item.activo} style={{ border: `1px solid ${BORDE}`, background: '#11223b', borderRadius: 11, padding: 14 }}>
                <strong style={{ color: item.favorable ? VERDE : '#d6e6fa', fontSize: 14 }}>{item.activo}</strong>
                <p style={{ fontSize: 13, lineHeight: 1.65, color: '#c5d7ed', margin: '7px 0 0' }}>{item.texto}</p>
              </div>)}
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.65, color: '#a7bbd6' }}>Las diferencias son descriptivas, no pruebas de significancia estadística. Una mejora histórica pequeña no demuestra capacidad predictiva futura. En MAE y RMSE, la diferencia relativa se calcula respecto al error del modelo base cero.</p>
          </div>
        </> : <p style={{ color: '#a7bbd6' }}>Selecciona al menos un activo con evaluación disponible.</p>}
        {filas.some(f => f.error) && <p role="alert" style={{ color: '#ff9eaa', fontSize: 12 }}>No se pudieron consultar algunas evaluaciones: {filas.filter(f => f.error).map(f => f.simbolo).join(', ')}.</p>}
      </>}
      <p style={{ color: '#a7bbd6', fontSize: 12, lineHeight: 1.6, margin: '18px 0 0' }}>Interpretación: para MAE y RMSE, un valor menor representa menos error; para acierto direccional, un valor mayor representa más coincidencias históricas. Los errores están expresados en rendimientos diarios, no en USDT. Los resultados de distintos activos no garantizan comparabilidad predictiva futura. Experimento académico sin operaciones reales.</p>
    </section>
  )
}
