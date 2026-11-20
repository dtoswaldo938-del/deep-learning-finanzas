"""Agente local de SOLO ANALISIS para Neural Finance.

No realiza compras ni ventas. Las decisiones son propuestas academicas.
La ejecucion ficticia se implementara por separado, con controles de riesgo.
"""
import json
import math
import os
from datetime import date, datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from inferencia_multiactivo import consultar_inferencia_multiactivo

router = APIRouter(prefix="/api/agente-ia", tags=["Agente IA local"])
OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
OLLAMA_MODELO = os.getenv("NEURAL_OLLAMA_MODEL", "llama3.2:1b")


class Propuesta(BaseModel):
    accion: str
    motivo: str
    confianza: str


def consultar_ollama(prompt: str) -> dict:
    solicitud = Request(
        OLLAMA_URL,
        data=json.dumps({
            "model": OLLAMA_MODELO,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {"temperature": 0},
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(solicitud, timeout=90) as respuesta:
        salida = json.load(respuesta)
    if not isinstance(salida, dict) or not isinstance(salida.get("response"), str):
        raise ValueError("Ollama devolvio una respuesta incompleta")
    propuesta = json.loads(salida["response"])
    if not isinstance(propuesta, dict):
        raise ValueError("Ollama no devolvio un objeto JSON")
    return propuesta


@router.get("/salud")
def salud():
    """Diagnostico local; no implica que el modelo este cargado en memoria."""
    try:
        with urlopen("http://127.0.0.1:11434/api/tags", timeout=5) as respuesta:
            datos = json.load(respuesta)
        modelos = [m.get("name") for m in datos.get("models", [])]
        return {"estado": "disponible" if OLLAMA_MODELO in modelos else "modelo_no_descargado",
                "modelo": OLLAMA_MODELO, "modelos_instalados": modelos,
                "operaciones_reales": False}
    except (OSError, ValueError) as exc:
        return {"estado": "sin_conexion", "detalle": type(exc).__name__,
                "modelo": OLLAMA_MODELO, "operaciones_reales": False}


@router.get("/analizar")
def analizar(simbolo: str = Query("BTCUSDT", min_length=2, max_length=30)):
    """Propone comprar/mantener/vender SOLO para una futura simulacion."""
    try:
        inferencia = consultar_inferencia_multiactivo(simbolo)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(422, str(exc)) from exc

    activo = inferencia["activo"]
    fecha = inferencia["fecha_emision"]
    try:
        fecha_vela = date.fromisoformat(fecha)
        rendimiento = float(inferencia["rendimiento_estimado"])
        if not math.isfinite(rendimiento):
            raise ValueError("Rendimiento no finito")
    except (ValueError, TypeError, KeyError) as exc:
        raise HTTPException(422, "Prediccion invalida") from exc

    # Las predicciones antiguas pueden analizarse, pero no habilitan ejecucion.
    antiguedad = (datetime.now(timezone.utc).date() - fecha_vela).days
    if antiguedad < 0:
        raise HTTPException(422, "La fecha del historico esta en el futuro")
    prompt = (
        "Eres un analista de SIMULACION ACADEMICA, no un asesor financiero. "
        "No hay operaciones reales. Devuelve SOLO un objeto JSON con exactamente "
        "accion (COMPRAR, MANTENER o VENDER), motivo (maximo 160 caracteres) "
        "y confianza (BAJA, MEDIA o ALTA). "
        "La prediccion es incierta y no prueba rentabilidad. "
        f"Activo: {activo}. Ultima vela cerrada: {fecha}. "
        f"Rendimiento LSTM estimado para la siguiente vela: {rendimiento:.8f}. "
        f"Antiguedad del historico: {antiguedad} dias. "
        "Si los datos estan desactualizados, elige MANTENER y confianza BAJA."
    )
    try:
        bruto = consultar_ollama(prompt)
        propuesta = Propuesta.model_validate(bruto)
        accion = propuesta.accion.strip().upper()
        confianza = propuesta.confianza.strip().upper()
        if accion not in {"COMPRAR", "MANTENER", "VENDER"}:
            raise ValueError("Accion no permitida")
        if confianza not in {"BAJA", "MEDIA", "ALTA"}:
            raise ValueError("Confianza no permitida")
        if not 1 <= len(propuesta.motivo.strip()) <= 160:
            raise ValueError("Motivo invalido")
    except (OSError, HTTPError, URLError, TimeoutError) as exc:
        raise HTTPException(503, "Ollama no esta disponible; no se ejecuta ninguna accion") from exc
    except (ValueError, TypeError, KeyError) as exc:
        raise HTTPException(502, "Ollama devolvio una decision invalida; no se ejecuta ninguna accion") from exc
    except Exception as exc:
        # Errores de validacion Pydantic tambien deben fallar de forma segura.
        from pydantic import ValidationError
        if isinstance(exc, ValidationError):
            raise HTTPException(502, "JSON de Ollama incompleto; no se ejecuta ninguna accion") from exc
        raise

    if antiguedad > 2:
        accion = "MANTENER"
        confianza = "BAJA"
        motivo = "Historial desactualizado: propuesta bloqueada hasta actualizar las velas cerradas."
    else:
        motivo = propuesta.motivo.strip()

    return {
        "estado": "analisis_completado", "simbolo": activo,
        "fecha_vela": fecha, "fecha_objetivo": inferencia["fecha_objetivo"],
        "rendimiento_estimado": rendimiento, "modelo_predictivo": "LSTM experimental",
        "modelo_lenguaje": OLLAMA_MODELO,
        "propuesta": {"accion": accion, "motivo": motivo, "confianza": confianza},
        "datos_vigentes": antiguedad <= 2,
        "ejecucion": "NO_EJECUTADA", "operaciones_reales": False,
        "advertencia": "Analisis academico. No constituye recomendacion de inversion.",
    }
