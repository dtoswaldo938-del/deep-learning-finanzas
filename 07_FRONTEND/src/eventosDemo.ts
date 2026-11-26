import { crearNotificacion } from './notificacionesAcademicas'

export function generarEventosDemo() {
  return [
    crearNotificacion(
      'SISTEMA',
      'Sistema disponible',
      'Demostracion del funcionamiento de Neural Finance.',
    ),
    crearNotificacion(
      'MERCADO',
      'Consulta de mercado completada',
      'Ejemplo de recepcion de datos publicos de mercado.',
    ),
    crearNotificacion(
      'EVALUACION',
      'Evaluacion predictiva completada',
      'Ejemplo de evaluacion academica de un modelo LSTM.',
    ),
    crearNotificacion(
      'SIMULACION',
      'Simulacion completada',
      'Ejemplo de PnL ficticio: +80 USDT.',
    ),
  ]
}
