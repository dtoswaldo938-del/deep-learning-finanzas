
from pathlib import Path

import matplotlib
matplotlib.use("Agg")

import matplotlib.pyplot as plt
import pandas as pd


BASE = Path(__file__).resolve().parent
RESULTADOS = BASE / "resultados"
GRAFICAS = RESULTADOS / "graficas"

RUTA_PREDICCIONES = (
    RESULTADOS / "predicciones_test_lstm32.csv"
)

RUTA_METRICAS = (
    RESULTADOS / "evaluacion_final_lstm32.csv"
)


def main():
    GRAFICAS.mkdir(parents=True, exist_ok=True)

    datos = pd.read_csv(RUTA_PREDICCIONES)
    metricas = pd.read_csv(RUTA_METRICAS)

    datos["fecha_objetivo"] = pd.to_datetime(
        datos["fecha_objetivo"]
    )

    assert len(datos) == 298
    assert len(metricas) == 2

    print("=== GRAFICAS DE EVALUACION LSTM ===")
    print("Observaciones:", len(datos))

    # GRAFICA 1: rendimientos reales y estimados
    fig, ax = plt.subplots(figsize=(12, 5))

    ax.plot(
        datos["fecha_objetivo"],
        datos["rendimiento_real"] * 100,
        label="Rendimiento real",
        linewidth=1,
    )

    ax.plot(
        datos["fecha_objetivo"],
        datos["prediccion_lstm"] * 100,
        label="Prediccion LSTM-32",
        linewidth=1,
    )

    ax.axhline(0, linewidth=0.8)
    ax.set_title("Rendimientos reales vs LSTM-32")
    ax.set_xlabel("Fecha")
    ax.set_ylabel("Rendimiento diario (%)")
    ax.legend()
    ax.grid(alpha=0.25)

    fig.autofmt_xdate()
    fig.tight_layout()

    fig.savefig(
        GRAFICAS / "01_rendimientos_lstm.png",
        dpi=180,
    )
    plt.close(fig)

    # GRAFICA 2: errores de prediccion
    fig, ax = plt.subplots(figsize=(12, 5))

    ax.plot(
        datos["fecha_objetivo"],
        datos["error_lstm"] * 100,
        label="Error LSTM-32",
        linewidth=1,
    )

    ax.plot(
        datos["fecha_objetivo"],
        datos["error_cero"] * 100,
        label="Error modelo Cero",
        linewidth=1,
        alpha=0.7,
    )

    ax.axhline(0, linewidth=0.8)
    ax.set_title("Errores de prediccion en TEST")
    ax.set_xlabel("Fecha")
    ax.set_ylabel("Error (puntos porcentuales)")
    ax.legend()
    ax.grid(alpha=0.25)

    fig.autofmt_xdate()
    fig.tight_layout()

    fig.savefig(
        GRAFICAS / "02_errores_test.png",
        dpi=180,
    )
    plt.close(fig)

    # GRAFICA 3: comparacion de metricas
    tabla = metricas.set_index("modelo")

    fig, ax = plt.subplots(figsize=(9, 5))

    tabla[["mae", "rmse"]].plot(
        kind="bar",
        ax=ax,
        rot=0,
    )

    ax.set_title("Comparacion de errores en TEST")
    ax.set_xlabel("Modelo")
    ax.set_ylabel("Error en rendimiento decimal")
    ax.legend(["MAE", "RMSE"])
    ax.grid(axis="y", alpha=0.25)

    fig.tight_layout()

    fig.savefig(
        GRAFICAS / "03_comparacion_metricas.png",
        dpi=180,
    )
    plt.close(fig)

    print("\n=== ARCHIVOS GENERADOS ===")

    for archivo in sorted(GRAFICAS.glob("*.png")):
        print(archivo.name)
        print("Tamano:", archivo.stat().st_size, "bytes")

    print("\nGRAFICAS GENERADAS CORRECTAMENTE")
    print("No se modificaron predicciones ni modelos.")
    print("No se modifico el capital virtual.")


if __name__ == "__main__":
    main()
