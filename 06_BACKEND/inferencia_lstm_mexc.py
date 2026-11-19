
import json
from datetime import date, timedelta
from pathlib import Path

import joblib
import numpy as np
import torch
from torch import nn

from preparar_datos_lstm_mexc import preparar_datos_lstm


BASE_DIR = Path(__file__).resolve().parent

RUTA_MODELO = BASE_DIR / "modelos" / "lstm_a_cap11.pt"
RUTA_ESCALADORES = (
    BASE_DIR / "modelos"
    / "modelos_clasicos_y_escaladores.joblib"
)


class ModeloLSTM(nn.Module):
    def __init__(self, input_size=1, hidden_size=32):
        super().__init__()

        self.lstm = nn.LSTM(
            input_size,
            hidden_size,
            batch_first=True,
        )
        self.fc = nn.Linear(hidden_size, 1)

    def forward(self, x):
        salida, _ = self.lstm(x)
        return self.fc(salida[:, -1, :])


def generar_inferencia_lstm_mexc():
    """Genera una inferencia con velas cerradas de MEXC."""

    datos = preparar_datos_lstm()

    columnas = [f"lag_{i}" for i in range(20)]

    valores = np.array(
        [[datos["rezagos"][col] for col in columnas]],
        dtype=np.float32,
    )

    objetos = joblib.load(RUTA_ESCALADORES)

    entrada_escalada = objetos["scaler_lags"].transform(
        valores
    )

    entrada = torch.tensor(
        entrada_escalada[:, :, None],
        dtype=torch.float32,
    )

    checkpoint = torch.load(
        RUTA_MODELO,
        map_location="cpu",
        weights_only=True,
    )

    config = checkpoint["model_config"]

    modelo = ModeloLSTM(
        input_size=config["input_size"],
        hidden_size=config["hidden_size"],
    )

    modelo.load_state_dict(checkpoint["model_state_dict"])
    modelo.eval()

    with torch.no_grad():
        prediccion_escalada = modelo(entrada).numpy()

    rendimiento_estimado = float(
        objetos["scaler_y"].inverse_transform(
            prediccion_escalada
        )[0, 0]
    )

    fecha_emision = date.fromisoformat(
        datos["ultima_vela_cerrada"]
    )

    fecha_objetivo = fecha_emision + timedelta(days=1)

    return {
        "status": "ok",
        "fuente": "MEXC",
        "modelo": "LSTM-A",
        "activo": "BTCUSDT",
        "modo": "inferencia_nueva",
        "fecha_emision": fecha_emision.isoformat(),
        "fecha_objetivo": fecha_objetivo.isoformat(),
        "rendimiento_estimado": rendimiento_estimado,
        "rendimiento_estimado_porcentaje": (
            rendimiento_estimado * 100
        ),
        "direccion_estimacion": (
            "subida" if rendimiento_estimado > 0
            else "bajada" if rendimiento_estimado < 0
            else "sin_cambio"
        ),
        "rendimiento_observado": None,
        "operaciones_reales": False,
    }


if __name__ == "__main__":
    resultado = generar_inferencia_lstm_mexc()
    print(json.dumps(resultado, indent=4, ensure_ascii=False))
