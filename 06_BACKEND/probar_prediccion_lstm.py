
from pathlib import Path

import joblib
import numpy as np
import torch
from torch import nn
import csv

BASE = Path(__file__).resolve().parent
DATOS = BASE / "data" / "procesado_ventanas_BTCUSDT_1d_simples.csv"
MODELO = BASE / "modelos" / "lstm_a_cap11.pt"
ESCALADORES = BASE / "modelos" / "modelos_clasicos_y_escaladores.joblib"

class ModeloLSTM(nn.Module):
    def __init__(self, input_size=1, hidden_size=32):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            batch_first=True,
        )
        self.fc = nn.Linear(hidden_size, 1)

    def forward(self, x):
        salida, _ = self.lstm(x)
        return self.fc(salida[:, -1, :])

with DATOS.open(encoding="utf-8-sig", newline="") as archivo:
    filas = list(csv.DictReader(archivo))

ultima = filas[-1]
columnas = [f"lag_{i}" for i in range(20)]

valores = np.array(
    [[float(ultima[col]) for col in columnas]],
    dtype=np.float32,
)

objetivo_real = float(ultima["target"])

objetos = joblib.load(ESCALADORES)
scaler_x = objetos["scaler_lags"]
scaler_y = objetos["scaler_y"]

entrada_escalada = scaler_x.transform(valores)
entrada_tensor = torch.tensor(
    entrada_escalada[:, :, None],
    dtype=torch.float32,
)

checkpoint = torch.load(
    MODELO,
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
    prediccion_escalada = modelo(entrada_tensor).numpy()

prediccion = float(
    scaler_y.inverse_transform(prediccion_escalada)[0, 0]
)

error_absoluto = abs(objetivo_real - prediccion)

print("\n=== PREDICCION HISTORICA LSTM-A ===")
print("Fecha de emision:", ultima["fecha_emision"])
print("Fecha objetivo:", ultima["fecha_objetivo"])
print("Forma de entrada:", tuple(entrada_tensor.shape))
print(f"Rendimiento estimado: {prediccion:.10f}")
print(f"Rendimiento observado: {objetivo_real:.10f}")
print(f"Error absoluto: {error_absoluto:.10f}")
print("=== PRUEBA FINALIZADA ===")