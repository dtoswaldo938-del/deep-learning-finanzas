
import { useState } from 'react'
import './App.css'

import TradingSidebar from './TradingSidebar'
import NeuralNetwork from './NeuralNetwork'
import NeuralPredictionPanel from './NeuralPredictionPanel'
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

type Seccion =
  | 'overview'
  | 'neural'
  | 'market'
  | 'predictions'
  | 'portfolio'
  | 'analytics'

const titulos: Record<Seccion, string> = {
  overview: 'Overview',
  neural: 'Neural Network',
  market: 'Market Terminal',
  predictions: 'AI Predictions',
  portfolio: 'Virtual Portfolio',
  analytics: 'Model Analytics',
}

const descripciones: Record<Seccion, string> = {
  overview: 'Your financial intelligence workspace.',
  neural: 'Explore the intelligence behind market predictions.',
  market: 'Bitcoin market data and price evolution.',
  predictions: 'AI-powered forecasts and model performance.',
  portfolio: 'Explore hypothetical outcomes with virtual funds.',
  analytics: 'Advanced model evaluation and historical results.',
}

function App() {
  const [seccionActual, setSeccionActual] =
    useState<Seccion>('overview')

  return (
    <div className="trading-layout">
      <TradingSidebar
        seccionActual={seccionActual}
        cambiarSeccion={setSeccionActual}
      />

      <main className="trading-main">
        <header className="trading-topbar">
          <div className="trading-topbar-left">
            <span className="trading-topbar-label">
              NEURAL FINANCE / TERMINAL
            </span>

            <h1>{titulos[seccionActual]}</h1>
            <p>{descripciones[seccionActual]}</p>
          </div>

          <div className="trading-topbar-right">
            <span className="trading-market-symbol">
              BTC / USDT
            </span>

            <span className="trading-simulation-badge">
              ● SIMULATION
            </span>
          </div>
        </header>

        <div className="trading-content">
          {seccionActual === 'overview' && (
            <div className="trading-section">
              <div className="trading-section-heading">
                <h2>Market Overview</h2>
                <p>
                  Market intelligence and virtual portfolio.
                </p>
              </div>

              <div className="trading-overview-grid">
                <PrecioMEXC />
                <CapitalVirtual />
              </div>

              <GraficaBitcoin />
              <PrediccionMEXC />
            </div>
          )}

          {seccionActual === 'neural' && (
            <div className="trading-section">
              <div className="trading-section-heading">
                <h2>Neural Intelligence</h2>
                <p>
                  Neural network monitoring and inference.
                </p>
              </div>

             <NeuralNetwork />
<NeuralPredictionPanel />
<MonitorLSTM />
            </div>
          )}

          {seccionActual === 'market' && (
            <div className="trading-section">
              <div className="trading-section-heading">
                <h2>Market Terminal</h2>
                <p>
                  Live market monitoring and price history.
                </p>
              </div>

              <PrecioMEXC />
              <GraficaBitcoin />
            </div>
          )}

          {seccionActual === 'predictions' && (
            <div className="trading-section">
              <div className="trading-section-heading">
                <h2>AI Predictions</h2>
                <p>
                  Forecasts, evaluations and performance.
                </p>
              </div>

              <PrediccionMEXC />
              <EvaluacionesLSTM />
              <GraficaEvaluacionesLSTM />
              <MetricasPrecisionLSTM />
              <PrediccionLSTM />
            </div>
          )}

          {seccionActual === 'portfolio' && (
            <div className="trading-section">
              <div className="trading-section-heading">
                <h2>Virtual Portfolio</h2>
                <p>
                  Simulate scenarios without real trades.
                </p>
              </div>

              <CapitalVirtual />
              <EscenariosLSTM />
              <ResumenEstadisticoLSTM />
              <GraficaErroresSimulador />
              <HistorialErroresLSTM />
              <TrayectoriasCapital />
            </div>
          )}

          {seccionActual === 'analytics' && (
            <div className="trading-section">
              <div className="trading-section-heading">
                <h2>Model Analytics</h2>
                <p>
                  Explore model research and evaluation.
                </p>
              </div>

              <ComparacionModelos />
              <LaboratorioLSTM />
              <AnalisisErroresLSTM />
              <ComparacionDireccionalLSTM />
              <ResultadosCap09 />
              <ResultadosCap10 />
              <ResultadosCap11 />
            </div>
          )}
        </div>

        <footer className="trading-footer">
          NEURAL FINANCE · Experimental AI predictions ·
          Virtual funds only · No real trading
        </footer>
      </main>
    </div>
  )
}

export default App
