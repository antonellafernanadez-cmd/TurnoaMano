import os
from datetime import timedelta

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config.config import Config
from models.db import db
from routes.auth_routes import auth_bp


def _buscar_destinatario(paciente_id):
    """Datos del paciente que necesitan los canales de aviso (se leen de la tabla usuarios)."""
    from models.usuario import Usuario
    usuario = Usuario.query.filter_by(identificador=paciente_id).first()
    if not usuario:
        return None
    return {"identificador": usuario.identificador, "telefono": usuario.telefono}


def create_app(turno_repo=None, notificacion_repo=None, destinatarios=None, canales_extra=None):
    """PATRÓN FACTORY: create_app arma la aplicación; los tests le inyectan
    repositorios y canales falsos.

    canales_extra: otros canales de aviso además de la app. Por defecto, WhatsApp si está
    configurado en el .env. Los tests pasan [] para desactivarlos o una lista con canales falsos."""
    app = Flask(__name__)

    app.config["SECRET_KEY"] = Config.SECRET_KEY
    app.config["SQLALCHEMY_DATABASE_URI"] = Config.DATABASE_CONNECTION_URI
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config.setdefault("JWT_ACCESS_TOKEN_EXPIRES", timedelta(minutes=60))

    if not app.config.get("SECRET_KEY"):
        raise RuntimeError("Falta SECRET_KEY (revisá config.py y el .env)")

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


if __name__ == "__main__":
    create_app().run(debug=False, port=5000)