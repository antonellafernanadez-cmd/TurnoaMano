import os
from datetime import timedelta
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import config.config as config
from models.db import db
from routes.auth_routes import auth_bp

app = Flask(__name__)

app.config["SECRET_KEY"] = config.SECRET_KEY
app.config["SQLALCHEMY_DATABASE_URI"] = config.DATABASE_CONNECTION_URI
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config.setdefault("JWT_ACCESS_TOKEN_EXPIRES", timedelta(minutes=60))

if not app.config.get("SECRET_KEY"):
    raise RuntimeError("Falta SECRET_KEY (revisá config.py y el .env)")

CORS(app, origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","))
db.init_app(app)
JWTManager(app)

app.register_blueprint(auth_bp)


@app.get("/api/health")
def health():
    return jsonify(status="ok")


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)