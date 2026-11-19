
import { useEffect, useState } from 'react'
import './App.css'
import GraficaBitcoin from './GraficaBitcoin'
import ComparacionModelos from './ComparacionModelos'
import ResultadosCap09 from './ResultadosCap09'
import ResultadosCap10 from './ResultadosCap10'
import TrayectoriasCapital from './TrayectoriasCapital'
import ResultadosCap11 from './ResultadosCap11'
import PrediccionLSTM from './PrediccionLSTM'
import PrecioMEXC from './PrecioMEXC'
import PrediccionMEXC from './PrediccionMEXC'
import EvaluacionesLSTM from './EvaluacionesLSTM'
import MonitorLSTM from './MonitorLSTM'
import GraficaEvaluacionesLSTM from './GraficaEvaluacionesLSTM'
import CapitalVirtual from './CapitalVirtual'
import EscenariosLSTM from './EscenariosLSTM'
import ResumenEstadisticoLSTM from './ResumenEstadisticoLSTM'
import GraficaErroresSimulador from './GraficaErroresSimulador'
import HistorialErroresLSTM from './HistorialErroresLSTM'
import MetricasPrecisionLSTM from './MetricasPrecisionLSTM'
import LaboratorioLSTM from './LaboratorioLSTM'
import AnalisisErroresLSTM from './AnalisisErroresLSTM'
import ComparacionDireccionalLSTM from './ComparacionDireccionalLSTM'

type Ciclo = {
  id: number
  fecha_utc: string
  estado: string
  modelo: string
  observaciones: string
}

function App() {
  const [totalCiclos, setTotalCiclos] = useState<number | null>(null)
  const [errorConexion, setErrorConexion] = useState('')
  const [ciclos, setCiclos] = useState<Ciclo[]>([])

  useEffect(() => {
    async function consultarCiclos() {
      try {
        const respuesta = await fetch(
          'http://127.0.0.1:8001/ciclos'
        )

        if (!respuesta.ok) {
          throw new Error('No se pudo consultar la API')
        }

        const datos = await respuesta.json()

        setTotalCiclos(datos.total_mostrados)
        setCiclos(datos.ciclos)
        setErrorConexion('')
      } catch {
        setErrorConexion('No se pudo conectar con el backend')
      }
    }

    consultarCiclos()
  }, [])

  return (
    <main className="dashboard">

      {/* ================================= */}
      {/* ENCABEZADO DEL DASHBOARD */}
      {/* ================================= */}

      <header className="dashboard-header">
        <h1 className="dashboard-title">
          Deep Learning para Finanzas
        </h1>

        <h2>Dashboard de análisis financiero</h2>

        <p className="dashboard-subtitle">
          Sistema académico de análisis de BTC/USDT
          mediante modelos de aprendizaje profundo.
        </p>
      </header>

      {/* ================================= */}
      {/* ESTADO DEL PROYECTO */}
      {/* ================================= */}

      <section className="dashboard-card">
        <h2>Estado del proyecto</h2>

        <p>Activo: BTC/USDT</p>

        <p>Modelo seleccionado: LSTM_A</p>

        <p>
          Modalidad: simulación con capital virtual
        </p>

        <p>
          Operaciones con dinero real: deshabilitadas
        </p>

        <p>
          Ciclos registrados en SQLite:{' '}
          {totalCiclos === null
            ? 'Consultando...'
            : totalCiclos}
        </p>

        {errorConexion && (
          <p style={{ color: '#f87171' }}>
            {errorConexion}
          </p>
        )}
      </section>

{/* ================================= */}
{/* SIMULADOR DE CAPITAL FICTICIO */}
{/* ================================= */}

<CapitalVirtual />

{/* ================================= */}
{/* ESCENARIOS HIPOTETICOS LSTM-A */}
{/* ================================= */}

<EscenariosLSTM />
<ResumenEstadisticoLSTM />
<GraficaErroresSimulador />
<HistorialErroresLSTM />
<MetricasPrecisionLSTM />

{/* ================================= */}
{/* LABORATORIO LSTM EXPERIMENTAL */}
{/* ================================= */}

<LaboratorioLSTM />

{/* ================================= */}
{/* ANALISIS AVANZADO DEL LABORATORIO */}
{/* ================================= */}

<AnalisisErroresLSTM />

{/* COMPARACION DIRECCIONAL DEL LABORATORIO */}
<ComparacionDireccionalLSTM />

{/* ================================= */}
{/* PRECIO ACTUAL DE BITCOIN EN MEXC */}
{/* ================================= */}

<PrecioMEXC />

{/* ================================= */}
{/* PREDICCION LSTM-A CON DATOS MEXC */}
{/* ================================= */}

<PrediccionMEXC />


{/* HISTORIAL DE EVALUACIONES LSTM-A */}
<EvaluacionesLSTM />

{/* MONITOR DE ACTUALIZACIONES AUTOMÁTICAS */}
<MonitorLSTM />

{/* GRÁFICA DE EVALUACIONES HISTÓRICAS LSTM-A */}
<GraficaEvaluacionesLSTM />

{/* ================================= */}
{/* GRÁFICA HISTÓRICA DE BITCOIN */}
{/* ================================= */}

<GraficaBitcoin />

      <ComparacionModelos />

      {/* ================================= */}
      {/* HISTORIAL DE CICLOS */}
      {/* ================================= */}

      <section className="dashboard-card">
        <h2>Historial de ciclos del sistema</h2>

        <div style={{ overflowX: 'auto' }}>
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Modelo</th>
                <th>Observaciones</th>
              </tr>
            </thead>

            <tbody>
              {ciclos.map((ciclo) => (
                <tr key={ciclo.id}>
                  <td>{ciclo.id}</td>

                  <td>
                    {new Date(
                      ciclo.fecha_utc
                    ).toLocaleString('es-MX')}
                  </td>

                  <td>{ciclo.estado}</td>

                  <td>{ciclo.modelo}</td>

                  <td>{ciclo.observaciones}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalCiclos === 0 && (
          <p>
            Todavía no hay ciclos registrados.
          </p>
        )}
      </section>

      {/* ================================= */}
      {/* PRÓXIMOS MÓDULOS */}
      {/* ================================= */}

      <section className="dashboard-card">
        <h2>Avance del proyecto</h2>

        <p>
          Plataforma académica para el análisis financiero
          mediante aprendizaje profundo y simulaciones históricas.
        </p>

        <div style={{
          textAlign: 'left',
          maxWidth: 650,
          margin: '20px auto'
        }}>
          <p>✅ Capítulo 7: preparación de datos y modelos base.</p>
          <p>✅ Capítulo 8: entrenamiento de redes MLP y LSTM.</p>
          <p>✅ Capítulo 9: validación temporal y simulación virtual.</p>
          <p>✅ Capítulo 10: experimento de aprendizaje por refuerzo.</p>
          <p>✅ Capítulo 11: evaluación final con datos reservados.</p>
          <p>✅ Dashboard conectado con FastAPI y SQLite.</p>
        </div>

        <p style={{ fontSize: '13px', opacity: 0.8 }}>
          Los experimentos utilizan datos históricos y capital virtual.
          No se realizan operaciones con dinero real.
        </p>
      </section>

      {/* ================================= */}
      {/* RESULTADOS DEL CAPÍTULO 9 */}
      {/* ================================= */}

      <ResultadosCap09 />

      {/* ================================= */}
      {/* RESULTADOS DEL CAPÍTULO 10 */}
      {/* ================================= */}

      <ResultadosCap10 />

      <TrayectoriasCapital />

      {/* ================================= */}
      {/* CAPÍTULO 11: EVALUACIÓN FINAL */}
      {/* ================================= */}

      <ResultadosCap11 />

      {/* ================================= */}
      {/* PREDICCIÓN HISTÓRICA LSTM-A */}
      {/* ================================= */}

      <PrediccionLSTM />

    </main>
  )
}

export default App
