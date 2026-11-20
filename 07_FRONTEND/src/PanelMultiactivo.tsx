import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

type Metricas = {
  observaciones: number
  mae: number
  rmse: number
  precision_direccional_porcentaje: number
}
type Evaluacion = {
  status: string
  simbolo: string
  datos: { entrenamiento: number; validacion: number; prueba: number; fecha_fin_prueba: string }
  prueba: { lstm: Metricas; base_cero: Metricas }
  advertencia?: string
}
type Inferencia = {
  status: string
  activo: string
  fecha_emision: string
  fecha_objetivo: string
  rendimiento_estimado_porcentaje: number
  arquitectura: { neuronas_ocultas: number; neuronas_salida: number; longitud_secuencia: number }
  activaciones: number[]
  estado_celda: number[]
  datos_actualizados_en_tiempo_real: boolean
}
type Resultado = { inferencia: Inferencia; evaluacion: Evaluacion }
const API = 'http://127.0.0.1:8001'
const formato = (valor: number, decimales = 4) => Number.isFinite(valor) ? valor.toFixed(decimales) : '—'

export default function PanelMultiactivo({ simbolo }: { simbolo: string }) {
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [modo, setModo] = useState<'hidden' | 'cell'>('hidden')

  useEffect(() => {
    const controlador = new AbortController()
    setResultado(null)
    setError('')
    setCargando(true)
    const consultar = async () => {
      try {
        const parametro = encodeURIComponent(simbolo)
        const [rInferencia, rEvaluacion] = await Promise.all([
          fetch(`${API}/api/modelos-multiactivo/inferencia?simbolo=${parametro}`, { signal: controlador.signal, cache: 'no-store' }),
          fetch(`${API}/api/modelos-multiactivo/evaluacion?simbolo=${parametro}`, { signal: controlador.signal, cache: 'no-store' }),
        ])
        if (rInferencia.status === 404 || rEvaluacion.status === 404) {
          throw new Error(`Todavía no existe un modelo LSTM entrenado para ${simbolo}. Puedes seguir consultando su precio y gráfica.`)
        }
        if (!rInferencia.ok || !rEvaluacion.ok) throw new Error('No fue posible consultar el modelo y su evaluación.')
        const inferencia = (await rInferencia.json()) as Inferencia
        const evaluacion = (await rEvaluacion.json()) as Evaluacion
        if (inferencia.status !== 'ok' || evaluacion.status !== 'ok' || inferencia.activo !== simbolo || evaluacion.simbolo !== simbolo || !Array.isArray(inferencia.activaciones) || !Array.isArray(inferencia.estado_celda)) {
          throw new Error('La respuesta no corresponde al activo seleccionado.')
        }
        if (!controlador.signal.aborted) setResultado({ inferencia, evaluacion })
      } catch (e) {
        if (!controlador.signal.aborted) setError(e instanceof Error ? e.message : 'Error desconocido')
      } finally {
        if (!controlador.signal.aborted) setCargando(false)
      }
    }
    void consultar()
    return () => controlador.abort()
  }, [simbolo])

  const panel: CSSProperties = { background: '#101c30', border: '1px solid #315575', borderRadius: 14, padding: 22, color: '#d8e8fb', marginBottom: 18 }
  const tarjeta: CSSProperties = { background: '#172943', borderRadius: 10, padding: 14, flex: '1 1 170px' }
  if (cargando) return <section style={panel}>Cargando modelo experimental de {simbolo}…</section>
  if (error || !resultado) return <section style={panel}><h3 style={{ color: '#7dd3fc' }}>Modelo multiactivo</h3><p>{error || 'No hay datos disponibles.'}</p></section>

  const { inferencia: pred, evaluacion: eva } = resultado
  const valores = modo === 'hidden' ? pred.activaciones : pred.estado_celda
  const escala = Math.max(0.01, ...valores.map(v => Math.abs(v)))
  return (
    <section style={panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <h3 style={{ color: '#7dd3fc', margin: 0 }}>LSTM experimental · {simbolo}</h3>
        <span style={{ color: '#9db1cf', fontSize: 12 }}>Histórico local · No es tiempo real</span>
      </div>
      <p style={{ fontSize: 13, color: '#a9c1dd' }}>Modelo independiente: {pred.arquitectura.neuronas_ocultas} neuronas ocultas, {pred.arquitectura.neuronas_salida} salida y ventana de {pred.arquitectura.longitud_secuencia} rendimientos diarios.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <div style={tarjeta}><div style={{ fontSize: 12 }}>Rendimiento estimado para el día objetivo</div><strong style={{ fontSize: 24 }}>{formato(pred.rendimiento_estimado_porcentaje)} %</strong><div style={{ fontSize: 12, color: '#9db1cf' }}>Emisión: {pred.fecha_emision}<br/>Objetivo: {pred.fecha_objetivo}</div></div>
        <div style={tarjeta}><div style={{ fontSize: 12 }}>MAE de prueba</div><strong style={{ fontSize: 22 }}>{formato(eva.prueba.lstm.mae, 6)}</strong><div style={{ fontSize: 12, color: '#9db1cf' }}>Referencia: {formato(eva.prueba.base_cero.mae, 6)}</div></div>
        <div style={tarjeta}><div style={{ fontSize: 12 }}>RMSE de prueba</div><strong style={{ fontSize: 22 }}>{formato(eva.prueba.lstm.rmse, 6)}</strong><div style={{ fontSize: 12, color: '#9db1cf' }}>Referencia: {formato(eva.prueba.base_cero.rmse, 6)}</div></div>
        <div style={tarjeta}><div style={{ fontSize: 12 }}>Acierto direccional en prueba</div><strong style={{ fontSize: 22 }}>{formato(eva.prueba.lstm.precision_direccional_porcentaje, 2)} %</strong><div style={{ fontSize: 12, color: '#9db1cf' }}>Referencia: {formato(eva.prueba.base_cero.precision_direccional_porcentaje, 2)} %</div></div>
      </div>
      <div style={{ background: '#0c1728', border: '1px solid #315575', borderRadius: 10, padding: 14, marginTop: 14 }}>
        <strong style={{ color: '#7dd3fc' }}>Lectura de las métricas de prueba</strong>
        <p style={{ color: '#c4d7ee', fontSize: 13, lineHeight: 1.65, margin: '8px 0 0' }}>
          MAE: error absoluto promedio. RMSE: error que penaliza más los desaciertos grandes.
          Para ambos, un valor menor es mejor. El acierto direccional mide coincidencias de dirección histórica.
        </p>
        <p style={{ color: '#c4d7ee', fontSize: 13, lineHeight: 1.65, margin: '8px 0 0' }}>
          Frente al modelo base cero, la LSTM {eva.prueba.lstm.mae < eva.prueba.base_cero.mae ? 'obtuvo un MAE menor' : eva.prueba.lstm.mae > eva.prueba.base_cero.mae ? 'obtuvo un MAE mayor' : 'igualó el MAE'}
          {' '}y {eva.prueba.lstm.precision_direccional_porcentaje > eva.prueba.base_cero.precision_direccional_porcentaje ? 'mejoró el acierto direccional' : eva.prueba.lstm.precision_direccional_porcentaje < eva.prueba.base_cero.precision_direccional_porcentaje ? 'tuvo menor acierto direccional' : 'igualó el acierto direccional'}.
          Son resultados retrospectivos, no garantías de predicción futura.
        </p>
      </div>
      <p style={{ fontSize: 12, color: '#a9c1dd' }}>Evaluación retrospectiva con {eva.prueba.lstm.observaciones} observaciones de prueba hasta {eva.datos.fecha_fin_prueba}. Las métricas son de rendimientos decimales, no de precios ni porcentajes.</p>
      <div style={{ background: '#0c1728', border: '1px solid #315575', borderRadius: 10, padding: 14, marginTop: 14 }}>
        <strong style={{ color: '#7dd3fc' }}>Datos utilizados y alcance del modelo</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
          <div style={tarjeta}><div style={{ fontSize: 12 }}>Muestras de entrenamiento</div><strong>{eva.datos.entrenamiento}</strong></div>
          <div style={tarjeta}><div style={{ fontSize: 12 }}>Muestras de validación</div><strong>{eva.datos.validacion}</strong></div>
          <div style={tarjeta}><div style={{ fontSize: 12 }}>Muestras de prueba</div><strong>{eva.datos.prueba}</strong></div>
          <div style={tarjeta}><div style={{ fontSize: 12 }}>Última fecha de prueba</div><strong>{eva.datos.fecha_fin_prueba}</strong></div>
        </div>
        <p style={{ fontSize: 12, color: '#a9c1dd', marginBottom: 0 }}>
          La estimación de {pred.fecha_objetivo} se calculó con el historial local disponible hasta {pred.fecha_emision}.
          No es una cotización actual ni un resultado observado. Las métricas de prueba resumen observaciones históricas distintas
          de esta estimación. La API consultada no proporciona una fecha exacta de ejecución del entrenamiento.
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 10px' }}>
        <strong>Activaciones internas reales</strong>
        <button type="button" onClick={() => setModo('hidden')} aria-pressed={modo === 'hidden'} style={{ padding: '6px 10px', cursor: 'pointer' }}>Estado oculto</button>
        <button type="button" onClick={() => setModo('cell')} aria-pressed={modo === 'cell'} style={{ padding: '6px 10px', cursor: 'pointer' }}>Estado de celda</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: 7 }}>
        {valores.map((valor, indice) => (
          <div key={`${modo}-${indice}`} title={`Neurona ${indice + 1}: ${formato(valor, 6)}`} style={{ background: valor >= 0 ? `rgba(56,189,248,${0.15 + 0.7 * Math.abs(valor) / escala})` : `rgba(244,114,182,${0.15 + 0.7 * Math.abs(valor) / escala})`, border: '1px solid #45617c', borderRadius: 6, padding: '8px 2px', textAlign: 'center', fontSize: 11 }}>{indice + 1}</div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: '#9db1cf', marginBottom: 0 }}>Predicción experimental basada en el último archivo histórico guardado; no constituye una señal de compra o venta ni demuestra capacidad predictiva futura.</p>
    </section>
  )
}
