import csv
import json
import math
import urllib.request
from pathlib import Path

import joblib
import numpy as np
import torch

from inferencia_multiactivo import ModeloLSTMExperimental

BASE = Path(__file__).resolve().parent
MODELO_DIR = BASE / "modelos" / "multiactivo" / "BTCUSDT"
DATOS = BASE / "data" / "BTCUSDT_1d_velas_cerradas.csv"
SALIDA = BASE.parent / "05_BITACORAS"
SALIDA.mkdir(exist_ok=True)

CAPITAL = 50000.0
EXPOSICION = 0.10
N = 20

with DATOS.open(encoding="utf-8-sig", newline="") as f:
    velas = list(csv.DictReader(f))

velas.sort(key=lambda x: int(x["open_time"]))

checkpoint = torch.load(
    MODELO_DIR / "modelo.pt",
    map_location="cpu",
    weights_only=True
)

config = checkpoint["model_config"]

modelo = ModeloLSTMExperimental(
    input_size=int(config["input_size"]),
    hidden_size=int(config["hidden_size"]),
    num_layers=int(config.get("num_layers", 1)),
)

modelo.load_state_dict(checkpoint["model_state_dict"])
modelo.eval()

escaladores = joblib.load(MODELO_DIR / "escaladores.joblib")
scaler_x = escaladores["scaler_x"]
scaler_y = escaladores["scaler_y"]

evaluacion = json.loads(
    (MODELO_DIR / "evaluacion.json").read_text(encoding="utf-8")
)

fecha_inicio = evaluacion["datos"]["fecha_inicio_prueba"]
fecha_fin = evaluacion["datos"]["fecha_fin_prueba"]

def fecha(vela):
    return vela["fecha"][:10]

indices = [
    i for i in range(20, len(velas) - 1)
    if fecha_inicio <= fecha(velas[i]) < fecha_fin
    and fecha(velas[i + 1]) <= fecha_fin
]

indices = indices[-N:]

if len(indices) != N:
    raise RuntimeError(
        f"Solo se encontraron {len(indices)} fechas validas."
    )

def predecir(indice):
    cierres = np.array(
        [float(v["close"]) for v in velas[indice-20:indice+1]],
        dtype=np.float64
    )

    tiempos = np.array(
        [int(v["open_time"]) for v in velas[indice-20:indice+1]]
    )

    if np.any(np.diff(tiempos) != 86400000):
        raise ValueError("Velas no consecutivas")

    rendimientos = np.diff(cierres) / cierres[:-1]

    entrada = scaler_x.transform(
        rendimientos.reshape(-1, 1)
    ).astype(np.float32)

    tensor = torch.from_numpy(entrada.reshape(1, 20, 1))

    with torch.no_grad():
        salida = modelo(tensor).numpy()

    prediccion = float(scaler_y.inverse_transform(salida)[0, 0])

    if not math.isfinite(prediccion):
        raise ValueError("Prediccion no finita")

    return prediccion


def consultar_ollama(dia, prediccion):
    esquema = {
        "type": "object",
        "properties": {
            "accion": {
                "type": "string",
                "enum": ["COMPRAR", "MANTENER", "VENDER"]
            },
            "motivo": {"type": "string"}
        },
        "required": ["accion", "motivo"],
        "additionalProperties": False
    }

    prompt = (
        "Simulacion academica historica sin dinero real. "
        "Decide COMPRAR, MANTENER o VENDER. "
        "Usa exclusivamente la prediccion LSTM proporcionada. "
        "No tienes acceso a precios futuros. "
        "Responde con las claves accion y motivo. "
        f"Fecha: {dia}. "
        f"Rendimiento estimado: {prediccion:.8f}."
    )

    cuerpo = json.dumps({
        "model": "llama3.2:1b",
        "prompt": prompt,
        "stream": False,
        "format": esquema,
        "options": {"temperature": 0}
    }).encode("utf-8")

    peticion = urllib.request.Request(
        "http://127.0.0.1:11434/api/generate",
        data=cuerpo,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    with urllib.request.urlopen(peticion, timeout=90) as respuesta:
        datos = json.load(respuesta)

    decision = json.loads(datos["response"])

    if not isinstance(decision, dict):
        raise ValueError("Respuesta JSON no es objeto")

    accion = str(decision.get("accion", "")).strip().upper()
    motivo = str(decision.get("motivo", "")).strip()

    if accion not in ("COMPRAR", "MANTENER", "VENDER"):
        raise ValueError(
            "Accion invalida. Respuesta: " + repr(decision)[:200]
        )

    if not motivo:
        raise ValueError("Motivo vacio")

    return accion, motivo[:160]

def ejecutar(cartera, accion, precio):
    saldo = cartera["saldo"]
    unidades = cartera["unidades"]
    equity = saldo + unidades * precio
    estado = "MANTENER"

    if accion == "COMPRAR":
        presupuesto = min(
            saldo,
            max(0.0, EXPOSICION * equity - unidades * precio)
        )
        cantidad = math.floor((presupuesto / precio) * 1e6) / 1e6

        if cantidad > 0 and cantidad * precio <= saldo:
            saldo -= cantidad * precio
            unidades += cantidad
            estado = "COMPRA_PAPER"
        else:
            estado = "RECHAZADA_EXPOSICION_O_SALDO"

    elif accion == "VENDER":
        if unidades > 0:
            saldo += unidades * precio
            unidades = 0.0
            estado = "VENTA_PAPER"
        else:
            estado = "RECHAZADA_SIN_POSICION"

    cartera["saldo"] = saldo
    cartera["unidades"] = unidades
    return estado

carteras = {
    "LSTM": {"saldo": CAPITAL, "unidades": 0.0},
    "LSTM_LLM": {"saldo": CAPITAL, "unidades": 0.0},
    "BUY_HOLD": {"saldo": CAPITAL, "unidades": 0.0}
}

resultados = []

for numero, indice in enumerate(indices, 1):
    actual = velas[indice]
    siguiente = velas[indice + 1]

    dia = fecha(actual)
    precio = float(actual["close"])
    precio_siguiente = float(siguiente["close"])

    prediccion = predecir(indice)

    accion_lstm = (
        "COMPRAR" if prediccion > 0
        else "VENDER" if prediccion < 0
        else "MANTENER"
    )

    estado_lstm = ejecutar(
        carteras["LSTM"], accion_lstm, precio
    )

    try:
        accion_llm, motivo_llm = consultar_ollama(
            dia, prediccion
        )
        estado_llm = ejecutar(
            carteras["LSTM_LLM"], accion_llm, precio
        )
        llm_valido = True
    except Exception as error:
        accion_llm = "ERROR"
        motivo_llm = f"{type(error).__name__}: {error}"
        estado_llm = "SIN_OPERACION_POR_ERROR"
        llm_valido = False

    if numero == 1:
        ejecutar(carteras["BUY_HOLD"], "COMPRAR", precio)

    equity_lstm = (
        carteras["LSTM"]["saldo"]
        + carteras["LSTM"]["unidades"] * precio_siguiente
    )

    equity_llm = (
        carteras["LSTM_LLM"]["saldo"]
        + carteras["LSTM_LLM"]["unidades"] * precio_siguiente
    )

    equity_hold = (
        carteras["BUY_HOLD"]["saldo"]
        + carteras["BUY_HOLD"]["unidades"] * precio_siguiente
    )

    resultados.append({
        "ciclo": numero,
        "tipo": "REPLAY_HISTORICO",
        "fecha_vela": dia,
        "fecha_evaluacion": fecha(siguiente),
        "precio_cierre": precio,
        "precio_siguiente": precio_siguiente,
        "prediccion_lstm": prediccion,
        "accion_lstm": accion_lstm,
        "estado_lstm": estado_lstm,
        "equity_lstm": round(equity_lstm, 4),
        "accion_llm": accion_llm,
        "motivo_llm": motivo_llm,
        "estado_llm": estado_llm,
        "llm_valido": llm_valido,
        "equity_llm": round(equity_llm, 4),
        "equity_buy_hold": round(equity_hold, 4),
    })

    print(
        f"Ciclo {numero:02d}/{N} | {dia} | "
        f"LSTM={accion_lstm} | LLM={accion_llm}",
        flush=True
    )

archivo = SALIDA / "REPLAY_20_CICLOS.csv"

with archivo.open("w", newline="", encoding="utf-8-sig") as f:
    escritor = csv.DictWriter(
        f, fieldnames=list(resultados[0].keys())
    )
    escritor.writeheader()
    escritor.writerows(resultados)

validos_llm = sum(r["llm_valido"] for r in resultados)

resumen = {
    "tipo": "REPLAY_HISTORICO_ACADEMICO",
    "capital_inicial": CAPITAL,
    "ciclos_lstm": len(resultados),
    "ciclos_llm_validos": validos_llm,
    "modelo_llm": "llama3.2:1b",
    "fecha_inicio": resultados[0]["fecha_vela"],
    "fecha_fin": resultados[-1]["fecha_vela"],
    "equity_final_lstm": resultados[-1]["equity_lstm"],
    "equity_final_llm": resultados[-1]["equity_llm"],
    "equity_final_buy_hold": resultados[-1]["equity_buy_hold"],
    "advertencias": [
        "Evaluacion retrospectiva; no son operaciones reales.",
        "Replay separado del agente en vivo y su base SQLite.",
        "La estrategia Buy & Hold usa la misma exposicion maxima del 10%.",
        "Las decisiones LLM fallidas no se cuentan como validas.",
        "La regla de perdida diaria del agente en vivo no se replica aqui."
    ]
}

(SALIDA / "RESUMEN_REPLAY_20_CICLOS.json").write_text(
    json.dumps(resumen, ensure_ascii=False, indent=2),
    encoding="utf-8"
)

print("\n=== RESULTADO FINAL ===")
print(json.dumps(resumen, ensure_ascii=False, indent=2))
print("\nCSV:", archivo)
