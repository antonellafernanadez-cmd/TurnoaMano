from flask import Blueprint, jsonify, request
from controllers import medicacion_controller as C
from utils.auth import requiere_rol

medicacion_bp = Blueprint("medicacion", __name__, url_prefix="/api")


@medicacion_bp.get("/pacientes")
@requiere_rol("administrativo")
def pacientes():
    return jsonify(C.buscar_pacientes(request.args.get("buscar")))


@medicacion_bp.get("/pacientes/<int:paciente_id>/medicacion")
@requiere_rol("administrativo")
def plan(paciente_id):
    return jsonify(C.plan_de_paciente(paciente_id))


@medicacion_bp.post("/medicacion/<int:item_id>/recordatorio")
@requiere_rol("administrativo")
def recordatorio(item_id):
    return jsonify(C.enviar_recordatorio_toma(item_id))
