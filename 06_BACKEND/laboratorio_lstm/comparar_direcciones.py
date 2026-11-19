
from pathlib import Path
import json

import numpy as np
import pandas as pd


BASE = Path(__file__).resolve().parent
RESULTADOS = BASE / "resultados"

RUTA_DATOS = (
    RESULTADOS / "predicciones_test_lstm32.csv"
)

RUTA_SALIDA = (
    RESULTADOS / "comparacion_direccional.json"
)


def main():
    print("=== COMPARACION DIRECCIONAL ===")

    datos = pd.read_csv(RUTA_DATOS)

    reales = datos["rendimiento_real"].to_numpy(
        dtype=float
    )

    predicciones = datos["prediccion_lstm"].to_numpy(
        dtype=float
    )

    total = len(datos)

    if total == 0:
        raise ValueError("No hay observaciones.")

    if not (
        np.isfinite(reales).all()
        and np.isfinite(predicciones).all()
    ):
        raise ValueError("Existen valores invalidos.")

    dias_subida = int(np.sum(reales > 0))
    dias_bajada = int(np.sum(reales < 0))
    dias_sin_cambio = int(np.sum(reales == 0))

    aciertos_lstm = int(
        np.sum(
            np.sign(predicciones) == np.sign(reales)
        )
    )

    # Referencia academica: predecir siempre subida.
    aciertos_siempre_subida = dias_subida

    precision_lstm = (
        aciertos_lstm / total * 100
    )

    precision_siempre_subida = (
        aciertos_siempre_subida / total * 100
    )

    diferencia = (
        precision_lstm - precision_siempre_subida
    )

    resumen = {
        "status": "ok",
        "modelo": "LSTM_32",
        "observaciones": total,
        "dias_reales_subida": dias_subida,
        "dias_reales_bajada": dias_bajada,
        "dias_reales_sin_cambio": dias_sin_cambio,
        "aciertos_lstm": aciertos_lstm,
        "aciertos_siempre_subida": (
            aciertos_siempre_subida
        ),
        "precision_lstm": precision_lstm,
        "precision_siempre_subida": (
            precision_siempre_subida
        ),
        "diferencia_puntos_porcentuales": diferencia,
        "operaciones_reales": False,
    }

    print("\n=== DIRECCION REAL ===")
    print("Total:", total)
    print("Dias de subida:", dias_subida)
    print("Dias de bajada:", dias_bajada)
    print("Dias sin cambio:", dias_sin_cambio)

    print("\n=== PRECISION DIRECCIONAL ===")
    print(
        "LSTM-32:",
        f"{precision_lstm:.4f}%"
    )

    print(
        "Siempre subida:",
        f"{precision_siempre_subida:.4f}%"
    )

    print(
        "Diferencia:",
        f"{diferencia:+.4f} puntos porcentuales"
    )

    if diferencia > 0:
        print(
            "LSTM-32 supera a la referencia "
            "en esta muestra."
        )
    elif diferencia < 0:
        print(
            "La referencia siempre subida "
            "supera a LSTM-32."
        )
    else:
        print(
            "Ambos enfoques tienen la misma "
            "precision direccional."
        )

    with RUTA_SALIDA.open(
        "w", encoding="utf-8"
    ) as archivo:
        json.dump(
            resumen,
            archivo,
            indent=4,
            ensure_ascii=False,
        )

    print("\nArchivo generado:")
    print(RUTA_SALIDA)

    print("\nCOMPARACION FINALIZADA")
    print("No se modificaron modelos.")
    print("No se modifico el capital virtual.")


if __name__ == "__main__":
    main()
