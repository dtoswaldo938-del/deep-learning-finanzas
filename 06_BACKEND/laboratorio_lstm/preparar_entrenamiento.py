
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler


BASE = Path(__file__).resolve().parents[1]

RUTA_DATOS = (
    BASE
    / "data"
    / "procesado_ventanas_BTCUSDT_1d_simples.csv"
)

COLUMNAS = [f"lag_{i}" for i in range(20)]


def preparar_conjuntos():
    datos = pd.read_csv(RUTA_DATOS)

    datos["fecha_emision"] = pd.to_datetime(
        datos["fecha_emision"], utc=True
    )
    datos["fecha_objetivo"] = pd.to_datetime(
        datos["fecha_objetivo"], utc=True
    )

    datos = datos.sort_values(
        "fecha_emision"
    ).reset_index(drop=True)

    X = datos[COLUMNAS].to_numpy(
        dtype=np.float64
    )

    y = datos[["target"]].to_numpy(
        dtype=np.float64
    )

    n = len(datos)

    fin_train = int(n * 0.70)
    fin_val = fin_train + int(n * 0.15)

    # Cada target pertenece al dia posterior a la emision.
    # Se eliminan las filas de frontera cuyos objetivos
    # coincidirian con la siguiente particion.
    indices_train = np.arange(0, fin_train - 1)
    indices_val = np.arange(fin_train, fin_val - 1)
    indices_test = np.arange(fin_val, n)

    escalador_X = StandardScaler()
    escalador_y = StandardScaler()

    X_train = escalador_X.fit_transform(
        X[indices_train]
    )
    y_train = escalador_y.fit_transform(
        y[indices_train]
    )

    X_val = escalador_X.transform(
        X[indices_val]
    )
    y_val = escalador_y.transform(
        y[indices_val]
    )

    X_test = escalador_X.transform(
        X[indices_test]
    )
    y_test = escalador_y.transform(
        y[indices_test]
    )

    def convertir_lstm(matriz):
        # StandardScaler recibe columnas lag_0 ... lag_19.
        # Luego invertimos el orden temporal.
        matriz = matriz[:, ::-1].copy()
        return matriz.reshape(-1, 20, 1).astype(
            np.float32
        )

    return {
        "X_train": convertir_lstm(X_train),
        "y_train": y_train.astype(np.float32),
        "X_val": convertir_lstm(X_val),
        "y_val": y_val.astype(np.float32),
        "X_test": convertir_lstm(X_test),
        "y_test": y_test.astype(np.float32),
        "scaler_X": escalador_X,
        "scaler_y": escalador_y,
        "fechas_train": datos.iloc[
            indices_train
        ]["fecha_emision"],
        "fechas_val": datos.iloc[
            indices_val
        ]["fecha_emision"],
        "fechas_test": datos.iloc[
            indices_test
        ]["fecha_emision"],
    }


if __name__ == "__main__":
    conjuntos = preparar_conjuntos()

    print("=== PREPARACION DE ENTRENAMIENTO ===")

    for nombre in ["train", "val", "test"]:
        X = conjuntos[f"X_{nombre}"]
        y = conjuntos[f"y_{nombre}"]
        fechas = conjuntos[f"fechas_{nombre}"]

        print(f"\n{nombre.upper()}")
        print("X:", X.shape)
        print("y:", y.shape)
        print("Primera fecha:", fechas.iloc[0].date())
        print("Ultima fecha:", fechas.iloc[-1].date())

        assert X.shape[1:] == (20, 1)
        assert y.shape[1:] == (1,)
        assert np.isfinite(X).all()
        assert np.isfinite(y).all()

    print("\nESCALADORES")
    print(
        "Variables de entrada:",
        conjuntos["scaler_X"].n_features_in_
    )
    print(
        "Variables de salida:",
        conjuntos["scaler_y"].n_features_in_
    )

    print("\nPREPARACION CORRECTA")
    print("Sin modificar archivos ni modelos.")
