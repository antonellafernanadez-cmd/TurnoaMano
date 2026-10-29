import os
from datetime import timedelta

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config.config import Config
from models.db import db
from routes.auth_routes import auth_bp


def _buscar_destinatario(paciente_id):
    """Datos del paciente que necesitan los canales de aviso (se leen de la tabla usuarios).
    Se busca por id (clave primaria), no por DNI."""
    from models.usuario import Usuario
    usuario = db.session.get(Usuario, paciente_id)
    if not usuario:
        return None
    return {"identificador": usuario.identificador, "telefono": usuario.telefono}


def create_app(turno_repo=None, notificacion_repo=None, destinatarios=None, canales_extra=None):
    """PATRÓN FACTORY: create_app arma la aplicación; los tests le inyectan
    repositorios y canales falsos.

    canales_extra: otros canales de aviso además de la app. Por defecto, WhatsApp si está
    configurado en el .env. Los tests pasan [] para desactivarlos o una lista con canales falsos."""
    Config.validar()  # corta acá, con mensaje claro, si falta JWT_SECRET o SECRET_KEY

    app = Flask(__name__)

    app.config["SECRET_KEY"] = Config.SECRET_KEY
    app.config["JWT_SECRET_KEY"] = Config.JWT_SECRET
    app.config["SQLALCHEMY_DATABASE_URI"] = Config.DATABASE_CONNECTION_URI
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config.setdefault("JWT_ACCESS_TOKEN_EXPIRES", timedelta(minutes=60))

    CORS(app, origins=os.getenv("CORS_ORIGINS", Config.CORS_ORIGIN).split(","))
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
    app.config["NOTIFICADOR"] = Notificador([CanalApp(notificacion_repo), *canales_extra],
                                            destinatarios or _buscar_destinatario)

    from events import suscriptores  # noqa: F401  (registra los avisos automáticos en el bus de eventos)
    from routes.notificacion_routes import notificaciones_bp
    from routes.turno_routes import turnos_bp
    from utils.errores import registrar_errores
    app.register_blueprint(turnos_bp)
    app.register_blueprint(notificaciones_bp)
    registrar_errores(app)

    @app.get("/api/health")
    def health():
        return jsonify(status="ok")

    return app


def verificar_base(app):
    """Al arrancar, comprueba que la base tenga las tablas y columnas que usa la app.
    Si no, avisa en la terminal qué falta en vez de fallar después con "Error interno"."""
    from sqlalchemy import text
    consultas = {
        "usuarios (con intentos_fallidos y bloqueado_hasta)": "SELECT id, intentos_fallidos, bloqueado_hasta FROM usuarios LIMIT 1",
        "turnos": "SELECT id FROM turnos LIMIT 1",
        "notificaciones": "SELECT id FROM notificaciones LIMIT 1",
    }
    with app.app_context():
        for nombre, sql in consultas.items():
            try:
                db.session.execute(text(sql))
            except Exception as e:
                db.session.rollback()
                print(f"\n[ERROR] La base '{Config.DB_NAME}' no está lista: falta la tabla {nombre}.")
                print("        Ejecutá database/mi_turno_a_mano.sql y revisá DB_NAME en el .env.")
                print(f"        Detalle: {type(e).__name__}: {str(e.orig) if hasattr(e, 'orig') else e}\n")
                raise SystemExit(1)


if __name__ == "__main__":
    aplicacion = create_app()
    verificar_base(aplicacion)
    aplicacion.run(debug=True, port=5000)