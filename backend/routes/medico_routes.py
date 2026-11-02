from flask import Blueprint, current_app, jsonify
from utils.auth import requiere_rol

medicos_bp = Blueprint("medicos", __name__, url_prefix="/api")


@medicos_bp.get("/medicos")
@requiere_rol("administrativo")
def listar():
    """Médicos disponibles para asignar a un turno (solo id y nombre)."""
    return jsonify(current_app.config["MEDICOS"]())
