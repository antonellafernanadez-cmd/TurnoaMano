import os
from datetime import timedelta

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config.config import Config
from models.db import db
from routes.auth_routes import auth_bp


def create_app(turno_repo=None):
    """PATRÓN FACTORY: create_app arma la aplicación; los tests le inyectan
    un repositorio falso de turnos."""
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

    from routes.turno_routes import turnos_bp
    from utils.errores import registrar_errores
    app.register_blueprint(turnos_bp)
    registrar_errores(app)

    @app.get("/api/health")
    def health():
        return jsonify(status="ok")

    return app


if __name__ == "__main__":
    create_app().run(debug=False, port=5000)