import { useEffect, useState } from 'react'

type Observacion = { fecha: string; real: number; estimado: number; base_cero: number; error: number }
type Metricas = { mae: number; rmse: number; precision_direccional_porcentaje: number }
type Respuesta = {
  status: string; simbolo: string; observaciones: Observacion[]; total: number
  coincidencia_metricas: boolean; periodo: { inicio: string; fin: string }
  metricas: { lstm: Metricas; base_cero: Metricas }; advertencia: string
}
const API = 'http://127.0.0.1:8001'
const formato = (n: number, d = 4) => n.toFixed(d)
const estilo: React.CSSProperties = { background: '#101c30', color: '#d8e8fb', border: '1px solid #315575', borderRadius: 14, padding: 20, marginBottom: 18 }

function GraficaLineas({ datos }: { datos: Observacion[] }) {
  const w = 900, h = 260, pad = 36
  const valores = datos.flatMap(d => [d.real * 100, d.estimado * 100])
  const min = Math.min(...valores, 0), max = Math.max(...valores, 0)
  const rango = max - min || 1
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, datos.length - 1)
  const y = (v: number) => h - pad - ((v - min) / rango) * (h - pad * 2)
  const linea = (campo: 'real' | 'estimado') => datos.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)},${y(d[campo] * 100).toFixed(2)}`).join(' ')
  return <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Rendimientos diarios observados y estimados en el conjunto de prueba" style={{ width: '100%', height: 'auto' }}>
    {[0, .25, .5, .75, 1].map(p => <g key={p}><line x1={pad} x2={w-pad} y1={pad + p * (h-pad*2)} y2={pad + p * (h-pad*2)} stroke="#2b3e59" /><text x={2} y={pad+p*(h-pad*2)+4} fontSize={11} fill="#9db1cf">{formato(max-p*rango, 1)}%</text></g>)}
    <line x1={pad} x2={w-pad} y1={y(0)} y2={y(0)} stroke="#64748b" strokeDasharray="4 5" />
    <path d={linea('real')} fill="none" stroke="#22d3ee" strokeWidth={2} />
    <path d={linea('estimado')} fill="none" stroke="#f472b6" strokeWidth={2} />
    <text x={pad} y={h-5} fill="#9db1cf" fontSize={11}>{datos[0]?.fecha}</text>
    <text x={w-pad} y={h-5} fill="#9db1cf" fontSize={11} textAnchor="end">{datos[datos.length-1]?.fecha}</text>
  </svg>
}

function GraficaErrores({ datos }: { datos: Observacion[] }) {
  const w = 900, h = 180, pad = 32
  const max = Math.max(0.00001, ...datos.map(d => Math.abs(d.error * 100)))
  const centro = h / 2
  const ancho = (w - pad*2) / Math.max(1, datos.length)
  return <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Errores diarios de predicción en puntos porcentuales" style={{ width: '100%', height: 'auto' }}>
    <line x1={pad} x2={w-pad} y1={centro} y2={centro} stroke="#94a3b8" />
    {datos.map((d, i) => { const valor = d.error * 100; const altura = Math.abs(valor)/max*(centro-20); return <rect key={d.fecha} x={pad+i*ancho+1} y={valor >= 0 ? centro-altura : centro} width={Math.max(1, ancho-2)} height={altura} fill={valor >= 0 ? '#22d3ee' : '#a855f7'}><title>{`${d.fecha}: ${formato(valor, 4)} puntos porcentuales`}</title></rect> })}
    <text x={pad} y={h-4} fill="#9db1cf" fontSize={11}>Error = estimado − observado · puntos porcentuales</text>
  </svg>
}

export default function GraficasEvaluacionMultiactivo({ simbolo }: { simbolo: string }) {
  const [datos, setDatos] = useState<Respuesta | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  useEffect(() => {
    const controller = new AbortController()
    setDatos(null); setError(''); setCargando(true)
    fetch(`${API}/api/modelos-multiactivo/evaluacion-detallada?simbolo=${encodeURIComponent(simbolo)}`, { signal: controller.signal, cache: 'no-store' })
      .then(async r => { if (r.status === 404) throw new Error(`Todavía no existe un modelo entrenado para ${simbolo}.`); if (!r.ok) { const body = await r.json().catch(() => ({})); throw new Error(body.detail || 'No fue posible consultar la evaluación.'); } return r.json() })
      .then((r: Respuesta) => { if (r.status !== 'ok' || r.simbolo !== simbolo || !r.coincidencia_metricas || !Array.isArray(r.observaciones) || !r.observaciones.length) throw new Error('Evaluación incompleta o incompatible.'); if (!controller.signal.aborted) setDatos(r) })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Error de consulta') })
      .finally(() => { if (!controller.signal.aborted) setCargando(false) })
    return () => controller.abort()
  }, [simbolo])
  if (cargando) return <section style={estilo}>Reconstruyendo evaluación de {simbolo}…</section>
  if (error || !datos) return <section style={estilo}><h3>Evaluación detallada · {simbolo}</h3><p role="alert">{error || 'Sin datos.'}</p></section>
  const { lstm, base_cero } = datos.metricas
  const tarjetas = [
    ['MAE · LSTM', formato(lstm.mae, 6)], ['MAE · base cero', formato(base_cero.mae, 6)],
    ['RMSE · LSTM', formato(lstm.rmse, 6)], ['RMSE · base cero', formato(base_cero.rmse, 6)],
  ]
  return <section style={estilo}>
    <h3 style={{ color: '#7dd3fc', marginTop: 0 }}>Evaluación histórica detallada · {simbolo}</h3>
    <p style={{ color: '#a9c1dd', fontSize: 13 }}>{datos.total} observaciones de prueba · {datos.periodo.inicio} a {datos.periodo.fin} · métricas verificadas contra el entrenamiento</p>
    <h4>Rendimientos observados frente a estimados</h4>
    <div style={{ display: 'flex', gap: 18, fontSize: 12, flexWrap: 'wrap' }}><span style={{ color: '#22d3ee' }}>● Observado</span><span style={{ color: '#f472b6' }}>● LSTM estimado</span></div>
    <GraficaLineas datos={datos.observaciones} />
    <h4>Errores diarios de predicción</h4>
    <GraficaErrores datos={datos.observaciones} />
    <h4>Comparación con referencia de rendimiento cero</h4>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>{tarjetas.map(([titulo, valor]) => <div key={titulo} style={{ background: '#172943', borderRadius: 9, padding: 14 }}><div style={{ fontSize: 12, color: '#9db1cf' }}>{titulo}</div><strong style={{ fontSize: 20 }}>{valor}</strong></div>)}</div>
    <p style={{ color: '#a9c1dd', fontSize: 12 }}>Precisión direccional: LSTM {formato(lstm.precision_direccional_porcentaje, 2)} % · Base cero {formato(base_cero.precision_direccional_porcentaje, 2)} %</p>
    <p style={{ color: '#9db1cf', fontSize: 12, marginBottom: 0 }}>{datos.advertencia}</p>
  </section>
}
