
from pathlib import Path

import joblib
import numpy as np

from preparar_entrenamiento import preparar_conjuntos


BASE = Path(__file__).resolve().parent
CARPETA_MODELOS = BASE / "modelos"

RUTA_SALIDA = (
    CARPETA_MODELOS
    / "escaladores_experimentales.joblib"
)


def main():
    print("=== ESCALADORES EXPERIMENTALES ===")

    conjuntos = preparar_conjuntos()

    scaler_X = conjuntos["scaler_X"]
    scaler_y = conjuntos["scaler_y"]

    print("Variables X:", scaler_X.n_features_in_)
    print("Variables y:", scaler_y.n_features_in_)

    # Comprobamos que los datos de entrenamiento
    # tienen media aproximadamente cero.
    X_train = conjuntos["X_train"]
    y_train = conjuntos["y_train"]

    medias_X = X_train.mean(axis=0)
    media_y = float(y_train.mean())

    print(
        "Mayor media absoluta X:",
        float(np.max(np.abs(medias_X)))
    )
    print("Media y escalada:", media_y)

    assert scaler_X.n_features_in_ == 20
    assert scaler_y.n_features_in_ == 1

    objetos = {
        "scaler_X": scaler_X,
        "scaler_y": scaler_y,
        "columnas_originales": [
            f"lag_{i}" for i in range(20)
        ],
        "orden_lstm": "antiguo_a_reciente",
        "semilla": 42,
        "tipo": "experimento_academico",
    }

    CARPETA_MODELOS.mkdir(
        parents=True,
        exist_ok=True
    )

    joblib.dump(objetos, RUTA_SALIDA)

    # Comprobamos que el archivo se pueda recuperar.
    recuperados = joblib.load(RUTA_SALIDA)

    assert (
        recuperados["scaler_X"].n_features_in_
        == 20
    )
    assert (
        recuperados["scaler_y"].n_features_in_
        == 1
    )

    print("\nArchivo guardado:")
    print(RUTA_SALIDA)

    print("\nESCALADORES VERIFICADOS")
    print("No se modificaron los modelos LSTM.")
    print("No se modifico la base SQLite.")


if __name__ == "__main__":
    main()
