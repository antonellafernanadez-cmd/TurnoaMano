from flask import Blueprint
from flask_jwt_extended import jwt_required

from controllers import auth_controller as c
from utils.security import roles_requeridos

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# Públicas: cualquiera puede registrarse o iniciar sesión.
auth_bp.add_url_rule("/registro", "registro", c.registro, methods=["POST"])
auth_bp.add_url_rule("/login", "login", c.login, methods=["POST"])

# Protegidas: exigen token (y, en el panel médico, además el rol "medico").
auth_bp.add_url_rule("/yo", "yo", jwt_required()(c.yo), methods=["GET"])
auth_bp.add_url_rule("/panel-medico", "panel_medico",
                     roles_requeridos("medico")(c.panel_medico), methods=["GET"])