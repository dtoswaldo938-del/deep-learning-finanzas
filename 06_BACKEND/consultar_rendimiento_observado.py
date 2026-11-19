
import json
import math
from datetime import date, datetime, timedelta, timezone
from urllib.parse import urlencode
from urllib.request import Request, urlopen


URL_BASE = "https://api.mexc.com/api/v3/klines"
MILISEGUNDOS_DIA = 86_400_000


def consultar_rendimiento_observado(fecha_objetivo):
    """Consulta el rendimiento real de un día ya cerrado."""

    objetivo = date.fromisoformat(fecha_objetivo)
    anterior = objetivo - timedelta(days=1)

    inicio = datetime(
        anterior.year,
        anterior.month,
        anterior.day,
        tzinfo=timezone.utc,
    )

    inicio_ms = int(inicio.timestamp() * 1000)

    parametros = urlencode({
        "symbol": "BTCUSDT",
        "interval": "1d",
        "limit": 30,
    })

    solicitud = Request(
        f"{URL_BASE}?{parametros}",
        headers={"User-Agent": "ProyectoDLFinanzas/1.0"},
    )

    with urlopen(solicitud, timeout=15) as respuesta:
        velas = json.load(respuesta)

    if not isinstance(velas, list):
        raise ValueError("Respuesta inesperada de MEXC.")

    ahora_ms = int(
        datetime.now(timezone.utc).timestamp() * 1000
    )

    cierres = {}

    for vela in velas:
        if not isinstance(vela, list) or len(vela) < 7:
            raise ValueError("MEXC devolvió una vela inválida.")

        inicio_vela = int(vela[0])
        fin_vela = int(vela[6])
        cierre = float(vela[4])

        if not math.isfinite(cierre) or cierre <= 0:
            raise ValueError("Precio de cierre inválido.")

        if fin_vela - inicio_vela != MILISEGUNDOS_DIA:
            raise ValueError("Duración de vela inesperada.")

        if fin_vela > ahora_ms:
            continue

        fecha = datetime.fromtimestamp(
            inicio_vela / 1000,
            tz=timezone.utc,
        ).date()

        if fecha in cierres:
            raise ValueError("MEXC devolvió fechas duplicadas.")

        cierres[fecha] = cierre

    if anterior not in cierres or objetivo not in cierres:
        return {
            "status": "pendiente",
            "fecha_objetivo": fecha_objetivo,
            "motivo": "Faltan velas diarias cerradas.",
        }

    precio_inicial = cierres[anterior]
    precio_final = cierres[objetivo]

    rendimiento = precio_final / precio_inicial - 1

    return {
        "status": "ok",
        "fuente": "MEXC",
        "activo": "BTCUSDT",
        "fecha_objetivo": fecha_objetivo,
        "precio_inicial": precio_inicial,
        "precio_final": precio_final,
        "rendimiento_observado": rendimiento,
        "rendimiento_observado_porcentaje": rendimiento * 100,
        "operaciones_reales": False,
    }
