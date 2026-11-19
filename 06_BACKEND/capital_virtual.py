
"""Cuenta académica de capital virtual, sin operaciones reales."""

from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from sqlite3 import IntegrityError

from app.database.connection import conexion_segura


CAPITAL_INICIAL = Decimal("100000.00")
MONEDA = "MXN"
NOMBRE_CUENTA = "SIMULADOR_LSTM_A"


def inicializar_capital_virtual():
    """Crea la cuenta virtual solo si todavía no existe."""

    fecha = datetime.now(timezone.utc).isoformat()

    with conexion_segura() as conexion:
        conexion.execute("""
            CREATE TABLE IF NOT EXISTS cuentas_virtuales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL UNIQUE,
                moneda TEXT NOT NULL,
                capital_inicial_centavos INTEGER NOT NULL,
                saldo_centavos INTEGER NOT NULL,
                fecha_creacion_utc TEXT NOT NULL,
                operaciones_reales INTEGER NOT NULL DEFAULT 0,
                CHECK (capital_inicial_centavos >= 0),
                CHECK (saldo_centavos >= 0),
                CHECK (operaciones_reales = 0)
            )
        """)

        try:
            conexion.execute("""
                INSERT INTO cuentas_virtuales (
                    nombre,
                    moneda,
                    capital_inicial_centavos,
                    saldo_centavos,
                    fecha_creacion_utc,
                    operaciones_reales
                )
                VALUES (?, ?, ?, ?, ?, 0)
            """, (
                NOMBRE_CUENTA,
                MONEDA,
                int(CAPITAL_INICIAL * 100),
                int(CAPITAL_INICIAL * 100),
                fecha,
            ))

            conexion.commit()
            accion = "cuenta_creada"

        except IntegrityError:
            conexion.rollback()
            accion = "cuenta_existente"

    return {
        "status": "ok",
        "accion": accion,
        "cuenta": consultar_capital_virtual(),
    }


def consultar_capital_virtual():
    """Consulta el capital ficticio sin modificar el saldo."""

    with conexion_segura() as conexion:
        fila = conexion.execute("""
            SELECT
                id,
                nombre,
                moneda,
                capital_inicial_centavos,
                saldo_centavos,
                fecha_creacion_utc,
                operaciones_reales
            FROM cuentas_virtuales
            WHERE nombre = ?
        """, (NOMBRE_CUENTA,)).fetchone()

    if fila is None:
        return {
            "status": "sin_inicializar",
            "mensaje": "La cuenta virtual todavía no existe.",
            "operaciones_reales": False,
        }

    capital_inicial = Decimal(
        fila["capital_inicial_centavos"]
    ) / Decimal("100")

    saldo = Decimal(
        fila["saldo_centavos"]
    ) / Decimal("100")

    return {
        "status": "ok",
        "id": fila["id"],
        "nombre": fila["nombre"],
        "moneda": fila["moneda"],
        "capital_inicial": float(capital_inicial),
        "saldo_actual": float(saldo),
        "rendimiento_acumulado_porcentaje": (
            float((saldo / capital_inicial - 1) * 100)
            if capital_inicial > 0
            else 0.0
        ),
        "fecha_creacion_utc": fila["fecha_creacion_utc"],
        "operaciones_reales": False,
        "modo": "simulacion_academica",
    }


if __name__ == "__main__":
    import json

    resultado = inicializar_capital_virtual()

    print(
        json.dumps(
            resultado,
            ensure_ascii=False,
            indent=4,
        )
    )
