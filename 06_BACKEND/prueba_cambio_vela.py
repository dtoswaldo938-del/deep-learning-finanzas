
import sqlite3
import tempfile
from pathlib import Path
import gc
from unittest.mock import patch

from app.database import connection
from guardar_prediccion_lstm import guardar_o_recuperar_prediccion


def ejecutar_prueba():
    """Simula dos fechas sin modificar la base de datos real."""

    with tempfile.TemporaryDirectory() as carpeta:
        ruta_temporal = Path(carpeta) / "prueba_velas.db"

        with patch.object(connection, "DB_PATH", ruta_temporal):
            connection.inicializar_base_datos()

            fecha_actual = "2026-11-17"
            fecha_nueva = "2026-11-18"

            def datos_simulados():
                return {
                    "activo": "BTCUSDT",
                    "ultima_vela_cerrada": fecha_actual,
                }

            def inferencia_simulada():
                return {
                    "modelo": "LSTM-A",
                    "activo": "BTCUSDT",
                    "fecha_emision": fecha_actual,
                    "fecha_objetivo": (
                        "2026-11-18"
                        if fecha_actual == "2026-11-17"
                        else "2026-11-19"
                    ),
                    "rendimiento_estimado": 0.001,
                    "direccion_estimacion": "subida",
                    "fuente": "SIMULACION",
                }

            with (
                patch(
                    "guardar_prediccion_lstm.preparar_datos_lstm",
                    side_effect=datos_simulados,
                ),
                patch(
                    "guardar_prediccion_lstm.generar_inferencia_lstm_mexc",
                    side_effect=inferencia_simulada,
                ) as modelo_simulado,
            ):
                primera = guardar_o_recuperar_prediccion()
                segunda = guardar_o_recuperar_prediccion()

                fecha_actual = fecha_nueva

                tercera = guardar_o_recuperar_prediccion()
                cuarta = guardar_o_recuperar_prediccion()

                conexion = sqlite3.connect(ruta_temporal)
                try:
                    total = conexion.execute(
                        "SELECT COUNT(*) FROM predicciones_lstm_mexc"
                    ).fetchone()[0]
                finally:
                    conexion.close()

                print("PRUEBA DE CAMBIO DE VELA")
                print("------------------------")
                print("Primera consulta:", primera["accion"])
                print("Segunda consulta:", segunda["accion"])
                print("Nueva vela:", tercera["accion"])
                print("Consulta repetida:", cuarta["accion"])
                print("Inferencias simuladas:", modelo_simulado.call_count)
                print("Registros en SQLite temporal:", total)

                assert primera["accion"] == "guardada"
                assert segunda["accion"] == "recuperada"
                assert tercera["accion"] == "guardada"
                assert cuarta["accion"] == "recuperada"
                assert modelo_simulado.call_count == 2
                assert total == 2

                print("RESULTADO: PRUEBA SUPERADA")
                del primera, segunda, tercera, cuarta
                gc.collect()


if __name__ == "__main__":
    ejecutar_prueba()
