import logging
import re
from datetime import datetime, timedelta, timezone

from flask import jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from models.db import db
from models.usuario import Usuario
from utils.respuestas import error

logger = logging.getLogger(__name__)

MAX_INTENTOS = 5
MINUTOS_BLOQUEO = 15
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
CAMPOS = ("nombre", "telefono", "email", "identificador", "password")

# Solo los pacientes se registran desde la app, y lo hacen con su DNI.
# El médico y el administrativo ya vienen cargados en la base de datos.
PATRON_DNI = re.compile(r"^[0-9]{7,8}$")


def ahora_utc():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _validar_registro(datos):
    """Devuelve (datos_limpios, None) o (None, mensaje_de_error)."""
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

    if not PATRON_DNI.fullmatch(limpios["identificador"]):
        return None, "El DNI debe tener 7 u 8 dígitos"

    if len(limpios["password"]) < 8:
        return None, "La contraseña debe tener al menos 8 caracteres"

    return limpios, None


def registro():
    cuerpo = request.get_json(silent=True)
    # Nadie puede elegir su rol: un cliente que intente registrarse como médico o
    # administrativo es rechazado (403). Si no manda "rol", es paciente.
    if isinstance(cuerpo, dict) and cuerpo.get("rol", "paciente") != "paciente":
        return error("Solo los pacientes pueden registrarse desde la app", 403)

    datos, msg = _validar_registro(cuerpo)
    if msg:
        return error(msg, 400)

    usuario = Usuario(
        nombre=datos["nombre"],
        telefono=datos["telefono"],
        email=datos["email"],
        identificador=datos["identificador"],
        password_hash=generate_password_hash(datos["password"]),
        rol="paciente",
    )
    db.session.add(usuario)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error("Ya existe un usuario con ese identificador o email", 409)

    return jsonify({"mensaje": "Registro exitoso", "usuario": usuario.serialize()}), 201


def login():
    datos = request.get_json(silent=True)
    if not isinstance(datos, dict):
        return error("El cuerpo de la solicitud debe ser un JSON", 400)
    identificador = datos.get("identificador")
    password = datos.get("password")
    if not isinstance(identificador, str) or not isinstance(password, str):
        return error("Identificador y contraseña son obligatorios", 400)
    identificador = identificador.strip()

    usuario = Usuario.query.filter_by(identificador=identificador).first()
    ahora = ahora_utc()

    if usuario and usuario.bloqueado_hasta and usuario.bloqueado_hasta > ahora:
        return error("Demasiados intentos. Probá de nuevo en unos minutos", 429)

    # Mismo mensaje si falla el identificador o la contraseña (no se dan pistas)
    if not usuario or not check_password_hash(usuario.password_hash, password):
        if usuario:
            usuario.intentos_fallidos += 1
            if usuario.intentos_fallidos >= MAX_INTENTOS:
                usuario.intentos_fallidos = 0
                usuario.bloqueado_hasta = ahora + timedelta(minutes=MINUTOS_BLOQUEO)
            db.session.commit()
        logger.warning("Login fallido (identificador terminado en %s)", identificador[-3:])
        return error("Credenciales inválidas", 401)

    usuario.intentos_fallidos = 0
    usuario.bloqueado_hasta = None
    db.session.commit()
    token = create_access_token(
        identity=usuario.identificador,
        additional_claims={"rol": usuario.rol},
    )
    return jsonify({"token": token, "usuario": usuario.serialize()}), 200


def yo():
    usuario = Usuario.query.filter_by(identificador=get_jwt_identity()).first()
    if not usuario:
        return error("Usuario no encontrado", 404)
    return jsonify(usuario.serialize()), 200


def panel_medico():
    # Endpoint de ejemplo para probar la restricción por rol (caso de prueba 3).
    return jsonify({"mensaje": "Acceso permitido: sos médico"}), 200