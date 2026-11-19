
"""Escenarios académicos basados en predicciones LSTM-A.

Solo consulta SQLite y calcula resultados hipotéticos.
No modifica capital, historial ni realiza operaciones reales.
"""

import json

from app.database.connection import conexion_segura
from motor_simulacion_virtual import calcular_resultado_hipotetico


# Porcentaje del capital ficticio asignado a cada escenario.
PORCENTAJE_ASIGNADO = 10

# Los rendimientos de SQLite se almacenan como decimales.
# Ejemplo: 0.01 representa un rendimiento del 1 %.
FACTOR_DECIMAL_A_PORCENTAJE = 100


def consultar_escenarios_lstm():
    """Calcula escenarios usando predicciones almacenadas."""

    with conexion_segura() as conexion:
        filas = conexion.execute("""
            SELECT
                p.id,
                p.fecha_emision,
                p.fecha_objetivo,
                p.modelo,
                p.activo,
                p.rendimiento_estimado,
                e.rendimiento_observado
            FROM predicciones_lstm_mexc AS p
            LEFT JOIN evaluaciones_lstm_mexc AS e
                ON e.prediccion_id = p.id
            WHERE p.modelo = ?
              AND p.activo = ?
            ORDER BY p.fecha_emision DESC
        """, ("LSTM-A", "BTCUSDT")).fetchall()

        cuenta = conexion.execute("""
            SELECT saldo_centavos
            FROM cuentas_virtuales
            WHERE nombre = ?
        """, ("SIMULADOR_LSTM_A",)).fetchone()

    if cuenta is None:
        raise ValueError("No existe la cuenta virtual.")

    # Convertimos los centavos almacenados a pesos mexicanos.
    capital_referencia = cuenta["saldo_centavos"] / 100

    escenarios = []

    for fila in filas:

        # Convertimos el rendimiento estimado de decimal a porcentaje.
        rendimiento_estimado_porcentaje = (
            fila["rendimiento_estimado"]
            * FACTOR_DECIMAL_A_PORCENTAJE
        )

        # Calculamos el resultado hipotético estimado.
        estimacion = calcular_resultado_hipotetico(
            capital_mxn=capital_referencia,
            porcentaje_asignado=PORCENTAJE_ASIGNADO,
            rendimiento_porcentaje=rendimiento_estimado_porcentaje,
        )

        observacion = None
        rendimiento_observado_porcentaje = None

        # Solo calculamos el resultado observado si ya existe
        # una evaluación registrada en SQLite.
        if fila["rendimiento_observado"] is not None:

            rendimiento_observado_porcentaje = (
                fila["rendimiento_observado"]
                * FACTOR_DECIMAL_A_PORCENTAJE
            )

            observacion = calcular_resultado_hipotetico(
                capital_mxn=capital_referencia,
                porcentaje_asignado=PORCENTAJE_ASIGNADO,
                rendimiento_porcentaje=rendimiento_observado_porcentaje,
            )

        # Guardamos los resultados del escenario académico.
        escenarios.append({
            "prediccion_id": fila["id"],
            "modelo": fila["modelo"],
            "activo": fila["activo"],
            "fecha_emision": fila["fecha_emision"],
            "fecha_objetivo": fila["fecha_objetivo"],

            "porcentaje_asignado": PORCENTAJE_ASIGNADO,

            "rendimiento_estimado_porcentaje": (
                rendimiento_estimado_porcentaje
            ),

            "resultado_estimado_mxn": (
                estimacion["resultado_hipotetico"]
            ),

            "rendimiento_observado_porcentaje": (
                rendimiento_observado_porcentaje
            ),

            "resultado_observado_hipotetico_mxn": (
                observacion["resultado_hipotetico"]
                if observacion is not None
                else None
            ),

            "estado": (
                "evaluado"
                if observacion is not None
                else "pendiente"
            ),

            "capital_referencia_mxn": capital_referencia,
            "saldo_sqlite_modificado": False,
            "operaciones_reales": False,
        })

    return {
        "status": "ok",
        "modo": "simulacion_academica",
        "modelo": "LSTM-A",
        "activo": "BTCUSDT",
        "moneda": "MXN",
        "capital_referencia_mxn": capital_referencia,
        "porcentaje_asignado": PORCENTAJE_ASIGNADO,
        "total_escenarios": len(escenarios),
        "escenarios": escenarios,
        "saldo_sqlite_modificado": False,
        "operaciones_reales": False,
    }


if __name__ == "__main__":

    resultado = consultar_escenarios_lstm()

    print(
        json.dumps(
            resultado,
            ensure_ascii=False,
            indent=4,
        )
    )
