"""Alta segura de un modelo LSTM experimental para un nuevo par MEXC.

Uso: python entrenar_nuevo_activo.py --simbolo ADAUSDT
No hace operaciones financieras ni modifica modelos existentes.
"""
import argparse
import json
import os
import random
import sys
import tempfile
from pathlib import Path

import numpy as np
import torch

import entrenar_lstm_multiactivo as motor
from preparar_dataset_multiactivo import descargar_velas, auditar_velas

BASE = Path(__file__).resolve().parent
DATOS = BASE / 'datos_multiactivo'
ORIGINALES = BASE / 'datos_entrenamiento_original'
MODELOS = BASE / 'modelos' / 'multiactivo'


def alta(simbolo: str, max_velas: int, epocas: int, paciencia: int, semilla: int):
    simbolo = simbolo.strip().upper()
    if not motor.PATRON.fullmatch(simbolo):
        raise ValueError('Símbolo inválido; solo letras mayúsculas y números (2 a 30 caracteres).')
    destino_modelo = MODELOS / simbolo
    destino_original = ORIGINALES / f'{simbolo}_1d.json'
    destino_actual = DATOS / f'{simbolo}_1d.json'
    if destino_modelo.exists() or destino_original.exists():
        raise FileExistsError(f'{simbolo} ya tiene modelo o datos originales; no se sobrescribirá nada.')
    print(f'Consultando velas cerradas de MEXC para {simbolo}...', flush=True)
    velas = descargar_velas(simbolo, max_velas)
    auditoria = auditar_velas(velas)
    print(json.dumps(auditoria, ensure_ascii=False, indent=2), flush=True)
    if not auditoria['suficientes_para_experimento']:
        raise ValueError('No hay al menos 365 velas diarias cerradas consecutivas. No se entrenó ningún modelo.')
    documento = {'simbolo': simbolo, 'intervalo': '1d', 'auditoria': auditoria, 'velas': velas}
    DATOS.mkdir(parents=True, exist_ok=True)
    ORIGINALES.mkdir(parents=True, exist_ok=True)
    MODELOS.mkdir(parents=True, exist_ok=True)
    # No publicar un modelo sobre un histórico anterior que podría no coincidir.
    if destino_actual.exists():
        raise FileExistsError('Ya existe un histórico para este activo. Para evitar discrepancias entre entrenamiento e inferencia, revisa ese archivo antes de continuar.')
    with tempfile.TemporaryDirectory(prefix=f'neural_{simbolo}_', dir=str(BASE)) as temporal:
        temporal = Path(temporal)
        datos_tmp = temporal / 'datos'
        modelos_tmp = temporal / 'modelos'
        datos_tmp.mkdir()
        modelos_tmp.mkdir()
        archivo_tmp = datos_tmp / f'{simbolo}_1d.json'
        archivo_tmp.write_text(json.dumps(documento, ensure_ascii=False, indent=2), encoding='utf-8')
        motor.DATOS = datos_tmp
        motor.DESTINO = modelos_tmp
        random.seed(semilla)
        np.random.seed(semilla)
        torch.manual_seed(semilla)
        torch.set_num_threads(2)
        print(f'Entrenando {simbolo} con particiones cronológicas...', flush=True)
        informe = motor.entrenar(simbolo, epocas, paciencia, semilla)
        temporal_modelo = modelos_tmp / simbolo
        if not all((temporal_modelo / nombre).is_file() for nombre in
                   ('modelo.pt', 'escaladores.joblib', 'evaluacion.json', 'historial_entrenamiento.json')):
            raise RuntimeError('Faltan artefactos del modelo; no se publicará.')
        # Publicar datos originales antes del modelo. La presencia del modelo completo
        # es lo que permite al frontend reconocer el nuevo activo.
        with destino_original.open('xb') as salida:
            salida.write(archivo_tmp.read_bytes())
        if not destino_actual.exists():
            with destino_actual.open('xb') as salida:
                salida.write(archivo_tmp.read_bytes())
        # os.rename no reemplaza directorios existentes en Windows.
        if destino_modelo.exists():
            raise FileExistsError('El modelo apareció durante el entrenamiento. Se conserva el existente.')
        temporal_modelo.rename(destino_modelo)
    print('\nMODELO REGISTRADO:', simbolo, flush=True)
    print('Muestras:', informe['datos'], flush=True)
    print('Métricas de prueba:', informe['prueba'], flush=True)
    print('Nota: evaluación histórica experimental; no implica capacidad predictiva futura.', flush=True)


def main():
    p = argparse.ArgumentParser(description='Entrenar un nuevo activo MEXC sin sobrescribir modelos')
    p.add_argument('--simbolo', required=True)
    p.add_argument('--max-velas', type=int, default=1500)
    p.add_argument('--epocas', type=int, default=60)
    p.add_argument('--paciencia', type=int, default=10)
    p.add_argument('--semilla', type=int, default=42)
    a = p.parse_args()
    if not 365 <= a.max_velas <= 5000 or not 1 <= a.epocas <= 500 or not 1 <= a.paciencia <= 100:
        p.error('max-velas: 365..5000; epocas: 1..500; paciencia: 1..100')
    try:
        alta(a.simbolo, a.max_velas, a.epocas, a.paciencia, a.semilla)
    except (ValueError, FileExistsError, RuntimeError, OSError, KeyError, TypeError) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
