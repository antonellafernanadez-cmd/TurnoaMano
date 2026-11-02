
import os
from datetime import timedelta

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config.config import Config
from models.db import db
from routes.auth_routes import auth_bp


def _buscar_destinatario(paciente_id):
    """Busca al paciente por ID de usuario o por identificador (DNI)."""
    from models.usuario import Usuario

    usuario = None

    # Primero intenta buscar por el ID numérico de la tabla usuarios.
    try:
        usuario = db.session.get(Usuario, int(paciente_id))
    except (TypeError, ValueError):
        pass

    # Si no lo encuentra, intenta buscar por identificador (DNI).
    if not usuario:
        usuario = Usuario.query.filter_by(
            identificador=str(paciente_id)
        ).first()

    if not usuario:
        return None

    return {
        "identificador": usuario.identificador,
        "telefono": usuario.telefono
    }


def _listar_medicos():
    """Médicos para asignar a los turnos: id = matrícula (identificador)."""
    from models.usuario import Usuario

    medicos = (
        Usuario.query
        .filter_by(rol="medico")
        .order_by(Usuario.nombre)
        .all()
    )

    return [
        {"id": m.identificador, "nombre": m.nombre}
        for m in medicos
    ]


def _buscar_pacientes(texto):
    """Pacientes por DNI o nombre (máximo 20)."""
    from models.usuario import Usuario
    from models.db import db
    filas = (
        Usuario.query.filter(
            Usuario.rol == "paciente",
            db.or_(
                Usuario.identificador.contains(texto, autoescape=True),
                Usuario.nombre.contains(texto, autoescape=True),
            ),
        )
        .order_by(Usuario.nombre)
        .limit(20)
        .all()
    )
    return [
        {"id": u.identificador, "nombre": u.nombre, "identificador": u.identificador}
        for u in filas
    ]


def create_app(
    turno_repo=None,
    notificacion_repo=None,
    destinatarios=None,
    canales_extra=None,
    medicos=None
):
    """PATRÓN FACTORY: create_app arma la aplicación; los tests le inyectan
    repositorios y canales falsos.

    canales_extra: otros canales de aviso además de la app. Por defecto,
    WhatsApp si está configurado en el .env. Los tests pasan [] para
    desactivarlos o una lista con canales falsos.
    """

    Config.validar()

    app = Flask(__name__)

    app.config["SECRET_KEY"] = Config.SECRET_KEY
    app.config["JWT_SECRET_KEY"] = Config.JWT_SECRET
    app.config["SQLALCHEMY_DATABASE_URI"] = Config.DATABASE_CONNECTION_URI
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config.setdefault(
        "JWT_ACCESS_TOKEN_EXPIRES",
        timedelta(minutes=60)
    )

    CORS(
        app,
        origins=os.getenv(
            "CORS_ORIGINS",
            Config.CORS_ORIGIN
        ).split(",")
    )

    db.init_app(app)
    JWTManager(app)

    app.register_blueprint(auth_bp)

    if turno_repo is None:
        from repositories.turno_repository import TurnoRepository
        turno_repo = TurnoRepository()

    app.config["TURNO_REPO"] = turno_repo

    if notificacion_repo is None:
        from repositories.notificacion_repository import NotificacionRepository
        notificacion_repo = NotificacionRepository()

    app.config["NOTIFICACION_REPO"] = notificacion_repo

    # Canales de aviso (patrón Strategy) y quién los usa (Notificador).
    from services.notificador import Notificador
    from strategies.canales import CanalApp, CanalWhatsApp

    if canales_extra is None:
        whatsapp = CanalWhatsApp.desde_config()
        canales_extra = [whatsapp] if whatsapp else []

    app.config["NOTIFICADOR"] = Notificador(
        [CanalApp(notificacion_repo), *canales_extra],
        destinatarios or _buscar_destinatario
    )

    app.config["MEDICOS"] = medicos or _listar_medicos
    app.config["PACIENTES"] = _buscar_pacientes

    from repositories.plan_medicacion_repository import PlanMedicacionRepository
    from repositories.receta_repository import RecetaRepository
    app.config["PLAN_REPO"] = PlanMedicacionRepository()
    app.config["RECETA_REPO"] = RecetaRepository()

    # Registra los avisos automáticos en el bus de eventos.
    from events import suscriptores  # noqa: F401

    from routes.medico_routes import medicos_bp
    from routes.notificacion_routes import notificaciones_bp
    from routes.turno_routes import turnos_bp
    from routes.medicacion_routes import medicacion_bp
    from utils.errores import registrar_errores

    app.register_blueprint(turnos_bp)
    app.register_blueprint(notificaciones_bp)
    app.register_blueprint(medicos_bp)
    app.register_blueprint(medicacion_bp)

    registrar_errores(app)

    @app.get("/api/health")
    def health():
        return jsonify(status="ok")

    return app


def verificar_base(app):
    """Al arrancar, comprueba que la base tenga las tablas y columnas que usa la app.
    Si no, avisa en la terminal qué falta en vez de fallar después con 'Error interno'."""

    from sqlalchemy import text

    consultas = {
        "usuarios (con intentos_fallidos y bloqueado_hasta)": (
            "SELECT id, intentos_fallidos, bloqueado_hasta FROM usuarios LIMIT 1"
        ),
        "turnos (con medico_id)": (
            "SELECT id, medico_id FROM turnos LIMIT 1"
        ),
        "notificaciones": "SELECT id FROM notificaciones LIMIT 1",
        "plan_medicacion": "SELECT id FROM plan_medicacion LIMIT 1",
        "recetas": "SELECT id FROM recetas LIMIT 1",
        "receta_items": "SELECT id FROM receta_items LIMIT 1",
    }

    with app.app_context():
        for nombre, sql in consultas.items():
            try:
                db.session.execute(text(sql))

            except Exception as e:
                db.session.rollback()

                print(
                    f"\n[ERROR] La base '{Config.DB_NAME}' no está lista: "
                    f"falta la tabla o columna {nombre}."
                )
                print(
                    "        Ejecutá database/mi_turno_a_mano.sql "
                    "y revisá DB_NAME en el .env."
                )
                print(
                    f"        Detalle: {type(e).__name__}: "
                    f"{str(e.orig) if hasattr(e, 'orig') else e}\n"
                )

                raise SystemExit(1)


if __name__ == "__main__":
    aplicacion = create_app()
    verificar_base(aplicacion)
    aplicacion.run(debug=True, port=5000)