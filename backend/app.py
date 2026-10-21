"""PATRÓN FACTORY: create_app arma la aplicación; los tests le inyectan un repositorio falso."""
import os
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

load_dotenv()


def create_app(turno_repo=None):
    app = Flask(__name__)
    CORS(app, origins=[os.getenv("CORS_ORIGIN", "http://localhost:3000")])
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
