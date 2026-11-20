
import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Precio = {
  fecha: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

type RespuestaHistorico = {
  status: string
  activo: string
  precios: Precio[]
}

type DatoGrafica = {
  fecha: string
  cierre: number
  sma20: number | null
  ema20: number | null
  rsi14: number | null
}

type Props = {
  simbolo?: string
}

const API = 'http://127.0.0.1:8001'

function nombreVisible(simbolo: string): string {
  if (simbolo.endsWith('USDT')) {
    return `${simbolo.slice(0, -4)}/USDT`
  }

  if (simbolo.endsWith('USDC')) {
    return `${simbolo.slice(0, -4)}/USDC`
  }

  return simbolo
}

function calcularIndicadores(
  precios: Precio[]
): DatoGrafica[] {
  const periodoSMA = 20
  const periodoEMA = 20
  const periodoRSI = 14

  const cierres = precios.map(
    (precio) => Number(precio.close)
  )

  const multiplicadorEMA = 2 / (periodoEMA + 1)

  let emaAnterior: number | null = null
  let gananciaPromedio = 0
  let perdidaPromedio = 0

  return precios.map((precio, indice) => {
    let sma20: number | null = null
    let ema20: number | null = null
    let rsi14: number | null = null

    // Media móvil simple de 20 periodos.
    if (indice >= periodoSMA - 1) {
      const ultimos20 = cierres.slice(
        indice - periodoSMA + 1,
        indice + 1
      )

      sma20 =
        ultimos20.reduce(
          (suma, valor) => suma + valor,
          0
        ) / periodoSMA
    }

    // Media móvil exponencial de 20 periodos.
    if (indice === periodoEMA - 1) {
      emaAnterior = sma20
      ema20 = emaAnterior
    } else if (
      indice >= periodoEMA &&
      emaAnterior !== null
    ) {
      emaAnterior =
        (cierres[indice] - emaAnterior) *
          multiplicadorEMA +
        emaAnterior

      ema20 = emaAnterior
    }

    // Índice de fuerza relativa con método de Wilder.
    if (indice === periodoRSI) {
      let sumaGanancias = 0
      let sumaPerdidas = 0

      for (let i = 1; i <= periodoRSI; i++) {
        const cambio = cierres[i] - cierres[i - 1]

        sumaGanancias += Math.max(cambio, 0)
        sumaPerdidas += Math.max(-cambio, 0)
      }

      gananciaPromedio =
        sumaGanancias / periodoRSI

      perdidaPromedio =
        sumaPerdidas / periodoRSI
    } else if (indice > periodoRSI) {
      const cambio =
        cierres[indice] - cierres[indice - 1]

      gananciaPromedio =
        (
          gananciaPromedio * (periodoRSI - 1) +
          Math.max(cambio, 0)
        ) / periodoRSI

      perdidaPromedio =
        (
          perdidaPromedio * (periodoRSI - 1) +
          Math.max(-cambio, 0)
        ) / periodoRSI
    }

    if (indice >= periodoRSI) {
      if (
        gananciaPromedio === 0 &&
        perdidaPromedio === 0
      ) {
        rsi14 = 50
      } else if (perdidaPromedio === 0) {
        rsi14 = 100
      } else {
        const rs =
          gananciaPromedio / perdidaPromedio

        rsi14 = 100 - 100 / (1 + rs)
      }
    }

    return {
      fecha: String(precio.fecha).slice(0, 10),
      cierre: cierres[indice],
      sma20,
      ema20,
      rsi14,
    }
  })
}

export default function GraficaBitcoin({
  simbolo = 'BTCUSDT',
}: Props) {
  const [precios, setPrecios] = useState<Precio[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [mostrarSMA, setMostrarSMA] = useState(true)
  const [mostrarEMA, setMostrarEMA] = useState(true)
  const [mostrarRSI, setMostrarRSI] = useState(true)

  const activoVisible = nombreVisible(simbolo)

  useEffect(() => {
    const controlador = new AbortController()
    let activo = true

    // Limpiar datos anteriores al cambiar de activo.
    setPrecios([])
    setCargando(true)
    setError('')

    async function cargarPrecios() {
      try {
        const parametros = new URLSearchParams({
          simbolo,
          limite: '100',
        })

        const respuesta = await fetch(
          `${API}/api/mexc/historico?${parametros.toString()}`,
          {
            signal: controlador.signal,
            cache: 'no-store',
          }
        )

        if (!respuesta.ok) {
          throw new Error(
            'No fue posible consultar el historial.'
          )
        }

        const datos: RespuestaHistorico =
          await respuesta.json()

        if (
          datos.status !== 'ok' ||
          !Array.isArray(datos.precios)
        ) {
          throw new Error(
            'La respuesta histórica no es válida.'
          )
        }

        const preciosValidos = datos.precios
          .map((precio) => ({
            fecha: String(precio.fecha),
            open: Number(precio.open),
            high: Number(precio.high),
            low: Number(precio.low),
            close: Number(precio.close),
            volume: Number(precio.volume),
          }))
          .filter(
            (precio) =>
              Number.isFinite(precio.close) &&
              precio.close > 0 &&
              Number.isFinite(precio.open) &&
              Number.isFinite(precio.high) &&
              Number.isFinite(precio.low)
          )
          .sort((a, b) =>
            a.fecha.localeCompare(b.fecha)
          )

        if (!activo) return

        setPrecios(preciosValidos)
        setError('')
      } catch (err) {
        if (
          activo &&
          !(err instanceof Error &&
            err.name === 'AbortError')
        ) {
          setError(
            `No se pudieron cargar los precios históricos de ${activoVisible}.`
          )
        }
      } finally {
        if (activo) {
          setCargando(false)
        }
      }
    }

    void cargarPrecios()

    return () => {
      activo = false
      controlador.abort()
    }
  }, [simbolo, activoVisible])

  const datosGrafica = useMemo(
    () => calcularIndicadores(precios),
    [precios]
  )

  return (
    <section className="dashboard-card">
      <h2>
        Precio histórico de {activoVisible}
      </h2>

      <p>
        Últimos {precios.length || 100} registros
        diarios solicitados a MEXC.
        Indicadores calculados con precios
        de cierre del activo seleccionado.
      </p>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 20,
          margin: '20px 0',
        }}
      >
        <label>
          <input
            type="checkbox"
            checked={mostrarSMA}
            onChange={(evento) =>
              setMostrarSMA(evento.target.checked)
            }
          />
          {' '}SMA 20
        </label>

        <label>
          <input
            type="checkbox"
            checked={mostrarEMA}
            onChange={(evento) =>
              setMostrarEMA(evento.target.checked)
            }
          />
          {' '}EMA 20
        </label>

        <label>
          <input
            type="checkbox"
            checked={mostrarRSI}
            onChange={(evento) =>
              setMostrarRSI(evento.target.checked)
            }
          />
          {' '}RSI 14
        </label>
      </div>

      {cargando && (
        <p>
          Cargando historial de {activoVisible}...
        </p>
      )}

      {error && (
        <p style={{ color: '#f87171' }}>
          {error}
        </p>
      )}

      {!cargando &&
        !error &&
        precios.length > 0 && (
          <>
            <div
              style={{
                width: '100%',
                height: 350,
              }}
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart data={datosGrafica}>
                  <CartesianGrid
                    stroke="#26344c"
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="fecha"
                    tick={{
                      fontSize: 12,
                      fill: '#94a3b8',
                    }}
                    minTickGap={30}
                  />

                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{
                      fontSize: 12,
                      fill: '#94a3b8',
                    }}
                    width={85}
                  />

                  <Tooltip
                    contentStyle={{
                      background: '#101b2e',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      color: '#ffffff',
                    }}
                    formatter={(valor) =>
                      typeof valor === 'number'
                        ? valor.toFixed(4)
                        : String(valor ?? '')
                    }
                  />

                  <Line
                    type="monotone"
                    dataKey="cierre"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                    name="Cierre (USDT)"
                  />

                  {mostrarSMA && (
                    <Line
                      type="monotone"
                      dataKey="sma20"
                      stroke="#fbbf24"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                      name="SMA 20"
                    />
                  )}

                  {mostrarEMA && (
                    <Line
                      type="monotone"
                      dataKey="ema20"
                      stroke="#a78bfa"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                      name="EMA 20"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {mostrarRSI && (
              <div style={{ marginTop: 30 }}>
                <h3>
                  Índice de Fuerza Relativa
                  (RSI 14)
                </h3>

                <div
                  style={{
                    width: '100%',
                    height: 220,
                  }}
                >
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <LineChart data={datosGrafica}>
                      <CartesianGrid
                        stroke="#26344c"
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        dataKey="fecha"
                        tick={{
                          fontSize: 12,
                          fill: '#94a3b8',
                        }}
                        minTickGap={30}
                      />

                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 30, 50, 70, 100]}
                        width={45}
                        tick={{
                          fontSize: 12,
                          fill: '#94a3b8',
                        }}
                      />

                      <Tooltip
                        contentStyle={{
                          background: '#101b2e',
                          border: '1px solid #334155',
                          borderRadius: 10,
                          color: '#ffffff',
                        }}
                        formatter={(valor) =>
                          typeof valor === 'number'
                            ? valor.toFixed(2)
                            : String(valor ?? '')
                        }
                      />

                      <ReferenceLine
                        y={70}
                        stroke="#f87171"
                        strokeDasharray="5 5"
                      />

                      <ReferenceLine
                        y={30}
                        stroke="#4ade80"
                        strokeDasharray="5 5"
                      />

                      <Line
                        type="monotone"
                        dataKey="rsi14"
                        stroke="#c084fc"
                        strokeWidth={2}
                        dot={false}
                        connectNulls={false}
                        name="RSI 14"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <p
                  style={{
                    fontSize: 13,
                    opacity: 0.8,
                  }}
                >
                  Líneas de referencia: 30 y 70.
                  Los indicadores se calculan
                  exclusivamente con el historial
                  del activo seleccionado y tienen
                  fines académicos.
                </p>
              </div>
            )}
          </>
        )}

      {!cargando &&
        !error &&
        precios.length === 0 && (
          <p>
            No hay precios históricos disponibles
            para {activoVisible}.
          </p>
        )}
    </section>
  )
}
