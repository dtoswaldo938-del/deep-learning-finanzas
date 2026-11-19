
from pathlib import Path
import json

import numpy as np
import pandas as pd
import torch


BASE = Path(__file__).resolve().parent
MODELOS = BASE / "modelos"
RESULTADOS = BASE / "resultados"
GRAFICAS = RESULTADOS / "graficas"


def main():
    print("=== AUDITORIA FINAL DEL LABORATORIO ===")

    modelos = [
        "LSTM_16_experimental.pt",
        "LSTM_32_experimental.pt",
        "LSTM_64_2CAPAS_experimental.pt",
    ]

    archivos = [
        RESULTADOS / "comparacion_arquitecturas.csv",
        RESULTADOS / "historial_entrenamiento.csv",
        RESULTADOS / "predicciones_test_lstm32.csv",
        RESULTADOS / "evaluacion_final_lstm32.csv",
        RESULTADOS / "analisis_errores_lstm32.json",
        RESULTADOS / "comparacion_direccional.json",
        MODELOS / "escaladores_experimentales.joblib",
    ]

    graficas = [
        f"{numero:02d}_{nombre}.png"
        for numero, nombre in [
            (1, "rendimientos_lstm"),
            (2, "errores_test"),
            (3, "comparacion_metricas"),
            (4, "dispersion_lstm"),
            (5, "distribucion_errores"),
        ]
    ]

    print("\n=== MODELOS ===")

    for nombre in modelos:
        ruta = MODELOS / nombre

        assert ruta.is_file(), f"Falta: {ruta}"

        checkpoint = torch.load(
            ruta,
            map_location="cpu",
            weights_only=True,
        )

        assert (
            checkpoint["orden_temporal"]
            == "antiguo_a_reciente"
        )

        print(
            nombre,
            "- mejor epoca:",
            checkpoint["mejor_epoca"],
        )

    print("\n=== ARCHIVOS DE RESULTADOS ===")

    for ruta in archivos:
        assert ruta.is_file(), f"Falta: {ruta}"
        print("OK:", ruta.name)

    print("\n=== GRAFICAS ===")

    for nombre in graficas:
        ruta = GRAFICAS / nombre
        assert ruta.is_file(), f"Falta: {ruta}"
        assert ruta.stat().st_size > 0
        print("OK:", nombre)

    print("\n=== CONSISTENCIA ESTADISTICA ===")

    datos = pd.read_csv(
        RESULTADOS / "predicciones_test_lstm32.csv"
    )

    evaluacion = pd.read_csv(
        RESULTADOS / "evaluacion_final_lstm32.csv"
    )

    with (
        RESULTADOS / "analisis_errores_lstm32.json"
    ).open("r", encoding="utf-8") as archivo:
        analisis = json.load(archivo)

    with (
        RESULTADOS / "comparacion_direccional.json"
    ).open("r", encoding="utf-8") as archivo:
        direcciones = json.load(archivo)

    assert len(datos) == 298
    assert analisis["observaciones"] == len(datos)
    assert direcciones["observaciones"] == len(datos)

    real = datos["rendimiento_real"].to_numpy()
    pred = datos["prediccion_lstm"].to_numpy()

    mae = float(np.mean(np.abs(pred - real)))

    rmse = float(
        np.sqrt(np.mean((pred - real) ** 2))
    )

    aciertos = int(
        np.sum(np.sign(pred) == np.sign(real))
    )

    fila_lstm = evaluacion.loc[
        evaluacion["modelo"] == "LSTM_32"
    ].iloc[0]

    assert np.isclose(mae, fila_lstm["mae"])
    assert np.isclose(rmse, fila_lstm["rmse"])

    assert np.isclose(
        mae, analisis["mae"]
    )

    assert np.isclose(
        rmse, analisis["rmse"]
    )

    assert (
        aciertos
        == analisis["aciertos_direccionales"]
    )

    assert (
        aciertos
        == direcciones["aciertos_lstm"]
    )

    print("Observaciones:", len(datos))
    print(f"MAE: {mae:.8f}")
    print(f"RMSE: {rmse:.8f}")
    print("Aciertos direccionales:", aciertos)

    print("\nAUDITORIA COMPLETADA CORRECTAMENTE")
    print("Todos los archivos estan disponibles.")
    print("Las metricas guardadas son consistentes.")
    print("No se modificaron modelos ni SQLite.")


if __name__ == "__main__":
    main()
