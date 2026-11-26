import {
  crearNotificacion,
  agregarNotificacion,
  marcarTodasLeidas,
  contarPendientes,
} from './src/notificacionesAcademicas.ts'

import assert from 'node:assert/strict'

const evento = crearNotificacion(
  'PRUEBA',
  'Evento de demostracion',
  'Prueba academica del sistema',
)

assert.equal(evento.leida, false)
assert.equal(evento.demostracion, true)
console.log('OK: Creacion de evento')

let historial = agregarNotificacion([], evento)

assert.equal(historial.length, 1)
console.log('OK: Registro de evento')

historial = agregarNotificacion(historial, evento)

assert.equal(historial.length, 1)
console.log('OK: Prevencion de duplicados')

assert.equal(contarPendientes(historial), 1)
console.log('OK: Contador de pendientes')

historial = marcarTodasLeidas(historial)

assert.equal(contarPendientes(historial), 0)
console.log('OK: Marcar como leidas')

console.log('TODAS LAS PRUEBAS APROBADAS')
