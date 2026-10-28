from flask import Blueprint, jsonify, request, g
from controllers import notificacion_controller as C
from utils.auth import requiere_rol

notificaciones_bp = Blueprint("notificaciones", __name__, url_prefix="/api")


@notificaciones_bp.get("/notificaciones/mias")
@requiere_rol("paciente")
def mias():
    solo_no_leidas = request.args.get("solo_no_leidas") in ("1", "true")
    return jsonify(C.mis_notificaciones(g.usuario, solo_no_leidas))


@notificaciones_bp.patch("/notificaciones/<int:notificacion_id>/leida")
@requiere_rol("paciente")
def leida(notificacion_id):
    return jsonify(C.marcar_leida(g.usuario, notificacion_id))


@notificaciones_bp.post("/turnos/<int:turno_id>/recordatorio")
@requiere_rol("administrativo")
def recordatorio(turno_id):
    return jsonify(C.enviar_recordatorio(turno_id))