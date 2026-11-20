"""Entrenamiento experimental LSTM por activo, sin operaciones reales.

Usa únicamente los JSON auditados por preparar_dataset_multiactivo.py.
No altera LSTM-A, escaladores originales ni SQLite.
"""
import argparse
import json
import math
import random
import re
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import torch
from sklearn.preprocessing import StandardScaler
from torch import nn

BASE = Path(__file__).resolve().parent
DATOS = BASE / 'datos_multiactivo'
DESTINO = BASE / 'modelos' / 'multiactivo'
PATRON = re.compile(r'^[A-Z0-9]{2,30}$')
VENTANA = 20
DIA_MS = 86_400_000


class LSTMExperimental(nn.Module):
    def __init__(self, ocultas=32):
        super().__init__()
        self.lstm = nn.LSTM(input_size=1, hidden_size=ocultas, batch_first=True)
        self.fc = nn.Linear(ocultas, 1)

    def forward(self, x):
        secuencia, _ = self.lstm(x)
        return self.fc(secuencia[:, -1, :])


def preparar(simbolo, carpeta_datos=None):
    # El entrenamiento mantiene datos_multiactivo por defecto.
    # La evaluacion puede indicar la copia historica inmutable.
    origen = DATOS if carpeta_datos is None else Path(carpeta_datos)
    ruta = origen / f'{simbolo}_1d.json'
    if not ruta.is_file():
        raise FileNotFoundError(f'Falta {ruta}. Descarga y audita el histórico primero.')
    contenido = json.loads(ruta.read_text(encoding='utf-8'))
    if contenido.get('simbolo') != simbolo or contenido.get('intervalo') != '1d':
        raise ValueError('Símbolo o intervalo no coinciden con el archivo.')
    velas = contenido['velas']
    if len(velas) < 365:
        raise ValueError('Se requieren al menos 365 velas cerradas para este experimento.')
    inicios = np.array([int(v['inicio_ms']) for v in velas], dtype=np.int64)
    if np.any(np.diff(inicios) != DIA_MS):
        raise ValueError('El histórico contiene saltos o duplicados de fechas.')
    precios = np.array([float(v['close']) for v in velas], dtype=np.float64)
    if not np.all(np.isfinite(precios)) or np.any(precios <= 0):
        raise ValueError('Hay precios inválidos.')
    rendimientos = np.diff(precios) / precios[:-1]
    # X contiene 20 rendimientos previos en orden cronológico.
    # y es el rendimiento siguiente, nunca contenido en la entrada.
    X = np.stack([rendimientos[t-VENTANA:t] for t in range(VENTANA, len(rendimientos))])
    y = rendimientos[VENTANA:]
    fechas = [v['fecha'] for v in velas[VENTANA+1:]]
    if len(X) != len(y) or len(fechas) != len(y):
        raise RuntimeError('Desalineación temporal de entradas y objetivos.')
    return X, y, fechas


def metricas(reales, estimadas):
    reales = np.asarray(reales, dtype=np.float64)
    estimadas = np.asarray(estimadas, dtype=np.float64)
    return {
        'observaciones': int(len(reales)),
        'mae': float(np.mean(np.abs(reales - estimadas))),
        'rmse': float(np.sqrt(np.mean((reales - estimadas) ** 2))),
        'precision_direccional_porcentaje': float(np.mean((reales > 0) == (estimadas > 0)) * 100),
        'sesgo': float(np.mean(estimadas - reales)),
    }


def entrenar(simbolo, epocas, paciencia, semilla):
    X, y, fechas = preparar(simbolo)
    n = len(y)
    fin_train = int(n * 0.70)
    fin_val = int(n * 0.85)
    if min(fin_train, fin_val-fin_train, n-fin_val) < 25:
        raise ValueError('No hay suficientes observaciones en las particiones.')
    # Ajustar ambos escaladores EXCLUSIVAMENTE con el periodo de entrenamiento.
    esc_x = StandardScaler().fit(X[:fin_train].reshape(-1, 1))
    esc_y = StandardScaler().fit(y[:fin_train].reshape(-1, 1))
    X_s = esc_x.transform(X.reshape(-1, 1)).reshape(n, VENTANA, 1).astype(np.float32)
    y_s = esc_y.transform(y.reshape(-1, 1)).astype(np.float32)
    xt = torch.from_numpy(X_s[:fin_train]); yt = torch.from_numpy(y_s[:fin_train])
    xv = torch.from_numpy(X_s[fin_train:fin_val]); yv = torch.from_numpy(y_s[fin_train:fin_val])
    modelo = LSTMExperimental(32)
    optimizador = torch.optim.Adam(modelo.parameters(), lr=0.001)
    perdida = nn.MSELoss()
    mejor_val = math.inf
    mejor_pesos = None
    epoca_mejor = 0
    sin_mejora = 0
    historial = []
    for epoca in range(1, epocas+1):
        modelo.train()
        # Mini-lotes aleatorios únicamente del entrenamiento.
        orden = torch.randperm(len(xt))
        for indices in orden.split(32):
            optimizador.zero_grad()
            error = perdida(modelo(xt[indices]), yt[indices])
            error.backward()
            nn.utils.clip_grad_norm_(modelo.parameters(), 1.0)
            optimizador.step()
        modelo.eval()
        with torch.no_grad():
            error_train = float(perdida(modelo(xt), yt))
            error_val = float(perdida(modelo(xv), yv))
        historial.append({'epoca': epoca, 'mse_train_escalado': error_train, 'mse_validacion_escalado': error_val})
        if error_val < mejor_val - 1e-6:
            mejor_val = error_val
            mejor_pesos = {k: v.detach().cpu().clone() for k, v in modelo.state_dict().items()}
            epoca_mejor = epoca
            sin_mejora = 0
        else:
            sin_mejora += 1
        if sin_mejora >= paciencia:
            break
    if mejor_pesos is None:
        raise RuntimeError('No se encontró un estado válido del modelo.')
    modelo.load_state_dict(mejor_pesos)
    modelo.eval()
    with torch.no_grad():
        pronostico_val = esc_y.inverse_transform(modelo(torch.from_numpy(X_s[fin_train:fin_val])).numpy()).ravel()
        pronostico_test = esc_y.inverse_transform(modelo(torch.from_numpy(X_s[fin_val:])).numpy()).ravel()
    reales_val = y[fin_train:fin_val]
    reales_test = y[fin_val:]
    informe = {
        'status': 'ok', 'simbolo': simbolo, 'tipo': 'experimento_independiente',
        'operaciones_reales': False, 'fecha_entrenamiento_utc': datetime.now(timezone.utc).isoformat(),
        'arquitectura': {'tipo': 'LSTM', 'input_size': 1, 'hidden_size': 32, 'num_layers': 1, 'ventana': VENTANA},
        'datos': {'muestras_totales': n, 'entrenamiento': fin_train, 'validacion': fin_val-fin_train,
                  'prueba': n-fin_val, 'fecha_inicio_entrenamiento': fechas[0],
                  'fecha_fin_entrenamiento': fechas[fin_train-1],
                  'fecha_inicio_validacion': fechas[fin_train], 'fecha_fin_validacion': fechas[fin_val-1],
                  'fecha_inicio_prueba': fechas[fin_val], 'fecha_fin_prueba': fechas[-1]},
        'entrenamiento': {'semilla': semilla, 'epocas_realizadas': len(historial), 'mejor_epoca': epoca_mejor,
                         'mejor_mse_validacion_escalado': mejor_val},
        'validacion': {'lstm': metricas(reales_val, pronostico_val),
                       'base_cero': metricas(reales_val, np.zeros_like(reales_val))},
        'prueba': {'lstm': metricas(reales_test, pronostico_test),
                   'base_cero': metricas(reales_test, np.zeros_like(reales_test))},
        'advertencia': 'Evaluación retrospectiva experimental; no demuestra rentabilidad ni capacidad predictiva futura.',
    }
    carpeta = DESTINO / simbolo
    carpeta.mkdir(parents=True, exist_ok=True)
    torch.save({'model_state_dict': mejor_pesos, 'model_config': {'input_size': 1, 'hidden_size': 32, 'num_layers': 1},
                'simbolo': simbolo, 'ventana': VENTANA, 'tipo': 'experimental_multiactivo'}, carpeta / 'modelo.pt')
    joblib.dump({'scaler_x': esc_x, 'scaler_y': esc_y}, carpeta / 'escaladores.joblib')
    (carpeta / 'evaluacion.json').write_text(json.dumps(informe, indent=2, ensure_ascii=False), encoding='utf-8')
    (carpeta / 'historial_entrenamiento.json').write_text(json.dumps(historial, indent=2), encoding='utf-8')
    return informe


def main():
    parser = argparse.ArgumentParser(description='Entrenamiento experimental LSTM multiactivo')
    parser.add_argument('--simbolos', nargs='+', default=['BTCUSDT', 'ETHUSDT', 'SOLUSDT'])
    parser.add_argument('--epocas', type=int, default=60)
    parser.add_argument('--paciencia', type=int, default=10)
    parser.add_argument('--semilla', type=int, default=42)
    args = parser.parse_args()
    if not 1 <= args.epocas <= 500 or not 1 <= args.paciencia <= 100:
        parser.error('epocas debe ser 1..500 y paciencia 1..100')
    random.seed(args.semilla)
    np.random.seed(args.semilla)
    torch.manual_seed(args.semilla)
    torch.set_num_threads(2)
    for simbolo in args.simbolos:
        simbolo = simbolo.strip().upper()
        if not PATRON.fullmatch(simbolo):
            print(f'ERROR: símbolo inválido: {simbolo}')
            continue
        print(f'\n=== ENTRENAMIENTO {simbolo} ===', flush=True)
        try:
            informe = entrenar(simbolo, args.epocas, args.paciencia, args.semilla)
            print(json.dumps({'activo': simbolo, 'datos': informe['datos'],
                              'entrenamiento': informe['entrenamiento'], 'prueba': informe['prueba']},
                             ensure_ascii=False, indent=2), flush=True)
            print(f"Guardado en: {DESTINO / simbolo}", flush=True)
        except (ValueError, RuntimeError, FileNotFoundError, KeyError) as exc:
            print(f'ERROR {simbolo}: {exc}', flush=True)


if __name__ == '__main__':
    main()
