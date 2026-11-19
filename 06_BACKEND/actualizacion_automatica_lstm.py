
import asyncio
import logging
from datetime import datetime, timedelta, timezone

from evaluar_predicciones_lstm import evaluar_predicciones_pendientes


INTERVALO_SEGUNDOS = 30 * 60

logger = logging.getLogger("uvicorn.error")

estado_actualizacion = {
    "activo": False,
    "estado": "sin_iniciar",
    "ultima_revision_utc": None,
    "ultima_revision_exitosa_utc": None,
    "proxima_revision_utc": None,
    "ultimo_resultado": None,
    "ultimo_error": None,
}


def consultar_estado_actualizacion():
    """Devuelve una copia del estado de la tarea automática."""
    return estado_actualizacion.copy()


async def ejecutar_actualizacion_automatica():
    """Evalúa las predicciones pendientes cada 30 minutos."""

    estado_actualizacion["activo"] = True
    estado_actualizacion["estado"] = "iniciado"

    logger.info(
        "LSTM-A: sistema de evaluación automática iniciado."
    )

    try:
        while True:
            fecha_inicio = datetime.now(timezone.utc)

            estado_actualizacion["estado"] = "revisando"
            estado_actualizacion["ultima_revision_utc"] = (
                fecha_inicio.isoformat()
            )
            estado_actualizacion["proxima_revision_utc"] = None
            estado_actualizacion["ultimo_error"] = None

            logger.info(
                "LSTM-A: iniciando revisión automática. UTC: %s",
                fecha_inicio.isoformat()
            )

            try:
                resultado = await asyncio.to_thread(
                    evaluar_predicciones_pendientes
                )

                fecha_fin = datetime.now(timezone.utc)

                estado_actualizacion["estado"] = "correcto"
                estado_actualizacion["ultima_revision_exitosa_utc"] = (
                    fecha_fin.isoformat()
                )
                estado_actualizacion["ultimo_resultado"] = resultado

                logger.info(
                    "LSTM-A: revisión completada. Resultado: %s",
                    resultado
                )

            except asyncio.CancelledError:
                raise

            except Exception as error:
                estado_actualizacion["estado"] = "error"
                estado_actualizacion["ultimo_error"] = str(error)

                logger.exception(
                    "LSTM-A: error durante la revisión automática."
                )

            fecha_siguiente = (
                datetime.now(timezone.utc)
                + timedelta(seconds=INTERVALO_SEGUNDOS)
            )

            estado_actualizacion["proxima_revision_utc"] = (
                fecha_siguiente.isoformat()
            )

            await asyncio.sleep(INTERVALO_SEGUNDOS)

    finally:
        estado_actualizacion["activo"] = False
        estado_actualizacion["estado"] = "detenido"
        estado_actualizacion["proxima_revision_utc"] = None
