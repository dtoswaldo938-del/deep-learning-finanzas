import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from historial_capital_virtual import consultar_historial_capital
from simulacion_lstm_virtual import consultar_escenarios_lstm
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import csv
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from leer_precios import leer_precios
from mexc_tiempo_real import consultar_precio_mexc
from guardar_prediccion_lstm import guardar_o_recuperar_prediccion
from actualizacion_automatica_lstm import (
    ejecutar_actualizacion_automatica,
    consultar_estado_actualizacion,
)

from capital_virtual import (
    inicializar_capital_virtual,
    consultar_capital_virtual,
)

from metricas_precision_lstm import consultar_metricas_precision_lstm

from app.database.connection import (
    DB_PATH,
    inicializar_base_datos,
    obtener_conexion,
)



@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa SQLite y administra la evaluación automática."""

    inicializar_base_datos()

    tarea_actualizacion = asyncio.create_task(
        ejecutar_actualizacion_automatica()
    )

    try:
        yield
    finally:
        tarea_actualizacion.cancel()

        try:
            await tarea_actualizacion
        except asyncio.CancelledError:
            pass



app = FastAPI(
    title="DL Finanzas API",
    description=(
        "Backend académico de análisis financiero "
        "y simulaciones con capital virtual."
    ),
    version="0.2.0",
    lifespan=lifespan,
)

# Permitir que nuestro frontend React consulte el backend.
app.add_middleware(
    CORSMiddleware,
    
allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
],

    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)



@app.get("/")
def inicio():
    return {
        "proyecto": "Deep Learning para Finanzas",
        "mensaje": "Backend funcionando correctamente",
        "modo": "simulacion",
        "operaciones_reales": False,
    }


@app.get("/health")
def verificar_estado():
    return {
        "status": "ok",
        "servicio": "DL Finanzas API",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "modo": "simulacion",
    }


@app.get("/database/status")
def verificar_base_datos():
    with obtener_conexion() as conexion:
        resultado = conexion.execute(
            "SELECT name FROM sqlite_master "
            "WHERE type = 'table' "
            "ORDER BY name"
        ).fetchall()

    tablas = [fila["name"] for fila in resultado]

    return {
        "status": "ok",
        "database": "SQLite",
        "archivo": DB_PATH.name,
        "tablas": tablas,
        "persistencia": True,
        "modo": "simulacion",
    }


# ==========================================================
# CONSULTAR CICLOS GUARDADOS EN SQLITE
# ==========================================================

from app.database.connection import obtener_conexion


@app.get("/ciclos")
def consultar_ciclos():
    """Consulta el historial de ciclos del agente académico."""

    with obtener_conexion() as conexion:
        registros = conexion.execute(
            """
            SELECT
                id,
                fecha_utc,
                estado,
                modelo,
                observaciones
            FROM ciclos
            ORDER BY id DESC
            LIMIT 100
            """
        ).fetchall()

    ciclos = [dict(registro) for registro in registros]

    return {
        "status": "ok",
        "modo": "simulacion",
        "total_mostrados": len(ciclos),
        "ciclos": ciclos
    }


@app.get("/precios")
def consultar_precios(limite: int = 100):
    """
    Consulta precios históricos de BTC/USDT.
    Solo lectura. No ejecuta operaciones financieras.
    """

    precios = leer_precios()

    limite = max(1, min(limite, 1999))
    seleccionados = precios[-limite:]

    resultado = []

    for fila in seleccionados:
        resultado.append({
            "fecha": fila["fecha"],
            "open": float(fila["open"]),
            "high": float(fila["high"]),
            "low": float(fila["low"]),
            "close": float(fila["close"]),
            "volume": float(fila["volume"])
        })

    return {
        "status": "ok",
        "activo": "BTCUSDT",
        "intervalo": "1d",
        "fuente": "MEXC",
        "modo": "historico",
        "total": len(resultado),
        "precios": resultado
    }



@app.get("/modelos/comparacion")
def obtener_comparacion_modelos():
    """Consulta los resultados académicos del capítulo 8."""
    import csv
    from pathlib import Path

    ruta_csv = (
        Path(__file__).resolve().parent.parent
        / "data"
        / "comparacion_cap8.csv"
    )

    if not ruta_csv.is_file():
        return {
            "status": "error",
            "mensaje": "No se encontró comparacion_cap8.csv",
            "modelos": [],
        }

    modelos = []

    with ruta_csv.open(
        "r", encoding="utf-8-sig", newline=""
    ) as archivo:
        lector = csv.DictReader(archivo)

        for fila in lector:
            modelos.append({
                "modelo": fila["Modelo"],
                "mae": float(fila["MAE VA"]),
                "rmse": float(fila["RMSE VA"]),
                "desv_rmse": (
                    float(fila["desv. RMSE VA"])
                    if fila.get("desv. RMSE VA", "").strip()
                    else None
                ),
            })

    modelos.sort(key=lambda modelo: modelo["rmse"])

    return {
        "status": "ok",
        "modo": "evaluacion_academica",
        "conjunto": "validacion",
        "total_modelos": len(modelos),
        "modelos": modelos,
    }


# ============================================================
# CAPÍTULO 9: RESULTADOS DE VALIDACIÓN Y SIMULACIÓN VIRTUAL
# ============================================================

import csv
from pathlib import Path
from fastapi import HTTPException

DIR_RESULTADOS_CAP09 = (
    Path(__file__).resolve().parent.parent
    / "data"
)


def leer_csv_cap09(nombre_archivo: str):
    ruta = DIR_RESULTADOS_CAP09 / nombre_archivo

    if not ruta.is_file():
        raise HTTPException(
            status_code=404,
            detail=f"No se encontró el archivo: {nombre_archivo}"
        )

    try:
        with ruta.open(
            mode="r",
            encoding="utf-8-sig",
            newline=""
        ) as archivo:
            lector = csv.DictReader(archivo)
            return list(lector)
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Error al leer {nombre_archivo}: {error}"
        )


@app.get("/cap09/modelos")
def consultar_modelos_cap09():
    filas = leer_csv_cap09("resumen_modelos.csv")

    return {
        "status": "ok",
        "capitulo": 9,
        "total": len(filas),
        "modelos": filas
    }


@app.get("/cap09/folds")
def consultar_folds_cap09():
    filas = leer_csv_cap09("metricas_folds.csv")

    return {
        "status": "ok",
        "capitulo": 9,
        "total": len(filas),
        "folds": filas
    }


@app.get("/cap09/simulacion")
def consultar_simulacion_cap09():
    filas = leer_csv_cap09(
        "resumen_simulacion_virtual.csv"
    )

    return {
        "status": "ok",
        "capitulo": 9,
        "modo": "simulacion",
        "total": len(filas),
        "resultados": filas
    }


# ============================================================
# CAPÍTULO 10: APRENDIZAJE POR REFUERZO
# Resultados históricos de simulación académica
# ============================================================

import csv
import json
from pathlib import Path
from fastapi import HTTPException

DIR_CAP10 = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "cap10"
)


def leer_csv_cap10(nombre_archivo: str):
    ruta = DIR_CAP10 / nombre_archivo

    if not ruta.is_file():
        raise HTTPException(
            status_code=404,
            detail=f"No se encontró {nombre_archivo}"
        )

    try:
        with ruta.open(
            mode="r",
            encoding="utf-8-sig",
            newline=""
        ) as archivo:
            return list(csv.DictReader(archivo))

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Error al leer {nombre_archivo}: {error}"
        )


@app.get("/cap10/politicas")
def consultar_politicas_cap10():
    filas = leer_csv_cap10("comparacion_politicas_va.csv")

    return {
        "status": "ok",
        "capitulo": 10,
        "modo": "simulacion",
        "total": len(filas),
        "politicas": filas
    }


@app.get("/cap10/recompensas")
def consultar_recompensas_cap10():
    filas = leer_csv_cap10("recompensas_entrenamiento.csv")

    return {
        "status": "ok",
        "capitulo": 10,
        "total": len(filas),
        "recompensas": filas
    }


@app.get("/cap10/trayectorias")
def consultar_trayectorias_cap10():
    filas = leer_csv_cap10("trayectorias_virtuales_va.csv")

    return {
        "status": "ok",
        "capitulo": 10,
        "modo": "simulacion",
        "total": len(filas),
        "trayectorias": filas
    }


@app.get("/cap10/configuracion")
def consultar_configuracion_cap10():
    ruta = DIR_CAP10 / "configuracion.json"

    if not ruta.is_file():
        raise HTTPException(
            status_code=404,
            detail="No se encontró configuracion.json"
        )

    try:
        with ruta.open(
            mode="r",
            encoding="utf-8-sig"
        ) as archivo:
            configuracion = json.load(archivo)

    except (OSError, json.JSONDecodeError) as error:
        raise HTTPException(
            status_code=500,
            detail=f"Error al leer la configuración: {error}"
        )

    return {
        "status": "ok",
        "capitulo": 10,
        "configuracion": configuracion
    }


# CAPÍTULO 10: TRAYECTORIAS DEL CAPITAL VIRTUAL

@app.get("/cap10/trayectorias")
def consultar_trayectorias_cap10():
    import csv
    from pathlib import Path

    ruta = (
        Path(__file__).resolve().parent.parent
        / "data"
        / "cap10"
        / "trayectorias_virtuales_va.csv"
    )

    if not ruta.is_file():
        raise HTTPException(
            status_code=404,
            detail="No se encontró el archivo de trayectorias del capítulo 10."
        )

    with ruta.open("r", encoding="utf-8-sig", newline="") as archivo:
        filas = list(csv.DictReader(archivo))

    trayectorias = []

    for fila in filas:
        trayectorias.append({
            "fecha": fila["fecha_objetivo"],
            "politica": fila["politica"],
            "capital_virtual": float(fila["capital_virtual"]),
            "drawdown": float(fila["drawdown"]),
        })

    return {
        "status": "ok",
        "capitulo": 10,
        "modo": "simulacion",
        "total": len(trayectorias),
        "trayectorias": trayectorias,
    }


# ============================================================
# CAPÍTULO 11 - EVALUACIÓN FINAL DE MODELOS
# ============================================================

import csv as csv_cap11
import json as json_cap11
from pathlib import Path as PathCap11

from fastapi import HTTPException as HTTPExceptionCap11


# Carpeta donde están los archivos originales del capítulo 11
CARPETA_CAP11 = (
    PathCap11(__file__).resolve().parent.parent
    / "data"
    / "cap11"
)


def leer_csv_cap11(nombre_archivo: str):
    """Lee un CSV sin modificar los resultados originales."""

    ruta = CARPETA_CAP11 / nombre_archivo

    if not ruta.is_file():
        raise HTTPExceptionCap11(
            status_code=404,
            detail=f"No se encontró el archivo: {nombre_archivo}"
        )

    try:
        with ruta.open(
            mode="r",
            encoding="utf-8-sig",
            newline=""
        ) as archivo:
            lector = csv_cap11.DictReader(archivo)
            registros = list(lector)

        return registros

    except (OSError, UnicodeError, csv_cap11.Error) as error:
        raise HTTPExceptionCap11(
            status_code=500,
            detail=f"Error al leer {nombre_archivo}: {error}"
        )


@app.get("/cap11/evaluacion")
def consultar_evaluacion_cap11():

    registros = leer_csv_cap11(
        "evaluacion_final_te_cap11.csv"
    )

    return {
        "status": "ok",
        "capitulo": 11,
        "conjunto": "test",
        "total": len(registros),
        "resultados": registros
    }


@app.get("/cap11/validacion")
def consultar_validacion_cap11():

    registros = leer_csv_cap11(
        "comparacion_validacion_cap11.csv"
    )

    return {
        "status": "ok",
        "capitulo": 11,
        "conjunto": "validacion",
        "total": len(registros),
        "resultados": registros
    }


@app.get("/cap11/protocolo")
def consultar_protocolo_cap11():

    ruta = CARPETA_CAP11 / "protocolo_congelado_cap11.json"

    if not ruta.is_file():
        raise HTTPExceptionCap11(
            status_code=404,
            detail="No se encontró el protocolo congelado."
        )

    try:
        with ruta.open(
            mode="r",
            encoding="utf-8-sig"
        ) as archivo:
            protocolo = json_cap11.load(archivo)

    except (OSError, UnicodeError, json_cap11.JSONDecodeError) as error:
        raise HTTPExceptionCap11(
            status_code=500,
            detail=f"Error al leer el protocolo: {error}"
        )

    return {
        "status": "ok",
        "capitulo": 11,
        "protocolo": protocolo
    }


# ============================================================
# LSTM-A - PREDICCION HISTORICA ACADEMICA
# ============================================================

@app.get("/api/prediccion-lstm")
def consultar_prediccion_lstm():
    """Consulta una inferencia historica del LSTM-A entrenado."""
    import csv
    from pathlib import Path

    import joblib
    import numpy as np
    import torch
    from torch import nn

    base = Path(__file__).resolve().parent.parent

    ruta_datos = (
        base / "data"
        / "procesado_ventanas_BTCUSDT_1d_simples.csv"
    )
    ruta_modelo = base / "modelos" / "lstm_a_cap11.pt"
    ruta_escaladores = (
        base / "modelos"
        / "modelos_clasicos_y_escaladores.joblib"
    )

    for ruta in (ruta_datos, ruta_modelo, ruta_escaladores):
        if not ruta.is_file():
            raise HTTPException(
                status_code=404,
                detail=f"Archivo no encontrado: {ruta.name}",
            )

    with ruta_datos.open(
        encoding="utf-8-sig",
        newline="",
    ) as archivo:
        filas = list(csv.DictReader(archivo))

    if not filas:
        raise HTTPException(
            status_code=422,
            detail="El archivo procesado no contiene observaciones.",
        )

    ultima = filas[-1]
    columnas = [f"lag_{i}" for i in range(20)]

    valores = np.array(
        [[float(ultima[col]) for col in columnas]],
        dtype=np.float32,
    )

    objetos = joblib.load(ruta_escaladores)

    entrada_escalada = objetos["scaler_lags"].transform(valores)

    entrada = torch.tensor(
        entrada_escalada[:, :, None],
        dtype=torch.float32,
    )

    class ModeloLSTM(nn.Module):
        def __init__(self, input_size=1, hidden_size=32):
            super().__init__()
            self.lstm = nn.LSTM(
                input_size,
                hidden_size,
                batch_first=True,
            )
            self.fc = nn.Linear(hidden_size, 1)

        def forward(self, x):
            salida, _ = self.lstm(x)
            return self.fc(salida[:, -1, :])

    checkpoint = torch.load(
        ruta_modelo,
        map_location="cpu",
        weights_only=True,
    )

    config = checkpoint["model_config"]

    modelo = ModeloLSTM(
        input_size=config["input_size"],
        hidden_size=config["hidden_size"],
    )

    modelo.load_state_dict(checkpoint["model_state_dict"])
    modelo.eval()

    with torch.no_grad():
        prediccion_escalada = modelo(entrada).numpy()

    prediccion = float(
        objetos["scaler_y"].inverse_transform(
            prediccion_escalada
        )[0, 0]
    )

    observado = float(ultima["target"])

    return {
        "status": "ok",
        "modelo": "LSTM-A",
        "activo": "BTCUSDT",
        "modo": "evaluacion_historica",
        "operaciones_reales": False,
        "fecha_emision": ultima["fecha_emision"],
        "fecha_objetivo": ultima["fecha_objetivo"],
        "rendimiento_estimado": prediccion,
        "rendimiento_observado": observado,
        "error_absoluto": abs(prediccion - observado),
        "direccion_estimacion": (
            "subida" if prediccion > 0
            else "bajada" if prediccion < 0
            else "sin_cambio"
        ),
    }


@app.get("/api/mexc/precio-actual")
def obtener_precio_actual_mexc():
    """Consulta el precio público de BTCUSDT desde MEXC."""

    resultado = consultar_precio_mexc()

    if resultado["status"] != "ok":
        raise HTTPException(
            status_code=503,
            detail={
                "mensaje": "No fue posible consultar MEXC.",
                "detalle": resultado["mensaje"]
            }
        )

    return resultado




@app.get("/api/mexc/prediccion-lstm")
def obtener_prediccion_lstm_mexc():
    """Consulta una predicción LSTM-A persistida en SQLite."""

    try:
        resultado = guardar_o_recuperar_prediccion()

        registro = resultado["prediccion"]
        rendimiento = float(
            registro["rendimiento_estimado"]
        )

        # Mantener el formato esperado por React.
        return {
            "status": "ok",
            "fuente": registro["fuente"],
            "modelo": registro["modelo"],
            "activo": registro["activo"],
            "modo": "inferencia_nueva",
            "fecha_emision": registro["fecha_emision"],
            "fecha_objetivo": registro["fecha_objetivo"],
            "rendimiento_estimado": rendimiento,
            "rendimiento_estimado_porcentaje": rendimiento * 100,
            "direccion_estimacion": registro["direccion_estimacion"],
            "rendimiento_observado": None,
            "operaciones_reales": False,
            "persistencia": {
                "id": registro["id"],
                "accion": resultado["accion"],
                "inferencia_ejecutada": resultado[
                    "inferencia_ejecutada"
                ],
            },
        }

    except (OSError, ValueError, KeyError) as error:
        raise HTTPException(
            status_code=503,
            detail={
                "mensaje": (
                    "No fue posible consultar la predicción "
                    "LSTM-A con datos de MEXC."
                ),
                "detalle": str(error),
            },
        ) from error


# ============================================================
# LSTM-A - EVALUACIONES DE PREDICCIONES DIARIAS
# ============================================================

from consultar_evaluaciones_lstm import consultar_evaluaciones_lstm
from evaluar_predicciones_lstm import evaluar_predicciones_pendientes


@app.get("/api/mexc/evaluaciones-lstm")
def obtener_evaluaciones_lstm():
    """Consulta el historial de evaluaciones en SQLite."""
    return consultar_evaluaciones_lstm()


@app.get("/api/mexc/evaluaciones-lstm/actualizar")
def actualizar_evaluaciones_lstm():
    """Evalúa las predicciones pendientes y devuelve el historial."""

    resultado_evaluacion = evaluar_predicciones_pendientes()
    historial = consultar_evaluaciones_lstm()

    return {
        "status": "ok",
        "actualizacion": resultado_evaluacion,
        "historial": historial,
        "operaciones_reales": False,
    }
# ==========================================================
# MONITOR DE ACTUALIZACIONES AUTOMATICAS LSTM-A
# ==========================================================

@app.get("/api/mexc/estado-actualizacion-lstm")
def obtener_estado_actualizacion_lstm():
    """Consulta el estado de la evaluación automática."""

    return {
        "status": "ok",
        "modelo": "LSTM-A",
        "activo": "BTCUSDT",
        "intervalo_segundos": 1800,
        "monitor": consultar_estado_actualizacion(),
        "operaciones_reales": False,
    }

# ==========================================================
# SIMULADOR ACADEMICO - CAPITAL VIRTUAL
# ==========================================================

@app.get("/api/simulador/capital")
def obtener_capital_simulado():
    """Consulta el saldo de la cuenta virtual."""
    return consultar_capital_virtual()

# ==========================================================
# SIMULADOR ACADEMICO - HISTORIAL DE CAPITAL
# ==========================================================

@app.get("/api/simulador/historial")
def obtener_historial_simulado():
    """Consulta los movimientos de capital ficticio."""
    return consultar_historial_capital()


# ==========================================================
# SIMULADOR ACADEMICO - ESCENARIOS LSTM-A
# ==========================================================

@app.get("/api/simulador/escenarios-lstm")
def obtener_escenarios_lstm_simulados():
    """Consulta escenarios hipotéticos basados en LSTM-A."""
    return consultar_escenarios_lstm()


# ==========================================================
# SIMULADOR ACADEMICO - METRICAS DE PRECISION LSTM-A
# ==========================================================

@app.get("/api/simulador/metricas-precision-lstm")
def obtener_metricas_precision_lstm():
    """Consulta las métricas académicas del modelo LSTM-A."""
    return consultar_metricas_precision_lstm()



# ============================================================
# LABORATORIO LSTM - RESULTADOS HISTORICOS EXPERIMENTALES
# ============================================================

DIR_LABORATORIO = (
    Path(__file__).resolve().parents[1]
    / "laboratorio_lstm"
    / "resultados"
)

DIR_GRAFICAS_LABORATORIO = DIR_LABORATORIO / "graficas"

if DIR_GRAFICAS_LABORATORIO.is_dir():
    app.mount(
        "/api/laboratorio-lstm/graficas",
        StaticFiles(directory=str(DIR_GRAFICAS_LABORATORIO)),
        name="graficas_laboratorio_lstm",
    )


@app.get("/api/laboratorio-lstm/evaluacion")
def consultar_evaluacion_laboratorio_lstm():
    """Consulta resultados historicos del experimento LSTM-32."""

    ruta = DIR_LABORATORIO / "evaluacion_final_lstm32.csv"

    if not ruta.is_file():
        raise HTTPException(
            status_code=404,
            detail="No se encontro la evaluacion del laboratorio.",
        )

    with ruta.open("r", encoding="utf-8-sig", newline="") as archivo:
        filas = list(csv.DictReader(archivo))

    metricas = {}

    for fila in filas:
        nombre = fila["modelo"]

        metricas[nombre] = {
            "mae": float(fila["mae"]),
            "rmse": float(fila["rmse"]),
            "sesgo": float(fila["sesgo"]),
            "precision_direccional": (
                float(fila["precision_direccional"])
                if fila["precision_direccional"]
                and fila["precision_direccional"].lower() != "nan"
                else None
            ),
        }

    return {
        "status": "ok",
        "tipo": "evaluacion_historica",
        "activo": "BTCUSDT",
        "modelo_seleccionado": "LSTM_32",
        "observaciones_test": 298,
        "metricas": metricas,
        "graficas": [
            "/api/laboratorio-lstm/graficas/01_rendimientos_lstm.png",
            "/api/laboratorio-lstm/graficas/02_errores_test.png",
            "/api/laboratorio-lstm/graficas/03_comparacion_metricas.png",
        ],
        "capital_virtual_modificado": False,
        "operaciones_reales": False,
    }


# ============================================================
# LABORATORIO LSTM - ANALISIS AVANZADO DE ERRORES
# ============================================================

@app.get("/api/laboratorio-lstm/analisis-errores")
def consultar_analisis_errores_lstm():
    """Consulta el analisis historico de errores LSTM-32."""

    import json

    ruta = (
        DIR_LABORATORIO
        / "analisis_errores_lstm32.json"
    )

    if not ruta.is_file():
        raise HTTPException(
            status_code=404,
            detail="No se encontro el analisis de errores.",
        )

    with ruta.open("r", encoding="utf-8") as archivo:
        datos = json.load(archivo)

    if datos.get("status") != "ok":
        raise HTTPException(
            status_code=500,
            detail="El analisis no contiene resultados validos.",
        )

    return {
        **datos,
        "graficas": [
            "/api/laboratorio-lstm/graficas/04_dispersion_lstm.png",
            "/api/laboratorio-lstm/graficas/05_distribucion_errores.png",
        ],
        "operaciones_reales": False,
        "capital_virtual_modificado": False,
    }


# ============================================================
# LABORATORIO LSTM - COMPARACION DIRECCIONAL
# ============================================================

@app.get("/api/laboratorio-lstm/comparacion-direccional")
def consultar_comparacion_direccional():
    """Consulta la comparacion direccional historica."""

    import json

    ruta = (
        DIR_LABORATORIO
        / "comparacion_direccional.json"
    )

    if not ruta.is_file():
        raise HTTPException(
            status_code=404,
            detail="No se encontro la comparacion direccional.",
        )

    with ruta.open("r", encoding="utf-8") as archivo:
        datos = json.load(archivo)

    if datos.get("status") != "ok":
        raise HTTPException(
            status_code=500,
            detail="Los resultados no son validos.",
        )

    total = datos["observaciones"]

    if total <= 0:
        raise HTTPException(
            status_code=500,
            detail="Numero de observaciones invalido.",
        )

    # Referencia descriptiva: siempre bajada.
    dias_bajada = datos["dias_reales_bajada"]

    return {
        **datos,
        "aciertos_siempre_bajada": dias_bajada,
        "precision_siempre_bajada": (
            dias_bajada / total * 100
        ),
        "capital_virtual_modificado": False,
        "operaciones_reales": False,
    }
