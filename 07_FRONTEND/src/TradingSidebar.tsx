
type Seccion =
  | 'overview'
  | 'neural'
  | 'market'
  | 'predictions'
  | 'portfolio'
  | 'analytics'

type Props = {
  seccionActual: Seccion
  cambiarSeccion: (seccion: Seccion) => void
}

const secciones: {
  id: Seccion
  icono: string
  nombre: string
}[] = [
  { id: 'overview', icono: '◈', nombre: 'Overview' },
  { id: 'neural', icono: '✧', nombre: 'Neural Network' },
  { id: 'market', icono: '▥', nombre: 'Market Terminal' },
  { id: 'predictions', icono: '⌁', nombre: 'AI Predictions' },
  { id: 'portfolio', icono: '◇', nombre: 'Virtual Portfolio' },
  { id: 'analytics', icono: '▤', nombre: 'Model Analytics' },
]

export default function TradingSidebar({
  seccionActual,
  cambiarSeccion,
}: Props) {
  return (
    <aside className="trading-sidebar">
      <div className="trading-brand">
        <div className="trading-brand-icon">N</div>

        <div>
          <strong>NEURAL FINANCE</strong>
          <span>INTELLIGENCE TERMINAL</span>
        </div>
      </div>

      <div className="trading-sidebar-label">
        WORKSPACE
      </div>

      <nav className="trading-nav" aria-label="Navegación principal">
        {secciones.map((seccion) => (
          <button
            key={seccion.id}
            type="button"
            className={
              'trading-nav-item' +
              (seccionActual === seccion.id ? ' active' : '')
            }
            onClick={() => cambiarSeccion(seccion.id)}
            aria-current={
              seccionActual === seccion.id ? 'page' : undefined
            }
          >
            <span className="trading-nav-icon">
              {seccion.icono}
            </span>
            <span>{seccion.nombre}</span>
          </button>
        ))}
      </nav>

      <div className="trading-sidebar-bottom">
        <div className="trading-mode-indicator">
          <span className="trading-mode-dot" />
          SIMULATION MODE
        </div>

        <p>
          Market intelligence powered by neural networks.
        </p>

        <small>
          Virtual funds only · No real trading
        </small>
      </div>
    </aside>
  )
}
