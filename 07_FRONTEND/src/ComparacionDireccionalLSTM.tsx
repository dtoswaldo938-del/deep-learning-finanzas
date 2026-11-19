
import { useEffect, useState } from 'react'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const API = 'http://127.0.0.1:8001'

type Comparacion = {
  status: string
  modelo: string
  observaciones: number
  dias_reales_subida: number
  dias_reales_bajada: number
  aciertos_lstm: number
  aciertos_siempre_subida: number
  aciertos_siempre_bajada: number
  precision_lstm: number
  precision_siempre_subida: number
  precision_siempre_bajada: number
  operaciones_reales: boolean
  capital_virtual_modificado: boolean
}

type Barra = {
  nombre: string
  precision: number
  aciertos: number
  color: string
}

export default function ComparacionDireccionalLSTM() {
  const [datos, setDatos] = useState<Comparacion | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function consultar() {
      try {
        const respuesta = await fetch(
          `${API}/api/laboratorio-lstm/comparacion-direccional`
        )

        if (!respuesta.ok) {
          throw new Error('Error al consultar la comparación')
        }

        const resultado: Comparacion = await respuesta.json()

        if (
          resultado.status !== 'ok' ||
          resultado.operaciones_reales ||
          resultado.capital_virtual_modificado
        ) {
          throw new Error('Respuesta no válida')
        }

        setDatos(resultado)
        setError('')
      } catch {
        setError(
          'No se pudo cargar la comparación direccional.'
        )
      } finally {
        setCargando(false)
      }
    }

    consultar()
  }, [])

  const barras: Barra[] = datos
    ? [
        {
          nombre: 'LSTM-32',
          precision: datos.precision_lstm,
          aciertos: datos.aciertos_lstm,
          color: '#38bdf8',
        },
        {
          nombre: 'Siempre subida',
          precision: datos.precision_siempre_subida,
          aciertos: datos.aciertos_siempre_subida,
          color: '#a78bfa',
        },
        {
          nombre: 'Siempre bajada',
          precision: datos.precision_siempre_bajada,
          aciertos: datos.aciertos_siempre_bajada,
          color: '#34d399',
        },
      ]
    : []

  return (
    <section className="dashboard-card">
      <h2>Comparación de precisión direccional</h2>

      <p>
        Evaluación histórica de LSTM-32 frente a dos
        referencias sencillas: predecir siempre una subida
        o siempre una bajada.
      </p>

      {cargando && <p>Cargando comparación...</p>}

      {error && (
        <p style={{ color: '#f87171' }}>{error}</p>
      )}

      {datos && (
        <>
          <p>
            <strong>Observaciones TEST:</strong>{' '}
            {datos.observaciones}
            {' | '}
            <strong>Días reales de subida:</strong>{' '}
            {datos.dias_reales_subida}
            {' | '}
            <strong>Días reales de bajada:</strong>{' '}
            {datos.dias_reales_bajada}
          </p>

          <div
            style={{
              width: '100%',
              height: 350,
              marginTop: 26,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barras}
                margin={{
                  top: 30,
                  right: 20,
                  left: 0,
                  bottom: 20,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                />

                <XAxis
                  dataKey="nombre"
                  tick={{
                    fill: '#cbd5e1',
                    fontSize: 12,
                  }}
                  interval={0}
                />

                <YAxis
                  domain={[0, 100]}
                  tick={{
                    fill: '#cbd5e1',
                    fontSize: 12,
                  }}
                  tickFormatter={(valor: number) => `${valor}%`}
                />

                <Tooltip
                  formatter={(valor) => [
                    `${Number(valor).toFixed(4)} %`,
                    'Precisión direccional',
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    color: '#f8fafc',
                  }}
                />

                <Bar
                  dataKey="precision"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={100}
                >
                  {barras.map((barra) => (
                    <Cell
                      key={barra.nombre}
                      fill={barra.color}
                    />
                  ))}

                  <LabelList
                    dataKey="precision"
                    position="top"
                    formatter={(valor: unknown) =>
                      `${Number(valor).toFixed(2)} %`
                    }
                    style={{
                      fill: '#e2e8f0',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 14,
              marginTop: 20,
            }}
          >
            {barras.map((barra) => (
              <div
                key={barra.nombre}
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border:
                    '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: 12,
                  padding: 16,
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    opacity: 0.8,
                  }}
                >
                  {barra.nombre}
                </p>

                <h3
                  style={{
                    color: barra.color,
                    margin: '12px 0 6px',
                  }}
                >
                  {barra.precision.toFixed(4)} %
                </h3>

                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    opacity: 0.7,
                  }}
                >
                  {barra.aciertos} aciertos
                </p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 26 }}>
            <h3>Interpretación</h3>

            <p>
              LSTM-32 obtuvo{' '}
              {datos.precision_lstm.toFixed(4)} % de precisión,
              frente a{' '}
              {datos.precision_siempre_subida.toFixed(4)} %
              de la referencia siempre subida y{' '}
              {datos.precision_siempre_bajada.toFixed(4)} %
              de la referencia siempre bajada.
            </p>

            <p>
              La comparación evidencia que el modelo
              neuronal no supera de manera consistente
              a ambas referencias sencillas en este
              periodo histórico.
            </p>
          </div>

          <p
            style={{
              fontSize: 13,
              opacity: 0.75,
              marginTop: 20,
            }}
          >
            Las referencias se utilizan únicamente para
            evaluación académica. No representan
            recomendaciones de inversión ni operaciones
            financieras reales.
          </p>
        </>
      )}
    </section>
  )
}
