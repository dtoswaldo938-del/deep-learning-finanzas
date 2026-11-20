
"""
Extraccion de activaciones internas de LSTM-A.

Este modulo permite consultar las salidas ocultas
de los 20 pasos temporales del modelo entrenado.

No modifica pesos, no reentrena el modelo y no
guarda predicciones en la base de datos.
"""

import json
from datetime import date, timedelta

import joblib
import numpy as np
import torch

from inferencia_lstm_mexc import (
    ModeloLSTM,
    RUTA_ESCALADORES,
    RUTA_MODELO,
)
from preparar_datos_lstm_mexc import preparar_datos_lstm


def obtener_activaciones_lstm():
    """
    Obtiene activaciones reales de la LSTM-A.

    Conserva la respuesta anterior y agrega:
    - secuencia_oculta: 20 x 32
    - entrada_escalada: 20 valores
    - resumen_temporal: estadisticas por paso
    """

    # 1. Preparar los mismos datos que utiliza
    #    la inferencia original.
    datos = preparar_datos_lstm()

    columnas = [
        f"lag_{i}"
        for i in range(20)
    ]

    valores = np.array(
        [[
            datos["rezagos"][col]
            for col in columnas
        ]],
        dtype=np.float32,
    )

    # 2. Utilizar los escaladores originales.
    objetos = joblib.load(
        RUTA_ESCALADORES
    )

    valores_escalados = (
        objetos["scaler_lags"].transform(
            valores
        )
    )

    entrada = torch.tensor(
        valores_escalados[:, :, None],
        dtype=torch.float32,
    )

    # 3. Cargar exactamente el mismo checkpoint.
    checkpoint = torch.load(
        RUTA_MODELO,
        map_location="cpu",
        weights_only=True,
    )

    config = checkpoint["model_config"]

    modelo = ModeloLSTM(
        input_size=config["input_size"],
        hidden_size=config["hidden_size"],
    )

    modelo.load_state_dict(
        checkpoint["model_state_dict"]
    )

    modelo.eval()

    # 4. Ejecutar inferencia sin gradientes.
    with torch.no_grad():
        salida_lstm, (
            estado_oculto,
            estado_celda,
        ) = modelo.lstm(entrada)

        prediccion_escalada = (
            modelo.fc(
                salida_lstm[:, -1, :]
            )
            .cpu()
            .numpy()
        )

    # 5. Recuperar rendimiento estimado.
    rendimiento_estimado = float(
        objetos["scaler_y"].inverse_transform(
            prediccion_escalada
        )[0, 0]
    )

    # 6. Obtener todas las salidas ocultas:
    #    (batch=1, steps=20, hidden=32).
    secuencia_numpy = (
        salida_lstm[0]
        .detach()
        .cpu()
        .numpy()
    )

    # 7. Mantener los 32 valores finales.
    activaciones_finales = (
        secuencia_numpy[-1]
        .tolist()
    )

    # 8. Mantener el estado de celda final.
    estado_celda_final = (
        estado_celda[-1, 0, :]
        .detach()
        .cpu()
        .numpy()
        .tolist()
    )

    # 9. Preparar la secuencia completa.
    secuencia_oculta = [
        [
            round(float(valor), 8)
            for valor in fila
        ]
        for fila in secuencia_numpy
    ]

    entrada_temporal = [
        round(float(valor), 8)
        for valor in valores_escalados[0]
    ]

    # 10. Calcular estadisticas descriptivas
    #     de cada paso temporal.
    resumen_temporal = []

    for indice, fila in enumerate(
        secuencia_numpy
    ):
        valores_absolutos = np.abs(fila)

        resumen_temporal.append({
            "paso": indice + 1,
            "entrada_escalada": (
                entrada_temporal[indice]
            ),
            "magnitud_media": round(
                float(
                    np.mean(valores_absolutos)
                ),
                8,
            ),
            "magnitud_maxima": round(
                float(
                    np.max(valores_absolutos)
                ),
                8,
            ),
            "activaciones_positivas": int(
                np.sum(fila > 0)
            ),
            "activaciones_negativas": int(
                np.sum(fila < 0)
            ),
        })

    # 11. Fechas originales.
    fecha_emision = date.fromisoformat(
        datos["ultima_vela_cerrada"]
    )

    fecha_objetivo = (
        fecha_emision
        + timedelta(days=1)
    )

    # 12. Respuesta compatible con el frontend.
    return {
        "status": "ok",
        "modelo": "LSTM-A",
        "activo": "BTCUSDT",
        "tipo": "activaciones_reales",
        "fecha_emision": (
            fecha_emision.isoformat()
        ),
        "fecha_objetivo": (
            fecha_objetivo.isoformat()
        ),
        "arquitectura": {
            "tipo": "LSTM",
            "capas_lstm": config.get(
                "num_layers",
                1,
            ),
            "neuronas_ocultas": (
                config["hidden_size"]
            ),
            "longitud_secuencia": (
                int(entrada.shape[1])
            ),
        },

        # Campos originales.
        "activaciones": [
            round(float(valor), 8)
            for valor in activaciones_finales
        ],
        "estado_celda": [
            round(float(valor), 8)
            for valor in estado_celda_final
        ],
        "rendimiento_estimado_porcentaje": (
            rendimiento_estimado * 100
        ),
        "operaciones_reales": False,

        # Nuevos campos temporales.
        "secuencia_oculta": secuencia_oculta,
        "entrada_escalada": entrada_temporal,
        "resumen_temporal": resumen_temporal,

        # Metadatos de interpretacion.
        "interpretacion_temporal": {
            "tipo": "salidas_ocultas_reales",
            "forma": [
                int(secuencia_numpy.shape[0]),
                int(secuencia_numpy.shape[1]),
            ],
            "orden": (
                "Mismo orden de entrada que "
                "la inferencia original"
            ),
            "incluye_estados_celda_intermedios": False,
            "predicciones_independientes_por_paso": False,
        },
    }


if __name__ == "__main__":
    resultado = obtener_activaciones_lstm()

    print(
        json.dumps(
            resultado,
            indent=4,
            ensure_ascii=False,
        )
    )
