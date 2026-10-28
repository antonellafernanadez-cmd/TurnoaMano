from flask import Blueprint, jsonify, request, g
from controllers import turno_controller as C
from utils.auth import requiere_rol

turnos_bp = Blueprint("turnos", __name__, url_prefix="/api/turnos")


@turnos_bp.post("")
@requiere_rol("paciente")
def crear():
    return jsonify(C.crear_turno(g.usuario, request.get_json(silent=True))), 201


@turnos_bp.get("/mios")
@requiere_rol("paciente")
def mios():
    return jsonify(C.mis_turnos(g.usuario))


@turnos_bp.patch("/<int:turno_id>/respuesta")
@requiere_rol("paciente")
def responder(turno_id):
    return jsonify(C.responder_turno(g.usuario, turno_id, request.get_json(silent=True) or {}))


@turnos_bp.get("")
@requiere_rol("administrativo", "medico")
def listar():
    return jsonify(C.listar_turnos(request.args.get("estado")))


@turnos_bp.patch("/<int:turno_id>/asignar")
@requiere_rol("administrativo")
def asignar(turno_id):
    return jsonify(C.asignar_fecha(turno_id, request.get_json(silent=True) or {}))
