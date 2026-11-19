
import json

from app.database.connection import (
    conexion_segura,
    inicializar_base_datos,
)


def consultar_evaluaciones_lstm():
    """Consulta predicciones y evaluaciones almacenadas."""

    inicializar_base_datos()

    with conexion_segura() as conexion:
        registros = conexion.execute("""
            SELECT
                p.id,
                p.fecha_emision,
                p.fecha_objetivo,
                p.modelo,
                p.activo,
                p.rendimiento_estimado,
                p.direccion_estimacion,
                e.rendimiento_observado,
                e.error_absoluto,
                e.direccion_correcta,
                e.fecha_evaluacion_utc
            FROM predicciones_lstm_mexc AS p
            LEFT JOIN evaluaciones_lstm_mexc AS e
                ON e.prediccion_id = p.id
            ORDER BY p.fecha_emision DESC, p.id DESC
        """).fetchall()

    predicciones = []

    for registro in registros:
        fila = dict(registro)

        evaluada = fila["fecha_evaluacion_utc"] is not None

        fila["estado_evaluacion"] = (
            "evaluada" if evaluada else "pendiente"
        )

        if fila["direccion_correcta"] is not None:
            fila["direccion_correcta"] = bool(
                fila["direccion_correcta"]
            )

        fila["rendimiento_estimado_porcentaje"] = (
            fila["rendimiento_estimado"] * 100
        )

        if fila["rendimiento_observado"] is not None:
            fila["rendimiento_observado_porcentaje"] = (
                fila["rendimiento_observado"] * 100
            )
        else:
            fila["rendimiento_observado_porcentaje"] = None

        predicciones.append(fila)

    evaluadas = [
        fila for fila in predicciones
        if fila["estado_evaluacion"] == "evaluada"
    ]

    aciertos = sum(
        1 for fila in evaluadas
        if fila["direccion_correcta"]
    )

    total_evaluadas = len(evaluadas)

    return {
        "status": "ok",
        "modelo": "LSTM-A",
        "activo": "BTCUSDT",
        "resumen": {
            "total_predicciones": len(predicciones),
            "total_evaluadas": total_evaluadas,
            "total_pendientes": (
                len(predicciones) - total_evaluadas
            ),
            "aciertos_direccion": aciertos,
            "precision_direccion_porcentaje": (
                aciertos / total_evaluadas * 100
                if total_evaluadas > 0
                else None
            ),
        },
        "predicciones": predicciones,
        "operaciones_reales": False,
    }


if __name__ == "__main__":
    print(json.dumps(
        consultar_evaluaciones_lstm(),
        indent=4,
        ensure_ascii=False,
    ))
