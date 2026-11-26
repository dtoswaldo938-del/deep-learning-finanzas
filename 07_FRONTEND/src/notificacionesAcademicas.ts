export type TipoNotificacion =
  | 'SISTEMA'
  | 'MERCADO'
  | 'EVALUACION'
  | 'SIMULACION'
  | 'PRUEBA'

export type NotificacionAcademica = {
  id: string
  fecha: string
  tipo: TipoNotificacion
  titulo: string
  mensaje: string
  leida: boolean
  demostracion: boolean
}

export function crearNotificacion(
  tipo: TipoNotificacion,
  titulo: string,
  mensaje: string,
): NotificacionAcademica {
  return {
    id: crypto.randomUUID(),
    fecha: new Date().toISOString(),
    tipo,
    titulo,
    mensaje,
    leida: false,
    demostracion: true,
  }
}

export function agregarNotificacion(
  historial: NotificacionAcademica[],
  evento: NotificacionAcademica,
): NotificacionAcademica[] {
  if (historial.some(n => n.id === evento.id)) {
    return historial
  }

  return [evento, ...historial].slice(0, 200)
}

export function marcarTodasLeidas(
  historial: NotificacionAcademica[],
): NotificacionAcademica[] {
  return historial.map(n => ({
    ...n,
    leida: true,
  }))
}

export function contarPendientes(
  historial: NotificacionAcademica[],
): number {
  return historial.filter(n => !n.leida).length
}
