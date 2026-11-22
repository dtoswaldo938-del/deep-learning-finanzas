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
import {
  activosParaCotizar,
  consultarPreciosLab,
} from './liveTradingCotizaciones'

import SelectorActivosLab from './SelectorActivosLab'
import './LiveTradingLab.css'
import {
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
  const activoRef = useRef(activo)
  const modoRef = useRef(modo)
  const cotizadosRef = useRef(cotizados)
  const [versionPosiciones, setVersionPosiciones] = useState(0)

  useEffect(() => { estadoRef.current = estado }, [estado])

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setReloj(Date.now())
    }, 1000)

    return () => window.clearInterval(intervalo)
  }, [])
  useEffect(() => { preciosRef.current = precios }, [precios])
  useEffect(() => { activoRef.current = activo }, [activo])
  useEffect(() => { modoRef.current = modo }, [modo])
  useEffect(() => { cotizadosRef.current = cotizados }, [cotizados])

  useEffect(() => {
    if (modo !== 'VIVO') return

    let activoEfecto = true
    let ocupado = false
    const controlador = new AbortController()

    async function actualizar() {
      if (ocupado || !activoEfecto) return
      ocupado = true

      try {
        const simbolos = activosParaCotizar(
          activoRef.current,
          estadoRef.current,
        )

        const nuevos = await consultarPreciosLab(
          simbolos,
          controlador.signal,
        )

        if (!activoEfecto || modoRef.current !== 'VIVO') return

        const simbolosActuales = activosParaCotizar(
          activoRef.current,
          estadoRef.current,
        )

        if (simbolosActuales.some(s => !(s in nuevos))) {
          ultimaCotizacionRef.current = null
          setUltimaCotizacion(null)
          setCotizados([])
          return
        }

        const ahora = Date.now()
        preciosRef.current = nuevos
        setPrecios(nuevos)
        ultimaCotizacionRef.current = ahora
        setUltimaCotizacion(ahora)
        setCotizados(simbolos)
        setMensaje('')
      } catch {
        if (activoEfecto) {
          ultimaCotizacionRef.current = null
          setUltimaCotizacion(null)
          setCotizados([])
          setMensaje(
            'Conexion interrumpida. Operaciones ficticias bloqueadas hasta recuperar precios.',
          )
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
  }, [modo, activo, versionPosiciones])
  useEffect(() => {
    if (modo !== 'ACELERADO') return

    const simbolos = activosParaCotizar(activo, estado)
    const actualizados: PreciosLab = { ...preciosRef.current }
    let hayCambios = false

    for (const simbolo of simbolos) {
      const precio = actualizados[simbolo]

      if (Number.isFinite(precio) && precio > 0) continue

      const semilla = [...simbolo].reduce(
        (total, caracter) => total + caracter.charCodeAt(0),
        0,
      )

      actualizados[simbolo] =
        REFERENCIAS[simbolo] ?? (1 + (semilla % 10000) / 100)

      hayCambios = true
    }

    if (hayCambios) {
      preciosRef.current = actualizados
      setPrecios(actualizados)
    }
  }, [modo, activo, estado])
  useEffect(() => {
    if (modo !== 'ACELERADO' || !reproduciendo) return

    const intervalo = window.setInterval(() => {
      paso.current += 1
      const t = paso.current

      const simbolos = activosParaCotizar(
        activoRef.current,
        estadoRef.current,
      )

      const nuevos: PreciosLab = {}

      for (const simbolo of simbolos) {
        const semilla = [...simbolo].reduce(
          (total, caracter) => total + caracter.charCodeAt(0),
          0,
        )

        const base = REFERENCIAS[simbolo] ??
          (1 + (semilla % 10000) / 100)

        const amplitud = 0.02 + (semilla % 4) * 0.005
        const frecuencia = 4 + (semilla % 7)

        nuevos[simbolo] =
          base * (1 + amplitud * Math.sin(t / frecuencia))
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
                        activosParaCotizar(
              activoRef.current,
              estadoRef.current,
            ).some(simbolo => !cotizados.includes(simbolo)) ||
            ultima === null ||
            Date.now() - ultima > MAX_EDAD_COTIZACION_MS
          ) return
        }
        const simbolosNecesarios = activosParaCotizar(
          activoRef.current,
          estadoRef.current,
        )

        if (simbolosNecesarios.some(simbolo => {
          const precio = preciosRef.current[simbolo]
          return !Number.isFinite(precio) || precio <= 0
        })) return

        const patrimonio = calcularPatrimonio(
          estadoRef.current,
          preciosRef.current,
        )

        if (!Number.isFinite(patrimonio)) return
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

  const precioActual = precios[activo]

  const precioValido =
    Number.isFinite(precioActual) && precioActual > 0

  const precioDisponible =
    precioValido &&
    (
      modo === 'ACELERADO' ||
      (cotizacionReciente && cotizados.includes(activo))
    )

  let patrimonio = estado.efectivo
  let patrimonioValido = true

  try {
    if (
      modo === 'VIVO' &&
      (
        !cotizacionReciente ||
        Object.entries(estado.posiciones).some(
          ([simbolo, cantidad]) =>
            cantidad > 0 && !cotizados.includes(simbolo),
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
        precioValido &&
        (
          modo === 'ACELERADO' ||
          (
            ultimaCotizacionRef.current !== null &&
            Date.now() - ultimaCotizacionRef.current <= MAX_EDAD_COTIZACION_MS &&
            cotizados.includes(activo)
          )
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
      setVersionPosiciones(v => v + 1)
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
    setVersionPosiciones(v => v + 1)
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

        <SelectorActivosLab
          activo={activo}
          onSeleccionar={simbolo => {
            setActivo(simbolo)
            activoRef.current = simbolo
            if (modo === 'ACELERADO') {
              const semilla = [...simbolo].reduce(
                (total, caracter) => total + caracter.charCodeAt(0),
                0,
              )
              const precio = REFERENCIAS[simbolo] ??
                (1 + (semilla % 10000) / 100)
              const nuevos = { ...preciosRef.current, [simbolo]: precio }
              preciosRef.current = nuevos
              setPrecios(nuevos)
            }
            ultimaCotizacionRef.current = null
            setUltimaCotizacion(null)
            setCotizados([])
            setHistoria([])
          }}
        />

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
          ['Unidades del activo', (estado.posiciones[activo] ?? 0).toFixed(6)],
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
              {Object.keys(estado.posiciones).map(simbolo => {
                const cantidad = estado.posiciones[simbolo] ?? 0
                const metricas = calcularMetricasPosicion(estado, simbolo, precios[simbolo])
                const precioPosicion = precios[simbolo]

                const disponible =
                  Number.isFinite(precioPosicion) &&
                  precioPosicion > 0 &&
                  (
                    modo === 'ACELERADO' ||
                    (cotizacionReciente && cotizados.includes(simbolo))
                  )

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
