"""Entrenamiento manual de nuevos activos, sin operaciones financieras."""
import re
import subprocess
import sys
import threading
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/entrenamiento-activos", tags=["Entrenamiento académico"])
BASE = Path(__file__).resolve().parents[1]
MODELOS = BASE / "modelos" / "multiactivo"
PATRON = re.compile(r"^[A-Z0-9]{2,30}$")
_lock = threading.Lock()
_estado = {"estado": "inactivo", "simbolo": None, "mensaje": "Sin entrenamiento en curso", "inicio_utc": None, "fin_utc": None, "registro": []}

class Solicitud(BaseModel):
    simbolo: str

def _disponible(simbolo):
    carpeta = MODELOS / simbolo
    return all((carpeta / nombre).is_file() for nombre in ("modelo.pt", "escaladores.joblib", "evaluacion.json"))

def _ejecutar(simbolo):
    comando = [sys.executable, "-u", str(BASE / "entrenar_nuevo_activo.py"), "--simbolo", simbolo]
    try:
        proceso = subprocess.run(comando, cwd=str(BASE), capture_output=True, text=True,
                                 encoding="utf-8", errors="replace", timeout=1200, check=False)
        registro = (proceso.stdout + "\n" + proceso.stderr).strip().splitlines()[-50:]
        correcto = proceso.returncode == 0 and _disponible(simbolo)
        estado = "completado" if correcto else "error"
        mensaje = "Modelo registrado correctamente" if correcto else "El entrenamiento no terminó correctamente; revisa el registro"
    except subprocess.TimeoutExpired:
        estado, mensaje, registro = "error", "Tiempo máximo de 20 minutos excedido", []
    except Exception as exc:
        estado, mensaje, registro = "error", f"No se pudo iniciar el entrenamiento: {type(exc).__name__}", []
    with _lock:
        _estado.update(estado=estado, mensaje=mensaje, registro=registro,
                       fin_utc=datetime.now(timezone.utc).isoformat())

@router.get("/estado")
def estado():
    with _lock:
        return dict(_estado)

@router.post("/iniciar", status_code=202)
def iniciar(solicitud: Solicitud):
    simbolo = solicitud.simbolo.strip().upper()
    if not PATRON.fullmatch(simbolo) or not simbolo.endswith("USDT"):
        raise HTTPException(422, "Selecciona un par USDT válido del catálogo MEXC")
    with _lock:
        if _estado["estado"] == "entrenando":
            raise HTTPException(409, f"Ya se está entrenando {_estado['simbolo']}")
        if _disponible(simbolo):
            raise HTTPException(409, f"{simbolo} ya tiene un modelo entrenado")
        if (MODELOS / simbolo).exists() or (BASE / "datos_entrenamiento_original" / f"{simbolo}_1d.json").exists() or (BASE / "datos_multiactivo" / f"{simbolo}_1d.json").exists():
            raise HTTPException(409, "Existen archivos previos de este activo; revísalos antes de entrenar")
        _estado.update(estado="entrenando", simbolo=simbolo, mensaje="Descargando historial y entrenando modelo", registro=[],
                       inicio_utc=datetime.now(timezone.utc).isoformat(), fin_utc=None)
        threading.Thread(target=_ejecutar, args=(simbolo,), daemon=True).start()
        return dict(_estado)
