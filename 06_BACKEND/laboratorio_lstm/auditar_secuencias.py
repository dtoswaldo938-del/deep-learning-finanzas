
from pathlib import Path

import numpy as np
import pandas as pd


BASE = Path(__file__).resolve().parents[1]

RUTA_DATOS = (
    BASE
    / "data"
    / "procesado_ventanas_BTCUSDT_1d_simples.csv"
)


def main():
    print("=== LABORATORIO LSTM ===")
    print("Auditoria de secuencias temporales\n")

    datos = pd.read_csv(RUTA_DATOS)

    columnas = [f"lag_{i}" for i in range(20)]

    X = datos[columnas].to_numpy(dtype=np.float32)
    y = datos["target"].to_numpy(dtype=np.float32)

    print("Ventanas:", len(datos))
    print("Forma original X:", X.shape)
    print("Forma original y:", y.shape)

    # lag_0 es el rendimiento mas reciente.
    # Invertimos para representar:
    # pasado lejano -> pasado reciente.
    X_cronologico = X[:, ::-1].copy()

    # Formato esperado por PyTorch con batch_first=True:
    # (muestras, pasos_temporales, variables)
    X_lstm = X_cronologico.reshape(-1, 20, 1)

    print("\nForma para LSTM:", X_lstm.shape)

    primera_original = X[0]
    primera_cronologica = X_lstm[0, :, 0]

    print("\nPrimera ventana:")
    print("lag_19:", primera_original[19])
    print("Primer paso LSTM:", primera_cronologica[0])
    print("lag_0:", primera_original[0])
    print("Ultimo paso LSTM:", primera_cronologica[-1])

    assert X_lstm.shape == (len(datos), 20, 1)
    assert np.allclose(
        X_lstm[:, 0, 0],
        datos["lag_19"].to_numpy()
    )
    assert np.allclose(
        X_lstm[:, -1, 0],
        datos["lag_0"].to_numpy()
    )

    print("\nAUDITORIA CORRECTA")
    print("Orden: pasado lejano -> pasado reciente")
    print("No se modificaron datos ni modelos.")


if __name__ == "__main__":
    main()
