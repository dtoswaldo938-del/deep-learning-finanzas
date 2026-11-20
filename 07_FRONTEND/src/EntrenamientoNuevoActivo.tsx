import { useCallback, useEffect, useRef, useState } from 'react'

const API = 'http://127.0.0.1:8001/api/entrenamiento-activos'

type Estado = {
  estado: string
  simbolo: string | null
  mensaje: string
  registro: string[]
  inicio_utc?: string | null
  fin_utc?: string | null
}
type Props = { simbolo: string; tieneModelo: boolean; onModeloCreado: () => void }

const colores = {
  fondo: '#0b172a', tarjeta: '#11223b', borde: '#2a4566', texto: '#e8f2ff',
  tenue: '#a7bbd6', azul: '#37c6ff', verde: '#45e0b3', amarillo: '#ffd078', rojo: '#ff9eaa',
}

function fechaLegible(valor?: string | null) {
  if (!valor) return '—'
  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime()) ? valor : fecha.toLocaleString('es-MX')
}

function resumirRegistro(registro: string[]) {
  const texto = registro.join('\n')
  const velas = texto.match(/["']?velas_cerradas["']?\s*:\s*(\d+)/i)?.[1]
  const total = texto.match(/["']?muestras_totales["']?\s*:\s*(\d+)/i)?.[1]
  const prueba = texto.match(/["']?prueba["']?\s*:\s*(\d+)/i)?.[1]
  return { velas, total, prueba }
}

export default function EntrenamientoNuevoActivo({ simbolo, tieneModelo, onModeloCreado }: Props) {
  const [estado, setEstado] = useState<Estado | null>(null)
  const [error, setError] = useState('')
  const [velasHistorial, setVelasHistorial] = useState<number | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [mostrarRegistro, setMostrarRegistro] = useState(false)
  const estadoAnterior = useRef<Estado | null>(null)
  const notificarModelo = useRef(onModeloCreado)

  useEffect(() => { notificarModelo.current = onModeloCreado }, [onModeloCreado])

  const consultar = useCallback(async (signal?: AbortSignal) => {
    try {
      const respuesta = await fetch(`${API}/estado`, { signal })
      if (!respuesta.ok) throw new Error('No se pudo consultar el entrenamiento')
      const datos: Estado = await respuesta.json()
      if (signal?.aborted) return
      const anterior = estadoAnterior.current
      estadoAnterior.current = datos
      setEstado(datos)
      setError('')
      if (anterior?.estado === 'entrenando' && datos.estado === 'completado') {
        notificarModelo.current()
      }
    } catch (e) {
      if (signal?.aborted) return
      setError(e instanceof Error ? e.message : 'No se pudo consultar el estado del servidor')
    }
  }, [])

  useEffect(() => {
    const controlador = new AbortController()
    void consultar(controlador.signal)
    const intervalo = window.setInterval(() => void consultar(controlador.signal), 3000)
    return () => { controlador.abort(); window.clearInterval(intervalo) }
  }, [consultar])

  // La vigencia pertenece al activo seleccionado, no a la última tarea global.
  // Son velas del historial disponible, no necesariamente las velas usadas al entrenar.
  useEffect(() => {
    const controlador = new AbortController()
    setVelasHistorial(null)
    async function cargarHistorial() {
      try {
        const respuesta = await fetch(
          `http://127.0.0.1:8001/api/modelos-multiactivo/vigencia?simbolo=${encodeURIComponent(simbolo)}`,
          { signal: controlador.signal },
        )
        if (!respuesta.ok) return
        const datos: { velas?: number } = await respuesta.json()
        if (!controlador.signal.aborted && typeof datos.velas === 'number' && Number.isFinite(datos.velas)) {
          setVelasHistorial(datos.velas)
        }
      } catch {
        // Si no hay historial, se mantiene un guion en lugar de inventar una cifra.
      }
    }
    void cargarHistorial()
    return () => controlador.abort()
  }, [simbolo, estado?.estado, estado?.simbolo])

  const iniciar = async () => {
    if (tieneModelo || enviando || estado?.estado === 'entrenando') return
    setEnviando(true)
    setError('')
    setMostrarRegistro(false)
    try {
      const respuesta = await fetch(`${API}/iniciar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simbolo }),
      })
      const datos = await respuesta.json()
      if (!respuesta.ok) {
        throw new Error(typeof datos.detail === 'string' ? datos.detail : 'No se pudo iniciar el entrenamiento')
      }
      estadoAnterior.current = datos
      setEstado(datos)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
    } finally {
      setEnviando(false)
    }
  }

  const trabajando = estado?.estado === 'entrenando'
  const trabajoDelActivo = estado?.simbolo === simbolo
  const completado = estado?.estado === 'completado' && trabajoDelActivo
  const fallo = estado?.estado === 'error' && trabajoDelActivo
  const deshabilitado = tieneModelo || trabajando || enviando
  const resumen = resumirRegistro(trabajoDelActivo ? (estado?.registro ?? []) : [])
  const estadoVisible = trabajando
    ? `Entrenando ${estado?.simbolo ?? 'activo'}…`
    : tieneModelo || completado
      ? 'Modelo disponible'
      : fallo
        ? 'Entrenamiento fallido'
        : 'Sin modelo entrenado'
  const colorEstado = trabajando ? colores.amarillo : tieneModelo || completado ? colores.verde : fallo ? colores.rojo : colores.azul

  const tarjeta: React.CSSProperties = {
    padding: '15px 17px', borderRadius: 12, background: colores.tarjeta,
    border: `1px solid ${colores.borde}`, minWidth: 0,
  }
  const etiqueta: React.CSSProperties = {
    fontSize: 12, letterSpacing: '.8px', fontWeight: 800, textTransform: 'uppercase',
    color: colores.tenue, margin: 0,
  }

  return (
    <section style={{ padding: 'clamp(18px, 3vw, 30px)', border: `1px solid ${colores.borde}`, borderRadius: 18, background: `linear-gradient(145deg, ${colores.fondo}, #101e37)`, marginBottom: 20, color: colores.texto, boxShadow: '0 14px 42px #00000020' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ ...etiqueta, color: colores.azul, marginBottom: 9 }}>NEURAL FINANCE / LABORATORIO DE IA</p>
          <h3 style={{ fontSize: 'clamp(19px, 2.2vw, 26px)', margin: '0 0 9px', letterSpacing: '-.5px' }}>Centro de entrenamiento neuronal</h3>
          <p style={{ color: colores.tenue, margin: 0, fontSize: 13, lineHeight: 1.6 }}>Entrena modelos LSTM independientes a partir de velas diarias cerradas de MEXC.</p>
        </div>
        <div style={{ border: `1px solid ${colorEstado}55`, background: `${colorEstado}13`, color: colorEstado, borderRadius: 30, padding: '9px 13px', fontWeight: 800, fontSize: 12 }} role="status" aria-live="polite">
          <span aria-hidden="true">● </span>{estadoVisible}
        </div>
      </div>

      <div style={{ height: 1, background: colores.borde, margin: '22px 0' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 18 }}>
        <div>
          <p style={{ ...etiqueta, marginBottom: 7 }}>ACTIVO SELECCIONADO</p>
          <div style={{ fontSize: 25, fontWeight: 850, letterSpacing: '-.5px' }}>{simbolo.replace(/USDT$/, '/USDT')}</div>
          <p style={{ color: colores.tenue, fontSize: 12, margin: '5px 0 0' }}>{tieneModelo ? 'Este activo ya cuenta con un modelo registrado.' : 'Este activo aún no tiene un modelo registrado.'}</p>
        </div>
        <button type="button" disabled={deshabilitado} onClick={() => void iniciar()}
          style={{ padding: '13px 20px', borderRadius: 10, border: 'none', background: deshabilitado ? '#34455d' : 'linear-gradient(100deg, #0ba9df, #4b8df7)', color: deshabilitado ? '#b3c2d5' : '#fff', fontWeight: 800, cursor: deshabilitado ? 'not-allowed' : 'pointer', fontSize: 13, maxWidth: '100%' }}>
          {trabajando ? `Entrenando ${estado?.simbolo ?? ''}…` : enviando ? 'Iniciando entrenamiento…' : tieneModelo ? '✓ Modelo ya entrenado' : `Entrenar modelo para ${simbolo}`}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 10, marginBottom: 19 }}>
        <div style={tarjeta}><p style={etiqueta}>Velas del historial disponible</p><div style={{ fontSize: 24, fontWeight: 850, marginTop: 9 }}>{velasHistorial ?? resumen.velas ?? '—'}</div><p style={{ fontSize: 12, color: colores.tenue, margin: '5px 0 0' }}>Velas diarias cerradas; pueden diferir de las usadas al entrenar</p></div>
        <div style={tarjeta}><p style={etiqueta}>Unidades ocultas</p><div style={{ fontSize: 24, fontWeight: 850, marginTop: 9 }}>32</div><p style={{ fontSize: 12, color: colores.tenue, margin: '5px 0 0' }}>Arquitectura LSTM</p></div>
        <div style={tarjeta}><p style={etiqueta}>Secuencia temporal</p><div style={{ fontSize: 24, fontWeight: 850, marginTop: 9 }}>20</div><p style={{ fontSize: 12, color: colores.tenue, margin: '5px 0 0' }}>Rendimientos diarios</p></div>
        <div style={tarjeta}><p style={etiqueta}>Neuronas de salida</p><div style={{ fontSize: 24, fontWeight: 850, marginTop: 9 }}>1</div><p style={{ fontSize: 12, color: colores.tenue, margin: '5px 0 0' }}>Rendimiento estimado</p></div>
      </div>

      {trabajando && (
        <div style={{ ...tarjeta, marginBottom: 14, borderColor: '#776542' }}>
          <p style={{ fontWeight: 800, margin: '0 0 8px', color: colores.amarillo }}>● Entrenamiento en ejecución: {estado?.simbolo}</p>
          <div style={{ height: 7, background: '#27384d', borderRadius: 9, overflow: 'hidden' }}><div style={{ width: '100%', height: '100%', background: 'repeating-linear-gradient(100deg, #26b8ee 0px, #26b8ee 16px, #175f86 16px, #175f86 32px)', opacity: .8 }} /></div>
          <p style={{ fontSize: 12, color: colores.tenue, margin: '9px 0 0' }}>Consultando el servidor cada 3 segundos. El backend no informa un porcentaje de avance; esta barra indica actividad, no progreso numérico.</p>
          {estado?.simbolo !== simbolo && <p style={{ fontSize: 12, color: colores.amarillo, marginBottom: 0 }}>Hay otro activo en entrenamiento. Espera a que termine antes de iniciar {simbolo}.</p>}
        </div>
      )}

      {completado && (
        <div style={{ ...tarjeta, borderColor: '#287d70', background: '#10302f', marginBottom: 14 }}>
          <p style={{ fontWeight: 800, color: colores.verde, margin: '0 0 5px' }}>✓ Entrenamiento completado y modelo registrado</p>
          <p style={{ fontSize: 12, color: '#b9dfd7', margin: 0 }}>Puedes explorar las activaciones y la evaluación histórica de {simbolo} en las demás secciones.</p>
        </div>
      )}

      {fallo && <p role="alert" style={{ color: colores.rojo, fontSize: 13 }}>No se pudo completar el entrenamiento: {estado?.mensaje}</p>}
      {error && <p role="alert" style={{ color: colores.rojo, fontSize: 13 }}>⚠ {error}</p>}

      {estado?.simbolo && estado.estado !== 'inactivo' && (
        <div style={{ ...tarjeta, marginBottom: 14 }}>
          <p style={{ ...etiqueta, marginBottom: 10 }}>ÚLTIMA ACTIVIDAD DEL SERVIDOR</p>
          <p style={{ fontSize: 13, margin: '0 0 8px', overflowWrap: 'anywhere' }}><strong>{estado.simbolo}</strong> · {estado.mensaje}</p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: colores.tenue, fontSize: 11 }}><span>Inicio: {fechaLegible(estado.inicio_utc)}</span><span>Fin: {fechaLegible(estado.fin_utc)}</span></div>
        </div>
      )}

      {estado?.registro?.length ? (
        <div style={{ border: `1px solid ${colores.borde}`, borderRadius: 12, overflow: 'hidden' }}>
          <button type="button" aria-expanded={mostrarRegistro} onClick={() => setMostrarRegistro(!mostrarRegistro)} style={{ width: '100%', textAlign: 'left', border: 'none', background: '#142640', color: colores.texto, padding: '13px 16px', cursor: 'pointer', fontWeight: 750, fontSize: 12 }}>
            {mostrarRegistro ? '▾' : '▸'} {mostrarRegistro ? 'Ocultar' : 'Ver'} registro técnico del entrenamiento
          </button>
          {mostrarRegistro && <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 260, overflowY: 'auto', margin: 0, padding: 16, background: '#081222', color: '#b9d6ee', fontSize: 12, lineHeight: 1.6 }}>{estado.registro.join('\n')}</pre>}
        </div>
      ) : null}
      <p style={{ fontSize: 12, color: colores.tenue, margin: '16px 0 0', lineHeight: 1.6 }}>Experimento académico con datos históricos. Los resultados no garantizan capacidad predictiva futura. No se realizan operaciones financieras reales.</p>
    </section>
  )
}
