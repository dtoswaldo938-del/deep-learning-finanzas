
from datetime import datetime, timezone

from app.database.connection import obtener_conexion


def registrar_ciclo():
    """Registra un ciclo de prueba del agente académico."""

    fecha = datetime.now(timezone.utc).isoformat()

    estado = "COMPLETADO"
    modelo = "LSTM_A"
    observaciones = (
        "Ciclo de prueba del sistema. "
        "Sin predicciones reales ni operaciones financieras. "
        "Modo simulacion."
    )

    with obtener_conexion() as conexion:
        cursor = conexion.execute(
            """
            INSERT INTO ciclos (
                fecha_utc,
                estado,
                modelo,
                observaciones
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                fecha,
                estado,
                modelo,
                observaciones
            )
        )

        conexion.commit()
        ciclo_id = cursor.lastrowid

    print("=== CICLO REGISTRADO ===")
    print(f"ID: {ciclo_id}")
    print(f"Fecha UTC: {fecha}")
    print(f"Estado: {estado}")
    print(f"Modelo: {modelo}")
    print(f"Observaciones: {observaciones}")
    print("Guardado correctamente en SQLite.")


if __name__ == "__main__":
    registrar_ciclo()
