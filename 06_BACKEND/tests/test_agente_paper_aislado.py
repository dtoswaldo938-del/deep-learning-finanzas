"""Pruebas aisladas del agente paper. Nunca utiliza la BD del proyecto.
Ejecutar desde raiz: .\06_BACKEND\.venv313\Scripts\python.exe -m unittest discover -s .\06_BACKEND\tests -p test_agente_paper_aislado.py -v
"""
import asyncio
import sqlite3
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
from app import rutas_agente_paper as agente


class PruebasPaperAisladas(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='neural_paper_tests_')
        self.addCleanup(self.tmp.cleanup)
        self.ruta = Path(self.tmp.name) / 'pruebas.sqlite3'
        def conexion_temporal():
            con = sqlite3.connect(str(self.ruta), timeout=5)
            con.row_factory = sqlite3.Row
            return con
        self.parche_db = patch.object(agente, 'obtener_conexion', side_effect=conexion_temporal)
        self.parche_token = patch.object(agente, '_token', return_value='TOKEN_SOLO_PRUEBAS')
        self.parche_db.start()
        self.parche_token.start()
        self.addCleanup(self.parche_db.stop)
        self.addCleanup(self.parche_token.stop)
        self.ayer = (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()
        self.analisis = {
            'fecha_vela': self.ayer, 'datos_vigentes': True,
            'propuesta': {'accion': 'MANTENER', 'motivo': 'Prueba controlada'},
            'modelo_lenguaje': 'simulacion-test',
        }
        self.parche_analisis = patch.object(agente, 'analizar', side_effect=lambda **kw: dict(self.analisis))
        self.parche_precio = patch.object(agente, '_precio', return_value=100.0)
        self.parche_analisis.start()
        self.parche_precio.start()
        self.addCleanup(self.parche_analisis.stop)
        self.addCleanup(self.parche_precio.stop)
        con = agente._db()
        con.close()

    def iniciar(self):
        return agente.iniciar('TOKEN_SOLO_PRUEBAS')

    def ciclo(self):
        return agente.ciclo(agente.SolicitudCiclo(simbolo='BTCUSDT'), 'TOKEN_SOLO_PRUEBAS')

    def estado(self):
        return agente.estado('TOKEN_SOLO_PRUEBAS')

    def test_01_autenticacion_obligatoria(self):
        with self.assertRaises(HTTPException) as cm:
            agente.estado(None)
        self.assertEqual(cm.exception.status_code, 401)

    def test_02_autenticacion_incorrecta(self):
        with self.assertRaises(HTTPException) as cm:
            agente.iniciar('incorrecta')
        self.assertEqual(cm.exception.status_code, 401)

    def test_03_no_opera_detenido(self):
        with self.assertRaises(HTTPException) as cm:
            self.ciclo()
        self.assertEqual(cm.exception.status_code, 409)
        self.assertEqual(len(self.estado()['historial']), 0)

    def test_04_pausa_bloquea_ciclo(self):
        self.iniciar()
        agente.pausar('TOKEN_SOLO_PRUEBAS')
        with self.assertRaises(HTTPException) as cm:
            self.ciclo()
        self.assertEqual(cm.exception.status_code, 409)
        self.assertEqual(self.estado()['estado']['modo'], 'PAUSADO')

    def test_05_mantener_y_persistencia(self):
        self.iniciar()
        resultado = self.ciclo()
        self.assertEqual(resultado['estado'], 'MANTENER')
        self.assertEqual(resultado['saldo'], 50000)
        self.assertFalse(resultado['operaciones_reales'])
        self.assertEqual(len(self.estado()['historial']), 1)

    def test_06_vela_duplicada_rechazada(self):
        self.iniciar()
        self.ciclo()
        with self.assertRaises(HTTPException) as cm:
            self.ciclo()
        self.assertEqual(cm.exception.status_code, 409)
        self.assertEqual(len(self.estado()['historial']), 1)

    def test_07_vela_obsoleta_pausa(self):
        self.iniciar()
        self.analisis['datos_vigentes'] = False
        with self.assertRaises(HTTPException) as cm:
            self.ciclo()
        self.assertEqual(cm.exception.status_code, 503)
        self.assertEqual(self.estado()['estado']['modo'], 'PAUSADO')
        self.assertEqual(len(self.estado()['historial']), 0)

    def test_08_accion_invalida_pausa(self):
        self.iniciar()
        self.analisis['propuesta']['accion'] = 'TRANSFERIR'
        with self.assertRaises(HTTPException) as cm:
            self.ciclo()
        self.assertEqual(cm.exception.status_code, 503)
        self.assertEqual(self.estado()['estado']['modo'], 'PAUSADO')

    def test_09_precio_no_disponible_pausa(self):
        self.iniciar()
        with patch.object(agente, '_precio', side_effect=ValueError('Precio invalido')):
            with self.assertRaises(HTTPException) as cm:
                self.ciclo()
        self.assertEqual(cm.exception.status_code, 503)
        self.assertEqual(self.estado()['estado']['saldo'], 50000)

    def test_10_compra_respetando_exposicion(self):
        self.iniciar()
        self.analisis['propuesta']['accion'] = 'COMPRAR'
        resultado = self.ciclo()
        self.assertEqual(resultado['estado'], 'COMPRA_PAPER')
        self.assertLessEqual(resultado['unidades'] * resultado['precio'], 5000.00001)
        self.assertAlmostEqual(resultado['equity'], 50000, places=4)

    def test_11_venta_sin_posicion(self):
        self.iniciar()
        self.analisis['propuesta']['accion'] = 'VENDER'
        resultado = self.ciclo()
        self.assertEqual(resultado['estado'], 'RECHAZADA_SIN_POSICION')
        self.assertEqual(resultado['unidades'], 0)

    def test_12_planificador_no_revisa_pausado(self):
        self.assertFalse(agente._debe_revisar_automaticamente())
        self.iniciar()
        self.assertTrue(agente._debe_revisar_automaticamente())
        agente.pausar('TOKEN_SOLO_PRUEBAS')
        self.assertFalse(agente._debe_revisar_automaticamente())

    def test_13_planificador_no_repite_vela(self):
        self.iniciar()
        self.ciclo()
        self.assertFalse(agente._debe_revisar_automaticamente())

    def test_14_simbolo_distinto_rechazado(self):
        self.iniciar()
        with self.assertRaises(HTTPException) as cm:
            agente.ciclo(agente.SolicitudCiclo(simbolo='ETHUSDT'), 'TOKEN_SOLO_PRUEBAS')
        self.assertEqual(cm.exception.status_code, 422)


if __name__ == '__main__':
    unittest.main()
