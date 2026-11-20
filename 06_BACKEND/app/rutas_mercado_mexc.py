
"""
Rutas publicas de mercado de MEXC.

Proporciona:
- Catalogo de pares disponibles.
- Precio del par seleccionado.

No ejecuta operaciones ni requiere credenciales.
"""

from fastapi import APIRouter, HTTPException, Query

from mexc_tiempo_real import (
    consultar_catalogo_mexc,
    consultar_precio_mexc,
    normalizar_simbolo,
)


router = APIRouter(
    prefix="/api/mexc",
    tags=["Mercado MEXC"],
)


@router.get("/catalogo")
def obtener_catalogo_mexc():
    """Devuelve los pares disponibles en MEXC."""

    resultado = consultar_catalogo_mexc()

    if resultado["status"] != "ok":
        raise HTTPException(
            status_code=503,
            detail={
                "mensaje": "No fue posible consultar el catálogo.",
                "detalle": resultado.get("mensaje"),
            },
        )

    return resultado


@router.get("/precio-por-simbolo")
def obtener_precio_por_simbolo(
    simbolo: str = Query(
        default="BTCUSDT",
        min_length=2,
        max_length=30,
    ),
):
    """Devuelve el precio del símbolo solicitado."""

    try:
        simbolo_validado = normalizar_simbolo(
            simbolo
        )
    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        ) from error

    resultado = consultar_precio_mexc(
        simbolo_validado
    )

    if resultado["status"] != "ok":
        raise HTTPException(
            status_code=503,
            detail={
                "mensaje": (
                    "No fue posible consultar "
                    "el precio del activo."
                ),
                "simbolo": simbolo_validado,
                "detalle": resultado.get("mensaje"),
            },
        )

    return resultado

# Monitor comparativo: datos publicos, sin ejecucion de operaciones.
import json as _monitor_json
import time as _monitor_time
from urllib.request import Request as _MonitorRequest
from urllib.request import urlopen as _monitor_urlopen

_MONITOR_CACHE = {"instante": 0.0, "datos": None}


@router.get("/monitor-general")
def monitor_general_mexc():
    ahora = _monitor_time.time()
    if (_MONITOR_CACHE["datos"] is not None
            and ahora - _MONITOR_CACHE["instante"] < 15):
        return _MONITOR_CACHE["datos"]

    url = "https://api.mexc.com/api/v3/ticker/24hr"
    try:
        solicitud = _MonitorRequest(
            url,
            headers={"User-Agent": "NeuralFinanceAcademic/1.0"},
        )
        with _monitor_urlopen(solicitud, timeout=15) as respuesta:
            datos = _monitor_json.load(respuesta)

        if not isinstance(datos, list):
            raise ValueError("MEXC no devolvio una lista de activos")

        filas = []
        for item in datos:
            simbolo = str(item.get("symbol", ""))
            if not simbolo.endswith("USDT"):
                continue

            try:
                precio = float(item.get("lastPrice", 0))
                cambio = float(item.get("priceChangePercent", 0)) * 100
                volumen = float(item.get("quoteVolume", 0))
            except (ValueError, TypeError):
                continue

            if precio <= 0:
                continue

            if cambio >= 0.5:
                estado = "Impulso alcista 24h"
                senal = "VIGILAR COMPRA"
                explicacion = "El precio presenta una variacion positiva de al menos 0.5% en 24 horas."
            elif cambio <= -0.5:
                estado = "Presion bajista 24h"
                senal = "VIGILAR VENTA"
                explicacion = "El precio presenta una variacion negativa de al menos 0.5% en 24 horas."
            else:
                estado = "Movimiento lateral 24h"
                senal = "ESPERAR"
                explicacion = "El movimiento de 24 horas es inferior a 0.5% en valor absoluto."

            filas.append({
                "simbolo": simbolo,
                "precio": precio,
                "cambio_24h": cambio,
                "volumen_usdt_24h": volumen,
                "estado": estado,
                "senal": senal,
                "explicacion": explicacion,
                "modelo_lstm": simbolo in {
                    "BTCUSDT", "ETHUSDT", "SOLUSDT",
                    "ADAUSDT", "LINKUSDT", "XRPUSDT",
                    "0GUSDT", "AAPLONUSDT", "ACEUSDT",
                },
            })

        filas.sort(key=lambda fila: fila["volumen_usdt_24h"], reverse=True)

        resultado = {
            "status": "ok",
            "total": len(filas),
            "actualizado_unix": ahora,
            "criterio": "Variacion de precio en 24 horas",
            "activos": filas,
        }
        _MONITOR_CACHE["datos"] = resultado
        _MONITOR_CACHE["instante"] = ahora
        return resultado

    except Exception as error:
        if _MONITOR_CACHE["datos"] is not None:
            return {
                **_MONITOR_CACHE["datos"],
                "status": "cache",
                "advertencia": "MEXC no disponible; datos anteriores",
            }
        raise HTTPException(
            status_code=503,
            detail=f"No se pudo consultar MEXC: {error}",
        ) from error
