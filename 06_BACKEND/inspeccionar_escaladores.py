
from pathlib import Path
import joblib

ruta = Path(__file__).resolve().parent / "modelos" / "modelos_clasicos_y_escaladores.joblib"

print("=== INSPECCIÓN DE MODELOS Y ESCALADORES ===")

if not ruta.exists():
    raise FileNotFoundError(f"No existe el archivo: {ruta}")

contenido = joblib.load(ruta)

print("\nTipo de contenido:")
print(type(contenido).__name__)

if isinstance(contenido, dict):
    print("\nElementos encontrados:")

    for nombre, objeto in contenido.items():
        print(f"\nNombre: {nombre}")
        print(f"Tipo: {type(objeto).__name__}")

        if hasattr(objeto, "n_features_in_"):
            print("Número de características:", objeto.n_features_in_)

        if hasattr(objeto, "feature_names_in_"):
            print("Características:", list(objeto.feature_names_in_))

        if isinstance(objeto, dict):
            print("Claves internas:", list(objeto.keys()))

else:
    print("\nContenido:")
    print(contenido)

print("\n=== INSPECCIÓN FINALIZADA ===")
