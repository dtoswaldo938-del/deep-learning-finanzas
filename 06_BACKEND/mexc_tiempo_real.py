
"""
Consultas publicas de mercado a MEXC.

Permite:
- Consultar precios de diferentes pares.
- Obtener el catalogo de pares disponibles.
- Mantener BTCUSDT como activo predeterminado.

No requiere claves privadas ni ejecuta operaciones.
"""

import json
import math
import re
import time

from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


BASE_URL = "https://api.mexc.com/api/v3"

ACTIVO_PREDETERMINADO = "BTCUSDT"

# Compatibilidad con codigo anterior.
URL_MEXC = (
    f"{BASE_URL}/ticker/price"
    f"?symbol={ACTIVO_PREDETERMINADO}"
)

# Evita solicitar el catalogo completo a MEXC
# en cada consulta del frontend.
DURACION_CACHE_SEGUNDOS = 300

_cache_catalogo = {
    "fecha": 0.0,
    "datos": None,
}


def normalizar_simbolo(simbolo):
    """
    Valida un simbolo de mercado.

    Ejemplos:
    BTCUSDT, ETHUSDT, SOLUSDT.
    """

    if not isinstance(simbolo, str):
        raise ValueError(
            "El simbolo debe ser texto."
        )

    simbolo = simbolo.strip().upper()

    if not re.fullmatch(
        r"[A-Z0-9]{2,30}",
        simbolo,
    ):
        raise ValueError(
            "El simbolo contiene caracteres invalidos."
        )

    return simbolo


def solicitar_json(ruta, parametros=None):
    """
    Consulta un endpoint publico de MEXC.
    """

    url = f"{BASE_URL}/{ruta.lstrip('/')}"

    if parametros:
        url += "?" + urlencode(parametros)

    solicitud = Request(
        url,
        headers={
            "User-Agent": "ProyectoDLFinanzas/1.0",
            "Accept": "application/json",
        },
    )

    with urlopen(
        solicitud,
        timeout=15,
    ) as respuesta:
        return json.load(respuesta)


def consultar_precio_mexc(
    simbolo=ACTIVO_PREDETERMINADO,
):
    """
    Consulta el precio publico de un par MEXC.

    Por compatibilidad, sin argumentos consulta BTCUSDT.
    """

    try:
        simbolo = normalizar_simbolo(simbolo)

        datos = solicitar_json(
            "ticker/price",
            {"symbol": simbolo},
        )

        if not isinstance(datos, dict):
            raise ValueError(
                "MEXC devolvio un formato inesperado."
            )

        simbolo_recibido = datos.get("symbol")

        if simbolo_recibido != simbolo:
            raise ValueError(
                "MEXC devolvio un simbolo inesperado."
            )

        precio = float(datos["price"])

        if (
            not math.isfinite(precio)
            or precio <= 0
        ):
            raise ValueError(
                "MEXC devolvio un precio invalido."
            )

        return {
            "status": "ok",
            "fuente": "MEXC",
            "activo": simbolo,
            "precio": precio,
            "fecha_consulta_utc": (
                datetime.now(
                    timezone.utc
                ).isoformat()
            ),
            "operaciones_reales": False,
        }

    except (
        HTTPError,
        URLError,
        TimeoutError,
        ValueError,
        KeyError,
        TypeError,
        OverflowError,
    ) as error:
        return {
            "status": "error",
            "mensaje": str(error),
            "operaciones_reales": False,
        }


def consultar_catalogo_mexc():
    """
    Obtiene los pares disponibles en MEXC.

    Utiliza el endpoint publico exchangeInfo
    y guarda temporalmente el resultado.
    """

    ahora = time.monotonic()

    if (
        _cache_catalogo["datos"] is not None
        and ahora - _cache_catalogo["fecha"]
        < DURACION_CACHE_SEGUNDOS
    ):
        return _cache_catalogo["datos"]

    try:
        respuesta = solicitar_json(
            "exchangeInfo"
        )

        if not isinstance(respuesta, dict):
            raise ValueError(
                "Respuesta de catalogo invalida."
            )

        simbolos = respuesta.get("symbols")

        if not isinstance(simbolos, list):
            raise ValueError(
                "MEXC no devolvio una lista de pares."
            )

        pares = []

        for elemento in simbolos:
            if not isinstance(elemento, dict):
                continue

            simbolo = elemento.get("symbol")
            base = elemento.get("baseAsset")
            cotizacion = elemento.get("quoteAsset")

            if not all(
                isinstance(valor, str)
                for valor in (
                    simbolo,
                    base,
                    cotizacion,
                )
            ):
                continue

            # Excluir pares expresamente inactivos.
            estado = elemento.get("status")

            if estado in (
                "BREAK",
                "HALT",
                "DELISTED",
            ):
                continue

            # Si MEXC informa que el comercio
            # al contado esta deshabilitado,
            # no ofrecer ese par como seleccionable.
            if (
                elemento.get(
                    "isSpotTradingAllowed"
                ) is False
            ):
                continue

            pares.append({
                "simbolo": simbolo,
                "activo_base": base,
                "moneda_cotizacion": cotizacion,
                "nombre": f"{base}/{cotizacion}",
            })

        pares.sort(
            key=lambda par: (
                par["moneda_cotizacion"] != "USDT",
                par["simbolo"] != "BTCUSDT",
                par["simbolo"],
            )
        )

        resultado = {
            "status": "ok",
            "fuente": "MEXC",
            "total": len(pares),
            "pares": pares,
            "fecha_consulta_utc": (
                datetime.now(
                    timezone.utc
                ).isoformat()
            ),
            "operaciones_reales": False,
        }

        _cache_catalogo["datos"] = resultado
        _cache_catalogo["fecha"] = ahora

        return resultado

    except (
        HTTPError,
        URLError,
        TimeoutError,
        ValueError,
        KeyError,
        TypeError,
    ) as error:
        return {
            "status": "error",
            "mensaje": str(error),
            "operaciones_reales": False,
        }


if __name__ == "__main__":
    print("PRUEBA DE PRECIOS MEXC")

    for simbolo in (
        "BTCUSDT",
        "ETHUSDT",
        "SOLUSDT",
    ):
        resultado = consultar_precio_mexc(
            simbolo
        )

        print(
            json.dumps(
                resultado,
                indent=4,
                ensure_ascii=False,
            )
        )
