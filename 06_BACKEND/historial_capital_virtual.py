
"""Historial de movimientos del simulador académico."""

from datetime import datetime, timezone

from app.database.connection import conexion_segura


def inicializar_historial_capital():
    """Crea la tabla de movimientos virtuales."""

    with conexion_segura() as conexion:
        conexion.execute("""
            CREATE TABLE IF NOT EXISTS movimientos_capital_virtual (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cuenta_id INTEGER NOT NULL,
                fecha_utc TEXT NOT NULL,
                tipo_movimiento TEXT NOT NULL,
                descripcion TEXT NOT NULL,
                monto_centavos INTEGER NOT NULL,
                saldo_resultante_centavos INTEGER NOT NULL,
                origen TEXT NOT NULL,
                operaciones_reales INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (cuenta_id)
                    REFERENCES cuentas_virtuales(id),
                CHECK (operaciones_reales = 0),
                CHECK (saldo_resultante_centavos >= 0)
            )
        """)

        conexion.commit()

    return {
        "status": "ok",
        "tabla": "movimientos_capital_virtual",
        "operaciones_reales": False,
    }


def registrar_capital_inicial():
    """Registra una sola vez el capital inicial de la cuenta."""

    inicializar_historial_capital()

    with conexion_segura() as conexion:
        cuenta = conexion.execute("""
            SELECT
                id,
                capital_inicial_centavos
            FROM cuentas_virtuales
            WHERE nombre = ?
        """, ("SIMULADOR_LSTM_A",)).fetchone()

        if cuenta is None:
            raise ValueError(
                "Primero debes inicializar la cuenta virtual."
            )

        existente = conexion.execute("""
            SELECT id
            FROM movimientos_capital_virtual
            WHERE cuenta_id = ?
              AND tipo_movimiento = 'capital_inicial'
        """, (cuenta["id"],)).fetchone()

        if existente is not None:
            return {
                "status": "ok",
                "accion": "movimiento_existente",
                "operaciones_reales": False,
            }

        fecha = datetime.now(timezone.utc).isoformat()

        conexion.execute("""
            INSERT INTO movimientos_capital_virtual (
                cuenta_id,
                fecha_utc,
                tipo_movimiento,
                descripcion,
                monto_centavos,
                saldo_resultante_centavos,
                origen,
                operaciones_reales
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        """, (
            cuenta["id"],
            fecha,
            "capital_inicial",
            "Asignación inicial de capital ficticio",
            cuenta["capital_inicial_centavos"],
            cuenta["capital_inicial_centavos"],
            "configuracion_academica",
        ))

        conexion.commit()

    return {
        "status": "ok",
        "accion": "movimiento_creado",
        "operaciones_reales": False,
    }


def consultar_historial_capital():
    """Devuelve los movimientos virtuales registrados."""

    with conexion_segura() as conexion:
        filas = conexion.execute("""
            SELECT
                id,
                cuenta_id,
                fecha_utc,
                tipo_movimiento,
                descripcion,
                monto_centavos,
                saldo_resultante_centavos,
                origen
            FROM movimientos_capital_virtual
            ORDER BY id DESC
        """).fetchall()

    movimientos = []

    for fila in filas:
        movimientos.append({
            "id": fila["id"],
            "cuenta_id": fila["cuenta_id"],
            "fecha_utc": fila["fecha_utc"],
            "tipo_movimiento": fila["tipo_movimiento"],
            "descripcion": fila["descripcion"],
            "monto": fila["monto_centavos"] / 100,
            "saldo_resultante":
                fila["saldo_resultante_centavos"] / 100,
            "origen": fila["origen"],
            "operaciones_reales": False,
        })

    return {
        "status": "ok",
        "total_movimientos": len(movimientos),
        "movimientos": movimientos,
        "operaciones_reales": False,
    }


if __name__ == "__main__":
    import json

    print(
        json.dumps(
            inicializar_historial_capital(),
            ensure_ascii=False,
            indent=4,
        )
    )

    print(
        json.dumps(
            registrar_capital_inicial(),
            ensure_ascii=False,
            indent=4,
        )
    )

    print(
        json.dumps(
            consultar_historial_capital(),
            ensure_ascii=False,
            indent=4,
        )
    )
