
"""Métricas académicas de precisión para LSTM-A.

Consulta evaluaciones existentes en SQLite.
No modifica predicciones, capital ni historial.
No ejecuta operaciones financieras.
"""

import json
import math

from app.database.connection import conexion_segura


MODELO = "LSTM-A"
ACTIVO = "BTCUSDT"
FACTOR_PORCENTAJE = 100


def consultar_metricas_precision_lstm():
    """Calcula métricas usando evaluaciones completas."""

    with conexion_segura() as conexion:
        registros = conexion.execute(
            """
            SELECT
                p.id,
                p.fecha_objetivo,
                p.rendimiento_estimado,
                e.rendimiento_observado,
                e.direccion_correcta
            FROM predicciones_lstm_mexc AS p
            INNER JOIN evaluaciones_lstm_mexc AS e
                ON e.prediccion_id = p.id
            WHERE p.modelo = ?
              AND p.activo = ?
              AND p.rendimiento_estimado IS NOT NULL
              AND e.rendimiento_observado IS NOT NULL
            ORDER BY p.fecha_objetivo ASC, p.id ASC
            """,
            (MODELO, ACTIVO),
        ).fetchall()

    errores = []
    errores_absolutos = []
    errores_cuadrados = []
    detalles = []
    aciertos = 0

    for registro in registros:
        estimado = (
            float(registro["rendimiento_estimado"])
            * FACTOR_PORCENTAJE
        )

        observado = (
            float(registro["rendimiento_observado"])
            * FACTOR_PORCENTAJE
        )

        if not (
            math.isfinite(estimado)
            and math.isfinite(observado)
        ):
            raise ValueError(
                "Se encontraron rendimientos no finitos."
            )

        # Convención: error = estimado - observado.
        error = estimado - observado
        error_absoluto = abs(error)
        error_cuadrado = error ** 2

        errores.append(error)
        errores_absolutos.append(error_absoluto)
        errores_cuadrados.append(error_cuadrado)

        # La evaluación ya guarda si acertó la dirección.
        direccion_correcta = (
            bool(registro["direccion_correcta"])
            if registro["direccion_correcta"] is not None
            else None
        )

        if direccion_correcta is True:
            aciertos += 1

        detalles.append({
            "prediccion_id": registro["id"],
            "fecha_objetivo": registro["fecha_objetivo"],
            "estimado_porcentaje": round(estimado, 6),
            "observado_porcentaje": round(observado, 6),
            "error_puntos_porcentuales": round(error, 6),
            "error_absoluto_puntos_porcentuales": round(
                error_absoluto, 6
            ),
            "direccion_correcta": direccion_correcta,
        })

    total = len(registros)

    total_con_direccion = sum(
        detalle["direccion_correcta"] is not None
        for detalle in detalles
    )

    if total == 0:
        mae = None
        rmse = None
        sesgo = None
    else:
        mae = sum(errores_absolutos) / total
        rmse = math.sqrt(
            sum(errores_cuadrados) / total
        )
        sesgo = sum(errores) / total

    precision_direccion = (
        aciertos / total_con_direccion * 100
        if total_con_direccion > 0
        else None
    )

    return {
        "status": "ok",
        "modo": "evaluacion_academica",
        "modelo": MODELO,
        "activo": ACTIVO,
        "unidad_error": "puntos_porcentuales",
        "total_evaluaciones": total,
        "mae": round(mae, 6) if mae is not None else None,
        "rmse": round(rmse, 6) if rmse is not None else None,
        "sesgo_medio": (
            round(sesgo, 6)
            if sesgo is not None
            else None
        ),
        "aciertos_direccion": aciertos,
        "total_con_direccion": total_con_direccion,
        "precision_direccion_porcentaje": (
            round(precision_direccion, 4)
            if precision_direccion is not None
            else None
        ),
        "detalles": detalles,
        "solo_lectura": True,
        "saldo_sqlite_modificado": False,
        "operaciones_reales": False,
    }


if __name__ == "__main__":
    resultado = consultar_metricas_precision_lstm()

    print(
        json.dumps(
            resultado,
            indent=4,
            ensure_ascii=False,
        )
    )
