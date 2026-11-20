from fastapi import APIRouter

from .integraciones.mexc_demo import ConexionMexcDemo

router = APIRouter(
    prefix="/api/integracion-mexc",
    tags=["Integracion MEXC"]
)


@router.get("/estado")
def estado_integracion():
    conexion = ConexionMexcDemo()
    return conexion.comprobar_conexion()
