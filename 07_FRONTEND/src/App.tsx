import { API_BASE_URL } from './apiConfig'

import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import './App.css'

import TradingSidebar from './TradingSidebar'
import SelectorActivosMEXC from './SelectorActivosMEXC'
const NeuralNetwork = lazy(() => import('./NeuralNetwork'))
const PanelMultiactivo = lazy(() => import('./PanelMultiactivo'))
const EntrenamientoNuevoActivo = lazy(() => import('./EntrenamientoNuevoActivo'))
const CatalogoModelosLSTM = lazy(() => import('./CatalogoModelosLSTM'))
const ComparadorModelosMultiactivo = lazy(() => import('./ComparadorModelosMultiactivo'))
const ActualizadorHistorial = lazy(() => import('./ActualizadorHistorial'))
const GraficasEvaluacionMultiactivo = lazy(() => import('./GraficasEvaluacionMultiactivo'))
const NeuralPredictionPanel = lazy(() => import('./NeuralPredictionPanel'))
const LSTMArchitectureExplorer = lazy(() => import('./LSTMArchitectureExplorer'))
const LSTMTemporalExplorer = lazy(() => import('./LSTMTemporalExplorer'))
const LSTMActivations = lazy(() => import('./LSTMActivations'))
const AgentePaperPanel = lazy(() => import('./AgentePaperPanel'))

const GraficaBitcoin = lazy(() => import('./GraficaBitcoin'))
const ComparacionModelos = lazy(() => import('./ComparacionModelos'))
const ResultadosCap09 = lazy(() => import('./ResultadosCap09'))
const ResultadosCap10 = lazy(() => import('./ResultadosCap10'))
const TrayectoriasCapital = lazy(() => import('./TrayectoriasCapital'))
const ResultadosCap11 = lazy(() => import('./ResultadosCap11'))
const PrediccionLSTM = lazy(() => import('./PrediccionLSTM'))
const PrecioMEXC = lazy(() => import('./PrecioMEXC'))
const PrediccionMEXC = lazy(() => import('./PrediccionMEXC'))
const EvaluacionesLSTM = lazy(() => import('./EvaluacionesLSTM'))
const MonitorLSTM = lazy(() => import('./MonitorLSTM'))
const GraficaEvaluacionesLSTM = lazy(() => import('./GraficaEvaluacionesLSTM'))
const CapitalVirtual = lazy(() => import('./CapitalVirtual'))
const EscenariosLSTM = lazy(() => import('./EscenariosLSTM'))
const ResumenEstadisticoLSTM = lazy(() => import('./ResumenEstadisticoLSTM'))
const GraficaErroresSimulador = lazy(() => import('./GraficaErroresSimulador'))
const HistorialErroresLSTM = lazy(() => import('./HistorialErroresLSTM'))
const MetricasPrecisionLSTM = lazy(() => import('./MetricasPrecisionLSTM'))
const LaboratorioLSTM = lazy(() => import('./LaboratorioLSTM'))
const AnalisisErroresLSTM = lazy(() => import('./AnalisisErroresLSTM'))
const ComparacionDireccionalLSTM = lazy(() => import('./ComparacionDireccionalLSTM'))

type Seccion =
  | 'overview'
  | 'neural'
  | 'market'
  | 'predictions'
  | 'portfolio'
  | 'analytics'
  | 'laboratory'
  | 'agent'

const titulos: Record<Seccion, string> = {
  overview: 'Resumen general',
  neural: 'Red neuronal',
  market: 'Mercado en tiempo real',
  predictions: 'Predicciones con IA',
  portfolio: 'Portafolio virtual',
  analytics: 'Análisis de modelos',
  laboratory: 'Laboratorio de IA',
  agent: 'Agente IA · Paper Trading',
}

const descripciones: Record<Seccion, string> = {
  overview:
    'Panel principal de inteligencia financiera y simulación.',
  neural:
    'Explora las redes neuronales y sus activaciones internas.',
  market:
    'Consulta precios y datos de criptomonedas de MEXC.',
  predictions:
    'Predicciones experimentales y evaluación de modelos.',
  portfolio:
    'Simulaciones financieras con capital ficticio.',
  analytics:
    'Resultados históricos y análisis de los modelos.',
  laboratory:
    'Entrena y administra modelos LSTM experimentales por criptomoneda.',
  agent:
    'Decisiones LSTM + Ollama, controles y capital ficticio independiente.',
}

function App() {
  const [seccionActual, setSeccionActual] =
    useState<Seccion>('overview')

  const [simbolo, setSimbolo] =
    useState('BTCUSDT')
  const [revisionHistorial, setRevisionHistorial] = useState(0)

  const esBitcoin =
    simbolo === 'BTCUSDT'

  const [modelos, setModelos] = useState<string[]>([])
  const [revisionModelos, setRevisionModelos] = useState(0)
  const actualizarModelos = useCallback(() => setRevisionModelos(n => n + 1), [])
  useEffect(() => {
    let activo = true
    fetch(`${API_BASE_URL}/api/modelos-multiactivo/disponibles`)
      .then(r => { if (!r.ok) throw new Error('API no disponible'); return r.json() })
      .then(datos => { if (activo && Array.isArray(datos.simbolos)) setModelos(datos.simbolos) })
      .catch(() => { /* El panel seguirá mostrando la opción de entrenar */ })
    return () => { activo = false }
  }, [revisionModelos])
  const tieneModelo = modelos.includes(simbolo)

  const simboloVisible =
    simbolo.endsWith('USDT')
      ? `${simbolo.slice(0, -4)}/USDT`
      : simbolo

  return (
    <div className="trading-layout">
      <TradingSidebar
        seccionActual={seccionActual}
        cambiarSeccion={setSeccionActual}
      />

      <main className="trading-main">
        <header
          className="trading-topbar"
          style={{
            flexWrap: 'wrap',
            gap: 20,
          }}
        >
          <div className="trading-topbar-left">
            <span className="trading-topbar-label">
              NEURAL FINANCE / TERMINAL FINANCIERA
            </span>

            <h1>
              {titulos[seccionActual]}
            </h1>

            <p>
              {descripciones[seccionActual]}
            </p>
          </div>

          <div
            className="trading-topbar-right"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <SelectorActivosMEXC
              simbolo={simbolo}
              onCambiar={setSimbolo}
            />

            <span className="trading-market-symbol">
              {simboloVisible}
            </span>

            <span className="trading-simulation-badge">
              SIMULACIÓN
            </span>
          </div>
        </header>

        <div className="trading-content">
          <Suspense fallback={
            <div role="status" aria-live="polite" style={{ padding: 24, color: '#9db1cf' }}>
              Cargando sección de Neural Finance…
            </div>
          }>
          {seccionActual === 'overview' && (
            <div className="trading-section">
              {tieneModelo && (
                <ActualizadorHistorial simbolo={simbolo} onActualizado={() => setRevisionHistorial(n => n + 1)} />
              )}
              <div className="trading-section-heading">
                <h2>Resumen del mercado</h2>

                <p>
                  Cotización, historial e
                  información del activo
                  seleccionado.
                </p>
              </div>

              <div className="trading-overview-grid">
                <PrecioMEXC
                  simbolo={simbolo}
                />

                <CapitalVirtual />
              </div>

              <p
                style={{
                  fontSize: 12,
                  color: '#8ba8cf',
                }}
              >
                El capital virtual corresponde
                a una cuenta académica general
                en MXN. No representa una
                posición comprada en{' '}
                {simboloVisible}.
              </p>

              <GraficaBitcoin
                simbolo={simbolo}
              />

              {esBitcoin ? (
                <PrediccionMEXC />
              ) : (
                <PanelMultiactivo key={`${simbolo}-${revisionHistorial}`} simbolo={simbolo} />
              )}
            </div>
          )}

          {seccionActual === 'neural' && (
            <div className="trading-section">
              <div className="trading-section-heading">
                <h2>Inteligencia neuronal</h2>

                <p>
                  Visualización y análisis
                  de redes neuronales.
                </p>
              </div>

              <NeuralNetwork simbolo={simbolo} />
              <PanelMultiactivo key={`${simbolo}-${revisionHistorial}`} simbolo={simbolo} />

              {tieneModelo && (
                <>
                  <LSTMActivations key={`activaciones-${simbolo}`} simbolo={simbolo} />
                  <LSTMArchitectureExplorer key={`arquitectura-${simbolo}`} simbolo={simbolo} />
                  <LSTMTemporalExplorer key={`temporal-${simbolo}`} simbolo={simbolo} />
                </>
              )}

              {esBitcoin && (
                <>
                  <NeuralPredictionPanel />
                  <MonitorLSTM />
                </>
              )}
            </div>
          )}

          {seccionActual === 'market' && (
            <div className="trading-section">
              <div className="trading-section-heading">
                <h2>
                  Mercado en tiempo real
                </h2>

                <p>
                  Cotización e indicadores
                  del activo seleccionado.
                </p>
              </div>

              <PrecioMEXC
                simbolo={simbolo}
              />

              <GraficaBitcoin
                simbolo={simbolo}
              />
            </div>
          )}

          {seccionActual === 'predictions' && (
            <div className="trading-section">
              <div className="trading-section-heading">
                <h2>
                  Predicciones con IA
                </h2>

                <p>
                  Inferencias y evaluación
                  del modelo predictivo.
                </p>
              </div>

              <ComparadorModelosMultiactivo />

              {esBitcoin && <PanelMultiactivo key={`${simbolo}-${revisionHistorial}`} simbolo={simbolo} />}
              <GraficasEvaluacionMultiactivo simbolo={simbolo} />

              {esBitcoin ? (
                <>
                  <PrediccionMEXC />
                  <EvaluacionesLSTM />
                  <GraficaEvaluacionesLSTM />
                  <MetricasPrecisionLSTM />
                  <PrediccionLSTM />
                </>
              ) : (
                <PanelMultiactivo key={`${simbolo}-${revisionHistorial}`} simbolo={simbolo} />
              )}
            </div>
          )}

          {seccionActual === 'portfolio' && (
            <div className="trading-section">
              <div className="trading-section-heading">
                <h2>
                  Portafolio virtual
                </h2>

                <p>
                  Cuenta académica y
                  simulaciones ficticias.
                </p>
              </div>

              <CapitalVirtual />

              {!esBitcoin && (
                <p
                  style={{
                    color: '#9db1cf',
                    fontSize: 13,
                  }}
                >
                  Esta cuenta general
                  todavía no registra
                  posiciones específicas
                  en {simboloVisible}.
                </p>
              )}

              {esBitcoin ? (
                <>
                  <EscenariosLSTM />
                  <ResumenEstadisticoLSTM />
                  <GraficaErroresSimulador />
                  <HistorialErroresLSTM />
                  <TrayectoriasCapital />
                </>
              ) : (
                <>
                  <GraficaBitcoin
                    simbolo={simbolo}
                  />

                  <PanelMultiactivo key={`${simbolo}-${revisionHistorial}`} simbolo={simbolo} />
                </>
              )}
            </div>
          )}

          {seccionActual === 'analytics' && (
            <div className="trading-section">
              <div className="trading-section-heading">
                <h2>
                  Análisis de modelos
                </h2>

                <p>
                  Evaluación de resultados
                  y desempeño histórico.
                </p>
              </div>

              <ComparadorModelosMultiactivo />

              {esBitcoin && <PanelMultiactivo key={`${simbolo}-${revisionHistorial}`} simbolo={simbolo} />}
              <GraficasEvaluacionMultiactivo simbolo={simbolo} />

              {esBitcoin ? (
                <>
                  <ComparacionModelos />
                  <LaboratorioLSTM />
                  <AnalisisErroresLSTM />
                  <ComparacionDireccionalLSTM />
                  <ResultadosCap09 />
                  <ResultadosCap10 />
                  <ResultadosCap11 />
                </>
              ) : (
                <>
                  <GraficaBitcoin
                    simbolo={simbolo}
                  />

                  <PanelMultiactivo key={`${simbolo}-${revisionHistorial}`} simbolo={simbolo} />
                </>
              )}
            </div>
          )}
          {seccionActual === 'agent' && (
            <AgentePaperPanel />
          )}
          {seccionActual === 'laboratory' && (
            <div className="trading-section">
              <div className="trading-section-heading">
                <h2>Laboratorio de inteligencia artificial</h2>
                <p>
                  Selecciona un activo para consultar su modelo LSTM, métricas de prueba,
                  predicción experimental y activaciones internas. Entrena únicamente
                  los activos que todavía no tengan un modelo guardado.
                </p>
              </div>
              <EntrenamientoNuevoActivo
                simbolo={simbolo}
                tieneModelo={tieneModelo}
                onModeloCreado={actualizarModelos}
              />
              {tieneModelo && (
                <ActualizadorHistorial
                  simbolo={simbolo}
                  onActualizado={() => setRevisionHistorial(n => n + 1)}
                />
              )}
              <CatalogoModelosLSTM
                revision={revisionModelos}
                onSeleccionar={setSimbolo}
              />
              {tieneModelo ? (
                <PanelMultiactivo
                  key={`laboratorio-${simbolo}-${revisionHistorial}-${revisionModelos}`}
                  simbolo={simbolo}
                />
              ) : (
                <p role="status" style={{ color: '#a7bbd6', marginTop: 16 }}>
                  {simbolo} todavía no tiene un modelo LSTM disponible.
                  Puedes entrenarlo desde el formulario de esta sección.
                </p>
              )}
            </div>
          )}
          </Suspense>
        </div>

        <footer className="trading-footer">
          NEURAL FINANCE | Predicciones experimentales
          con IA | Capital ficticio | Sin operaciones reales
        </footer>
      </main>
    </div>
  )
}

export default App
