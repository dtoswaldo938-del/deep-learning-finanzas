
from copy import deepcopy
from pathlib import Path
import random

import numpy as np
import pandas as pd
import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

from preparar_entrenamiento import preparar_conjuntos


CARPETA = Path(__file__).resolve().parent
CARPETA_MODELOS = CARPETA / "modelos"
CARPETA_RESULTADOS = CARPETA / "resultados"

SEMILLA = 42
EPOCAS_MAXIMAS = 20
PACIENCIA = 5
BATCH_SIZE = 32

EXPERIMENTOS = [
    {
        "nombre": "LSTM_16",
        "hidden_size": 16,
        "num_layers": 1,
        "learning_rate": 0.001,
    },
    {
        "nombre": "LSTM_32",
        "hidden_size": 32,
        "num_layers": 1,
        "learning_rate": 0.001,
    },
    {
        "nombre": "LSTM_64_2CAPAS",
        "hidden_size": 64,
        "num_layers": 2,
        "learning_rate": 0.001,
    },
]


def establecer_semilla():
    random.seed(SEMILLA)
    np.random.seed(SEMILLA)
    torch.manual_seed(SEMILLA)


class RedLSTM(nn.Module):
    def __init__(self, hidden_size, num_layers):
        super().__init__()

        self.lstm = nn.LSTM(
            input_size=1,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
        )

        self.salida = nn.Linear(hidden_size, 1)

    def forward(self, x):
        secuencia, _ = self.lstm(x)
        ultimo_paso = secuencia[:, -1, :]
        return self.salida(ultimo_paso)


def calcular_metricas(y_real, y_pred):
    errores = y_real - y_pred

    mae = float(np.mean(np.abs(errores)))
    rmse = float(np.sqrt(np.mean(errores ** 2)))

    return mae, rmse


def evaluar_modelo(modelo, X, y, scaler_y):
    modelo.eval()

    with torch.no_grad():
        pred_escalada = modelo(X).cpu().numpy()

    y_real = scaler_y.inverse_transform(
        y.cpu().numpy()
    ).ravel()

    y_pred = scaler_y.inverse_transform(
        pred_escalada
    ).ravel()

    return calcular_metricas(y_real, y_pred)


def entrenar_modelo(config, conjuntos):
    establecer_semilla()

    X_train = torch.from_numpy(conjuntos["X_train"])
    y_train = torch.from_numpy(conjuntos["y_train"])

    X_val = torch.from_numpy(conjuntos["X_val"])
    y_val = torch.from_numpy(conjuntos["y_val"])

    dataset = TensorDataset(X_train, y_train)

    generador = torch.Generator()
    generador.manual_seed(SEMILLA)

    cargador = DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        generator=generador,
        num_workers=0,
    )

    modelo = RedLSTM(
        hidden_size=config["hidden_size"],
        num_layers=config["num_layers"],
    )

    optimizador = torch.optim.Adam(
        modelo.parameters(),
        lr=config["learning_rate"],
    )

    funcion_perdida = nn.MSELoss()

    mejor_rmse = float("inf")
    mejor_epoca = 0
    mejor_estado = None
    epocas_sin_mejora = 0

    historial = []

    print(f"\n=== {config['nombre']} ===", flush=True)

    for epoca in range(1, EPOCAS_MAXIMAS + 1):
        modelo.train()
        perdidas = []

        for X_lote, y_lote in cargador:
            optimizador.zero_grad()

            predicciones = modelo(X_lote)
            perdida = funcion_perdida(
                predicciones,
                y_lote
            )

            perdida.backward()

            torch.nn.utils.clip_grad_norm_(
                modelo.parameters(),
                max_norm=1.0,
            )

            optimizador.step()
            perdidas.append(float(perdida.item()))

        mae_val, rmse_val = evaluar_modelo(
            modelo,
            X_val,
            y_val,
            conjuntos["scaler_y"],
        )

        perdida_train = float(np.mean(perdidas))

        historial.append({
            "modelo": config["nombre"],
            "epoca": epoca,
            "perdida_train_escalada": perdida_train,
            "mae_val": mae_val,
            "rmse_val": rmse_val,
        })

        print(
            f"Epoca {epoca:02d} | "
            f"Loss train: {perdida_train:.6f} | "
            f"MAE val: {mae_val:.6f} | "
            f"RMSE val: {rmse_val:.6f}",
            flush=True,
        )

        if rmse_val < mejor_rmse:
            mejor_rmse = rmse_val
            mejor_epoca = epoca
            mejor_estado = deepcopy(
                modelo.state_dict()
            )
            epocas_sin_mejora = 0
        else:
            epocas_sin_mejora += 1

        if epocas_sin_mejora >= PACIENCIA:
            print("Early stopping activado.")
            break

    modelo.load_state_dict(mejor_estado)

    mae_final, rmse_final = evaluar_modelo(
        modelo,
        X_val,
        y_val,
        conjuntos["scaler_y"],
    )

    ruta_modelo = (
        CARPETA_MODELOS
        / f"{config['nombre']}_experimental.pt"
    )

    torch.save({
        "model_state_dict": modelo.state_dict(),
        "model_config": {
            "input_size": 1,
            "hidden_size": config["hidden_size"],
            "num_layers": config["num_layers"],
        },
        "seed": SEMILLA,
        "mejor_epoca": mejor_epoca,
        "orden_temporal": "antiguo_a_reciente",
        "nota": (
            "Modelo experimental. "
            "No sustituye LSTM-A original."
        ),
    }, ruta_modelo)

    resultado = {
        "modelo": config["nombre"],
        "hidden_size": config["hidden_size"],
        "num_layers": config["num_layers"],
        "learning_rate": config["learning_rate"],
        "mejor_epoca": mejor_epoca,
        "mae_val": mae_final,
        "rmse_val": rmse_final,
        "ruta_modelo": str(ruta_modelo),
    }

    return resultado, historial


def main():
    CARPETA_MODELOS.mkdir(
        parents=True,
        exist_ok=True
    )
    CARPETA_RESULTADOS.mkdir(
        parents=True,
        exist_ok=True
    )

    # Evita usar demasiados hilos en una PC normal.
    torch.set_num_threads(2)

    conjuntos = preparar_conjuntos()

    print("=== LABORATORIO DE ENTRENAMIENTO LSTM ===")
    print("Activo: BTCUSDT")
    print("Datos de entrenamiento:", len(conjuntos["X_train"]))
    print("Datos de validacion:", len(conjuntos["X_val"]))
    print("Datos de prueba: RESERVADOS")
    print("Capital real utilizado: $0 MXN")
    print("Semilla:", SEMILLA)

    # Referencia: predecir siempre rendimiento cero.
    y_val_real = conjuntos[
        "scaler_y"
    ].inverse_transform(
        conjuntos["y_val"]
    ).ravel()

    pred_cero = np.zeros_like(y_val_real)

    mae_cero, rmse_cero = calcular_metricas(
        y_val_real,
        pred_cero,
    )

    print("\n=== MODELO DE REFERENCIA CERO ===")
    print(f"MAE validacion: {mae_cero:.6f}")
    print(f"RMSE validacion: {rmse_cero:.6f}")

    resultados = []
    historial_completo = []

    for config in EXPERIMENTOS:
        resultado, historial = entrenar_modelo(
            config,
            conjuntos,
        )

        resultados.append(resultado)
        historial_completo.extend(historial)

    tabla = pd.DataFrame(resultados)

    tabla = tabla.sort_values(
        "rmse_val"
    ).reset_index(drop=True)

    ruta_resultados = (
        CARPETA_RESULTADOS
        / "comparacion_arquitecturas.csv"
    )

    ruta_historial = (
        CARPETA_RESULTADOS
        / "historial_entrenamiento.csv"
    )

    tabla.to_csv(
        ruta_resultados,
        index=False,
    )

    pd.DataFrame(historial_completo).to_csv(
        ruta_historial,
        index=False,
    )

    print("\n=== COMPARACION FINAL DE VALIDACION ===")
    print(
        tabla[
            [
                "modelo",
                "hidden_size",
                "num_layers",
                "mejor_epoca",
                "mae_val",
                "rmse_val",
            ]
        ].to_string(index=False)
    )

    mejor = tabla.iloc[0]

    print("\n=== MEJOR ARQUITECTURA EXPERIMENTAL ===")
    print("Modelo:", mejor["modelo"])
    print("RMSE validacion:", f"{mejor['rmse_val']:.6f}")
    print("RMSE referencia Cero:", f"{rmse_cero:.6f}")

    if mejor["rmse_val"] < rmse_cero:
        print(
            "Resultado: supera al modelo Cero "
            "en esta validacion."
        )
    else:
        print(
            "Resultado: no supera al modelo Cero "
            "en esta validacion."
        )

    print("\nArchivos generados:")
    print(ruta_resultados)
    print(ruta_historial)

    print("\nENTRENAMIENTO FINALIZADO")
    print("El conjunto TEST no fue utilizado.")
    print("El modelo LSTM-A original sigue intacto.")
    print("No se realizaron operaciones financieras.")


if __name__ == "__main__":
    main()
