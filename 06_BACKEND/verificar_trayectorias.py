
import csv
from pathlib import Path

RUTA = (
    Path(__file__).resolve().parent
    / "data"
    / "cap10"
    / "trayectorias_virtuales_va.csv"
)

with RUTA.open("r", encoding="utf-8-sig", newline="") as archivo:
    registros = list(csv.DictReader(archivo))

print("=== TRAYECTORIAS VIRTUALES - CAPÍTULO 10 ===")
print("Total de registros:", len(registros))
print("Columnas:", list(registros[0].keys()))

politicas = sorted({fila["politica"] for fila in registros})
print("Políticas encontradas:", politicas)

for politica in politicas:
    filas = [f for f in registros if f["politica"] == politica]
    print(
        politica,
        "| Registros:", len(filas),
        "| Capital final:", filas[-1]["capital_virtual"],
    )
