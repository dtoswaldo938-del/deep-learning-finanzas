import assert from 'node:assert/strict'

import { prepararCorreo, enlaceCorreo }
  from './src/correoAcademico.ts'

const evento = {
  id: 'demo-760',
  fecha: '2026-11-26T12:00:00Z',
  tipo: 'SIMULACION' as const,
  titulo: 'Simulacion completada',
  mensaje: 'PnL ficticio: +80 USDT',
  leida: false,
  demostracion: true,
}

const correo = prepararCorreo(evento)

assert.ok(correo.asunto.includes('DEMO'))
console.log('OK: Asunto academico')

assert.ok(correo.cuerpo.includes('+80 USDT'))
console.log('OK: Contenido del evento')

assert.ok(correo.cuerpo.includes('Sin operaciones financieras reales'))
console.log('OK: Identificacion del entorno')

assert.ok(enlaceCorreo(evento).startsWith('mailto:'))
console.log('OK: Enlace de correo')

assert.throws(() =>
  prepararCorreo({
    ...evento,
    demostracion: false,
  }),
)
console.log('OK: Restriccion de eventos')

console.log('TODAS LAS PRUEBAS APROBADAS')
