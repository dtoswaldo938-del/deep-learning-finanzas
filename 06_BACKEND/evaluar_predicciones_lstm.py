
import json
from datetime import datetime, timezone

from app.database.connection import (
    conexion_segura,
    inicializar_base_datos,
)
from consultar_rendimiento_observado import (
    consultar_rendimiento_observado,
)


def evaluar_predicciones_pendientes():
    """Evalúa predicciones sin evaluación registrada."""

    inicializar_base_datos()

    with conexion_segura() as conexion:
        pendientes = conexion.execute("""
            SELECT
                p.id,
                p.fecha_objetivo,
                p.rendimiento_estimado,
                p.direccion_estimacion
            FROM predicciones_lstm_mexc AS p
            LEFT JOIN evaluaciones_lstm_mexc AS e
                ON e.prediccion_id = p.id
            WHERE e.id IS NULL
            ORDER BY p.id
        """).fetchall()

        pendientes = [dict(fila) for fila in pendientes]

    resultados = []

    for prediccion in pendientes:
        identificador = prediccion["id"]

        try:
            observado = consultar_rendimiento_observado(
                prediccion["fecha_objetivo"]
            )

            if observado["status"] == "pendiente":
                resultados.append({
                    "prediccion_id": identificador,
                    "accion": "pendiente",
                    "motivo": observado["motivo"],
                })
                continue

            if observado["status"] != "ok":
                raise ValueError(
                    "Estado inesperado al consultar MEXC."
                )

            rendimiento_real = observado[
                "rendimiento_observado"
            ]
            rendimiento_estimado = prediccion[
                "rendimiento_estimado"
            ]

            error_absoluto = abs(
                rendimiento_real - rendimiento_estimado
            )

            if rendimiento_real > 0:
                direccion_real = "subida"
            elif rendimiento_real < 0:
                direccion_real = "bajada"
            else:
                direccion_real = "sin_cambio"

            direccion_correcta = int(
                prediccion["direccion_estimacion"]
                == direccion_real
            )

            fecha_evaluacion = datetime.now(
                timezone.utc
            ).isoformat()

            with conexion_segura() as conexion:
                cursor = conexion.execute("""
                    INSERT OR IGNORE INTO
                        evaluaciones_lstm_mexc (
                            prediccion_id,
                            fecha_evaluacion_utc,
                            rendimiento_observado,
                            error_absoluto,
                            direccion_correcta,
                            fuente
                        )
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    identificador,
                    fecha_evaluacion,
                    rendimiento_real,
                    error_absoluto,
                    direccion_correcta,
                    observado["fuente"],
                ))

                accion = (
                    "guardada"
                    if cursor.rowcount == 1
                    else "ya_existia"
                )

            resultados.append({
                "prediccion_id": identificador,
                "accion": accion,
                "rendimiento_estimado": rendimiento_estimado,
                "rendimiento_observado": rendimiento_real,
                "error_absoluto": error_absoluto,
                "direccion_correcta": bool(
                    direccion_correcta
                ),
            })

        except Exception as error:
            resultados.append({
                "prediccion_id": identificador,
                "accion": "error",
                "detalle": str(error),
            })

    return {
        "status": "ok",
        "predicciones_pendientes_revisadas": len(
            pendientes
        ),
        "resultados": resultados,
        "operaciones_reales": False,
    }


if __name__ == "__main__":
    print(json.dumps(
        evaluar_predicciones_pendientes(),
        indent=4,
        ensure_ascii=False,
    ))
