
from pathlib import Path

import torch
from torch import nn


RUTA = (
    Path(__file__).resolve().parent
    / "modelos"
    / "lstm_a_cap11.pt"
)

print("=== VERIFICACIÓN DEL MODELO LSTM-A ===")

checkpoint = torch.load(
    RUTA,
    map_location="cpu",
    weights_only=True,
)

config = checkpoint["model_config"]

print("\nCONFIGURACIÓN ORIGINAL:")
print(config)

input_size = int(config["input_size"])
hidden_size = int(config["hidden_size"])


class ModeloLSTM(nn.Module):
    def __init__(self, entrada, ocultas):
        super().__init__()

        self.lstm = nn.LSTM(
            input_size=entrada,
            hidden_size=ocultas,
            batch_first=True,
        )

        self.fc = nn.Linear(ocultas, 1)

    def forward(self, x):
        salida, _ = self.lstm(x)
        ultimo_paso = salida[:, -1, :]
        return self.fc(ultimo_paso)


modelo = ModeloLSTM(
    entrada=input_size,
    ocultas=hidden_size,
)

modelo.load_state_dict(
    checkpoint["model_state_dict"],
    strict=True,
)

modelo.eval()

print("\nARQUITECTURA RECONSTRUIDA:")
print(modelo)

print("\nPRUEBA TÉCNICA:")

# Entrada artificial únicamente para verificar funcionamiento.
# No representa información financiera real.
entrada_prueba = torch.zeros(
    (1, 20, input_size),
    dtype=torch.float32,
)

with torch.no_grad():
    prediccion = modelo(entrada_prueba)

print("Forma de entrada:", tuple(entrada_prueba.shape))
print("Forma de salida:", tuple(prediccion.shape))
print("Valor de prueba:", prediccion.item())

assert prediccion.shape == (1, 1)
assert torch.isfinite(prediccion).all()

print("\nMODELO LSTM-A CARGADO CORRECTAMENTE")
print("PRUEBA TÉCNICA SUPERADA")
