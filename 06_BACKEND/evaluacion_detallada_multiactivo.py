"""Reconstruye predicciones del conjunto de prueba sin reentrenar.

Los datos de origen deben ser exactamente los usados para entrenar.
"""
import json
import re
from pathlib import Path

import joblib
import numpy as np
import torch

from entrenar_lstm_multiactivo import LSTMExperimental, preparar, metricas, DESTINO

PATRON = re.compile(r'^[A-Z0-9]{2,30}$')
DATOS_ORIGINALES = Path(__file__).resolve().parent / 'datos_entrenamiento_original'


def consultar_evaluacion_detallada(simbolo: str) -> dict:
    simbolo = simbolo.strip().upper()
    if not PATRON.fullmatch(simbolo):
        raise ValueError('Símbolo inválido.')
    carpeta = DESTINO / simbolo
    rutas = [carpeta / 'modelo.pt', carpeta / 'escaladores.joblib', carpeta / 'evaluacion.json']
    if not all(r.is_file() for r in rutas):
        raise FileNotFoundError(f'No hay un modelo entrenado para {simbolo}.')

    informe = json.loads(rutas[2].read_text(encoding='utf-8'))
    if informe.get('simbolo') != simbolo:
        raise ValueError('El informe pertenece a otro activo.')
    X, y, fechas = preparar(simbolo, carpeta_datos=DATOS_ORIGINALES)
    datos = informe['datos']
    n_entrenamiento = int(datos['entrenamiento'])
    n_validacion = int(datos['validacion'])
    inicio = n_entrenamiento + n_validacion
    if (len(y) != int(datos['muestras_totales']) or
            len(y) - inicio != int(datos['prueba']) or
            fechas[inicio] != datos['fecha_inicio_prueba'] or
            fechas[-1] != datos['fecha_fin_prueba']):
        raise ValueError('El histórico local cambió respecto al entrenamiento. Conserva una copia del histórico original para reconstruir esta evaluación.')

    # Solo cargar checkpoints y escaladores creados por este proyecto, nunca archivos desconocidos.
    checkpoint = torch.load(rutas[0], map_location='cpu', weights_only=True)
    if checkpoint.get('simbolo') != simbolo:
        raise ValueError('El checkpoint pertenece a otro activo.')
    config = checkpoint['model_config']
    if (int(config['input_size']) != 1 or int(config['hidden_size']) != 32 or
            int(config['num_layers']) != 1 or int(checkpoint['ventana']) != 20):
        raise ValueError('Arquitectura del checkpoint no compatible.')
    escaladores = joblib.load(rutas[1])
    esc_x, esc_y = escaladores['scaler_x'], escaladores['scaler_y']
    modelo = LSTMExperimental(32)
    modelo.load_state_dict(checkpoint['model_state_dict'])
    modelo.eval()
    X_prueba = esc_x.transform(X[inicio:].reshape(-1, 1)).reshape(-1, 20, 1).astype(np.float32)
    with torch.inference_mode():
        pred_escalada = modelo(torch.from_numpy(X_prueba)).numpy()
    estimados = esc_y.inverse_transform(pred_escalada).ravel().astype(np.float64)
    reales = y[inicio:].astype(np.float64)
    calculadas = metricas(reales, estimados)
    originales = informe['prueba']['lstm']
    diferencias = {campo: abs(float(calculadas[campo]) - float(originales[campo]))
                   for campo in ('mae', 'rmse', 'precision_direccional_porcentaje', 'sesgo')}
    tolerancias = {'mae': 1e-7, 'rmse': 1e-7,
                   'precision_direccional_porcentaje': 1e-7, 'sesgo': 1e-7}
    if any(diferencias[k] > tolerancias[k] for k in diferencias):
        raise ValueError('Las métricas reconstruidas no coinciden con las guardadas; no se mostrarán gráficas inconsistentes.')
    observaciones = [
        {'fecha': fecha, 'real': float(real), 'estimado': float(pred),
         'base_cero': 0.0, 'error': float(pred - real)}
        for fecha, real, pred in zip(fechas[inicio:], reales, estimados)
    ]
    return {
        'status': 'ok', 'simbolo': simbolo, 'tipo': 'evaluacion_historica_prueba',
        'observaciones': observaciones,
        'metricas': {'lstm': calculadas, 'base_cero': informe['prueba']['base_cero']},
        'coincidencia_metricas': True, 'total': len(observaciones),
        'periodo': {'inicio': fechas[inicio], 'fin': fechas[-1]},
        'advertencia': 'Evaluación retrospectiva sobre datos reservados para prueba. No es una predicción en tiempo real ni evidencia de rentabilidad.',
        'operaciones_reales': False,
    }
