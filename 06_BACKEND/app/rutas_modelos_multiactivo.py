"""Rutas de lectura para modelos experimentales por criptomoneda."""

from fastapi import APIRouter, HTTPException, Query

from inferencia_multiactivo import (
    consultar_evaluacion_multiactivo,
    consultar_inferencia_multiactivo,
)

router = APIRouter(prefix="/api/modelos-multiactivo", tags=["Modelos multiactivo"])


@router.get("/disponibles")
def modelos_disponibles():
    from inferencia_multiactivo import CARPETA_MODELOS

    disponibles = []
    if CARPETA_MODELOS.is_dir():
        for carpeta in sorted(CARPETA_MODELOS.iterdir()):
            if carpeta.is_dir() and all(
                (carpeta / nombre).is_file()
                for nombre in ("modelo.pt", "escaladores.joblib", "evaluacion.json")
            ):
                disponibles.append(carpeta.name)
    return {"status": "ok", "simbolos": disponibles, "total": len(disponibles)}


@router.get("/evaluacion")
def evaluacion(simbolo: str = Query(..., min_length=2, max_length=30)):
    try:
        return consultar_evaluacion_multiactivo(simbolo)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except (ValueError, KeyError, TypeError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.get("/inferencia")
def inferencia(simbolo: str = Query(..., min_length=2, max_length=30)):
    try:
        return consultar_inferencia_multiactivo(simbolo)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except (ValueError, KeyError, TypeError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.get("/evaluacion-detallada")
def evaluacion_detallada(simbolo: str = Query(..., min_length=2, max_length=30)):
    from evaluacion_detallada_multiactivo import consultar_evaluacion_detallada
    try:
        return consultar_evaluacion_detallada(simbolo)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except (ValueError, KeyError, TypeError, RuntimeError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.get("/vigencia")
def vigencia(simbolo: str = Query(..., min_length=2, max_length=30)):
    from actualizacion_historial_multiactivo import consultar_vigencia
    try:
        return consultar_vigencia(simbolo)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except (ValueError, KeyError, TypeError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.post("/actualizar-historial")
def actualizar_historial(simbolo: str = Query(..., min_length=2, max_length=30)):
    from actualizacion_historial_multiactivo import actualizar_historial as ejecutar
    try:
        return ejecutar(simbolo)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except (ValueError, KeyError, TypeError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
