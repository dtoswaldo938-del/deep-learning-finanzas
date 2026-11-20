"""Inferencia experimental por activo con modelos LSTM previamente entrenados.

No realiza operaciones, no reentrena y no modifica SQLite.
"""

import json
import math
import re
from datetime import date, timedelta
from pathlib import Path

import joblib
import numpy as np
import torch
from torch import nn

BASE = Path(__file__).resolve().parent
CARPETA_MODELOS = BASE / "modelos" / "multiactivo"
CARPETA_DATOS = BASE / "datos_multiactivo"
PATRON_SIMBOLO = re.compile(r"^[A-Z0-9]{2,30}$")
DIA_MS = 86_400_000


class ModeloLSTMExperimental(nn.Module):
    def __init__(self, input_size=1, hidden_size=32, num_layers=1):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
        )
        self.fc = nn.Linear(hidden_size, 1)

    def forward(self, x):
        secuencia, _ = self.lstm(x)
        return self.fc(secuencia[:, -1, :])


def validar_simbolo(simbolo):
    if not isinstance(simbolo, str):
        raise ValueError("El símbolo debe ser texto.")
    simbolo = simbolo.strip().upper()
    if not PATRON_SIMBOLO.fullmatch(simbolo):
        raise ValueError("Símbolo no válido.")
    return simbolo


def _rutas(simbolo):
    carpeta = CARPETA_MODELOS / simbolo
    rutas = {
        "modelo": carpeta / "modelo.pt",
        "escaladores": carpeta / "escaladores.joblib",
        "evaluacion": carpeta / "evaluacion.json",
        "datos": CARPETA_DATOS / f"{simbolo}_1d.json",
    }
    if not all(ruta.is_file() for ruta in rutas.values()):
        raise FileNotFoundError(
            f"No hay un modelo experimental completo para {simbolo}."
        )
    return rutas


def consultar_evaluacion_multiactivo(simbolo):
    simbolo = validar_simbolo(simbolo)
    rutas = _rutas(simbolo)
    evaluacion = json.loads(rutas["evaluacion"].read_text(encoding="utf-8"))
    if evaluacion.get("simbolo") != simbolo:
        raise ValueError("La evaluación no corresponde al activo solicitado.")
    return evaluacion


def consultar_inferencia_multiactivo(simbolo):
    simbolo = validar_simbolo(simbolo)
    rutas = _rutas(simbolo)

    datos = json.loads(rutas["datos"].read_text(encoding="utf-8"))
    if datos.get("simbolo") != simbolo or datos.get("intervalo") != "1d":
        raise ValueError("El conjunto de datos no corresponde al activo solicitado.")

    velas = datos.get("velas")
    if not isinstance(velas, list) or len(velas) < 21:
        raise ValueError("Se necesitan al menos 21 velas diarias cerradas.")

    ultimas = velas[-21:]
    fechas_ms = np.array([int(v["inicio_ms"]) for v in ultimas], dtype=np.int64)
    if np.any(np.diff(fechas_ms) != DIA_MS):
        raise ValueError("Hay fechas faltantes o duplicadas en las últimas velas.")

    cierres = np.array([float(v["close"]) for v in ultimas], dtype=np.float64)
    if not np.all(np.isfinite(cierres)) or np.any(cierres <= 0):
        raise ValueError("El histórico contiene precios inválidos.")

    rendimientos = np.diff(cierres) / cierres[:-1]
    escaladores = joblib.load(rutas["escaladores"])
    entrada_escalada = escaladores["scaler_x"].transform(
        rendimientos.reshape(-1, 1)
    ).astype(np.float32)
    entrada = torch.from_numpy(entrada_escalada.reshape(1, 20, 1))

    checkpoint = torch.load(
        rutas["modelo"], map_location="cpu", weights_only=True
    )
    if checkpoint.get("simbolo") != simbolo:
        raise ValueError("El modelo guardado pertenece a otro activo.")
    configuracion = checkpoint["model_config"]
    ventana = int(checkpoint.get("ventana", 20))
    if ventana != 20 or int(configuracion["input_size"]) != 1:
        raise ValueError("La arquitectura guardada no coincide con las entradas.")

    modelo = ModeloLSTMExperimental(
        input_size=int(configuracion["input_size"]),
        hidden_size=int(configuracion["hidden_size"]),
        num_layers=int(configuracion.get("num_layers", 1)),
    )
    modelo.load_state_dict(checkpoint["model_state_dict"])
    modelo.eval()

    with torch.no_grad():
        secuencia, (_, estado_celda) = modelo.lstm(entrada)
        prediccion_escalada = modelo.fc(secuencia[:, -1, :]).numpy()

    rendimiento = float(
        escaladores["scaler_y"].inverse_transform(prediccion_escalada)[0, 0]
    )
    if not math.isfinite(rendimiento):
        raise ValueError("El modelo devolvió una predicción no válida.")

    fecha_emision = date.fromisoformat(ultimas[-1]["fecha"])
    fecha_objetivo = fecha_emision + timedelta(days=1)
    estados_ocultos = secuencia[0].cpu().numpy()
    celdas_finales = estado_celda[-1, 0].cpu().numpy()

    return {
        "status": "ok",
        "fuente": "MEXC (histórico local auditado)",
        "modelo": "LSTM experimental multiactivo",
        "activo": simbolo,
        "tipo": "inferencia_experimental",
        "fecha_emision": fecha_emision.isoformat(),
        "fecha_objetivo": fecha_objetivo.isoformat(),
        "rendimiento_estimado": rendimiento,
        "rendimiento_estimado_porcentaje": rendimiento * 100,
        "direccion_estimacion": (
            "subida" if rendimiento > 0 else "bajada" if rendimiento < 0 else "sin_cambio"
        ),
        "arquitectura": {
            "tipo": "LSTM",
            "capas_lstm": int(configuracion.get("num_layers", 1)),
            "neuronas_ocultas": int(configuracion["hidden_size"]),
            "longitud_secuencia": ventana,
            "neuronas_salida": 1,
        },
        "activaciones": [round(float(v), 8) for v in estados_ocultos[-1]],
        "estado_celda": [round(float(v), 8) for v in celdas_finales],
        "secuencia_oculta": [
            [round(float(v), 8) for v in fila] for fila in estados_ocultos
        ],
        "entrada_escalada": [float(v) for v in entrada_escalada[:, 0]],
        "rendimientos_entrada": [float(v) for v in rendimientos],
        "datos_actualizados_en_tiempo_real": False,
        "advertencia": (
            "Predicción experimental basada en el último histórico local guardado. "
            "No es una recomendación de inversión ni una inferencia por segundo."
        ),
        "operaciones_reales": False,
    }
