
type Seccion =
  | 'overview'
  | 'neural'
  | 'market'
  | 'predictions'
  | 'portfolio'
  | 'analytics'
  | 'laboratory'
  | 'agent'
  | 'live-trading'

type Props = {
  seccionActual: Seccion
  cambiarSeccion: (seccion: Seccion) => void
}

const secciones: {
  id: Seccion
  icono: string
  nombre: string
}[] = [
  {
    id: 'overview',
    icono: '◈',
    nombre: 'Resumen general',
  },
  {
    id: 'neural',
    icono: '✧',
    nombre: 'Red neuronal',
  },
  {
    id: 'market',
    icono: '▥',
    nombre: 'Mercado en tiempo real',
  },
  {
    id: 'predictions',
    icono: '⌁',
    nombre: 'Predicciones con IA',
  },
  {
    id: 'portfolio',
    icono: '◇',
    nombre: 'Portafolio virtual',
  },
  {
    id: 'analytics',
    icono: '▤',
    nombre: 'Análisis de modelos',
  },
  {
    id: 'live-trading',
    icono: '◉',
    nombre: 'Live Trading Lab',
  },  {
    id: 'agent',
    icono: '◉',
    nombre: 'Agente IA · Paper',
  },
  {
    id: 'laboratory',
    icono: '⚙',
    nombre: 'Laboratorio de IA',
  },
]

export default function TradingSidebar({
  seccionActual,
  cambiarSeccion,
}: Props) {
  return (
    <aside className="trading-sidebar">
      <div className="trading-brand">
        <div className="trading-brand-icon">
          N
        </div>

        <div>
          <strong>NEURAL FINANCE</strong>
          <span>TERMINAL INTELIGENTE</span>
        </div>
      </div>

      <div className="trading-sidebar-label">
        PANEL DE NAVEGACIÓN
      </div>

      <nav
        className="trading-nav"
        aria-label="Navegación principal"
      >
        {secciones.map((seccion) => (
          <button
            key={seccion.id}
            type="button"
            className={
              'trading-nav-item' +
              (
                seccionActual === seccion.id
                  ? ' active'
                  : ''
              )
            }
            onClick={() =>
              cambiarSeccion(seccion.id)
            }
            aria-current={
              seccionActual === seccion.id
                ? 'page'
                : undefined
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
          MODO SIMULACIÓN
        </div>

        <p>
          Inteligencia financiera impulsada
          por redes neuronales.
        </p>

        <small>
          Capital ficticio · Sin operaciones reales
        </small>
      </div>
    </aside>
  )
}

