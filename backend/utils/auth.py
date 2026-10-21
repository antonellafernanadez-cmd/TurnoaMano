"""PROVISORIO: decorador de roles. Tu compañera lo reemplaza con su login real.
Contrato acordado: el JWT trae `sub` (id del usuario) y `rol` (paciente | medico | administrativo)."""
import os
from functools import wraps
import jwt
from flask import request, g
from utils.errores import ApiError


def requiere_rol(*roles):
    def decorador(fn):
        @wraps(fn)
        def envoltura(*args, **kwargs):
            cabecera = request.headers.get("Authorization", "")
            if not cabecera.startswith("Bearer "):
                raise ApiError("Falta iniciar sesión.", 401)
            try:
                datos = jwt.decode(cabecera[7:], os.getenv("JWT_SECRET", ""), algorithms=["HS256"])
            except jwt.PyJWTError:
                raise ApiError("Sesión inválida o vencida.", 401)
            if datos.get("rol") not in roles:
                raise ApiError("No tenés permiso para esta acción.", 403)
            g.usuario = {"id": datos["sub"], "rol": datos["rol"]}
            return fn(*args, **kwargs)
        return envoltura
    return decorador
