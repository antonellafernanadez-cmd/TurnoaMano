
from flask import Blueprint, jsonify, request
from controllers import medicacion_controller as C
from utils.auth import requiere_rol

medicacion_bp = Blueprint("medicacion", __name__, url_prefix="/api")


@medicacion_bp.get("/pacientes")
@requiere_rol("administrativo", "medico")
def pacientes():
    return jsonify(C.buscar_pacientes(request.args.get("buscar")))


@medicacion_bp.get("/pacientes/<int:paciente_id>/medicacion")
@requiere_rol("administrativo", "medico")
def plan(paciente_id):
    return jsonify(C.plan_de_paciente(paciente_id))


@medicacion_bp.get("/medicacion/mia")
@requiere_rol("paciente")
def mi_plan():
    return jsonify(C.mi_plan())


@medicacion_bp.post("/medicacion/<int:item_id>/recordatorio")
@requiere_rol("administrativo")
def recordatorio(item_id):
    return jsonify(C.enviar_recordatorio_toma(item_id))


@medicacion_bp.post("/recetas")
@requiere_rol("medico")
def emitir_receta():
    data, code = C.emitir_receta(request.get_json(silent=True))
    return jsonify(data), code


@medicacion_bp.get("/recetas/mias")
@requiere_rol("medico")
def recetas_medico():
    return jsonify(C.listar_mis_recetas_medico())


@medicacion_bp.get("/recetas/mis-recetas")
@requiere_rol("paciente")
def recetas_paciente():
    return jsonify(C.mis_recetas_paciente())


@medicacion_bp.delete("/recetas/<int:receta_id>")
@requiere_rol("medico")
def eliminar_receta(receta_id):
    return jsonify(C.eliminar_receta(receta_id))


@medicacion_bp.delete("/medicacion/<int:item_id>")
@requiere_rol("medico", "administrativo")
def desactivar_toma(item_id):
    return jsonify(C.desactivar_toma(item_id))
