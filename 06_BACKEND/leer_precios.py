
from pathlib import Path
import csv

# Ubicación del archivo CSV
BASE_DIR = Path(__file__).resolve().parent
ARCHIVO_CSV = BASE_DIR / "data" / "BTCUSDT_1d_velas_cerradas.csv"


def leer_precios():
    """Lee los precios históricos de Bitcoin."""

    if not ARCHIVO_CSV.exists():
        raise FileNotFoundError(
            f"No se encontró el archivo: {ARCHIVO_CSV}"
        )

    with open(ARCHIVO_CSV, "r", encoding="utf-8-sig", newline="") as archivo:
        lector = csv.DictReader(archivo)
        precios = list(lector)

    return precios


if __name__ == "__main__":
    precios = leer_precios()

    print("=== DATOS HISTÓRICOS DE BITCOIN ===")
    print(f"Total de registros: {len(precios)}")

    if precios:
        print("\nColumnas disponibles:")
        print(list(precios[0].keys()))

        print("\nPrimer registro:")
        print(precios[0])

        print("\nÚltimo registro:")
        print(precios[-1])
