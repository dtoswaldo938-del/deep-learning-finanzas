from dataclasses import dataclass
from datetime import datetime, timezone
import secrets


@dataclass
class CredencialesDemo:
    api_key: str
    api_secret: str


class ConexionMexcDemo:
    """
    Adaptador de autenticacion simulado.
    No utiliza credenciales reales ni envia ordenes.
    """

    def __init__(self):
        self.credenciales = CredencialesDemo(
            api_key="DEMO_" + secrets.token_hex(12),
            api_secret=secrets.token_hex(24),
        )

    def comprobar_conexion(self):
        return {
            "estado": "simulacion_correcta",
            "proveedor": "MEXC",
            "tipo_conexion": "autenticacion_simulada",
            "credenciales_reales": False,
            "operaciones_reales": False,
            "fecha_utc": datetime.now(timezone.utc).isoformat(),
        }
