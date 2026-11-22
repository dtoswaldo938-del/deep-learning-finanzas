import { useEffect, useMemo, useState } from 'react'
import {
  cargarCatalogoLab,
  type CatalogoLab,
} from './liveTradingCatalogo'

type Props = {
  activo: string
  onSeleccionar: (simbolo: string) => void
}

type Categoria = 'MODELOS' | 'MEXC'

export default function SelectorActivosLab({
  activo,
  onSeleccionar,
}: Props) {
  const [categoria, setCategoria] = useState<Categoria>('MODELOS')
  const [busqueda, setBusqueda] = useState('')
  const [catalogo, setCatalogo] = useState<CatalogoLab | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    cargarCatalogoLab(controller.signal)
      .then(datos => {
        if (!controller.signal.aborted) {
          setCatalogo(datos)
          setError('')
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError('No fue posible cargar el catalogo de activos.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCargando(false)
        }
      })

    return () => controller.abort()
  }, [])

  const resultados = useMemo(() => {
    if (!catalogo) return []

    const modelos = new Set(catalogo.modelos)

    const disponibles = categoria === 'MODELOS'
      ? catalogo.pares.filter(par => modelos.has(par.simbolo))
      : catalogo.pares

    const termino = busqueda.trim().toUpperCase()

    return disponibles
      .filter(par =>
        par.simbolo.includes(termino) ||
        par.nombre.toUpperCase().includes(termino)
      )
      .slice(0, 60)
  }, [catalogo, categoria, busqueda])

  return (
    <div className="lab-selector-dinamico">
      <div className="lab-selector-tabs">
        <button
          type="button"
          onClick={() => setCategoria('MODELOS')}
          aria-pressed={categoria === 'MODELOS'}
        >
          Mis modelos LSTM
        </button>

        <button
          type="button"
          onClick={() => setCategoria('MEXC')}
          aria-pressed={categoria === 'MEXC'}
        >
          Explorar MEXC
        </button>
      </div>

      <input
        type="search"
        value={busqueda}
        onChange={event => setBusqueda(event.target.value)}
        placeholder="Buscar BTC, ADA, XRP..."
        aria-label="Buscar activo"
      />

      {cargando && <p>Cargando activos disponibles...</p>}

      {error && <p role="alert">{error}</p>}

      {catalogo && (
        <>
          <p className="lab-muted">
            {categoria === 'MODELOS'
              ? `${catalogo.modelos.length} modelos disponibles en MEXC`
              : `${catalogo.pares.length} pares disponibles`}
          </p>

          <select
            value={resultados.some(par => par.simbolo === activo)
              ? activo
              : ''}
            onChange={event => {
              if (event.target.value) {
                onSeleccionar(event.target.value)
              }
            }}
            aria-label="Seleccionar activo del catalogo"
          >
            <option value="">Selecciona un activo</option>

            {resultados.map(par => (
              <option key={par.simbolo} value={par.simbolo}>
                {par.nombre}
              </option>
            ))}
          </select>

          {resultados.length === 0 && (
            <p>No se encontraron coincidencias.</p>
          )}

          {resultados.length === 60 && (
            <p className="lab-muted">
              Mostrando hasta 60 resultados. Escribe para filtrar.
            </p>
          )}
        </>
      )}
    </div>
  )
}
