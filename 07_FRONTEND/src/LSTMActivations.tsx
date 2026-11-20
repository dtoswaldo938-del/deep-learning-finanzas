import { API_BASE_URL } from './apiConfig'

import { useEffect, useState } from 'react'
import './LSTMActivations.css'

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
  }
  activaciones: number[]
  estado_celda: number[]
  rendimiento_estimado_porcentaje: number
}

const API = `${API_BASE_URL}`

export default function LSTMActivations({ simbolo = 'BTCUSDT' }: { simbolo?: string }) {
  const [datos, setDatos] = useState<DatosLSTM | null>(null)
  const [seleccionado, setSeleccionado] = useState(0)
  const [tipo, setTipo] = useState<'hidden' | 'cell'>('hidden')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true
    let consultando = false

    async function actualizar() {
      if (consultando) return
      consultando = true

      try {
        const respuesta = await fetch(
          `${API}/api/modelos-multiactivo/inferencia?simbolo=${encodeURIComponent(simbolo)}`,
          { cache: 'no-store' }
        )

        if (!respuesta.ok) {
          throw new Error('No se pudo consultar la LSTM')
        }

        const resultado: DatosLSTM = await respuesta.json()

        if (
          resultado.status !== 'ok' ||
          resultado.activo !== simbolo ||
          !Array.isArray(resultado.activaciones) ||
          !Array.isArray(resultado.estado_celda)
        ) {
          throw new Error('Respuesta de LSTM no válida')
        }

        if (activo) {
          setDatos(resultado)
          setError('')
        }
      } catch {
        if (activo) {
          setError('No se pudieron actualizar las activaciones.')
        }
      } finally {
        consultando = false
        if (activo) setCargando(false)
      }
    }

    void actualizar()

    const intervalo = window.setInterval(() => {
      void actualizar()
    }, 60000)

    return () => {
      activo = false
      window.clearInterval(intervalo)
    }
  }, [simbolo])

  const valores =
    tipo === 'hidden'
      ? datos?.activaciones ?? []
      : datos?.estado_celda ?? []

  const maximo = Math.max(
    0.000001,
    ...valores.map((valor) => Math.abs(valor))
  )

  const valorSeleccionado = valores[seleccionado]

  return (
    <section className="lstm-activations">
      <header className="lstm-activations-header">
        <div>
          <span className="lstm-activations-eyebrow">
            ESTADOS INTERNOS / PYTORCH
          </span>
          <h3>Actividad neuronal real</h3>
          <p>
            Activaciones calculadas por las unidades
            ocultas del modelo LSTM experimental seleccionado.
          </p>
        </div>

        <span className="lstm-activations-tag">
          DATOS DEL MODELO
        </span>
      </header>

      <div className="lstm-activations-toolbar">
        <button
          type="button"
          className={tipo === 'hidden' ? 'active' : ''}
          onClick={() => setTipo('hidden')}
        >
          Estado oculto
        </button>

        <button
          type="button"
          className={tipo === 'cell' ? 'active' : ''}
          onClick={() => setTipo('cell')}
        >
          Estado de celda
        </button>
      </div>

      {cargando && !datos && (
        <p className="lstm-activations-message">
          Consultando activaciones del modelo...
        </p>
      )}

      {error && (
        <p className="lstm-activations-error">{error}</p>
      )}

      {datos && (
        <>
          <div className="lstm-activations-stats">
            <div>
              <span>UNIDADES OCULTAS</span>
              <strong>{datos.arquitectura.neuronas_ocultas}</strong>
            </div>
            <div>
              <span>PASOS TEMPORALES</span>
              <strong>{datos.arquitectura.longitud_secuencia}</strong>
            </div>
            <div>
              <span>CAPAS LSTM</span>
              <strong>{datos.arquitectura.capas_lstm}</strong>
            </div>
            <div>
              <span>FECHA DEL MODELO</span>
              <strong>{datos.fecha_emision}</strong>
            </div>
          </div>

          <div className="lstm-activations-grid">
            {valores.map((valor, indice) => {
              const intensidad = Math.abs(valor) / maximo
              const positivo = valor >= 0

              const fondo = positivo
                ? `rgba(34, 211, 238, ${0.12 + intensidad * 0.75})`
                : `rgba(168, 85, 247, ${0.12 + intensidad * 0.75})`

              return (
                <button
                  key={`${tipo}-${indice}`}
                  type="button"
                  className={
                    seleccionado === indice
                      ? 'lstm-unit selected'
                      : 'lstm-unit'
                  }
                  style={{
                    background: fondo,
                    boxShadow:
                      `0 0 ${8 + intensidad * 24}px ${
                        positivo
                          ? 'rgba(34,211,238,0.25)'
                          : 'rgba(168,85,247,0.25)'
                      }`,
                  }}
                  onClick={() => setSeleccionado(indice)}
                  title={`Unidad ${indice + 1}: ${valor.toFixed(8)}`}
                >
                  <span>H{String(indice + 1).padStart(2, '0')}</span>
                  <strong>
                    {valor >= 0 ? '+' : ''}
                    {valor.toFixed(4)}
                  </strong>
                </button>
              )
            })}
          </div>

          {valorSeleccionado !== undefined && (
            <div className="lstm-activations-inspector">
              <div>
                <span>UNIDAD SELECCIONADA</span>
                <strong>
                  H{String(seleccionado + 1).padStart(2, '0')}
                </strong>
              </div>
              <div>
                <span>TIPO DE ESTADO</span>
                <strong>
                  {tipo === 'hidden'
                    ? 'Estado oculto'
                    : 'Estado de celda'}
                </strong>
              </div>
              <div>
                <span>VALOR REAL</span>
                <strong>
                  {valorSeleccionado.toFixed(8)}
                </strong>
              </div>
            </div>
          )}

          <div className="lstm-activations-legend">
            <span>
              <i className="lstm-legend-positive" />
              Activación positiva
            </span>
            <span>
              <i className="lstm-legend-negative" />
              Activación negativa
            </span>
            <span>
              Mayor brillo = mayor magnitud absoluta
            </span>
          </div>
        </>
      )}

      <p className="lstm-activations-note">
        Estos valores se extraen de la LSTM-A entrenada
        durante la inferencia con datos diarios del mercado.
        No son señales de inversión, probabilidades
        ni predicciones independientes en tiempo real.
      </p>
    </section>
  )
}