"""Consulta y actualización manual segura de velas cerradas, sin reentrenamiento."""
import json
import os
import tempfile
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path

from inferencia_multiactivo import CARPETA_DATOS, CARPETA_MODELOS, validar_simbolo
from preparar_dataset_multiactivo import DIA_MS, auditar_velas, descargar_velas

CANDADO = threading.Lock()
DATOS_CONGELADOS = Path(__file__).resolve().parent / "datos_entrenamiento_original"


def _ruta(simbolo):
    simbolo = validar_simbolo(simbolo)
    carpeta = CARPETA_MODELOS / simbolo
    if not all((carpeta / archivo).is_file() for archivo in ("modelo.pt", "escaladores.joblib", "evaluacion.json")):
        raise FileNotFoundError(f"No hay modelo entrenado para {simbolo}.")
    return simbolo, CARPETA_DATOS / f"{simbolo}_1d.json"


def _leer(ruta, simbolo):
    if not ruta.is_file():
        raise FileNotFoundError(f"No existe el histórico de {simbolo}.")
    contenido = json.loads(ruta.read_text(encoding="utf-8"))
    if contenido.get("simbolo") != simbolo or contenido.get("intervalo") != "1d":
        raise ValueError("El histórico no coincide con el símbolo o intervalo.")
    velas = contenido.get("velas")
    if not isinstance(velas, list) or not velas:
        raise ValueError("El histórico no contiene velas.")
    auditoria = auditar_velas(velas)
    if auditoria["saltos_detectados"]:
        raise ValueError("El histórico contiene fechas faltantes o duplicadas.")
    return contenido, velas, auditoria


def _fecha_esperada():
    # MEXC utiliza velas diarias UTC. La fecha de la última vela cerrada
    # es el día UTC anterior, aun cuando apenas inició un día nuevo.
    return (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()


def consultar_vigencia(simbolo):
    simbolo, ruta = _ruta(simbolo)
    _, velas, auditoria = _leer(ruta, simbolo)
    ultima = auditoria["ultima_fecha"]
    esperada = _fecha_esperada()
    atraso = max(0, (datetime.fromisoformat(esperada).date() - datetime.fromisoformat(ultima).date()).days)
    return {
        "status": "ok", "simbolo": simbolo, "intervalo": "1d",
        "ultima_vela": ultima, "primera_vela": auditoria["primera_fecha"],
        "velas": len(velas), "ultima_vela_esperada": esperada,
        "dias_atraso": atraso, "vigente": atraso == 0,
        "actualizado_archivo_utc": datetime.fromtimestamp(ruta.stat().st_mtime, tz=timezone.utc).isoformat(),
        "fuente": "MEXC, velas diarias cerradas (UTC)",
        "advertencia": "El modelo no se reentrena al actualizar los datos."
    }


def actualizar_historial(simbolo):
    simbolo, ruta = _ruta(simbolo)
    if not CANDADO.acquire(blocking=False):
        raise RuntimeError("Hay otra actualización en curso. Intenta nuevamente.")
    try:
        # Nunca permitir actualización sin respaldo congelado comprobable.
        original = DATOS_CONGELADOS / f"{simbolo}_1d.json"
        _, velas_originales, _ = _leer(original, simbolo)
        _, actuales, _ = _leer(ruta, simbolo)
        if len(actuales) < len(velas_originales):
            raise ValueError("El histórico actual es más corto que el original protegido.")
        for a, b in zip(velas_originales, actuales):
            if a != b:
                raise ValueError("El histórico difiere del original protegido. No se sobrescribió.")
        # No solicitar miles de velas ni truncar las existentes.
        # Se requiere superposición para comprobar integridad de datos.
        nuevas = descargar_velas(simbolo, max_velas=1000)
        if not nuevas:
            raise RuntimeError("MEXC no devolvió velas cerradas.")
        anteriores_por_fecha = {int(v["inicio_ms"]): v for v in actuales}
        nuevas_por_fecha = {int(v["inicio_ms"]): v for v in nuevas}
        coincidencias = set(anteriores_por_fecha) & set(nuevas_por_fecha)
        if not coincidencias:
            raise ValueError("No hay fechas compartidas para validar el histórico.")
        for fecha in coincidencias:
            if anteriores_por_fecha[fecha] != nuevas_por_fecha[fecha]:
                raise ValueError("MEXC devolvió cambios en velas anteriores. Se canceló la actualización.")
        combinadas = sorted({**anteriores_por_fecha, **nuevas_por_fecha}.values(), key=lambda v: int(v["inicio_ms"]))
        auditoria = auditar_velas(combinadas)
        if auditoria["saltos_detectados"]:
            raise ValueError("La actualización presenta saltos de fechas; se canceló.")
        agregadas = len(combinadas) - len(actuales)
        if agregadas <= 0:
            return {"status": "ok", "simbolo": simbolo, "velas_agregadas": 0, "mensaje": "El histórico ya estaba actualizado.", "vigencia": consultar_vigencia(simbolo)}
        contenido = {"simbolo": simbolo, "intervalo": "1d", "auditoria": auditoria, "velas": combinadas}
        ruta.parent.mkdir(parents=True, exist_ok=True)
        temporal = None
        try:
            with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=ruta.parent, prefix=f".{simbolo}_", suffix=".tmp", delete=False) as f:
                temporal = f.name
                json.dump(contenido, f, ensure_ascii=False, indent=2)
                f.flush()
                os.fsync(f.fileno())
            os.replace(temporal, ruta)
        finally:
            if temporal and os.path.exists(temporal):
                os.unlink(temporal)
        return {"status": "ok", "simbolo": simbolo, "velas_agregadas": agregadas, "mensaje": f"Se añadieron {agregadas} velas cerradas.", "vigencia": consultar_vigencia(simbolo)}
    finally:
        CANDADO.release()
