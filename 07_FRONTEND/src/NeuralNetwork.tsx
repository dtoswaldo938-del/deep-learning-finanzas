
import { useEffect, useRef, useState } from 'react'
import './NeuralNetwork.css'

type PrecioMEXC = {
  status: string
  precio: number
  fecha_consulta_utc: string
}

type Nodo = {
  id: number
  x: number
  y: number
  capa: number
}

type DireccionMercado = 'up' | 'down' | 'neutral'

const API = 'http://127.0.0.1:8001'

const capas = [5, 8, 10, 8, 5, 2]

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
    .filter(
      (destino) =>
        destino.capa === origen.capa + 1 &&
        (origen.id + destino.id) % 3 !== 0
    )
    .map((destino) => ({
      id: `${origen.id}-${destino.id}`,
      origen,
      destino,
    }))
)

export default function NeuralNetwork() {
  const [precio, setPrecio] = useState<number | null>(null)

  const [ultimoCambio, setUltimoCambio] =
    useState<number | null>(null)

  const [ultimaActualizacion, setUltimaActualizacion] =
    useState('')

  const [ultimoMovimiento, setUltimoMovimiento] =
    useState('')

  const [conectado, setConectado] = useState(false)

  const [direccionMercado, setDireccionMercado] =
    useState<DireccionMercado>('neutral')

  const [intensidadMercado, setIntensidadMercado] =
    useState(0)

  const [eventoMercado, setEventoMercado] = useState(0)

  const [nodoSeleccionado, setNodoSeleccionado] =
    useState<Nodo | null>(null)

  const ultimoPrecioRef = useRef<number | null>(null)

  useEffect(() => {
    let activo = true
    let consultando = false
    const controlador = new AbortController()

    async function actualizarPrecio() {
      if (consultando || !activo) return

      consultando = true

      try {
        const respuesta = await fetch(
          `${API}/api/mexc/precio-actual`,
          {
            cache: 'no-store',
            signal: controlador.signal,
          }
        )

        if (!respuesta.ok) {
          throw new Error('Error al consultar MEXC')
        }

        const datos: PrecioMEXC = await respuesta.json()

        if (!activo || datos.status !== 'ok') {
          return
        }

        const precioNuevo = Number(datos.precio)

        if (
          !Number.isFinite(precioNuevo) ||
          precioNuevo <= 0
        ) {
          throw new Error('Precio no válido')
        }

        const precioAnterior = ultimoPrecioRef.current

        if (
          precioAnterior !== null &&
          precioNuevo !== precioAnterior
        ) {
          const diferencia = precioNuevo - precioAnterior

          const variacionPorcentual =
            Math.abs(diferencia / precioAnterior) * 100

          setUltimoCambio(diferencia)

          setDireccionMercado(
            diferencia > 0 ? 'up' : 'down'
          )

          setIntensidadMercado(
            Math.min(1, variacionPorcentual / 0.1)
          )

          setUltimoMovimiento(datos.fecha_consulta_utc)

          setEventoMercado((anterior) => anterior + 1)
        }

        ultimoPrecioRef.current = precioNuevo

        setPrecio(precioNuevo)
        setUltimaActualizacion(datos.fecha_consulta_utc)
        setConectado(true)
      } catch {
        if (activo) {
          setConectado(false)
        }
      } finally {
        consultando = false
      }
    }

    void actualizarPrecio()

    const intervalo = window.setInterval(() => {
      void actualizarPrecio()
    }, 1000)

    return () => {
      activo = false
      window.clearInterval(intervalo)
      controlador.abort()
    }
  }, [])

  const formatearHora = (fecha: string) => {
    if (!fecha) return 'Waiting for market data'

    const fechaConvertida = new Date(fecha)

    if (Number.isNaN(fechaConvertida.getTime())) {
      return 'Unavailable'
    }

    return fechaConvertida.toLocaleTimeString('es-MX')
  }

  return (
    <section className="neural-terminal">
      <header className="neural-terminal-header">
        <div>
          <span className="neural-eyebrow">
            NEURAL INTELLIGENCE / VISUAL ENGINE
          </span>

          <h2>Neural Constellation</h2>

          <p>
            Visualización interactiva de una red neuronal
            y seguimiento del mercado BTC/USDT.
          </p>
        </div>

        <span
          className={
            conectado
              ? 'neural-status online'
              : 'neural-status offline'
          }
        >
          <span className="neural-status-dot" />

          {conectado
            ? 'MEXC CONNECTED'
            : 'MEXC OFFLINE'}
        </span>
      </header>

      <div className="neural-metrics">
        <div>
          <span>BTC / USDT</span>

          <strong>
            {precio === null
              ? '---'
              : `$${precio.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
          </strong>
        </div>

        <div>
          <span>LAST PRICE CHANGE</span>

          <strong
            className={
              ultimoCambio === null
                ? ''
                : ultimoCambio >= 0
                  ? 'neural-positive'
                  : 'neural-negative'
            }
          >
            {ultimoCambio === null
              ? '---'
              : `${ultimoCambio > 0 ? '+' : ''}${ultimoCambio.toFixed(2)}`}
          </strong>
        </div>

        <div>
          <span>NETWORK NODES</span>
          <strong>{nodos.length}</strong>
        </div>

        <div>
          <span>MARKET FEED</span>
          <strong>1s POLLING</strong>
        </div>
      </div>

      <div
        className={`neural-canvas neural-market-${direccionMercado}`}
        style={{
          ['--market-intensity' as string]: intensidadMercado,
        }}
      >
        {eventoMercado > 0 && (
          <div
            key={eventoMercado}
            className={`neural-market-flash ${direccionMercado}`}
            aria-hidden="true"
          />
        )}

        <div className="neural-canvas-top">
          <span>NETWORK ACTIVITY</span>

          <span>
            VISUAL SIMULATION · NOT INTERNAL LSTM ACTIVATIONS
          </span>
        </div>

        <svg
          className="neural-svg"
          viewBox="0 0 900 700"
          role="img"
          aria-label="Constelación neuronal animada con datos de mercado"
        >
          <defs>
            <linearGradient
              id="neuralGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>

            <filter id="neuralGlow">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>

          {conexiones.map(
            ({ id, origen, destino }, indice) => {
              const medioX =
                (origen.x + destino.x) / 2

              const curvatura =
                ((origen.id + destino.id) % 5 - 2) * 12

              const trayectoria = `
                M ${origen.x} ${origen.y}
                Q ${medioX} ${
                  (origen.y + destino.y) / 2 + curvatura
                }
                ${destino.x} ${destino.y}
              `

              return (
                <g key={id}>
                  <path
                    d={trayectoria}
                    className="neural-connection"
                  />

                  <path
                    d={trayectoria}
                    className="neural-pulse"
                    style={{
                      animationDelay:
                        `${(indice % 12) * -0.3}s`,
                    }}
                  />
                </g>
              )
            }
          )}

          {nodos.map((nodo, indice) => (
            <g
              key={nodo.id}
              className="neural-node-group"
              onClick={() =>
                setNodoSeleccionado(nodo)
              }
              role="button"
              tabIndex={0}
              onKeyDown={(evento) => {
                if (
                  evento.key === 'Enter' ||
                  evento.key === ' '
                ) {
                  evento.preventDefault()
                  setNodoSeleccionado(nodo)
                }
              }}
              aria-label={`Nodo ${nodo.id}`}
            >
              <circle
                cx={nodo.x}
                cy={nodo.y}
                r="15"
                className="neural-node-glow"
              />

              <circle
                cx={nodo.x}
                cy={nodo.y}
                r={
                  nodoSeleccionado?.id === nodo.id
                    ? 8
                    : 5
                }
                className="neural-node"
                style={{
                  animationDelay:
                    `${indice * -0.08}s`,
                }}
              />
            </g>
          ))}
        </svg>

        <div className="neural-layer-labels">
          <span>MARKET INPUT</span>
          <span>NEURAL PROCESSING</span>
          <span>OUTPUT</span>
        </div>
      </div>

      <footer className="neural-terminal-footer">
        <div>
          <span>SELECTED NODE</span>

          <strong>
            {nodoSeleccionado
              ? `NODE ${nodoSeleccionado.id} · LAYER ${nodoSeleccionado.capa + 1}`
              : 'Click any node to inspect'}
          </strong>
        </div>

        <div>
          <span>LAST MARKET MOVEMENT</span>

          <strong>
            {ultimoMovimiento
              ? formatearHora(ultimoMovimiento)
              : 'Waiting for a price change'}
          </strong>
        </div>

        <div>
          <span>LAST MARKET UPDATE</span>

          <strong>
            {formatearHora(ultimaActualizacion)}
          </strong>
        </div>
      </footer>
    </section>
  )
}
