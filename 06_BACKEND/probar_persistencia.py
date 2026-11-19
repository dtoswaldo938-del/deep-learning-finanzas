
from datetime import datetime, timezone

from app.database.connection import (
    DB_PATH,
    inicializar_base_datos,
    obtener_conexion,
)


def probar_persistencia():
    inicializar_base_datos()

    with obtener_conexion() as conexion:
        conexion.execute(
            """
            INSERT INTO bitacora (
                fecha_utc,
                nivel,
                evento,
                detalle
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                datetime.now(timezone.utc).isoformat(),
                "INFO",
                "PRUEBA_PERSISTENCIA",
                "Registro académico de prueba",
            ),
        )

        conexion.commit()

        resultado = conexion.execute(
            """
            SELECT COUNT(*) AS total
            FROM bitacora
            WHERE evento = 'PRUEBA_PERSISTENCIA'
            """
        ).fetchone()

    print("=== PRUEBA DE PERSISTENCIA ===")
    print(f"Base de datos: {DB_PATH}")
    print(f"Registros de prueba guardados: {resultado['total']}")
    print("Registro insertado correctamente.")


if __name__ == "__main__":
    probar_persistencia()
