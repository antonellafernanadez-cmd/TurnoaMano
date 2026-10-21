"""PATRÓN FACTORY: create_app arma la aplicación; los tests le inyectan un repositorio falso."""
from flask import Flask
from flask_cors import CORS
from config.config import Config


def create_app(turno_repo=None):
    app = Flask(__name__)
    CORS(app, origins=[Config.CORS_ORIGIN])
    if turno_repo is None:
        from repositories.turno_repository import TurnoRepository
        turno_repo = TurnoRepository()
    app.config["TURNO_REPO"] = turno_repo

    from routes.turno_routes import turnos_bp
    from utils.errores import registrar_errores
    app.register_blueprint(turnos_bp)
    registrar_errores(app)
    return app


if __name__ == "__main__":
    create_app().run(debug=False, port=5000)
