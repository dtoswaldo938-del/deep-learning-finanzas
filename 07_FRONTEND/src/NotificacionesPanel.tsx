import { useEffect, useState } from 'react'

import {
  crearNotificacion,
  agregarNotificacion,
  marcarTodasLeidas,
  contarPendientes,
} from './notificacionesAcademicas'

import type {
  NotificacionAcademica,
} from './notificacionesAcademicas'

import './NotificacionesPanel.css'
import { generarEventosDemo } from './eventosDemo'
import { enlaceCorreo } from './correoAcademico'

const STORAGE_KEY = 'neural_finance_notificaciones_demo_v1'

function cargarHistorial(): NotificacionAcademica[] {
  try {
    const datos = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',
    )

    return Array.isArray(datos)
      ? datos.filter(n => n && n.demostracion === true)
      : []
  } catch {
    return []
  }
}

export default function NotificacionesPanel() {
  const [historial, setHistorial] =
    useState<NotificacionAcademica[]>(cargarHistorial)

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(historial),
      )
    } catch {
      console.warn('Historial local no disponible')
    }
  }, [historial])

  function generarDemostracion() {
    const eventos = generarEventosDemo()

    setHistorial(anterior =>
      eventos.reduce(
        (lista, evento) =>
          agregarNotificacion(lista, evento),
        anterior,
      ),
    )
  }

  function generarPrueba() {
    const evento = crearNotificacion(
      'PRUEBA',
      'Notificacion academica',
      'El centro de eventos funciona correctamente.',
    )

    setHistorial(anterior =>
      agregarNotificacion(anterior, evento),
    )
  }

  return (
    <section className="nf-notificaciones">
      <header>
        <small>NEURAL FINANCE / EVENT CENTER</small>
        <h2>Centro de notificaciones</h2>
        <p>Eventos de demostracion academica.</p>
      </header>

      <div className="nf-notificaciones-kpis">
        <article>
          <span>Eventos registrados</span>
          <strong>{historial.length}</strong>
        </article>

        <article>
          <span>Sin leer</span>
          <strong>{contarPendientes(historial)}</strong>
        </article>

        <article>
          <span>Entorno</span>
          <strong>DEMO</strong>
        </article>
      </div>

      <div className="nf-notificaciones-controles">
        <button onClick={generarDemostracion}>
          Generar eventos de demostracion
        </button>

        <button onClick={generarPrueba}>
          Generar notificacion de prueba
        </button>

        <button onClick={() =>
          setHistorial(marcarTodasLeidas)
        }>
          Marcar todas como leidas
        </button>
      </div>

      <div className="nf-notificaciones-lista">
        {historial.length === 0 && (
          <p>No hay eventos registrados.</p>
        )}

        {historial.map(evento => (
          <article
            key={evento.id}
            className={evento.leida ? 'leida' : 'pendiente'}
          >
            <small>{evento.tipo} / DEMOSTRACION</small>
            <h3>{evento.titulo}</h3>
            <p>{evento.mensaje}</p>

            <a
              className="nf-correo-demo"
              href={enlaceCorreo(evento)}
            >
              Preparar correo
            </a>
            <time>
              {new Date(evento.fecha).toLocaleString()}
            </time>
          </article>
        ))}
      </div>
    </section>
  )
}
