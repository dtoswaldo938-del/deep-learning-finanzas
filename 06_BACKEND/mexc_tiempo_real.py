
import json
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


URL_MEXC = (
    "https://api.mexc.com/api/v3/ticker/price"
    "?symbol=BTCUSDT"
)


def consultar_precio_mexc():
    """Consulta el precio público de BTCUSDT en MEXC."""

    solicitud = Request(
        URL_MEXC,
        headers={"User-Agent": "ProyectoDLFinanzas/1.0"}
    )

    try:
        with urlopen(solicitud, timeout=10) as respuesta:
            datos = json.load(respuesta)

        if datos.get("symbol") != "BTCUSDT":
            raise ValueError("MEXC devolvió un símbolo inesperado.")

        precio = float(datos["price"])

        if not (0 < precio < float("inf")):
            raise ValueError("MEXC devolvió un precio inválido.")

        return {
            "status": "ok",
            "fuente": "MEXC",
            "activo": "BTCUSDT",
            "precio": precio,
            "fecha_consulta_utc": datetime.now(
                timezone.utc
            ).isoformat(),
            "operaciones_reales": False
        }

    except (HTTPError, URLError, TimeoutError) as error:
        return {
            "status": "error",
            "mensaje": str(error),
            "operaciones_reales": False
        }

    except (ValueError, KeyError, TypeError) as error:
        return {
            "status": "error",
            "mensaje": str(error),
            "operaciones_reales": False
        }


if __name__ == "__main__":
    resultado = consultar_precio_mexc()
    print(json.dumps(resultado, indent=4, ensure_ascii=False))
