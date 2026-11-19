
import json
import math
from datetime import datetime, timezone
from urllib.request import Request, urlopen


URL_MEXC = (
    "https://api.mexc.com/api/v3/klines"
    "?symbol=BTCUSDT&interval=1d&limit=30"
)

MILISEGUNDOS_DIA = 86_400_000


def preparar_datos_lstm():
    """Prepara 20 rendimientos diarios para LSTM-A."""

    solicitud = Request(
        URL_MEXC,
        headers={"User-Agent": "ProyectoDLFinanzas/1.0"},
    )

    with urlopen(solicitud, timeout=15) as respuesta:
        velas = json.load(respuesta)

    if not isinstance(velas, list):
        raise ValueError("Respuesta inesperada de MEXC.")

    ahora_ms = int(datetime.now(timezone.utc).timestamp() * 1000)

    velas_cerradas = []

    for vela in velas:
        if not isinstance(vela, list) or len(vela) < 7:
            raise ValueError("MEXC devolvió una vela inválida.")

        inicio_ms = int(vela[0])
        fin_ms = int(vela[6])
        cierre = float(vela[4])

        if not math.isfinite(cierre) or cierre <= 0:
            raise ValueError("Precio de cierre inválido.")

        if fin_ms - inicio_ms != MILISEGUNDOS_DIA:
            raise ValueError("Duración de vela inesperada.")

        if fin_ms <= ahora_ms:
            velas_cerradas.append({
                "inicio_ms": inicio_ms,
                "fin_ms": fin_ms,
                "cierre": cierre,
            })

    velas_cerradas.sort(key=lambda v: v["inicio_ms"])

    if len(velas_cerradas) < 21:
        raise ValueError(
            "Se necesitan al menos 21 velas cerradas."
        )

    ultimas = velas_cerradas[-21:]

    for anterior, actual in zip(ultimas, ultimas[1:]):
        if (
            actual["inicio_ms"] - anterior["inicio_ms"]
            != MILISEGUNDOS_DIA
        ):
            raise ValueError(
                "Hay fechas faltantes o duplicadas."
            )

    rendimientos = []

    for i in range(1, len(ultimas)):
        precio_anterior = ultimas[i - 1]["cierre"]
        precio_actual = ultimas[i]["cierre"]

        rendimiento = precio_actual / precio_anterior - 1
        rendimientos.append(rendimiento)

    rezagos = {
        f"lag_{i}": rendimientos[-1 - i]
        for i in range(20)
    }

    ultima_fecha = datetime.fromtimestamp(
        ultimas[-1]["inicio_ms"] / 1000,
        tz=timezone.utc,
    ).date()

    return {
        "status": "ok",
        "fuente": "MEXC",
        "activo": "BTCUSDT",
        "modo": "preparacion_inferencia",
        "ultima_vela_cerrada": ultima_fecha.isoformat(),
        "velas_utilizadas": len(ultimas),
        "rendimientos_calculados": len(rendimientos),
        "lag_0": rezagos["lag_0"],
        "lag_19": rezagos["lag_19"],
        "rezagos": rezagos,
        "operaciones_reales": False,
    }


if __name__ == "__main__":
    resultado = preparar_datos_lstm()
    print(json.dumps(resultado, indent=4, ensure_ascii=False))
