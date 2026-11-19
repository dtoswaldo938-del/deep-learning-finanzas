
"""Motor matemático de simulación académica.

No ejecuta operaciones reales ni modifica cuentas SQLite.
"""

from decimal import Decimal, ROUND_HALF_UP


def calcular_resultado_hipotetico(
    capital_mxn,
    porcentaje_asignado,
    rendimiento_porcentaje,
):
    """Calcula un escenario ficticio usando rendimientos porcentuales."""

    capital = Decimal(str(capital_mxn))
    asignacion = Decimal(str(porcentaje_asignado))
    rendimiento = Decimal(str(rendimiento_porcentaje))

    if not capital.is_finite() or capital <= 0:
        raise ValueError("El capital debe ser positivo y finito.")

    if not asignacion.is_finite() or not (0 <= asignacion <= 100):
        raise ValueError(
            "La asignación debe estar entre 0 y 100."
        )

    if not rendimiento.is_finite() or rendimiento < -100:
        raise ValueError(
            "El rendimiento debe ser finito y no menor a -100 %."
        )

    monto_asignado = capital * asignacion / Decimal("100")

    resultado = (
        monto_asignado
        * rendimiento
        / Decimal("100")
    )

    saldo_final = capital + resultado

    def redondear(valor):
        return valor.quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )

    monto_asignado = redondear(monto_asignado)
    resultado = redondear(resultado)
    saldo_final = redondear(saldo_final)

    return {
        "status": "ok",
        "modo": "simulacion_academica",
        "moneda": "MXN",
        "capital_inicial": float(redondear(capital)),
        "porcentaje_asignado": float(asignacion),
        "monto_asignado": float(monto_asignado),
        "rendimiento_hipotetico_porcentaje": float(rendimiento),
        "resultado_hipotetico": float(resultado),
        "saldo_final_hipotetico": float(saldo_final),
        "operaciones_reales": False,
        "saldo_sqlite_modificado": False,
    }


if __name__ == "__main__":
    import json

    escenarios = [
        {
            "capital_mxn": 100000,
            "porcentaje_asignado": 10,
            "rendimiento_porcentaje": 1,
        },
        {
            "capital_mxn": 100000,
            "porcentaje_asignado": 10,
            "rendimiento_porcentaje": -2,
        },
        {
            "capital_mxn": 100000,
            "porcentaje_asignado": 25,
            "rendimiento_porcentaje": 0.5,
        },
    ]

    for numero, escenario in enumerate(escenarios, start=1):
        print(f"\n=== ESCENARIO {numero} ===")

        resultado = calcular_resultado_hipotetico(
            **escenario
        )

        print(
            json.dumps(
                resultado,
                ensure_ascii=False,
                indent=4,
            )
        )

