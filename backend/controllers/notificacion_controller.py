"""Lógica de las notificaciones: que el paciente vea y marque sus avisos, y que el
administrativo envíe recordatorios de turnos ya otorgados (historia de usuario 2)."""
from flask import current_app

from models.notificacion import RECORDATORIO, notificacion_a_json
from models.turno import CONFIRMADO
from utils.errores import ApiError
from utils.formato import fecha_legible


def _repo():
    return current_app.config["NOTIFICACION_REPO"]


def mis_notificaciones(usuario, solo_no_leidas=False):
    filas = _repo().listar_por_paciente(usuario["id"], solo_no_leidas)
    return [notificacion_a_json(f) for f in filas]


def marcar_leida(usuario, notificacion_id):
    aviso = _repo().obtener(notificacion_id)
    # Si no existe o es de otro paciente, la respuesta es la misma: no se revela que existe.
    if not aviso or aviso["paciente_id"] != usuario["id"]:
        raise ApiError("Notificación no encontrada.", 404)
    return notificacion_a_json(_repo().marcar_leida(notificacion_id))


def enviar_recordatorio(turno_id):
    turno = current_app.config["TURNO_REPO"].obtener(turno_id)
    if not turno:
        raise ApiError("Turno no encontrado.", 404)
    if turno["estado"] != CONFIRMADO:
        raise ApiError("Solo se puede enviar recordatorio de un turno confirmado.", 409)
    # Solo lo mínimo: especialidad, fecha y hora (sin datos clínicos).
    mensaje = f"Recordatorio: tenés turno de {turno['especialidad']} el {fecha_legible(turno['fecha_hora'])}."
    canales = current_app.config["NOTIFICADOR"].avisar(turno["paciente_id"], turno_id, RECORDATORIO, mensaje)
    if not canales:
        raise ApiError("No se pudo enviar el recordatorio: paciente no encontrado.", 404)
    return {"mensaje": "Recordatorio enviado.", "canales": canales}