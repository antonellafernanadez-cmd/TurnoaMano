from models.db import db


class Usuario(db.Model):
    __tablename__ = "usuarios"

    # Roles que puede elegir cualquiera al registrarse. Cada uno valida su
    # identificador con un formato distinto (ver auth_routes.py).
    ROLES = ("paciente", "medico", "administrativo")

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    telefono = db.Column(db.String(30), nullable=False)
    email = db.Column(db.String(120), nullable=False, unique=True)
    identificador = db.Column(db.String(20), nullable=False, unique=True)  # DNI, matrícula o legajo
    password_hash = db.Column(db.String(255), nullable=False)
    rol = db.Column(db.String(20), nullable=False)  # paciente, medico o administrativo
    intentos_fallidos = db.Column(db.Integer, nullable=False, default=0)
    bloqueado_hasta = db.Column(db.DateTime, nullable=True)

    def serialize(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "email": self.email,
            "telefono": self.telefono,
            "identificador": self.identificador,
            "rol": self.rol,
        }