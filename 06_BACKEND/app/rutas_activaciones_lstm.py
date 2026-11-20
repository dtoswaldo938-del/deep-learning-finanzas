
"""
Endpoint de activaciones internas de LSTM-A.

Consulta la salida oculta real del modelo entrenado.
No modifica los pesos ni registra operaciones.
"""

from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool

from activaciones_lstm_mexc import obtener_activaciones_lstm


router = APIRouter(
    prefix="/api/lstm",
    tags=["LSTM Neural Visualization"],
)


@router.get("/activaciones")
async def consultar_activaciones():
    try:
        resultado = await run_in_threadpool(
            obtener_activaciones_lstm
        )

        return resultado

    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail=(
                "No fue posible obtener las activaciones "
                "del modelo LSTM-A."
            ),
        ) from error
