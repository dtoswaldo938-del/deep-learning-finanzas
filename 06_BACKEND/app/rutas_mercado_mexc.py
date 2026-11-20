
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
