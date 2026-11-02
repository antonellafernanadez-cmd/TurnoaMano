"""Decorador de roles para las rutas de turnos y notificaciones.
Usa el mismo sistema de tokens que el login (Flask-JWT-Extended, firmado con SECRET_KEY):
el token trae `sub` (id del usuario en la tabla usuarios) y el claim `rol`."""
from functools import wraps

from flask import g
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request

from utils.errores import ApiError


def requiere_rol(*roles):
    def decorador(fn):
        @wraps(fn)
        def envoltura(*args, **kwargs):
            try:
                verify_jwt_in_request()
            except Exception:
                raise ApiError("Sesión inválida o vencida.", 401)
            rol = get_jwt().get("rol")
            if rol not in roles:
                raise ApiError("No tenés permiso para esta acción.", 403)
            g.usuario = {"id": str(get_jwt_identity()), "rol": rol}
            return fn(*args, **kwargs)
        return envoltura
    return decorador
