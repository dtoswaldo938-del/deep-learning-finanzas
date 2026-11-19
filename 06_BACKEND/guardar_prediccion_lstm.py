
import json
import math
from datetime import datetime, timezone

from app.database.connection import (
    inicializar_base_datos,
    conexion_segura,
)
from preparar_datos_lstm_mexc import preparar_datos_lstm
from inferencia_lstm_mexc import generar_inferencia_lstm_mexc


def guardar_o_recuperar_prediccion():
    """Recupera la predicción diaria o genera una nueva."""

    inicializar_base_datos()

    # Identificar la última vela cerrada de MEXC.
    datos = preparar_datos_lstm()

    modelo = "LSTM-A"
    activo = datos["activo"]
    fecha_emision = datos["ultima_vela_cerrada"]

    # Buscar primero la predicción en SQLite.
    with conexion_segura() as conexion:
        existente = conexion.execute(
            """
            SELECT *
            FROM predicciones_lstm_mexc
            WHERE modelo = ?
              AND activo = ?
              AND fecha_emision = ?
            """,
            (modelo, activo, fecha_emision),
        ).fetchone()

        if existente is not None:
            return {
                "status": "ok",
                "accion": "recuperada",
                "inferencia_ejecutada": False,
                "prediccion": dict(existente),
            }

    # Solo ejecutar la LSTM-A si no existe predicción.
    prediccion = generar_inferencia_lstm_mexc()

    # Comprobar que la inferencia use la misma vela.
    if prediccion["fecha_emision"] != fecha_emision:
        raise ValueError(
            "La vela cambió durante la inferencia. "
            "Vuelve a intentar la operación."
        )

    rendimiento = float(
        prediccion["rendimiento_estimado"]
    )

    if not math.isfinite(rendimiento):
        raise ValueError("Predicción no válida.")

    fecha_registro = datetime.now(
        timezone.utc
    ).isoformat()

    with conexion_segura() as conexion:
        cursor = conexion.execute(
            """
            INSERT OR IGNORE INTO predicciones_lstm_mexc (
                fecha_registro_utc,
                fecha_emision,
                fecha_objetivo,
                modelo,
                activo,
                rendimiento_estimado,
                direccion_estimacion,
                fuente
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                fecha_registro,
                fecha_emision,
                prediccion["fecha_objetivo"],
                modelo,
                activo,
                rendimiento,
                prediccion["direccion_estimacion"],
                prediccion["fuente"],
            ),
        )

        conexion.commit()

        registro = conexion.execute(
            """
            SELECT *
            FROM predicciones_lstm_mexc
            WHERE modelo = ?
              AND activo = ?
              AND fecha_emision = ?
            """,
            (modelo, activo, fecha_emision),
        ).fetchone()

        return {
            "status": "ok",
            "accion": (
                "guardada"
                if cursor.rowcount == 1
                else "recuperada"
            ),
            "inferencia_ejecutada": True,
            "prediccion": dict(registro),
        }


if __name__ == "__main__":
    resultado = guardar_o_recuperar_prediccion()
    print(
        json.dumps(
            resultado,
            indent=4,
            ensure_ascii=False,
        )
    )
