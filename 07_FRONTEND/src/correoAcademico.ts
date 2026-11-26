import type {
  NotificacionAcademica,
} from './notificacionesAcademicas'

export function prepararCorreo(
  evento: NotificacionAcademica,
) {
  if (evento.demostracion !== true) {
    throw new Error('Solo se permiten eventos academicos')
  }

  const asunto =
    `[Neural Finance DEMO] ${evento.titulo}`

  const cuerpo = [
    'NEURAL FINANCE',
    'Centro de notificaciones academicas',
    '',
    `Evento: ${evento.titulo}`,
    `Categoria: ${evento.tipo}`,
    `Fecha UTC: ${evento.fecha}`,
    '',
    evento.mensaje,
    '',
    'Entorno: DEMOSTRACION ACADEMICA',
    'Sin operaciones financieras reales.',
    'No constituye una recomendacion de inversion.',
  ].join('\n')

  return { asunto, cuerpo }
}

export function enlaceCorreo(
  evento: NotificacionAcademica,
): string {
  const { asunto, cuerpo } = prepararCorreo(evento)

  return 'mailto:?subject=' +
    encodeURIComponent(asunto) +
    '&body=' +
    encodeURIComponent(cuerpo)
}
