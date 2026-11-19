
import { useEffect, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Trayectoria = {
  fecha_objetivo: string
  politica: string
  capital_virtual: number | string
  drawdown: number | string
}

type PuntoGrafica = {
  fecha: string
  exposicion?: number
  qlearning?: number
  sinExposicion?: number
}

function TrayectoriasCapital() {
  const [datos, setDatos] = useState<PuntoGrafica[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function cargarTrayectorias() {
      try {
        const respuesta = await fetch(
          'http://127.0.0.1:8001/cap10/trayectorias'
        )

        if (!respuesta.ok) {
          throw new Error(
            'Error al consultar las trayectorias'
          )
        }

        const resultado = await respuesta.json()

        if (!Array.isArray(resultado.trayectorias)) {
          throw new Error('Formato de datos incorrecto')
        }

        const registros: Trayectoria[] = resultado.trayectorias

        const porFecha = new Map<string, PuntoGrafica>()

        registros.forEach((registro) => {
          const fecha = registro.fecha_objetivo.slice(0, 10)

          const capital = Number(registro.capital_virtual)

          if (!Number.isFinite(capital)) {
            return
          }

          const punto = porFecha.get(fecha) ?? { fecha }

          if (registro.politica === 'Exposición permanente') {
            punto.exposicion = capital
          }

          if (registro.politica === 'Q-learning') {
            punto.qlearning = capital
          }

          if (registro.politica === 'Sin exposición') {
            punto.sinExposicion = capital
          }

          porFecha.set(fecha, punto)
        })

        const ordenados = Array.from(
          porFecha.values()
        ).sort((a, b) =>
          a.fecha.localeCompare(b.fecha)
        )

        setDatos(ordenados)
        setError('')
      } catch (error) {
        console.error(
          'Error al cargar trayectorias:',
          error
        )

        setError(
          'No se pudieron cargar las trayectorias virtuales.'
        )
      } finally {
        setCargando(false)
      }
    }

    cargarTrayectorias()
  }, [])

  return (
    <section className="dashboard-card">
      <h2>Evolución del capital virtual</h2>

      <p>
        Capítulo 10: comparación histórica de tres políticas
        durante el periodo de validación.
      </p>

      {cargando && (
        <p>Cargando trayectorias...</p>
      )}

      {error && (
        <p style={{ color: '#f87171' }}>
          {error}
        </p>
      )}

      {!cargando && !error && datos.length > 0 && (
        <div style={{ width: '100%', height: 420 }}>
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <LineChart
              data={datos}
              margin={{
                top: 20,
                right: 20,
                left: 15,
                bottom: 20,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#475569"
              />

              <XAxis
                dataKey="fecha"
                tick={{ fontSize: 11 }}
                minTickGap={35}
              />

              <YAxis
                domain={['auto', 'auto']}
                width={90}
                tick={{ fontSize: 11 }}
                tickFormatter={(valor: number) =>
                  Number(valor).toLocaleString('es-MX', {
                    maximumFractionDigits: 0,
                  })
                }
              />

              <Tooltip
                formatter={(valor) =>
                  Number(valor).toLocaleString('es-MX', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                }
              />

              <Legend />

              <Line
                type="monotone"
                dataKey="exposicion"
                name="Exposición permanente"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
              />

              <Line
                type="monotone"
                dataKey="qlearning"
                name="Q-learning"
                stroke="#34d399"
                strokeWidth={2}
                dot={false}
              />

              <Line
                type="monotone"
                dataKey="sinExposicion"
                name="Sin exposición"
                stroke="#94a3b8"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {!cargando && !error && datos.length === 0 && (
        <p>No hay trayectorias disponibles.</p>
      )}

      <p style={{ fontSize: '13px', marginTop: '20px' }}>
        Capital inicial virtual: 100,000 unidades.
        Resultados de una simulación histórica académica.
        No representan rendimientos futuros garantizados.
      </p>
    </section>
  )
}

export default TrayectoriasCapital
