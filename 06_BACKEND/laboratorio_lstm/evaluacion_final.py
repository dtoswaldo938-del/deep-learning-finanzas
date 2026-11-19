
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import torch

from entrenar_experimentos import RedLSTM
from preparar_entrenamiento import preparar_conjuntos


BASE = Path(__file__).resolve().parent

RUTA_MODELO = (
    BASE / "modelos" / "LSTM_32_experimental.pt"
)

RUTA_ESCALADORES = (
    BASE / "modelos" / "escaladores_experimentales.joblib"
)

CARPETA_RESULTADOS = BASE / "resultados"


def calcular_metricas(y_real, y_pred):
    errores = y_pred - y_real

    mae = float(np.mean(np.abs(errores)))
    rmse = float(np.sqrt(np.mean(errores ** 2)))
    sesgo = float(np.mean(errores))

    return {
        "mae": mae,
        "rmse": rmse,
        "sesgo": sesgo,
    }


def main():
    print("=== EVALUACION FINAL LSTM ===")

    torch.set_num_threads(2)

    conjuntos = preparar_conjuntos()

    objetos = joblib.load(RUTA_ESCALADORES)

    scaler_X = objetos["scaler_X"]
    scaler_y = objetos["scaler_y"]

    # Comprobar que los escaladores recuperados
    # coinciden con los usados en la preparacion.
    assert np.allclose(
        scaler_X.mean_,
        conjuntos["scaler_X"].mean_,
    )
    assert np.allclose(
        scaler_X.scale_,
        conjuntos["scaler_X"].scale_,
    )
    assert np.allclose(
        scaler_y.mean_,
        conjuntos["scaler_y"].mean_,
    )
    assert np.allclose(
        scaler_y.scale_,
        conjuntos["scaler_y"].scale_,
    )
    assert objetos["orden_lstm"] == "antiguo_a_reciente"

    checkpoint = torch.load(
        RUTA_MODELO,
        map_location="cpu",
        weights_only=True,
    )

    config = checkpoint["model_config"]

    modelo = RedLSTM(
        hidden_size=config["hidden_size"],
        num_layers=config["num_layers"],
    )

    modelo.load_state_dict(
        checkpoint["model_state_dict"]
    )

    modelo.eval()

    X_test = torch.from_numpy(
        conjuntos["X_test"]
    )

    with torch.no_grad():
        pred_escalada = modelo(
            X_test
        ).numpy()

    y_real = scaler_y.inverse_transform(
        conjuntos["y_test"]
    ).ravel()

    y_pred = scaler_y.inverse_transform(
        pred_escalada
    ).ravel()

    y_cero = np.zeros_like(y_real)

    metricas_lstm = calcular_metricas(
        y_real, y_pred
    )

    metricas_cero = calcular_metricas(
        y_real, y_cero
    )

    print("Modelo:", RUTA_MODELO.name)
    print("Mejor epoca:", checkpoint["mejor_epoca"])
    print("Observaciones TEST:", len(y_real))

    print("\n=== RESULTADOS LSTM_32 ===")

    for nombre, valor in metricas_lstm.items():
        print(f"{nombre.upper()}: {valor:.8f}")

    print("\n=== RESULTADOS MODELO CERO ===")

    for nombre, valor in metricas_cero.items():
        print(f"{nombre.upper()}: {valor:.8f}")

    mejora_rmse = (
        (metricas_cero["rmse"] - metricas_lstm["rmse"])
        / metricas_cero["rmse"]
        * 100
    )

    print("\n=== COMPARACION ===")
    print(f"Mejora relativa RMSE: {mejora_rmse:.4f}%")

    if mejora_rmse > 0:
        print("LSTM_32 tiene menor RMSE en TEST.")
    elif mejora_rmse < 0:
        print("El modelo Cero tiene menor RMSE en TEST.")
    else:
        print("Ambos modelos tienen el mismo RMSE.")

    # Precision direccional:
    # subida si rendimiento > 0,
    # bajada si rendimiento < 0.
    # Las predicciones exactamente cero
    # se consideran sin direccion.
    signos_reales = np.sign(y_real)
    signos_predichos = np.sign(y_pred)

    aciertos = signos_reales == signos_predichos

    precision_direccional = (
        float(np.mean(aciertos)) * 100
    )

    print(
        "Precision direccional LSTM:",
        f"{precision_direccional:.4f}%"
    )

    # El modelo Cero no predice subida ni bajada.
    # No se le asigna artificialmente una direccion.

    fechas = conjuntos["fechas_test"]

    detalle = pd.DataFrame({
        "fecha_emision": fechas.dt.strftime(
            "%Y-%m-%d"
        ).to_numpy(),
        "fecha_objetivo": (
            fechas + pd.Timedelta(days=1)
        ).dt.strftime("%Y-%m-%d").to_numpy(),
        "rendimiento_real": y_real,
        "prediccion_lstm": y_pred,
        "prediccion_cero": y_cero,
        "error_lstm": y_pred - y_real,
        "error_cero": y_cero - y_real,
        "direccion_correcta_lstm": aciertos,
    })

    resumen = pd.DataFrame([
        {
            "modelo": "LSTM_32",
            "mae": metricas_lstm["mae"],
            "rmse": metricas_lstm["rmse"],
            "sesgo": metricas_lstm["sesgo"],
            "precision_direccional": (
                precision_direccional
            ),
        },
        {
            "modelo": "Cero",
            "mae": metricas_cero["mae"],
            "rmse": metricas_cero["rmse"],
            "sesgo": metricas_cero["sesgo"],
            "precision_direccional": np.nan,
        },
    ])

    CARPETA_RESULTADOS.mkdir(
        parents=True,
        exist_ok=True
    )

    ruta_detalle = (
        CARPETA_RESULTADOS
        / "predicciones_test_lstm32.csv"
    )

    ruta_resumen = (
        CARPETA_RESULTADOS
        / "evaluacion_final_lstm32.csv"
    )

    detalle.to_csv(
        ruta_detalle,
        index=False,
    )

    resumen.to_csv(
        ruta_resumen,
        index=False,
    )

    print("\n=== ARCHIVOS GENERADOS ===")
    print(ruta_detalle)
    print(ruta_resumen)

    print("\nEVALUACION FINALIZADA")
    print("No se modificaron modelos originales.")
    print("No se modifico el capital virtual.")
    print("No se realizaron operaciones reales.")


if __name__ == "__main__":
    main()
