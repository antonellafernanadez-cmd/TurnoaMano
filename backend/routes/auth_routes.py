import logging
import re
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity, jwt_required
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from models.db import db
from models.usuario import Usuario
from utils.security import roles_requeridos

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")
logger = logging.getLogger(__name__)

MAX_INTENTOS = 5
MINUTOS_BLOQUEO = 15
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
CAMPOS = ("nombre", "telefono", "email", "identificador", "password", "rol")

# Cada rol valida su identificador con un formato distinto.
# Ajustá los rangos si tu institución usa otro criterio.
VALIDACIONES_IDENTIFICADOR = {
    "paciente": (re.compile(r"^[0-9]{7,8}$"), "El DNI debe tener 7 u 8 dígitos"),
    "medico": (re.compile(r"^[0-9]{4,6}$"), "La matrícula debe tener entre 4 y 6 dígitos"),
    "administrativo": (re.compile(r"^[0-9]{3,6}$"), "El legajo debe tener entre 3 y 6 dígitos"),
}


def ahora_utc():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def validar_registro(datos):
    """Devuelve (datos_limpios, error). Si hay error, datos_limpios es None."""
    if not isinstance(datos, dict):
        return None, "El cuerpo de la solicitud debe ser un JSON"
    limpios = {}
    for campo in CAMPOS:
        valor = datos.get(campo)
        if not isinstance(valor, str) or not valor.strip():
            return None, f"'{campo}' es obligatorio y debe ser texto"
        limpios[campo] = valor if campo == "password" else valor.strip()

    if not EMAIL_RE.match(limpios["email"]):
        return None, "El email no es válido"

    if limpios["rol"] not in Usuario.ROLES:
        return None, "El rol debe ser paciente, medico o administrativo"

    patron, mensaje_error = VALIDACIONES_IDENTIFICADOR[limpios["rol"]]
    if not patron.fullmatch(limpios["identificador"]):
        return None, mensaje_error

    if len(limpios["password"]) < 8:
        return None, "La contraseña debe tener al menos 8 caracteres"

    return limpios, None


@auth_bp.post("/registro")
def registro():
    datos, error = validar_registro(request.get_json(silent=True))
    if error:
        return jsonify(error=error), 400

    usuario = Usuario(
        nombre=datos["nombre"],
        telefono=datos["telefono"],
        email=datos["email"],
        identificador=datos["identificador"],
        password_hash=generate_password_hash(datos["password"]),
        rol=datos["rol"],
    )
    db.session.add(usuario)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="Ya existe un usuario con ese identificador o email"), 409

    return jsonify(mensaje="Registro exitoso", usuario=usuario.serialize()), 201


@auth_bp.post("/login")
def login():
    datos = request.get_json(silent=True)
    if not isinstance(datos, dict):
        return jsonify(error="El cuerpo de la solicitud debe ser un JSON"), 400
    identificador = datos.get("identificador")
    password = datos.get("password")
    if not isinstance(identificador, str) or not isinstance(password, str):
        return jsonify(error="Identificador y contraseña son obligatorios"), 400
    identificador = identificador.strip()

    usuario = Usuario.query.filter_by(identificador=identificador).first()
    ahora = ahora_utc()

    if usuario and usuario.bloqueado_hasta and usuario.bloqueado_hasta > ahora:
        return jsonify(error="Demasiados intentos. Probá de nuevo en unos minutos"), 429

    if not usuario or not check_password_hash(usuario.password_hash, password):
        if usuario:
            usuario.intentos_fallidos += 1
            if usuario.intentos_fallidos >= MAX_INTENTOS:
                usuario.intentos_fallidos = 0
                usuario.bloqueado_hasta = ahora + timedelta(minutes=MINUTOS_BLOQUEO)
            db.session.commit()
        logger.warning("Login fallido (identificador terminado en %s)", identificador[-3:])
        return jsonify(error="Credenciales inválidas"), 401

    usuario.intentos_fallidos = 0
    usuario.bloqueado_hasta = None
    db.session.commit()
    token = create_access_token(
        identity=str(usuario.id),
        additional_claims={"rol": usuario.rol},
    )
    return jsonify(token=token, usuario=usuario.serialize()), 200


@auth_bp.get("/yo")
@jwt_required()
def yo():
    usuario = Usuario.query.get(get_jwt_identity())
    if not usuario:
        return jsonify(error="Usuario no encontrado"), 404
    return jsonify(usuario.serialize())


# Endpoint de ejemplo para probar la restricción por rol (caso de prueba
# sugerido N°3 del integrador). Se puede borrar cuando estén los endpoints
# reales de turnos.
@auth_bp.get("/panel-medico")
@roles_requeridos("medico")
def panel_medico():
    return jsonify(mensaje="Acceso permitido: sos médico")