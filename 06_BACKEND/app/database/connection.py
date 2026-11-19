from contextlib import contextmanager
from pathlib import Path
import sqlite3

# Carpeta principal del backend
BASE_DIR = Path(__file__).resolve().parents[2]

# Archivo donde se guardarán los datos
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "dl_finanzas.db"


def obtener_conexion():
    """Abre una conexión a la base de datos SQLite."""
    conexion = sqlite3.connect(
        DB_PATH,
        timeout=30
    )

    conexion.row_factory = sqlite3.Row
    conexion.execute("PRAGMA foreign_keys = ON")

    return conexion


@contextmanager
def conexion_segura():
    """Abre y cierra una conexión SQLite de forma segura."""
    conexion = obtener_conexion()

    try:
        with conexion:
            yield conexion
    finally:
        conexion.close()

def inicializar_base_datos():
    """Crea las tablas iniciales si no existen."""

    with conexion_segura() as conexion:

        conexion.execute("""
            CREATE TABLE IF NOT EXISTS ciclos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fecha_utc TEXT NOT NULL,
                estado TEXT NOT NULL,
                modelo TEXT,
                observaciones TEXT
            )
        """)

        conexion.execute("""
            CREATE TABLE IF NOT EXISTS bitacora (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fecha_utc TEXT NOT NULL,
                nivel TEXT NOT NULL,
                evento TEXT NOT NULL,
                detalle TEXT
            )
        """)


        conexion.execute("""
            CREATE TABLE IF NOT EXISTS predicciones_lstm_mexc (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fecha_registro_utc TEXT NOT NULL,
                fecha_emision TEXT NOT NULL,
                fecha_objetivo TEXT NOT NULL,
                modelo TEXT NOT NULL,
                activo TEXT NOT NULL,
                rendimiento_estimado REAL NOT NULL,
                direccion_estimacion TEXT NOT NULL,
                fuente TEXT NOT NULL,
                UNIQUE (modelo, activo, fecha_emision)
            )
        """)


        conexion.execute("""
            CREATE TABLE IF NOT EXISTS evaluaciones_lstm_mexc (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prediccion_id INTEGER NOT NULL UNIQUE,
                fecha_evaluacion_utc TEXT NOT NULL,
                rendimiento_observado REAL NOT NULL,
                error_absoluto REAL NOT NULL,
                direccion_correcta INTEGER NOT NULL,
                fuente TEXT NOT NULL,
                FOREIGN KEY (prediccion_id)
                    REFERENCES predicciones_lstm_mexc(id)
            )
        """)

        conexion.commit()

    return DB_PATH
