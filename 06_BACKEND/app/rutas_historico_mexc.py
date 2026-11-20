
"""
Historial diario de criptomonedas desde MEXC.

Consulta velas publicas OHLCV para el activo seleccionado.
No modifica la base de datos ni ejecuta operaciones.
"""

import math
import time
from datetime import datetime, timezone
from threading import Lock
from urllib.error import HTTPError, URLError

from fastapi import APIRouter, HTTPException, Query

from mexc_tiempo_real import (
    normalizar_simbolo,
    solicitar_json,
)


router = APIRouter(
    prefix="/api/mexc",
    tags=["Historial de mercado MEXC"],
)

CACHE_SEGUNDOS = 60
_cache = {}
_bloqueo = Lock()


@router.get("/historico")
def obtener_historico_mexc(
    simbolo: str = Query(
        default="BTCUSDT",
        min_length=2,
        max_length=30,
    ),
    limite: int = Query(
        default=100,
        ge=20,
        le=500,
    ),
):
    """
    Obtiene velas diarias reales del par solicitado.

    Cada registro contiene:
    fecha, open, high, low, close y volume.
    """

    try:
        simbolo = normalizar_simbolo(simbolo)
    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        ) from error

    clave = (simbolo, limite)
    ahora = time.monotonic()

    with _bloqueo:
        entrada_cache = _cache.get(clave)

        if (
            entrada_cache is not None
            and ahora - entrada_cache["momento"]
            < CACHE_SEGUNDOS
        ):
            return entrada_cache["resultado"]

    try:
        velas = solicitar_json(
            "klines",
            {
                "symbol": simbolo,
                "interval": "1d",
                "limit": limite,
            },
        )

        if not isinstance(velas, list):
            raise ValueError(
                "MEXC no devolvio una lista de velas."
            )

        precios = []

        for vela in velas:
            if (
                not isinstance(vela, list)
                or len(vela) < 6
            ):
                continue

            apertura = float(vela[1])
            maximo = float(vela[2])
            minimo = float(vela[3])
            cierre = float(vela[4])
            volumen = float(vela[5])

            valores = [
                apertura,
                maximo,
                minimo,
                cierre,
                volumen,
            ]

            if not all(
                math.isfinite(valor)
                for valor in valores
            ):
                continue

            if (
                min(
                    apertura,
                    maximo,
                    minimo,
                    cierre,
                ) <= 0
                or volumen < 0
            ):
                continue

            fecha = datetime.fromtimestamp(
                int(vela[0]) / 1000,
                tz=timezone.utc,
            ).isoformat()

            precios.append({
                "fecha": fecha,
                "open": apertura,
                "high": maximo,
                "low": minimo,
                "close": cierre,
                "volume": volumen,
            })

        precios.sort(
            key=lambda registro: registro["fecha"]
        )

        if not precios:
            raise ValueError(
                "No hay velas validas para este activo."
            )

        resultado = {
            "status": "ok",
            "fuente": "MEXC",
            "activo": simbolo,
            "intervalo": "1d",
            "total": len(precios),
            "precios": precios,
            "fecha_consulta_utc": (
                datetime.now(
                    timezone.utc
                ).isoformat()
            ),
            "operaciones_reales": False,
        }

        with _bloqueo:
            _cache[clave] = {
                "momento": time.monotonic(),
                "resultado": resultado,
            }

        return resultado

    except (
        HTTPError,
        URLError,
        TimeoutError,
        ValueError,
        KeyError,
        TypeError,
        OverflowError,
    ) as error:
        raise HTTPException(
            status_code=503,
            detail={
                "mensaje": (
                    "No fue posible obtener "
                    "el historial de MEXC."
                ),
                "simbolo": simbolo,
                "detalle": str(error),
            },
        ) from error
