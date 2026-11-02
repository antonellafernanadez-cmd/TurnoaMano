
from functools import wraps

from flask import g, jsonify
from flask_jwt_extended import (
    get_jwt,
    get_jwt_identity,
    verify_jwt_in_request
)

from models.cuidador import Cuidador
from models.usuario import Usuario


def roles_requeridos(*roles):
    """Verifica que el token pertenezca a uno de los roles permitidos."""
    def decorador(funcion):
        @wraps(funcion)
        def envoltura(*args, **kwargs):
            verify_jwt_in_request()

            if get_jwt().get("rol") not in roles:
                return jsonify(error="No tenés permiso para esta acción"), 403

            return funcion(*args, **kwargs)

        return envoltura
    return decorador


def cuidador_activo(funcion):
    """Comprueba que el vínculo del cuidador siga activo en la base de datos."""
    @wraps(funcion)
    def envoltura(*args, **kwargs):
        verify_jwt_in_request()

        claims = get_jwt()

        if claims.get("rol") != "cuidador":
            return jsonify(error="No tenés permiso para esta acción"), 403

        cuidador_id = claims.get("cuidador_id")
        paciente_id = claims.get("paciente_id")
        identificador = get_jwt_identity()

        if not cuidador_id or not paciente_id or not identificador:
            return jsonify(error="Sesión inválida"), 401

        # Comprobamos que el paciente asociado al token siga existiendo.
        paciente = Usuario.query.filter_by(
            id=paciente_id,
            identificador=identificador,
            rol="paciente"
        ).first()

        if not paciente:
            return jsonify(error="Acceso revocado o inválido"), 403

        # Comprobamos el vínculo directamente en MySQL en cada petición.
        vinculo = Cuidador.query.filter_by(
            id=cuidador_id,
            paciente_id=paciente_id,
            activo=True
        ).first()

        if not vinculo:
            return jsonify(error="Acceso revocado o inválido"), 403

        # El repositorio de turnos y notificaciones utiliza el DNI del paciente.
        g.usuario = {
            "id": identificador,
            "rol": "cuidador",
            "cuidador_id": vinculo.id
        }

        return funcion(*args, **kwargs)

    return envoltura
