
from app.database.connection import obtener_conexion

with obtener_conexion() as conexion:
    tablas = conexion.execute(
        """
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        ORDER BY name
        """
    ).fetchall()

    print("=== TABLAS DISPONIBLES ===")

    for tabla in tablas:
        print("-", tabla["name"])

    print("\n=== ESTRUCTURA DE CICLOS ===")

    columnas = conexion.execute(
        "PRAGMA table_info(ciclos)"
    ).fetchall()

    for columna in columnas:
        print(
            columna["name"],
            "|",
            columna["type"]
        )
