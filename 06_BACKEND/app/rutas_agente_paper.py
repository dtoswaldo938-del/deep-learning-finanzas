"""Paper trading didactico: sin claves de exchange, sin ordenes reales.
Ciclos manuales y revision automatica periodica de velas diarias cerradas.
"""
import asyncio
import logging
import math
import os
import secrets
import sqlite3
from datetime import datetime, timezone, date, timedelta
from pathlib import Path
from threading import Lock

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field
from app.database.connection import DB_PATH, obtener_conexion
from app.rutas_agente_ia import analizar
from mexc_tiempo_real import consultar_precio_mexc

router = APIRouter(prefix="/api/agente-paper", tags=["Agente paper trading"])
_LOCK = Lock()
_LOG = logging.getLogger(__name__)
INTERVALO_REVISION_SEGUNDOS = 1800
CAPITAL_INICIAL = 50000.0
MAX_EXPOSICION = 0.10
MAX_PERDIDA_DIARIA = 0.03
COSTO_COMISION = 0.0
TOKEN_PATH = DB_PATH.parent / "agente_paper_token.txt"


def _ahora():
    return datetime.now(timezone.utc).isoformat()


def _token():
    """Secreto local generado al primer uso. No se envia al navegador."""
    env = os.getenv("NEURAL_AGENT_API_KEY", "").strip()
    if env:
        return env
    if not TOKEN_PATH.exists():
        TOKEN_PATH.parent.mkdir(parents=True, exist_ok=True)
        try:
            with TOKEN_PATH.open("x", encoding="utf8") as f:
                f.write(secrets.token_urlsafe(36))
        except FileExistsError:
            pass
    return TOKEN_PATH.read_text(encoding="utf8").strip()


# Acceso sin clave SOLO desde el dashboard local autorizado.
# El encabezado personalizado exige preflight CORS en navegadores.
_ORIGENES_LOCALES = frozenset({
    "http://127.0.0.1:5174", "http://localhost:5174",
    "http://127.0.0.1:5173", "http://localhost:5173",
})


def _auth(request: Request, x_agent_key: str | None, x_neural_local: str | None):
    # La clave sigue funcionando para acceso administrativo y despliegues externos.
    if x_agent_key and secrets.compare_digest(x_agent_key, _token()):
        return
    origen = request.headers.get("origin", "")
    host = request.headers.get("host", "").lower()
    cliente = request.client.host if request.client else ""
    # Sin Origin no hay acceso anónimo: evita que una petición directa a la API
    # pueda controlar el agente sin autenticarse.
    local = (
        cliente in {"127.0.0.1", "::1"}
        and host in {"127.0.0.1:8001", "localhost:8001"}
        and origen in _ORIGENES_LOCALES
        and x_neural_local == "dashboard-v1"
    )
    if not local:
        raise HTTPException(401, "Acceso restringido: usa el dashboard local o una X-Agent-Key válida")


def _db():
    con = obtener_conexion()
    con.execute("""CREATE TABLE IF NOT EXISTS agente_paper_estado (
        id INTEGER PRIMARY KEY CHECK(id=1), modo TEXT NOT NULL,
        saldo REAL NOT NULL, unidades REAL NOT NULL, simbolo TEXT NOT NULL,
        ultima_actualizacion TEXT NOT NULL)""")
    con.execute("""CREATE TABLE IF NOT EXISTS agente_paper_decisiones (
        id INTEGER PRIMARY KEY AUTOINCREMENT, fecha_utc TEXT NOT NULL,
        simbolo TEXT NOT NULL, fecha_vela TEXT, accion TEXT NOT NULL,
        motivo TEXT NOT NULL, estado TEXT NOT NULL, precio REAL,
        unidades REAL NOT NULL DEFAULT 0, saldo_final REAL,
        equity_final REAL, modelo TEXT,
        UNIQUE(simbolo, fecha_vela))""")
    con.execute("""CREATE TABLE IF NOT EXISTS agente_paper_eventos (
        id INTEGER PRIMARY KEY AUTOINCREMENT, fecha_utc TEXT NOT NULL,
        tipo TEXT NOT NULL, detalle TEXT NOT NULL)""")
    con.execute("""INSERT OR IGNORE INTO agente_paper_estado
        (id,modo,saldo,unidades,simbolo,ultima_actualizacion)
        VALUES(1,'DETENIDO',50000,0,'BTCUSDT',?)""", (_ahora(),))
    con.commit()
    return con


def _estado(con):
    return dict(con.execute("SELECT * FROM agente_paper_estado WHERE id=1").fetchone())


def _evento(con, tipo, detalle):
    con.execute("INSERT INTO agente_paper_eventos(fecha_utc,tipo,detalle) VALUES(?,?,?)",
                (_ahora(), tipo, str(detalle)[:500]))


def _precio(simbolo):
    dato = consultar_precio_mexc(simbolo)
    if dato.get('status') != 'ok':
        raise ValueError('Cotizacion MEXC no disponible')
    p = float(dato['precio'])
    if not math.isfinite(p) or p <= 0:
        raise ValueError('Precio invalido')
    return p


@router.get('/estado')
def estado(request: Request, x_agent_key: str | None = Header(default=None), x_neural_local: str | None = Header(default=None)):
    _auth(request, x_agent_key, x_neural_local)
    with _LOCK:
        con = _db()
        try:
            e = _estado(con)
            historial = [dict(r) for r in con.execute(
                'SELECT * FROM agente_paper_decisiones ORDER BY id DESC LIMIT 30')]
            return {'estado': e, 'historial': historial, 'capital_inicial': CAPITAL_INICIAL,
                    'comision': COSTO_COMISION, 'exposicion_maxima': MAX_EXPOSICION,
                    'perdida_diaria_maxima': MAX_PERDIDA_DIARIA,
                    'modo_ejecucion': 'MANUAL_Y_AUTOMATICO',
                    'intervalo_revision_segundos': INTERVALO_REVISION_SEGUNDOS,
                    'operaciones_reales': False}
        finally:
            con.close()


@router.post('/iniciar')
def iniciar(request: Request, x_agent_key: str | None = Header(default=None), x_neural_local: str | None = Header(default=None)):
    _auth(request, x_agent_key, x_neural_local)
    with _LOCK:
        con = _db()
        try:
            con.execute("UPDATE agente_paper_estado SET modo='ACTIVO', ultima_actualizacion=? WHERE id=1", (_ahora(),))
            _evento(con,'INICIAR','Habilitado para ciclos manuales y revision automatica')
            con.commit()
            return {'modo': 'ACTIVO', 'operaciones_reales': False}
        finally:
            con.close()


@router.post('/pausar')
def pausar(request: Request, x_agent_key: str | None = Header(default=None), x_neural_local: str | None = Header(default=None)):
    _auth(request, x_agent_key, x_neural_local)
    with _LOCK:
        con = _db()
        try:
            con.execute("UPDATE agente_paper_estado SET modo='PAUSADO', ultima_actualizacion=? WHERE id=1", (_ahora(),))
            _evento(con,'PAUSAR','Sin nuevas operaciones')
            con.commit()
            return {'modo': 'PAUSADO'}
        finally:
            con.close()


@router.post('/detener')
def detener(request: Request, x_agent_key: str | None = Header(default=None), x_neural_local: str | None = Header(default=None)):
    _auth(request, x_agent_key, x_neural_local)
    with _LOCK:
        con = _db()
        try:
            con.execute("UPDATE agente_paper_estado SET modo='DETENIDO', ultima_actualizacion=? WHERE id=1", (_ahora(),))
            _evento(con,'DETENER','Sin liquidacion automatica')
            con.commit()
            return {'modo': 'DETENIDO', 'liquidacion_automatica': False}
        finally:
            con.close()


class SolicitudCiclo(BaseModel):
    simbolo: str = Field(default='BTCUSDT', pattern=r'^[A-Z0-9]{2,30}$')


@router.post('/ciclo')
def ciclo(solicitud: SolicitudCiclo, request: Request, x_agent_key: str | None = Header(default=None), x_neural_local: str | None = Header(default=None)):
    _auth(request, x_agent_key, x_neural_local)
    simbolo = solicitud.simbolo
    # El candado evita duplicaciones en este proceso. SQLite agrega UNIQUE.
    with _LOCK:
        con = _db()
        try:
            e = _estado(con)
            if e['modo'] != 'ACTIVO':
                raise HTTPException(409, 'Agente pausado o detenido')
            if simbolo != e['simbolo']:
                raise HTTPException(422, 'Este portafolio paper solo permite BTCUSDT')
            try:
                resultado = analizar(simbolo=simbolo)
                vela = resultado['fecha_vela']
                if not resultado.get('datos_vigentes'):
                    raise ValueError('Vela desactualizada')
                antiguedad = (datetime.now(timezone.utc).date() - date.fromisoformat(vela)).days
                if antiguedad < 0 or antiguedad > 2:
                    raise ValueError('Fecha de vela no valida')
                existente = con.execute(
                    'SELECT id FROM agente_paper_decisiones WHERE simbolo=? AND fecha_vela=?',
                    (simbolo,vela)).fetchone()
                if existente:
                    raise HTTPException(409, 'Ciclo duplicado: esa vela ya fue procesada')
                precio = _precio(simbolo)
                accion = resultado['propuesta']['accion']
                motivo = resultado['propuesta']['motivo']
                saldo, unidades = float(e['saldo']), float(e['unidades'])
                equity_antes = saldo + unidades * precio
                if equity_antes <= 0:
                    raise ValueError('Patrimonio invalido')
                # Riesgo: detener compras ante una caida diaria del 3%.
                fila_base = con.execute("""SELECT equity_final FROM agente_paper_decisiones
                    WHERE substr(fecha_utc,1,10)=? ORDER BY id ASC LIMIT 1""",
                    (datetime.now(timezone.utc).date().isoformat(),)).fetchone()
                base_dia = float(fila_base['equity_final']) if fila_base else CAPITAL_INICIAL
                if equity_antes < base_dia * (1 - MAX_PERDIDA_DIARIA):
                    raise ValueError('Limite de perdida diaria alcanzado')
                # Riesgo: limite de exposicion del 10% del patrimonio.
                cantidad = 0.0
                estado = 'MANTENER'
                if accion == 'COMPRAR':
                    valor_actual = unidades * precio
                    presupuesto = min(saldo, max(0.0, MAX_EXPOSICION * equity_antes - valor_actual))
                    if presupuesto >= 10:
                        cantidad = math.floor((presupuesto / precio) * 1e6) / 1e6
                        if cantidad > 0 and cantidad * precio <= saldo:
                            saldo -= cantidad * precio
                            unidades += cantidad
                            estado = 'COMPRA_PAPER'
                        else:
                            estado = 'RECHAZADA_SALDO_O_PRECISION'
                    else:
                        estado = 'RECHAZADA_EXPOSICION_O_SALDO'
                elif accion == 'VENDER':
                    if unidades > 0:
                        cantidad = unidades
                        saldo += cantidad * precio
                        unidades = 0.0
                        estado = 'VENTA_PAPER'
                    else:
                        estado = 'RECHAZADA_SIN_POSICION'
                elif accion != 'MANTENER':
                    raise ValueError('Accion LLM invalida')
                # No se ejecutan ordenes reales. No se cobran comisiones.
                equity = saldo + unidades * precio
                con.execute("""INSERT INTO agente_paper_decisiones
                    (fecha_utc,simbolo,fecha_vela,accion,motivo,estado,precio,unidades,saldo_final,equity_final,modelo)
                    VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                    (_ahora(),simbolo,vela,accion,motivo,estado,precio,cantidad,saldo,equity,
                     resultado['modelo_lenguaje']))
                con.execute("""UPDATE agente_paper_estado SET saldo=?,unidades=?,ultima_actualizacion=?
                    WHERE id=1""", (saldo,unidades,_ahora()))
                _evento(con,'CICLO',f'{simbolo} {vela}: {estado}')
                con.commit()
                return {'estado':estado,'accion_propuesta':accion,'fecha_vela':vela,
                        'precio':precio,'cantidad':cantidad,'saldo':saldo,'unidades':unidades,
                        'equity':equity,'operaciones_reales':False}
            except HTTPException:
                raise
            except (ValueError, KeyError, TypeError, OSError) as exc:
                _evento(con,'ERROR',type(exc).__name__ + ': ' + str(exc))
                con.execute("UPDATE agente_paper_estado SET modo='PAUSADO',ultima_actualizacion=? WHERE id=1", (_ahora(),))
                con.commit()
                raise HTTPException(503,'Ciclo cancelado; agente pausado: '+str(exc)) from exc
        finally:
            con.close()


def _debe_revisar_automaticamente():
    """No llama al LLM si ya se proceso la vela diaria anterior."""
    with _LOCK:
        con = _db()
        try:
            e = _estado(con)
            if e['modo'] != 'ACTIVO':
                return False
            ultima = con.execute(
                'SELECT MAX(fecha_vela) AS fecha FROM agente_paper_decisiones WHERE simbolo=?',
                (e['simbolo'],)
            ).fetchone()['fecha']
            ayer = (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()
            return ultima is None or ultima < ayer
        finally:
            con.close()


async def planificador_agente_paper():
    """Revisa cada 30 min; solo procesa datos vigentes, sin ordenes reales.

    Requiere un unico proceso Uvicorn (--workers 1). Los errores del ciclo
    pausan el agente y quedan registrados por la rutina existente.
    """
    _LOG.info('Agente paper: planificador diario iniciado (revision cada 30 min)')
    while True:
        try:
            if await asyncio.to_thread(_debe_revisar_automaticamente):
                try:
                    respuesta = await asyncio.to_thread(
                        ciclo, SolicitudCiclo(simbolo='BTCUSDT'),
                        Request({'type': 'http', 'headers': [], 'client': ('127.0.0.1', 0)}), _token()
                    )
                    _LOG.info('Agente paper: ciclo automatico %s', respuesta['estado'])
                except HTTPException as exc:
                    if exc.status_code != 409:
                        _LOG.warning('Agente paper: ciclo automatico rechazado: %s', exc.detail)
        except asyncio.CancelledError:
            raise
        except Exception:
            _LOG.exception('Agente paper: fallo inesperado del planificador')
        await asyncio.sleep(INTERVALO_REVISION_SEGUNDOS)


@router.get("/rendimiento")
def rendimiento_paper(
    request: Request,
    x_agent_key: str | None = Header(default=None),
    x_neural_local: str | None = Header(default=None),
):
    """Resumen contable del paper trading, sin ordenes reales."""
    _auth(request, x_agent_key, x_neural_local)

    with _LOCK:
        con = _db()
        try:
            cuenta = _estado(con)
            decisiones = [
                dict(fila) for fila in con.execute(
                    "SELECT * FROM agente_paper_decisiones ORDER BY id ASC"
                )
            ]
        finally:
            con.close()

    saldo = float(cuenta["saldo"])
    unidades = float(cuenta["unidades"])
    costo_posicion = 0.0
    unidades_contables = 0.0
    ganancia_realizada = 0.0
    compras = 0
    ventas = 0
    operaciones = []
    curva = [{
        "fecha": "Capital inicial",
        "patrimonio": CAPITAL_INICIAL,
    }]

    for d in decisiones:
        precio = float(d["precio"] or 0)
        cantidad = float(d["unidades"] or 0)
        tipo = d["estado"]
        ganancia_operacion = None

        if tipo == "COMPRA_PAPER" and precio > 0 and cantidad > 0:
            costo_posicion += precio * cantidad
            unidades_contables += cantidad
            compras += 1

        elif tipo == "VENTA_PAPER" and precio > 0 and cantidad > 0:
            costo_unitario = (
                costo_posicion / unidades_contables
                if unidades_contables > 0 else 0.0
            )
            costo_vendido = costo_unitario * cantidad
            ganancia_operacion = precio * cantidad - costo_vendido
            ganancia_realizada += ganancia_operacion
            costo_posicion = max(0.0, costo_posicion - costo_vendido)
            unidades_contables = max(0.0, unidades_contables - cantidad)
            ventas += 1

        if tipo in ("COMPRA_PAPER", "VENTA_PAPER"):
            operaciones.append({
                "id": d["id"],
                "fecha": d["fecha_utc"],
                "activo": d["simbolo"],
                "tipo": "COMPRA" if tipo == "COMPRA_PAPER" else "VENTA",
                "cantidad": cantidad,
                "precio": precio,
                "importe": precio * cantidad,
                "saldo_final": d["saldo_final"],
                "patrimonio_registrado": d["equity_final"],
                "ganancia_realizada": ganancia_operacion,
            })

        if d["equity_final"] is not None:
            curva.append({
                "fecha": d["fecha_utc"],
                "patrimonio": float(d["equity_final"]),
            })

    precio_actual = None
    fuente = "Sin cotizacion actual"
    if unidades > 0:
        try:
            precio_actual = _precio(cuenta["simbolo"])
            fuente = "MEXC"
        except (ValueError, TypeError, KeyError, OSError):
            for d in reversed(decisiones):
                if d["precio"] is not None and float(d["precio"]) > 0:
                    precio_actual = float(d["precio"])
                    fuente = "Ultimo precio registrado (no en vivo)"
                    break
    else:
        fuente = "Sin posicion abierta"

    valor_posicion = (
        unidades * precio_actual if precio_actual is not None else None
    )
    patrimonio = (
        saldo + valor_posicion if valor_posicion is not None else
        saldo if unidades == 0 else None
    )
    ganancia_total = (
        patrimonio - CAPITAL_INICIAL if patrimonio is not None else None
    )
    rendimiento = (
        ganancia_total / CAPITAL_INICIAL * 100
        if ganancia_total is not None else None
    )
    ganancia_no_realizada = (
        valor_posicion - costo_posicion
        if valor_posicion is not None else None
    )

    return {
        "capital_inicial": CAPITAL_INICIAL,
        "saldo_disponible": saldo,
        "patrimonio_actual": patrimonio,
        "ganancia_total": ganancia_total,
        "rendimiento_porcentaje": rendimiento,
        "ganancia_realizada": ganancia_realizada,
        "ganancia_no_realizada": ganancia_no_realizada,
        "posicion": {
            "activo": cuenta["simbolo"],
            "unidades": unidades,
            "precio_actual": precio_actual,
            "valor_actual": valor_posicion,
            "costo_contable": costo_posicion,
        },
        "numero_compras": compras,
        "numero_ventas": ventas,
        "total_operaciones": len(operaciones),
        "operaciones": list(reversed(operaciones)),
        "curva_historica": curva,
        "fuente_precio": fuente,
        "operaciones_reales": False,
    }
