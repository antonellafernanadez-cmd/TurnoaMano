"""Lógica y validaciones de turnos (historia 1; la 2 y la 4 reutilizan asignar/listar)."""
from datetime import datetime, timezone
from flask import current_app
from events.bus import bus
from models import turno as T
from strategies.solicitud import ESTRATEGIAS
from utils.errores import ApiError


def _repo():
    return current_app.config["TURNO_REPO"]


def _cargar(turno_id):
    doc = _repo().obtener(turno_id)
    if not doc:
        raise ApiError("Turno no encontrado.", 404)
    return doc


def _cambiar_estado(doc, nuevo, extra=None):
    if nuevo not in T.TRANSICIONES[doc["estado"]]:
        raise ApiError(f"No se puede pasar de '{doc['estado']}' a '{nuevo}'.", 409)
    actualizado = _repo().actualizar(doc["id"], {"estado": nuevo, **(extra or {})})
    bus.publicar(f"turno.{nuevo}", turno_id=doc["id"], estado=nuevo)
    return actualizado


def crear_turno(usuario, datos):
    if not isinstance(datos, dict):
        raise ApiError("Datos inválidos.", 400)
    estrategia = ESTRATEGIAS.get(datos.get("modo", "manual"))
    if not estrategia:
        raise ApiError("Modo de solicitud no válido.", 400)
    especialidad, motivo = estrategia.interpretar(datos)
    if not isinstance(motivo, str) or len(motivo) > 300:
        raise ApiError("El motivo debe ser texto de hasta 300 caracteres.", 400)
    doc = _repo().crear(T.nuevo_turno(usuario["id"], especialidad, motivo.strip(), estrategia.origen))
    bus.publicar("turno.solicitado", turno_id=doc["id"], estado=T.SOLICITADO)
    return T.turno_a_json(doc)


def mis_turnos(usuario):
    return [T.turno_a_json(d) for d in _repo().listar_por_paciente(usuario["id"])]


def listar_turnos(estado=None):
    return [T.turno_a_json(d) for d in _repo().listar(estado)]


def asignar_fecha(turno_id, datos):
    try:
        fecha = datetime.fromisoformat(str(datos.get("fecha_hora")))
    except ValueError:
        raise ApiError("fecha_hora debe tener formato ISO (2026-11-10T09:30).", 400)
    if fecha.tzinfo is not None:
        fecha = fecha.astimezone(timezone.utc).replace(tzinfo=None)
    if fecha <= T.ahora_utc():
        raise ApiError("La fecha del turno debe ser futura.", 400)
    return T.turno_a_json(_cambiar_estado(_cargar(turno_id), T.PROPUESTO, {"fecha_hora": fecha}))


def responder_turno(usuario, turno_id, datos):
    doc = _cargar(turno_id)
    if doc["paciente_id"] != usuario["id"]:
        raise ApiError("No tenés permiso para esta acción.", 403)
    respuesta = datos.get("respuesta")
    if respuesta not in ("aceptar", "rechazar"):
        raise ApiError("La respuesta debe ser 'aceptar' o 'rechazar'.", 400)
    nuevo = T.CONFIRMADO if respuesta == "aceptar" else T.RECHAZADO
    return T.turno_a_json(_cambiar_estado(doc, nuevo))
