import { API_BASE_URL } from './apiConfig'
import { useEffect, useRef, useState } from 'react'
import './NeuralNetwork.css'

type PrecioMEXC = {
  status: string
  activo: string
  precio: number
  fecha_consulta_utc: string
}

type DatosLSTM = {
  status: string
  modelo: string
  activo: string
  fecha_emision: string
  fecha_objetivo: string
  arquitectura: {
    tipo: string
    capas_lstm: number
    neuronas_ocultas: number
    longitud_secuencia: number
    neuronas_salida: number
  }
  activaciones: number[]
  estado_celda: number[]
  rendimiento_estimado_porcentaje: number
}

type Nodo = { id: number; x: number; y: number; capa: number }
type DireccionMercado = 'up' | 'down' | 'neutral'
type ModoVisual = 'market' | 'lstm'
type Props = { simbolo?: string }

const API = `${API_BASE_URL}`

// Una sola salida. Esta constelación es una visualización, no la arquitectura LSTM real.
const capas = [5, 8, 10, 8, 5, 1]

const nodos: Nodo[] = capas.flatMap((cantidad, capa) =>
  Array.from({ length: cantidad }, (_, indice) => ({
    id: capa * 100 + indice,
    x: 85 + capa * 145,
    y: 100 + (indice + 1) * (480 / (cantidad + 1)),
    capa,
  }))
)

const conexiones = nodos.flatMap((origen) =>
  nodos
    .filter((destino) =>
      destino.capa === origen.capa + 1 &&
      (destino.capa === capas.length - 1 ||
        (origen.id + destino.id) % 3 !== 0)
    )
    .map((destino) => ({
      id: `${origen.id}-${destino.id}`,
      origen,
      destino,
    }))
)

function nombreUnidad(indice: number) {
  return `H${String(indice + 1).padStart(2, '0')}`
}

function nombreActivo(simbolo: string) {
  if (simbolo.endsWith('USDT')) return `${simbolo.slice(0, -4)}/USDT`
  if (simbolo.endsWith('USDC')) return `${simbolo.slice(0, -4)}/USDC`
  return simbolo
}

function formatearHora(fecha: string) {
  if (!fecha) return 'Esperando datos del mercado'
  const valor = new Date(fecha)
  return Number.isNaN(valor.getTime())
    ? 'No disponible'
    : valor.toLocaleTimeString('es-MX')
}

const estiloBoton = (activo: boolean) => ({
  padding: '11px 18px',
  borderRadius: '10px',
  border: activo ? '1px solid #38bdf8' : '1px solid #2b3d5b',
  background: activo ? '#153a58' : '#111c30',
  color: activo ? '#7dd3fc' : '#9db1cf',
  fontWeight: 700 as const,
  cursor: 'pointer' as const,
})

export default function NeuralNetwork({ simbolo = 'BTCUSDT' }: Props) {
  const [modo, setModo] = useState<ModoVisual>('market')
  const [precio, setPrecio] = useState<number | null>(null)
  const [ultimoCambio, setUltimoCambio] = useState<number | null>(null)
  const [ultimaActualizacion, setUltimaActualizacion] = useState('')
  const [ultimoMovimiento, setUltimoMovimiento] = useState('')
  const [conectado, setConectado] = useState(false)
  const [direccionMercado, setDireccionMercado] = useState<DireccionMercado>('neutral')
  const [intensidadMercado, setIntensidadMercado] = useState(0)
  const [eventoMercado, setEventoMercado] = useState(0)
  const [nodoSeleccionado, setNodoSeleccionado] = useState<Nodo | null>(null)
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<number | null>(null)
  const [datosLSTM, setDatosLSTM] = useState<DatosLSTM | null>(null)
  const [errorLSTM, setErrorLSTM] = useState('')
  const [simboloSinModelo, setSimboloSinModelo] = useState('')
  const [cargandoLSTM, setCargandoLSTM] = useState(false)
  const ultimoPrecioRef = useRef<number | null>(null)

  const activoVisible = nombreActivo(simbolo)

  // Cotización del par seleccionado, aproximadamente una vez por segundo.
  useEffect(() => {
    let activo = true
    let consultando = false
    const controlador = new AbortController()

    ultimoPrecioRef.current = null
    setPrecio(null)
    setUltimoCambio(null)
    setUltimaActualizacion('')
    setUltimoMovimiento('')
    setDireccionMercado('neutral')
    setIntensidadMercado(0)
    setEventoMercado(0)
    setConectado(false)
    setNodoSeleccionado(null)

    async function actualizarPrecio() {
      if (!activo || consultando) return
      consultando = true
      try {
        const parametros = new URLSearchParams({ simbolo })
        const respuesta = await fetch(
          `${API}/api/mexc/precio-por-simbolo?${parametros.toString()}`,
          { cache: 'no-store', signal: controlador.signal }
        )
        if (!respuesta.ok) throw new Error('No fue posible consultar MEXC')
        const datos: PrecioMEXC = await respuesta.json()
        if (!activo || datos.status !== 'ok' || datos.activo !== simbolo) {
          throw new Error('Respuesta del activo incorrecto')
        }
        const precioNuevo = Number(datos.precio)
        if (!Number.isFinite(precioNuevo) || precioNuevo <= 0) {
          throw new Error('Precio no válido')
        }
        const anterior = ultimoPrecioRef.current
        if (anterior !== null && precioNuevo !== anterior) {
          const diferencia = precioNuevo - anterior
          const variacion = Math.abs(diferencia / anterior) * 100
          setUltimoCambio(diferencia)
          setDireccionMercado(diferencia > 0 ? 'up' : 'down')
          setIntensidadMercado(Math.min(1, variacion / 0.1))
          setUltimoMovimiento(datos.fecha_consulta_utc)
          setEventoMercado((valor) => valor + 1)
        }
        ultimoPrecioRef.current = precioNuevo
        setPrecio(precioNuevo)
        setUltimaActualizacion(datos.fecha_consulta_utc)
        setConectado(true)
      } catch {
        if (activo && !controlador.signal.aborted) setConectado(false)
      } finally {
        consultando = false
      }
    }

    void actualizarPrecio()
    const intervalo = window.setInterval(() => void actualizarPrecio(), 1000)
    return () => {
      activo = false
      window.clearInterval(intervalo)
      controlador.abort()
    }
  }, [simbolo])

  // Cada activo consulta exclusivamente su propio modelo experimental guardado.
  useEffect(() => {
    if (modo !== 'lstm') return
    let activo = true
    let consultando = false
    const controlador = new AbortController()

    setDatosLSTM(null)
    setUnidadSeleccionada(null)
    setErrorLSTM('')
    setSimboloSinModelo('')
    setCargandoLSTM(true)

    async function actualizarLSTM() {
      if (!activo || consultando) return
      consultando = true
      setCargandoLSTM(true)
      try {
        const parametros = new URLSearchParams({ simbolo })
        const respuesta = await fetch(
          `${API}/api/modelos-multiactivo/inferencia?${parametros.toString()}`,
          { cache: 'no-store', signal: controlador.signal },
        )
        if (respuesta.status === 404) {
          if (activo) {
            setDatosLSTM(null)
            setSimboloSinModelo(simbolo)
            setErrorLSTM('')
          }
          return
        }
        if (!respuesta.ok) throw new Error('No fue posible consultar el modelo')
        const resultado: DatosLSTM = await respuesta.json()
        if (
          resultado.status !== 'ok' ||
          resultado.activo !== simbolo ||
          resultado.arquitectura?.neuronas_ocultas !== 32 ||
          resultado.arquitectura?.neuronas_salida !== 1 ||
          !Array.isArray(resultado.activaciones) ||
          !Array.isArray(resultado.estado_celda) ||
          resultado.activaciones.length !== 32 ||
          resultado.estado_celda.length !== 32 ||
          !resultado.activaciones.every((valor) => typeof valor === 'number' && Number.isFinite(valor)) ||
          !resultado.estado_celda.every((valor) => typeof valor === 'number' && Number.isFinite(valor))
        ) throw new Error('Las activaciones no corresponden al modelo seleccionado')
        if (activo) {
          setDatosLSTM(resultado)
          setSimboloSinModelo('')
          setErrorLSTM('')
        }
      } catch {
        if (activo && !controlador.signal.aborted) {
          setDatosLSTM(null)
          setErrorLSTM('No se pudieron consultar las activaciones del modelo seleccionado.')
        }
      } finally {
        consultando = false
        if (activo) setCargandoLSTM(false)
      }
    }

    void actualizarLSTM()
    // El histórico es local; consultar con poca frecuencia evita cargas innecesarias.
    const intervalo = window.setInterval(() => void actualizarLSTM(), 60000)
    return () => {
      activo = false
      window.clearInterval(intervalo)
      controlador.abort()
    }
  }, [modo, simbolo])

  // No mostrar nunca estados de un símbolo anterior durante el cambio de activo.
  const datosDelActivo = datosLSTM?.activo === simbolo ? datosLSTM : null
  const activaciones = datosDelActivo?.activaciones ?? []
  const estadosCelda = datosDelActivo?.estado_celda ?? []
  const maximoAbsoluto = Math.max(1e-12, ...activaciones.map(Math.abs))
  const valorOculto = unidadSeleccionada === null
    ? undefined : activaciones[unidadSeleccionada]
  const valorCelda = unidadSeleccionada === null
    ? undefined : estadosCelda[unidadSeleccionada]
  const intensidadSeleccionada = valorOculto === undefined
    ? undefined : (Math.abs(valorOculto) / maximoAbsoluto) * 100

  return (
    <section className="neural-terminal">
      <header className="neural-terminal-header">
        <div>
          <span className="neural-eyebrow">INTELIGENCIA NEURONAL / {activoVisible}</span>
          <h2>Red neuronal del mercado</h2>
          <p>Visualización animada de la actividad del mercado y exploración del modelo entrenado.</p>
        </div>
        <div className={`neural-status ${conectado ? 'online' : 'offline'}`}>
          <span className="neural-status-dot" />
          {conectado ? 'MEXC CONECTADO' : 'ESPERANDO CONEXIÓN'}
        </div>
      </header>

      <div className="neural-metrics">
        <div>
          <span>ACTIVO SELECCIONADO</span>
          <strong>{activoVisible}</strong>
        </div>
        <div>
          <span>PRECIO ACTUAL</span>
          <strong>{precio === null ? '---' : `${precio.toLocaleString('es-MX', { maximumFractionDigits: 8 })} USDT`}</strong>
        </div>
        <div>
          <span>ÚLTIMA VARIACIÓN</span>
          <strong className={ultimoCambio === null ? '' : ultimoCambio >= 0 ? 'neural-positive' : 'neural-negative'}>
            {ultimoCambio === null ? '---' : `${ultimoCambio > 0 ? '+' : ''}${ultimoCambio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: Math.abs(ultimoCambio) < 0.01 ? 6 : 2 })} USDT`}
          </strong>
        </div>
        <div>
          <span>{modo === 'market' ? 'NODOS VISUALES' : 'UNIDADES OCULTAS'}</span>
          <strong>{modo === 'market' ? nodos.length : 32}</strong>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, margin: '20px 24px' }}>
        <button type="button" style={estiloBoton(modo === 'market')} aria-pressed={modo === 'market'} onClick={() => setModo('market')}>
          Actividad del mercado
        </button>
        <button type="button" style={estiloBoton(modo === 'lstm')} aria-pressed={modo === 'lstm'} onClick={() => setModo('lstm')}>
          Activaciones LSTM
        </button>
        <span style={{ color: '#8ca6c9', fontSize: 12 }}>
          {modo === 'market' ? 'Animación visual impulsada por cotizaciones reales' : `Estados internos reales del modelo experimental para ${activoVisible}`}
        </span>
      </div>

      {modo === 'market' ? (
        <div className={`neural-canvas neural-market-${direccionMercado}`} style={{ ['--market-intensity' as string]: intensidadMercado }}>
          {eventoMercado > 0 && (
            <div key={eventoMercado} className={`neural-market-flash ${direccionMercado}`} aria-hidden="true" />
          )}
          <div className="neural-canvas-top">
            <span>ACTIVIDAD DE RED · {activoVisible}</span>
            <span>SIMULACIÓN VISUAL · NO REPRESENTA ACTIVACIONES INTERNAS DE LA LSTM</span>
          </div>
          <svg className="neural-svg" viewBox="0 0 900 700" role="img" aria-label={`Constelación neuronal animada para ${activoVisible}, con una salida`}>
            <defs>
              <linearGradient id="neuralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
              <filter id="neuralGlow"><feGaussianBlur stdDeviation="5" /></filter>
            </defs>
            {conexiones.map(({ id, origen, destino }, indice) => {
              const medioX = (origen.x + destino.x) / 2
              const curvatura = ((origen.id + destino.id) % 5 - 2) * 12
              const trayectoria = `M ${origen.x} ${origen.y} Q ${medioX} ${(origen.y + destino.y) / 2 + curvatura} ${destino.x} ${destino.y}`
              return (
                <g key={id}>
                  <path d={trayectoria} className="neural-connection" />
                  <path d={trayectoria} className="neural-pulse" style={{ animationDelay: `${(indice % 12) * -0.3}s` }} />
                </g>
              )
            })}
            {nodos.map((nodo, indice) => (
              <g key={nodo.id} className="neural-node-group" role="button" tabIndex={0}
                aria-label={`Nodo ${nodo.id}, capa ${nodo.capa + 1}`}
                onClick={() => setNodoSeleccionado(nodo)}
                onKeyDown={(evento) => {
                  if (evento.key === 'Enter' || evento.key === ' ') {
                    evento.preventDefault()
                    setNodoSeleccionado(nodo)
                  }
                }}>
                <circle cx={nodo.x} cy={nodo.y} r="15" className="neural-node-glow" />
                <circle cx={nodo.x} cy={nodo.y} r={nodoSeleccionado?.id === nodo.id ? 8 : 5}
                  className="neural-node" style={{ animationDelay: `${indice * -0.08}s` }} />
              </g>
            ))}
          </svg>
          <div className="neural-layer-labels">
            <span>ENTRADA DE MERCADO</span>
            <span>PROCESAMIENTO VISUAL</span>
            <span>UNA SALIDA</span>
          </div>
        </div>
      ) : simboloSinModelo === simbolo && !datosDelActivo ? (
        <div className="neural-canvas" style={{ minHeight: 230, padding: '80px 28px 28px' }}>
          <h3 style={{ color: '#67e8f9' }}>Modelo LSTM no disponible para {activoVisible}</h3>
          <p style={{ color: '#cbd5e1', maxWidth: 700, lineHeight: 1.7 }}>
            Este activo todavía no tiene un modelo experimental entrenado y guardado.
            Puedes seguir explorando su actividad de mercado sin atribuirle activaciones de otro activo.
          </p>
        </div>
      ) : (
        <div className="neural-canvas" style={{ minHeight: 520, paddingBottom: 22 }}>
          <div className="neural-canvas-top">
            <span>ACTIVIDAD OCULTA REAL · {activoVisible}</span>
            <span>32 UNIDADES · ÚLTIMO PASO TEMPORAL</span>
          </div>
          {errorLSTM && <p role="alert" style={{ color: '#fda4af', padding: '12px 24px' }}>{errorLSTM}</p>}
          {cargandoLSTM && !datosDelActivo && <p style={{ color: '#9db1cf', padding: '12px 24px' }}>Consultando activaciones reales...</p>}
          {datosDelActivo && (
            <>
              <svg className="neural-svg" viewBox="0 0 900 560" role="img" aria-label={`32 unidades ocultas reales del modelo de ${activoVisible}`}>
                <defs>
                  <filter id="lstmRealGlow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="9" />
                  </filter>
                </defs>
                {activaciones.map((valor, indice) => {
                  const x = 105 + (indice % 8) * 99
                  const y = 95 + Math.floor(indice / 8) * 125
                  const intensidad = Math.abs(valor) / maximoAbsoluto
                  const color = valor >= 0 ? '#22d3ee' : '#a855f7'
                  const seleccionado = unidadSeleccionada === indice
                  return (
                    <g key={indice} role="button" tabIndex={0} style={{ cursor: 'pointer' }}
                      aria-label={`${nombreUnidad(indice)}: ${valor.toFixed(8)}`}
                      onClick={() => setUnidadSeleccionada(indice)}
                      onKeyDown={(evento) => {
                        if (evento.key === 'Enter' || evento.key === ' ') {
                          evento.preventDefault()
                          setUnidadSeleccionada(indice)
                        }
                      }}>
                      <circle cx={x} cy={y} r={25 + intensidad * 13} fill={color}
                        opacity={0.12 + intensidad * 0.22} filter="url(#lstmRealGlow)">
                        <animate attributeName="opacity"
                          values={`${0.08 + intensidad * 0.12};${0.18 + intensidad * 0.4};${0.08 + intensidad * 0.12}`}
                          dur={`${2.5 + (indice % 5) * 0.35}s`} repeatCount="indefinite" />
                      </circle>
                      <circle cx={x} cy={y} r={seleccionado ? 24 : 19} fill={color}
                        fillOpacity={0.18 + intensidad * 0.65}
                        stroke={seleccionado ? '#ffffff' : color} strokeWidth={seleccionado ? 3 : 1.5} />
                      {seleccionado && <circle cx={x} cy={y} r="29" fill="none" stroke="#ffffff"
                        strokeOpacity="0.65" strokeWidth="1" strokeDasharray="4 5" />}
                      <text x={x} y={y + 4} textAnchor="middle" fill="#ffffff" fontSize="12"
                        fontWeight="700" pointerEvents="none">{nombreUnidad(indice)}</text>
                      <text x={x} y={y + 45} textAnchor="middle" fill="#a9bdd9" fontSize="11"
                        pointerEvents="none">{valor >= 0 ? '+' : ''}{valor.toFixed(4)}</text>
                    </g>
                  )
                })}
              </svg>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, padding: '0 24px', color: '#9db1cf', fontSize: 12 }}>
                <span style={{ color: '#22d3ee' }}>● Activación positiva</span>
                <span style={{ color: '#a855f7' }}>● Activación negativa</span>
                <span>Brillo = magnitud relativa</span>
              </div>
            </>
          )}
        </div>
      )}

      {modo === 'lstm' && datosDelActivo && (
        <div style={{ marginTop: 18, padding: 22, border: '1px solid #253757', borderRadius: 14, background: '#101b30', color: '#e2e8f0' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
            <div>
              <span style={{ color: '#7dd3fc', fontSize: 11, letterSpacing: 2 }}>ANÁLISIS DE ACTIVACIONES</span>
              <h3 style={{ margin: '8px 0 0' }}>Inspector de unidades</h3>
            </div>
            <span style={{ color: '#67e8f9', fontSize: 12 }}>LSTM EXPERIMENTAL · {activoVisible} · SOLO LECTURA</span>
          </div>
          {unidadSeleccionada === null ? (
            <p style={{ color: '#94a3b8' }}>Selecciona cualquiera de las 32 unidades para inspeccionar sus estados internos.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
              {[
                { titulo: 'UNIDAD SELECCIONADA', valor: nombreUnidad(unidadSeleccionada) },
                { titulo: 'ESTADO OCULTO', valor: valorOculto?.toFixed(8) ?? '---' },
                { titulo: 'ESTADO DE CELDA', valor: valorCelda?.toFixed(8) ?? '---' },
                { titulo: 'MAGNITUD RELATIVA', valor: intensidadSeleccionada === undefined ? '---' : `${intensidadSeleccionada.toFixed(2)} %` },
              ].map((elemento) => (
                <div key={elemento.titulo} style={{ padding: 15, border: '1px solid #263a57', borderRadius: 10, background: '#0b1527' }}>
                  <div style={{ color: '#83a0c3', fontSize: 10, letterSpacing: 1, marginBottom: 10 }}>{elemento.titulo}</div>
                  <strong style={{ fontSize: 17, overflowWrap: 'anywhere' }}>{elemento.valor}</strong>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, marginTop: 20, color: '#93a9c8', fontSize: 12 }}>
            <span>FECHA DE ENTRADA: {datosDelActivo.fecha_emision}</span>
            <span>FECHA OBJETIVO: {datosDelActivo.fecha_objetivo}</span>
            <span>SECUENCIA: {datosDelActivo.arquitectura.longitud_secuencia} PASOS DIARIOS</span>
          </div>
          <p style={{ marginTop: 16, color: '#7188a9', fontSize: 12, lineHeight: 1.7 }}>
            Las activaciones son valores reales de PyTorch. La pulsación luminosa es un efecto visual.
            La magnitud relativa compara cada unidad con la activación absoluta máxima; no representa
            una probabilidad ni una señal de compra o venta. Los estados provienen del último histórico local guardado,
            no del precio que cambia cada segundo.
          </p>
        </div>
      )}

      <footer className="neural-terminal-footer">
        <div>
          <span>{modo === 'market' ? 'NODO SELECCIONADO' : 'UNIDAD LSTM SELECCIONADA'}</span>
          <strong>
            {modo === 'market'
              ? nodoSeleccionado
                ? `NODO ${nodoSeleccionado.id} · CAPA ${nodoSeleccionado.capa + 1}`
                : 'Selecciona un nodo para inspeccionarlo'
              : simboloSinModelo === simbolo
                ? 'Modelo no entrenado para este activo'
                : unidadSeleccionada !== null && valorOculto !== undefined
                  ? `${nombreUnidad(unidadSeleccionada)} · ${valorOculto.toFixed(8)}`
                  : 'Selecciona una unidad oculta'}
          </strong>
        </div>
        <div>
          <span>{modo === 'market' ? 'ÚLTIMO MOVIMIENTO' : 'FECHA DEL MODELO'}</span>
          <strong>{modo === 'market' ? formatearHora(ultimoMovimiento) : datosDelActivo?.fecha_emision ?? 'No disponible'}</strong>
        </div>
        <div>
          <span>{modo === 'market' ? 'ÚLTIMA ACTUALIZACIÓN' : 'FUENTE DE DATOS'}</span>
          <strong>{modo === 'market' ? formatearHora(ultimaActualizacion) : datosDelActivo ? 'PYTORCH LSTM EXPERIMENTAL · HISTÓRICO LOCAL' : 'Sin modelo específico'}</strong>
        </div>
      </footer>
    </section>
  )
}
