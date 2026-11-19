
import { useEffect, useState } from 'react'
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

type DatoGrafica = {
  fecha: string
  cierre: number
  sma20: number | null
  ema20: number | null
  rsi14: number | null
}

function calcularIndicadores(precios: Precio[]): DatoGrafica[] {
  const periodoSMA = 20
  const periodoEMA = 20
  const periodoRSI = 14

  const cierres = precios.map((precio) => precio.close)

  const multiplicadorEMA = 2 / (periodoEMA + 1)

  let emaAnterior: number | null = null
  let gananciaPromedio = 0
  let perdidaPromedio = 0

  return precios.map((precio, indice) => {
    let sma20: number | null = null
    let ema20: number | null = null
    let rsi14: number | null = null

    // MEDIA MÓVIL SIMPLE
    if (indice >= periodoSMA - 1) {
      const ultimos20 = cierres.slice(
        indice - periodoSMA + 1,
        indice + 1
      )

      sma20 =
        ultimos20.reduce((suma, valor) => suma + valor, 0) /
        periodoSMA
    }

    // MEDIA MÓVIL EXPONENCIAL
    if (indice === periodoEMA - 1) {
      emaAnterior = sma20
      ema20 = emaAnterior
    } else if (indice >= periodoEMA && emaAnterior !== null) {
      emaAnterior =
        (precio.close - emaAnterior) * multiplicadorEMA +
        emaAnterior

      ema20 = emaAnterior
    }

    // RSI CON SUAVIZADO DE WILDER
    if (indice === periodoRSI) {
      let sumaGanancias = 0
      let sumaPerdidas = 0

      for (let i = 1; i <= periodoRSI; i++) {
        const cambio = cierres[i] - cierres[i - 1]

        sumaGanancias += Math.max(cambio, 0)
        sumaPerdidas += Math.max(-cambio, 0)
      }

      gananciaPromedio = sumaGanancias / periodoRSI
      perdidaPromedio = sumaPerdidas / periodoRSI
    } else if (indice > periodoRSI) {
      const cambio = cierres[indice] - cierres[indice - 1]

      gananciaPromedio =
        (gananciaPromedio * (periodoRSI - 1) +
          Math.max(cambio, 0)) /
        periodoRSI

      perdidaPromedio =
        (perdidaPromedio * (periodoRSI - 1) +
          Math.max(-cambio, 0)) /
        periodoRSI
    }

    if (indice >= periodoRSI) {
      if (gananciaPromedio === 0 && perdidaPromedio === 0) {
        rsi14 = 50
      } else if (perdidaPromedio === 0) {
        rsi14 = 100
      } else {
        const rs = gananciaPromedio / perdidaPromedio
        rsi14 = 100 - 100 / (1 + rs)
      }
    }

    return {
      fecha: precio.fecha.slice(0, 10),
      cierre: precio.close,
      sma20,
      ema20,
      rsi14,
    }
  })
}

function GraficaBitcoin() {
  const [precios, setPrecios] = useState<Precio[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [mostrarSMA, setMostrarSMA] = useState(true)
  const [mostrarEMA, setMostrarEMA] = useState(true)
  const [mostrarRSI, setMostrarRSI] = useState(true)

  useEffect(() => {
    async function cargarPrecios() {
      try {
        const respuesta = await fetch(
          'http://127.0.0.1:8001/precios?limite=100'
        )

        if (!respuesta.ok) {
          throw new Error('No se pudieron obtener los precios')
        }

        const datos = await respuesta.json()

        if (!Array.isArray(datos.precios)) {
          throw new Error('Formato de datos incorrecto')
        }

        setPrecios(datos.precios)
        setError('')
      } catch {
        setError('No se pudieron cargar los precios históricos.')
      } finally {
        setCargando(false)
      }
    }

    cargarPrecios()
  }, [])

  const datosGrafica = calcularIndicadores(precios)

  return (
    <section className="dashboard-card">
      <h2>Precio histórico de Bitcoin (BTC/USDT)</h2>

      <p>
        Últimos 100 registros diarios disponibles.
        Datos históricos de MEXC.
      </p>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '20px',
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

      {cargando && <p>Cargando gráfica...</p>}

      {error && <p>{error}</p>}

      {!cargando && !error && precios.length > 0 && (
        <>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datosGrafica}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="fecha"
                  tick={{ fontSize: 12 }}
                  minTickGap={30}
                />

                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 12 }}
                  width={85}
                />

                <Tooltip
                  formatter={(valor) =>
                    typeof valor === 'number'
                      ? valor.toFixed(2)
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
            <div style={{ marginTop: '30px' }}>
              <h3>Índice de Fuerza Relativa (RSI 14)</h3>

              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={datosGrafica}>
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis
                      dataKey="fecha"
                      tick={{ fontSize: 12 }}
                      minTickGap={30}
                    />

                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 30, 50, 70, 100]}
                      width={45}
                    />

                    <Tooltip
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

              <p style={{ fontSize: '13px', opacity: 0.8 }}>
                Líneas de referencia: 30 y 70.
                Indicadores calculados con los datos históricos
                cargados, exclusivamente para análisis académico.
              </p>
            </div>
          )}
        </>
      )}

      {!cargando && !error && precios.length === 0 && (
        <p>No hay precios disponibles para mostrar.</p>
      )}
    </section>
  )
}

export default GraficaBitcoin
