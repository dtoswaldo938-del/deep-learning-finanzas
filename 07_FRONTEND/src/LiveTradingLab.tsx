import { useEffect, useRef, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { API_BASE_URL } from './apiConfig'
import './LiveTradingLab.css'
import {
  ACTIVOS_LAB,
  CAPITAL_INICIAL,
  calcularPatrimonio,
  calcularMetricasPosicion,
  crearEstadoInicial,
  ejecutarOperacion,
  type ActivoLab,
  type PreciosLab,
} from './liveTradingEngine'

type Modo = 'VIVO' | 'ACELERADO'
const MAX_EDAD_COTIZACION_MS = 5000
type Punto = { tiempo: string; patrimonio: number; precio: number }

const REFERENCIAS: PreciosLab = {
  BTCUSDT: 60000,
  ETHUSDT: 3000,
  SOLUSDT: 150,
}

const formato = (n: number) =>
  n.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export default function LiveTradingLab() {
  const [modo, setModo] = useState<Modo>('ACELERADO')
  const [activo, setActivo] = useState<ActivoLab>('BTCUSDT')
  const [estado, setEstado] = useState(crearEstadoInicial)
  const [precios, setPrecios] = useState<PreciosLab>(REFERENCIAS)
  const [cotizados, setCotizados] = useState<ActivoLab[]>([])
  const [ultimaCotizacion, setUltimaCotizacion] = useState<number | null>(null)
  const [reloj, setReloj] = useState(Date.now())
  const ultimaCotizacionRef = useRef<number | null>(null)
  const [importe, setImporte] = useState('1000')
  const [mensaje, setMensaje] = useState('')
  const [historia, setHistoria] = useState<Punto[]>([])
  const [reproduciendo, setReproduciendo] = useState(true)
  const paso = useRef(0)
  const estadoRef = useRef(estado)
  const preciosRef = useRef(precios)

  useEffect(() => { estadoRef.current = estado }, [estado])

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setReloj(Date.now())
    }, 1000)

    return () => window.clearInterval(intervalo)
  }, [])
  useEffect(() => { preciosRef.current = precios }, [precios])

  useEffect(() => {
    if (modo !== 'VIVO') return

    let activoEfecto = true
    let ocupado = false
    const controlador = new AbortController()

    async function actualizar() {
      if (ocupado || !activoEfecto) return
      ocupado = true

      try {
        const resultados = await Promise.all(
          ACTIVOS_LAB.map(async simbolo => {
            const r = await fetch(
              `${API_BASE_URL}/api/mexc/precio-por-simbolo?simbolo=${simbolo}`,
              { cache: 'no-store', signal: controlador.signal },
            )
            if (!r.ok) throw new Error('Sin cotizacion')
            const d = await r.json()
            if (
              d.status !== 'ok' ||
              d.activo !== simbolo ||
              !Number.isFinite(Number(d.precio)) ||
              Number(d.precio) <= 0
            ) throw new Error('Cotizacion invalida')

            return [simbolo, Number(d.precio)] as const
          }),
        )

        if (!activoEfecto) return

        const nuevos = Object.fromEntries(resultados) as PreciosLab
        preciosRef.current = nuevos
        setPrecios(nuevos)
        const ahora = Date.now()
        ultimaCotizacionRef.current = ahora
        setUltimaCotizacion(ahora)
        setCotizados([...ACTIVOS_LAB])
        setMensaje('')
      } catch {
        if (activoEfecto) {
          ultimaCotizacionRef.current = null
          setUltimaCotizacion(null)
          setCotizados([])
          setMensaje('Conexion interrumpida. Operaciones ficticias bloqueadas hasta recuperar precios.')
        }
      } finally {
        ocupado = false
      }
    }

    void actualizar()
    const intervalo = window.setInterval(() => void actualizar(), 1000)

    return () => {
      activoEfecto = false
      controlador.abort()
      window.clearInterval(intervalo)
    }
  }, [modo])

  useEffect(() => {
    if (modo !== 'ACELERADO' || !reproduciendo) return

    const intervalo = window.setInterval(() => {
      paso.current += 1
      const t = paso.current

      const nuevos: PreciosLab = {
        BTCUSDT: 60000 * (1 + 0.025 * Math.sin(t / 5)),
        ETHUSDT: 3000 * (1 + 0.035 * Math.sin(t / 7)),
        SOLUSDT: 150 * (1 + 0.045 * Math.sin(t / 4)),
      }

      preciosRef.current = nuevos
      setPrecios(nuevos)
    }, 1000)

    return () => window.clearInterval(intervalo)
  }, [modo, reproduciendo])

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      try {
        if (modo === 'VIVO') {
          const ultima = ultimaCotizacionRef.current
          if (
            cotizados.length !== ACTIVOS_LAB.length ||
            ultima === null ||
            Date.now() - ultima > MAX_EDAD_COTIZACION_MS
          ) return
        }
        const patrimonio = calcularPatrimonio(
          estadoRef.current,
          preciosRef.current,
        )
        setHistoria(anterior => [
          ...anterior.slice(-59),
          {
            tiempo: new Date().toLocaleTimeString('es-MX'),
            patrimonio,
            precio: preciosRef.current[activo],
          },
        ])
      } catch {
        // Se espera una cotizacion valida.
      }
    }, 1000)

    return () => window.clearInterval(intervalo)
  }, [activo, modo, cotizados])

  const cotizacionReciente =
    ultimaCotizacion !== null &&
    reloj - ultimaCotizacion <= MAX_EDAD_COTIZACION_MS

  const precioDisponible =
    modo === 'ACELERADO' || (cotizacionReciente && cotizados.includes(activo))

  let patrimonio = estado.efectivo
  let patrimonioValido = true

  try {
    if (
      modo === 'VIVO' &&
      (
        !cotizacionReciente ||
        ACTIVOS_LAB.some(
        simbolo =>
          estado.posiciones[simbolo] > 0 &&
          !cotizados.includes(simbolo),
        )
      )
    ) {
      patrimonioValido = false
    } else {
      patrimonio = calcularPatrimonio(estado, precios)
    }
  } catch {
    patrimonioValido = false
  }

  function operar(tipo: 'COMPRA' | 'VENTA') {
    try {
      const vigenteAhora =
        modo === 'ACELERADO' ||
        (
          ultimaCotizacionRef.current !== null &&
          Date.now() - ultimaCotizacionRef.current <= MAX_EDAD_COTIZACION_MS &&
          cotizados.includes(activo)
        )

      if (!vigenteAhora) {
        throw new Error('Espera una cotizacion valida.')
      }

      const siguiente = ejecutarOperacion(
        estado,
        activo,
        tipo,
        Number(importe),
        precios[activo],
      )
      estadoRef.current = siguiente
      setEstado(siguiente)
      setMensaje(`${tipo} ficticia registrada correctamente.`)
    } catch (error) {
      setMensaje(
        error instanceof Error ? error.message : 'Operacion invalida.',
      )
    }
  }

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo)
    const inicial = crearEstadoInicial()
    estadoRef.current = inicial
    preciosRef.current = REFERENCIAS
    setEstado(inicial)
    setPrecios(REFERENCIAS)
    ultimaCotizacionRef.current = null
    setUltimaCotizacion(null)
    setCotizados([])
    setHistoria([])
    setMensaje('')
    paso.current = 0
    setReproduciendo(true)
  }

  function reiniciar() {
    const inicial = crearEstadoInicial()
    estadoRef.current = inicial
    setEstado(inicial)
    setHistoria([])
    setMensaje('Laboratorio reiniciado.')
  }

  return (
    <div className="live-lab" style={{ display: 'grid', gap: 18 }}>
      <section className="dashboard-card">
        <h2>Live Trading Lab</h2>
        <p>Laboratorio educativo con capital ficticio. Sin operaciones reales.</p>

        <div className="lab-toolbar">
          <button onClick={() => cambiarModo('VIVO')}>
            Mercado en vivo
          </button>
          <button onClick={() => cambiarModo('ACELERADO')}>
            Simulacion acelerada
          </button>
          <button onClick={reiniciar}>Reiniciar</button>
        </div>

        <p>
          Modo activo: <strong>{modo}</strong>
          {modo === 'ACELERADO' && ' · Precios ficticios didacticos'}
        </p>

        {modo === 'ACELERADO' && (
          <button onClick={() => setReproduciendo(v => !v)}>
            {reproduciendo ? 'Pausar reproduccion' : 'Reanudar reproduccion'}
          </button>
        )}
      </section>

      <section className="dashboard-card">
        <h2>Seleccion de activo</h2>

        <select
          value={activo}
          onChange={e => {
            setActivo(e.target.value as ActivoLab)
            setHistoria([])
          }}
        >
          {ACTIVOS_LAB.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <h2>
          {precioDisponible
            ? `${formato(precios[activo])} USDT`
            : 'Esperando precio de MEXC'}
        </h2>

        <p>
          Fuente: {modo === 'VIVO'
            ? 'MEXC · Datos publicos'
            : 'Secuencia ficticia · Demostracion'}
        </p>

        {modo === 'VIVO' && (
          <div className="lab-connection-status">
            <strong style={{
              color: precioDisponible ? '#34d399' : '#f87171',
            }}>
              {precioDisponible
                ? 'Cotizacion reciente disponible'
                : 'Esperando cotizacion reciente'}
            </strong>

            <p>
              Ultima actualizacion: {
                ultimaCotizacion !== null
                  ? new Date(ultimaCotizacion).toLocaleTimeString('es-MX')
                  : 'Sin datos'
              }
            </p>

            <p className="lab-muted">
              Las operaciones ficticias requieren precios recibidos
              durante los ultimos cinco segundos.
            </p>
          </div>
        )}
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 12,
        }}
      >
        {[
          ['Saldo disponible', formato(estado.efectivo)],
          ['Patrimonio total', patrimonioValido ? formato(patrimonio) : 'Sin cotizacion'],
          ['Resultado ficticio', patrimonioValido ? formato(patrimonio - CAPITAL_INICIAL) : 'Sin cotizacion'],
          ['Unidades del activo', estado.posiciones[activo].toFixed(6)],
        ].map(([titulo, valor]) => (
          <div key={titulo} className="dashboard-card">
            <p>{titulo}</p>
            <h2>{valor}</h2>
          </div>
        ))}
      </section>

      <section className="dashboard-card">
        <h2>Evolucion del patrimonio ficticio</h2>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={historia}>
              <CartesianGrid stroke="#334155" />
              <XAxis dataKey="tiempo" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" domain={['auto', 'auto']} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="patrimonio"
                stroke="#38bdf8"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="dashboard-card">
        <h2>Evolucion del precio del activo</h2>
        <p className="lab-muted">
          {activo} · {modo === 'VIVO'
            ? 'Cotizaciones publicas de MEXC'
            : 'Precios ficticios para demostracion'}
        </p>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={historia}>
              <CartesianGrid stroke="#334155" />
              <XAxis dataKey="tiempo" stroke="#94a3b8" />
              <YAxis
                stroke="#94a3b8"
                domain={['auto', 'auto']}
                width={80}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="precio"
                stroke="#34d399"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="dashboard-card">
        <h2>Operaciones ficticias</h2>

        <label>
          Importe en USDT:{' '}
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={importe}
            onChange={e => setImporte(e.target.value)}
          />
        </label>

        <div className="lab-toolbar" style={{ marginTop: 14 }}>
          <button className="lab-buy" disabled={!precioDisponible} onClick={() => operar('COMPRA')}>
            Simular compra
          </button>
          <button className="lab-sell" disabled={!precioDisponible} onClick={() => operar('VENTA')}>
            Simular venta
          </button>
        </div>

        {mensaje && <p role="status">{mensaje}</p>}
      </section>

      <section className="dashboard-card">
        <h2>Posiciones abiertas</h2>
        <p className="lab-muted">
          Valor de los activos ficticios del portafolio.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Activo</th>
                <th>Cantidad</th>
                <th>Precio USDT</th>
                <th>Valor USDT</th>
                <th>Costo promedio</th>
                <th>Resultado abierto</th>
                <th>Rendimiento %</th>
                <th>Resultado realizado</th>
              </tr>
            </thead>
            <tbody>
              {ACTIVOS_LAB.map(simbolo => {
                const cantidad = estado.posiciones[simbolo]
                const metricas = calcularMetricasPosicion(estado, simbolo, precios[simbolo])
                const disponible =
                  modo === 'ACELERADO' ||
                  (cotizacionReciente && cotizados.includes(simbolo))

                return (
                  <tr key={simbolo}>
                    <td>{simbolo}</td>
                    <td>{cantidad.toFixed(6)}</td>
                    <td>
                      {disponible
                        ? formato(precios[simbolo])
                        : 'Sin cotizacion'}
                    </td>
                    <td>
                      {cantidad === 0
                        ? '0.00'
                        : disponible
                          ? formato(cantidad * precios[simbolo])
                          : 'Sin cotizacion'}
                    </td>
                    <td>
                      {cantidad > 0
                        ? formato(metricas.costoPromedio)
                        : '—'}
                    </td>
                    <td style={{
                      color: !disponible
                        ? '#94a3b8'
                        : metricas.resultadoNoRealizado >= 0
                          ? '#34d399'
                          : '#f87171',
                    }}>
                      {cantidad === 0
                        ? '0.00'
                        : disponible
                          ? formato(metricas.resultadoNoRealizado)
                          : 'Sin cotizacion'}
                    </td>
                    <td style={{
                      color: metricas.resultadoNoRealizado >= 0
                        ? '#34d399'
                        : '#f87171',
                    }}>
                      {cantidad > 0 && disponible && metricas.costoPendiente > 0
                        ? `${(100 * metricas.resultadoNoRealizado / metricas.costoPendiente).toFixed(2)}%`
                        : '—'}
                    </td>
                    <td style={{
                      color: metricas.resultadoRealizado >= 0
                        ? '#34d399'
                        : '#f87171',
                    }}>
                      {formato(metricas.resultadoRealizado)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="dashboard-card">
        <h2>Historial del laboratorio</h2>

        {estado.operaciones.length === 0 ? (
          <p>Todavia no hay operaciones ficticias.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Activo</th>
                  <th>Importe</th>
                  <th>Precio</th>
                </tr>
              </thead>
              <tbody>
                {estado.operaciones.map(op => (
                  <tr key={op.id}>
                    <td>{op.tipo}</td>
                    <td>{op.activo}</td>
                    <td>{formato(op.importe)}</td>
                    <td>{formato(op.precio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}








