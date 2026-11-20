"""Descarga y audita velas diarias cerradas de MEXC para investigación.

No modifica modelos, escaladores ni la base de datos existente.
"""

import argparse
import json
import math
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

URL = 'https://api.mexc.com/api/v3/klines'
DIA_MS = 86_400_000
MAX_POR_PETICION = 1000
PATRON_SIMBOLO = re.compile(r'^[A-Z0-9]{2,30}$')


def descargar_velas(simbolo: str, max_velas: int = 1500) -> list[dict]:
    simbolo = simbolo.strip().upper()
    if not PATRON_SIMBOLO.fullmatch(simbolo):
        raise ValueError('El símbolo contiene caracteres no permitidos.')
    if not 100 <= max_velas <= 5000:
        raise ValueError('max_velas debe estar entre 100 y 5000.')

    ahora_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    fin_exclusivo = ahora_ms
    velas_por_inicio: dict[int, dict] = {}

    while len(velas_por_inicio) < max_velas:
        restantes = max_velas - len(velas_por_inicio)
        parametros = urlencode({
            'symbol': simbolo,
            'interval': '1d',
            'limit': min(MAX_POR_PETICION, restantes),
            'endTime': fin_exclusivo - 1,
        })
        solicitud = Request(
            f'{URL}?{parametros}',
            headers={'User-Agent': 'ProyectoDLFinanzas/1.0'},
        )
        try:
            with urlopen(solicitud, timeout=20) as respuesta:
                datos = json.load(respuesta)
        except (HTTPError, URLError, TimeoutError) as exc:
            raise RuntimeError(f'No se pudieron descargar velas: {exc}') from exc

        if not isinstance(datos, list):
            raise ValueError(f'Respuesta inesperada de MEXC: {str(datos)[:180]}')
        if not datos:
            break

        minimo_inicio = None
        nuevas = 0
        for vela in datos:
            if not isinstance(vela, list) or len(vela) < 7:
                raise ValueError('MEXC devolvió una vela con formato incorrecto.')
            inicio = int(vela[0])
            cierre_ms = int(vela[6])
            cierre = float(vela[4])
            if not math.isfinite(cierre) or cierre <= 0:
                raise ValueError('MEXC devolvió un precio de cierre inválido.')
            if cierre_ms < inicio or cierre_ms - inicio not in (DIA_MS - 1, DIA_MS):
                raise ValueError('MEXC devolvió una duración de vela inesperada.')
            minimo_inicio = inicio if minimo_inicio is None else min(minimo_inicio, inicio)
            if cierre_ms >= ahora_ms:
                continue  # Nunca usar la vela diaria todavía abierta.
            if inicio not in velas_por_inicio:
                nuevas += 1
            velas_por_inicio[inicio] = {
                'fecha': datetime.fromtimestamp(inicio / 1000, tz=timezone.utc).date().isoformat(),
                'inicio_ms': inicio,
                'fin_ms': cierre_ms,
                'open': float(vela[1]),
                'high': float(vela[2]),
                'low': float(vela[3]),
                'close': cierre,
                'volume': float(vela[5]),
            }

        if minimo_inicio is None or nuevas == 0 or minimo_inicio >= fin_exclusivo:
            break
        fin_exclusivo = minimo_inicio
        if len(datos) < min(MAX_POR_PETICION, restantes):
            break
        time.sleep(0.15)

    return sorted(velas_por_inicio.values(), key=lambda fila: fila['inicio_ms'])[-max_velas:]


def auditar_velas(velas: list[dict]) -> dict:
    saltos = []
    for anterior, actual in zip(velas, velas[1:]):
        diferencia = actual['inicio_ms'] - anterior['inicio_ms']
        if diferencia != DIA_MS:
            saltos.append({'desde': anterior['fecha'], 'hasta': actual['fecha'], 'dias': diferencia / DIA_MS})
    return {
        'velas_cerradas': len(velas),
        'primera_fecha': velas[0]['fecha'] if velas else None,
        'ultima_fecha': velas[-1]['fecha'] if velas else None,
        'saltos_detectados': len(saltos),
        'ejemplos_saltos': saltos[:10],
        'suficientes_para_experimento': len(velas) >= 365 and not saltos,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description='Auditoría histórica multiactivo de MEXC')
    parser.add_argument('--simbolos', nargs='+', default=['BTCUSDT', 'ETHUSDT', 'SOLUSDT'])
    parser.add_argument('--max-velas', type=int, default=1500)
    parser.add_argument('--guardar', action='store_true', help='Guardar JSON bajo datos_multiactivo')
    args = parser.parse_args()

    destino = Path(__file__).resolve().parent / 'datos_multiactivo'
    if args.guardar:
        destino.mkdir(parents=True, exist_ok=True)

    for simbolo in args.simbolos:
        simbolo = simbolo.upper().strip()
        print(f'\n=== {simbolo} ===')
        try:
            velas = descargar_velas(simbolo, args.max_velas)
            auditoria = auditar_velas(velas)
            print(json.dumps(auditoria, ensure_ascii=False, indent=2))
            if args.guardar and velas:
                ruta = destino / f'{simbolo}_1d.json'
                ruta.write_text(json.dumps({'simbolo': simbolo, 'intervalo': '1d', 'auditoria': auditoria, 'velas': velas}, ensure_ascii=False, indent=2), encoding='utf-8')
                print(f'Guardado: {ruta}')
        except (RuntimeError, ValueError, KeyError, TypeError) as exc:
            print(f'ERROR {simbolo}: {exc}')


if __name__ == '__main__':
    main()
