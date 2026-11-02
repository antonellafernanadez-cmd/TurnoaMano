
from flask import Blueprint
from flask_jwt_extended import jwt_required

from controllers import auth_controller as c
from utils.security import roles_requeridos

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# Rutas públicas.
auth_bp.add_url_rule("/registro", "registro", c.registro, methods=["POST"])
auth_bp.add_url_rule("/login", "login", c.login, methods=["POST"])
auth_bp.add_url_rule(
    "/login-cuidador",
    "login_cuidador",
    c.login_cuidador,
    methods=["POST"]
)

# Rutas protegidas.
auth_bp.add_url_rule("/yo", "yo", jwt_required()(c.yo), methods=["GET"])

auth_bp.add_url_rule(
    "/panel-medico",
    "panel_medico",
    roles_requeridos("medico")(c.panel_medico),
    methods=["GET"]
)

# El paciente administra su vínculo con el cuidador.
auth_bp.add_url_rule(
    "/mi-cuidador",
    "designar_cuidador",
    roles_requeridos("paciente")(c.designar_cuidador),
    methods=["POST"]
)

auth_bp.add_url_rule(
    "/mi-cuidador",
    "revocar_cuidador",
    roles_requeridos("paciente")(c.revocar_cuidador),
    methods=["DELETE"]
)
