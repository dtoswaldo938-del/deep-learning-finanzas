
from pathlib import Path
import json

import matplotlib
matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


BASE = Path(__file__).resolve().parent

RESULTADOS = BASE / "resultados"
GRAFICAS = RESULTADOS / "graficas"

RUTA_DATOS = (
    RESULTADOS / "predicciones_test_lstm32.csv"
)

RUTA_RESUMEN = (
    RESULTADOS / "analisis_errores_lstm32.json"
)


def main():
    print("=== ANALISIS AVANZADO LSTM-32 ===")

    datos = pd.read_csv(RUTA_DATOS)

    columnas = [
        "fecha_objetivo",
        "rendimiento_real",
        "prediccion_lstm",
    ]

    for columna in columnas:
        if columna not in datos.columns:
            raise ValueError(
                f"Falta la columna: {columna}"
            )

    if len(datos) == 0:
        raise ValueError("El archivo no contiene datos.")

    datos["fecha_objetivo"] = pd.to_datetime(
        datos["fecha_objetivo"]
    )

    real = datos["rendimiento_real"].to_numpy(
        dtype=float
    )

    pred = datos["prediccion_lstm"].to_numpy(
        dtype=float
    )

    if not np.isfinite(real).all():
        raise ValueError("Hay rendimientos reales invalidos.")

    if not np.isfinite(pred).all():
        raise ValueError("Hay predicciones invalidas.")

    errores = pred - real
    errores_absolutos = np.abs(errores)

    total = len(datos)

    subidas = int(np.sum(pred > 0))
    bajadas = int(np.sum(pred < 0))
    sin_cambio = int(np.sum(pred == 0))

    aciertos = int(
        np.sum(np.sign(pred) == np.sign(real))
    )

    precision = aciertos / total * 100

    mae = float(np.mean(errores_absolutos))

    rmse = float(
        np.sqrt(np.mean(errores ** 2))
    )

    sesgo = float(np.mean(errores))

    desviacion_errores = float(
        np.std(errores, ddof=0)
    )

    # Correlacion de Pearson.
    # Si una serie es constante, no esta definida.
    if (
        np.std(real) > 0
        and np.std(pred) > 0
    ):
        correlacion = float(
            np.corrcoef(real, pred)[0, 1]
        )
    else:
        correlacion = None

    indice_mayor_error = int(
        np.argmax(errores_absolutos)
    )

    fila_mayor_error = datos.iloc[
        indice_mayor_error
    ]

    mayor_error = {
        "fecha": (
            fila_mayor_error["fecha_objetivo"]
            .strftime("%Y-%m-%d")
        ),
        "rendimiento_real_porcentaje": float(
            real[indice_mayor_error] * 100
        ),
        "prediccion_porcentaje": float(
            pred[indice_mayor_error] * 100
        ),
        "error_absoluto_puntos_porcentuales": float(
            errores_absolutos[indice_mayor_error]
            * 100
        ),
    }

    resumen = {
        "status": "ok",
        "modelo": "LSTM_32",
        "activo": "BTCUSDT",
        "tipo": "evaluacion_historica",
        "observaciones": total,
        "predicciones_subida": subidas,
        "predicciones_bajada": bajadas,
        "predicciones_sin_cambio": sin_cambio,
        "porcentaje_subida": subidas / total * 100,
        "porcentaje_bajada": bajadas / total * 100,
        "aciertos_direccionales": aciertos,
        "precision_direccional": precision,
        "mae": mae,
        "rmse": rmse,
        "sesgo": sesgo,
        "desviacion_errores": desviacion_errores,
        "correlacion_pearson": correlacion,
        "mayor_error": mayor_error,
        "operaciones_reales": False,
        "capital_virtual_modificado": False,
    }

    print("\n=== COMPORTAMIENTO DIRECCIONAL ===")
    print("Observaciones:", total)
    print("Predicciones de subida:", subidas)
    print("Predicciones de bajada:", bajadas)
    print("Predicciones sin cambio:", sin_cambio)

    print(
        "Porcentaje de subida:",
        f"{resumen['porcentaje_subida']:.4f}%"
    )

    print(
        "Porcentaje de bajada:",
        f"{resumen['porcentaje_bajada']:.4f}%"
    )

    print("Aciertos direccionales:", aciertos)

    print(
        "Precision direccional:",
        f"{precision:.4f}%"
    )

    print("\n=== ESTADISTICAS DE ERROR ===")
    print(f"MAE: {mae:.8f}")
    print(f"RMSE: {rmse:.8f}")
    print(f"Sesgo: {sesgo:.8f}")

    print(
        "Desviacion de errores:",
        f"{desviacion_errores:.8f}"
    )

    if correlacion is not None:
        print(
            "Correlacion Pearson:",
            f"{correlacion:.6f}"
        )
    else:
        print("Correlacion Pearson: no definida")

    print("\n=== MAYOR ERROR ABSOLUTO ===")

    for clave, valor in mayor_error.items():
        print(f"{clave}: {valor}")

    RESULTADOS.mkdir(
        parents=True,
        exist_ok=True
    )

    GRAFICAS.mkdir(
        parents=True,
        exist_ok=True
    )

    with RUTA_RESUMEN.open(
        "w", encoding="utf-8"
    ) as archivo:
        json.dump(
            resumen,
            archivo,
            indent=4,
            ensure_ascii=False,
        )

    # ==========================================
    # GRAFICA 1: DISPERSION
    # ==========================================

    fig, ax = plt.subplots(
        figsize=(8, 7)
    )

    ax.scatter(
        real * 100,
        pred * 100,
        alpha=0.6,
        s=24,
    )

    limite = max(
        float(np.max(np.abs(real * 100))),
        float(np.max(np.abs(pred * 100))),
        0.1,
    )

    ax.plot(
        [-limite, limite],
        [-limite, limite],
        linestyle="--",
        linewidth=1,
        label="Prediccion perfecta",
    )

    ax.axhline(0, linewidth=0.7)
    ax.axvline(0, linewidth=0.7)

    ax.set_xlim(-limite, limite)
    ax.set_ylim(-limite, limite)

    ax.set_title(
        "Dispersion: rendimiento real vs LSTM-32"
    )

    ax.set_xlabel(
        "Rendimiento real (%)"
    )

    ax.set_ylabel(
        "Rendimiento estimado (%)"
    )

    ax.legend()
    ax.grid(alpha=0.25)

    fig.tight_layout()

    fig.savefig(
        GRAFICAS / "04_dispersion_lstm.png",
        dpi=180,
    )

    plt.close(fig)

    # ==========================================
    # GRAFICA 2: DISTRIBUCION DE ERRORES
    # ==========================================

    fig, ax = plt.subplots(
        figsize=(10, 5)
    )

    ax.hist(
        errores * 100,
        bins=30,
        edgecolor="black",
        alpha=0.8,
    )

    ax.axvline(
        0,
        linestyle="--",
        linewidth=1,
        label="Error cero",
    )

    ax.axvline(
        sesgo * 100,
        linestyle=":",
        linewidth=2,
        label="Sesgo medio",
    )

    ax.set_title(
        "Distribucion de errores LSTM-32"
    )

    ax.set_xlabel(
        "Error (puntos porcentuales)"
    )

    ax.set_ylabel(
        "Frecuencia"
    )

    ax.legend()
    ax.grid(axis="y", alpha=0.25)

    fig.tight_layout()

    fig.savefig(
        GRAFICAS / "05_distribucion_errores.png",
        dpi=180,
    )

    plt.close(fig)

    print("\n=== ARCHIVOS GENERADOS ===")
    print(RUTA_RESUMEN)
    print("04_dispersion_lstm.png")
    print("05_distribucion_errores.png")

    print("\nANALISIS FINALIZADO CORRECTAMENTE")
    print("No se modificaron los modelos.")
    print("No se modifico SQLite.")
    print("No se realizaron operaciones reales.")


if __name__ == "__main__":
    main()
