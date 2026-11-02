import secrets
import logging
import re
from datetime import datetime, timedelta, timezone

from flask import jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from models.db import db
from models.usuario import Usuario
from models.cuidador import Cuidador
from utils.respuestas import error

logger = logging.getLogger(__name__)

MAX_INTENTOS = 5
MINUTOS_BLOQUEO = 15

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
DNI_RE = re.compile(r"^[0-9]{7,8}$")
CODIGO_RE = re.compile(r"^[0-9]{6}$")

# Solo el paciente se registra desde la app.
CAMPOS = ("nombre", "telefono", "email", "identificador", "password")


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

    if not DNI_RE.fullmatch(limpios["identificador"]):
        return None, "El DNI debe tener 7 u 8 dígitos"

    if len(limpios["password"]) < 8:
        return None, "La contraseña debe tener al menos 8 caracteres"

    return limpios, None


def registro():
    datos, msg = _validar_registro(request.get_json(silent=True))

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

    return jsonify({
        "mensaje": "Registro exitoso",
        "usuario": usuario.serialize()
    }), 201


def login():
    datos = request.get_json(silent=True)

    if not isinstance(datos, dict):
        return error("El cuerpo de la solicitud debe ser un JSON", 400)

    identificador = datos.get("identificador")
    password = datos.get("password")

    if not isinstance(identificador, str) or not isinstance(password, str):
        return error("Identificador y contraseña son obligatorios", 400)

    identificador = identificador.strip()

    usuario = Usuario.query.filter_by(
        identificador=identificador
    ).first()

    ahora = ahora_utc()

    if usuario and usuario.bloqueado_hasta and usuario.bloqueado_hasta > ahora:
        return error(
            "Demasiados intentos. Probá de nuevo en unos minutos",
            429
        )

    # Mismo mensaje si falla el identificador o la contraseña.
    if not usuario or not check_password_hash(
        usuario.password_hash, password
    ):
        if usuario:
            usuario.intentos_fallidos += 1

            if usuario.intentos_fallidos >= MAX_INTENTOS:
                usuario.intentos_fallidos = 0
                usuario.bloqueado_hasta = (
                    ahora + timedelta(minutes=MINUTOS_BLOQUEO)
                )

            db.session.commit()

        logger.warning(
            "Login fallido (identificador terminado en %s)",
            identificador[-3:]
        )

        return error("Credenciales inválidas", 401)

    usuario.intentos_fallidos = 0
    usuario.bloqueado_hasta = None
    db.session.commit()

    token = create_access_token(
        identity=usuario.identificador,
        additional_claims={"rol": usuario.rol},
    )

    return jsonify({
        "token": token,
        "usuario": usuario.serialize()
    }), 200


def login_cuidador():
    """Autentica al cuidador mediante DNI del paciente y código de acceso."""
    datos = request.get_json(silent=True)

    if not isinstance(datos, dict):
        return error("El cuerpo de la solicitud debe ser un JSON", 400)

    identificador = datos.get("identificador")
    codigo = datos.get("codigo")

    if not isinstance(identificador, str) or not isinstance(codigo, str):
        return error("Credenciales inválidas", 401)

    identificador = identificador.strip()
    codigo = codigo.strip()

    if not DNI_RE.fullmatch(identificador) or not CODIGO_RE.fullmatch(codigo):
        return error("Credenciales inválidas", 401)

    usuario = Usuario.query.filter_by(
        identificador=identificador,
        rol="paciente"
    ).first()

    # No revelar si existe el paciente o si tiene un cuidador vinculado.
    if not usuario:
        return error("Credenciales inválidas", 401)

    vinculo = Cuidador.query.filter_by(
        paciente_id=usuario.id,
        activo=True
    ).first()

    if not vinculo:
        return error("Credenciales inválidas", 401)

    ahora = ahora_utc()

    if vinculo.bloqueado_hasta and vinculo.bloqueado_hasta > ahora:
        return error(
            "Demasiados intentos. Probá de nuevo en unos minutos",
            429
        )

    if not check_password_hash(vinculo.codigo_hash, codigo):
        vinculo.intentos_fallidos += 1

        if vinculo.intentos_fallidos >= MAX_INTENTOS:
            vinculo.intentos_fallidos = 0
            vinculo.bloqueado_hasta = (
                ahora + timedelta(minutes=MINUTOS_BLOQUEO)
            )

        db.session.commit()

        logger.warning(
            "Login de cuidador fallido para paciente terminado en %s",
            identificador[-3:]
        )

        return error("Credenciales inválidas", 401)

    vinculo.intentos_fallidos = 0
    vinculo.bloqueado_hasta = None
    db.session.commit()

    token = create_access_token(
        identity=usuario.identificador,
        additional_claims={
            "rol": "cuidador",
            "cuidador_id": vinculo.id,
            "paciente_id": usuario.id,
        },
    )

    return jsonify({
        "token": token,
        "usuario": usuario.serialize(),
        "tipo_acceso": "cuidador",
        "cuidador": {
            "nombre": vinculo.nombre
        }
    }), 200


def yo():
    usuario = Usuario.query.filter_by(
        identificador=get_jwt_identity()
    ).first()

    if not usuario:
        return error("Usuario no encontrado", 404)

    return jsonify(usuario.serialize()), 200


def panel_medico():
    return jsonify({
        "mensaje": "Acceso permitido: sos médico"
    }), 200
def designar_cuidador():
    """El paciente registra a su cuidador y genera un código de acceso."""
    datos = request.get_json(silent=True)

    if not isinstance(datos, dict):
        return error("El cuerpo de la solicitud debe ser un JSON", 400)

    nombre = datos.get("nombre")

    if not isinstance(nombre, str) or not nombre.strip():
        return error("El nombre del cuidador es obligatorio", 400)

    nombre = nombre.strip()

    if len(nombre) > 100:
        return error("El nombre no puede superar los 100 caracteres", 400)

    identificador = get_jwt_identity()

    paciente = Usuario.query.filter_by(
        identificador=identificador,
        rol="paciente"
    ).first()

    if not paciente:
        return error("Paciente no encontrado", 404)

    # Generamos un código numérico de seis dígitos.
    codigo = f"{secrets.randbelow(1000000):06d}"

    # Buscamos el vínculo existente para reutilizarlo.
    vinculo = Cuidador.query.filter_by(
        paciente_id=paciente.id
    ).first()

    if vinculo:
        vinculo.nombre = nombre
        vinculo.codigo_hash = generate_password_hash(codigo)
        vinculo.activo = True
        vinculo.intentos_fallidos = 0
        vinculo.bloqueado_hasta = None
    else:
        vinculo = Cuidador(
            paciente_id=paciente.id,
            nombre=nombre,
            codigo_hash=generate_password_hash(codigo),
            activo=True,
            intentos_fallidos=0,
            bloqueado_hasta=None
        )
        db.session.add(vinculo)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        logger.exception("Error al registrar el cuidador")
        return error("No se pudo registrar el cuidador", 500)

    # El código se devuelve únicamente en esta respuesta.
    return jsonify({
        "mensaje": "Cuidador registrado correctamente",
        "cuidador": {
            "nombre": vinculo.nombre
        },
        "codigo": codigo
    }), 201


def revocar_cuidador():
    """El paciente revoca el acceso de su cuidador."""
    identificador = get_jwt_identity()

    paciente = Usuario.query.filter_by(
        identificador=identificador,
        rol="paciente"
    ).first()

    if not paciente:
        return error("Paciente no encontrado", 404)

    vinculo = Cuidador.query.filter_by(
        paciente_id=paciente.id,
        activo=True
    ).first()

    if not vinculo:
        return error("No tenés un cuidador activo", 404)

    vinculo.activo = False
    vinculo.intentos_fallidos = 0
    vinculo.bloqueado_hasta = None

    db.session.commit()

    return jsonify({
        "mensaje": "Acceso del cuidador revocado correctamente"
    }), 200