import { API_BASE_URL } from './apiConfig'

import { useCallback, useEffect, useState } from 'react'

const API_BASE = `${API_BASE_URL}`

type Resumen = {
  total_predicciones: number
  total_evaluadas: number
  total_pendientes: number
  aciertos_direccion: number
  precision_direccion_porcentaje: number | null
}

type Prediccion = {
  id: number
  fecha_emision: string
  fecha_objetivo: string
  modelo: string
  activo: string
  rendimiento_estimado_porcentaje: number
  rendimiento_observado_porcentaje: number | null
  error_absoluto: number | null
  direccion_correcta: boolean | null
  estado_evaluacion: 'evaluada' | 'pendiente'
}

type Historial = {
  status: string
  resumen: Resumen
  predicciones: Prediccion[]
}

function formatoPorcentaje(valor: number | null) {
  if (valor === null || !Number.isFinite(valor)) {
    return '—'
  }

  const signo = valor > 0 ? '+' : ''

  return `${signo}${valor.toFixed(4)} %`
}

function EvaluacionesLSTM() {
  const [historial, setHistorial] = useState<Historial | null>(null)
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const cargarHistorial = useCallback(async () => {
    const respuesta = await fetch(
      `${API_BASE}/api/mexc/evaluaciones-lstm`
    )

    if (!respuesta.ok) {
      throw new Error('No se pudo consultar el historial')
    }

    const datos: Historial = await respuesta.json()

    if (datos.status !== 'ok') {
      throw new Error('La API devolvió un estado inesperado')
    }

    setHistorial(datos)
  }, [])

  useEffect(() => {
    let activo = true

    async function iniciar() {
      try {
        const respuesta = await fetch(
          `${API_BASE}/api/mexc/evaluaciones-lstm`
        )

        if (!respuesta.ok) {
          throw new Error('No se pudo consultar el historial')
        }

        const datos: Historial = await respuesta.json()

        if (activo) {
          setHistorial(datos)
          setError('')
        }
      } catch {
        if (activo) {
          setError('No fue posible conectar con las evaluaciones.')
        }
      } finally {
        if (activo) {
          setCargando(false)
        }
      }
    }

    iniciar()

    return () => {
      activo = false
    }
  }, [])

  async function actualizarEvaluaciones() {
    setActualizando(true)
    setError('')
    setMensaje('')

    try {
      const respuesta = await fetch(
        `${API_BASE}/api/mexc/evaluaciones-lstm/actualizar`
      )

      if (!respuesta.ok) {
        throw new Error('No se pudieron actualizar las evaluaciones')
      }

      const datos = await respuesta.json()

      if (datos.status !== 'ok') {
        throw new Error('La actualización no fue satisfactoria')
      }

      const resultados = datos.actualizacion?.resultados ?? []
      const guardadas = resultados.filter(
        (fila: { accion: string }) => fila.accion === 'guardada'
      ).length
      const errores = resultados.filter(
        (fila: { accion: string }) => fila.accion === 'error'
      ).length

      await cargarHistorial()

      setMensaje(
        errores > 0
          ? `Actualización parcial: ${guardadas} guardadas y ${errores} errores.`
          : `Actualización completada. Nuevas evaluaciones: ${guardadas}.`
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al actualizar.'
      )
    } finally {
      setActualizando(false)
    }
  }

  const resumen = historial?.resumen

  return (
    <section className="dashboard-card">
      <div className="evaluaciones-encabezado">
        <div>
          <h2>Evaluación de predicciones LSTM-A</h2>
          <p className="evaluaciones-descripcion">
            Comparación de predicciones diarias con los
            rendimientos observados de BTC/USDT en MEXC.
          </p>
        </div>

        <button
          className="evaluaciones-boton"
          onClick={actualizarEvaluaciones}
          disabled={actualizando}
        >
          {actualizando ? 'Actualizando...' : 'Actualizar evaluaciones'}
        </button>
      </div>

      {error && (
        <p className="evaluaciones-error" role="alert">
          {error}
        </p>
      )}

      {mensaje && (
        <p className="evaluaciones-mensaje" role="status">
          {mensaje}
        </p>
      )}

      {cargando ? (
        <p>Consultando evaluaciones...</p>
      ) : historial ? (
        <>
          <div className="evaluaciones-indicadores">
            <div className="evaluaciones-indicador">
              <span>Predicciones registradas</span>
              <strong>{resumen?.total_predicciones ?? 0}</strong>
            </div>

            <div className="evaluaciones-indicador">
              <span>Evaluadas</span>
              <strong>{resumen?.total_evaluadas ?? 0}</strong>
            </div>

            <div className="evaluaciones-indicador">
              <span>Pendientes</span>
              <strong>{resumen?.total_pendientes ?? 0}</strong>
            </div>

            <div className="evaluaciones-indicador">
              <span>Aciertos de dirección</span>
              <strong>
                {resumen?.aciertos_direccion ?? 0} /{' '}
                {resumen?.total_evaluadas ?? 0}
              </strong>
            </div>
          </div>

          <div className="evaluaciones-tabla-contenedor">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Fecha objetivo</th>
                  <th>Estimado</th>
                  <th>Observado</th>
                  <th>Error absoluto</th>
                  <th>Dirección</th>
                  <th>Estado</th>
                </tr>
              </thead>

              <tbody>
                {historial.predicciones.map((prediccion) => (
                  <tr key={prediccion.id}>
                    <td>{prediccion.fecha_objetivo}</td>

                    <td>
                      {formatoPorcentaje(
                        prediccion.rendimiento_estimado_porcentaje
                      )}
                    </td>

                    <td>
                      {formatoPorcentaje(
                        prediccion.rendimiento_observado_porcentaje
                      )}
                    </td>

                    <td>
                      {prediccion.error_absoluto === null
                        ? '—'
                        : `${(prediccion.error_absoluto * 100).toFixed(4)} pp`}
                    </td>

                    <td>
                      {prediccion.direccion_correcta === null
                        ? '—'
                        : prediccion.direccion_correcta
                          ? 'Correcta'
                          : 'Incorrecta'}
                    </td>

                    <td>
                      <span className={
                        prediccion.estado_evaluacion === 'evaluada'
                          ? 'evaluaciones-estado evaluaciones-evaluada'
                          : 'evaluaciones-estado evaluaciones-pendiente'
                      }>
                        {prediccion.estado_evaluacion === 'evaluada'
                          ? 'Evaluada'
                          : 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {historial.predicciones.length === 0 && (
            <p>Todavía no hay predicciones registradas.</p>
          )}

          <p className="evaluaciones-nota">
            Los resultados son académicos y no representan
            recomendaciones de inversión. Las estadísticas
            pueden cambiar conforme se evalúen más predicciones.
          </p>
        </>
      ) : (
        <p>No hay datos de evaluaciones disponibles.</p>
      )}
    </section>
  )
}

export default EvaluacionesLSTM
