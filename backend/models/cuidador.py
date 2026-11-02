
from datetime import datetime

from models.db import db


class Cuidador(db.Model):
    __tablename__ = "cuidadores"

    id = db.Column(db.Integer, primary_key=True)

    # Un paciente puede tener un único vínculo de cuidador.
    paciente_id = db.Column(
        db.Integer,
        db.ForeignKey("usuarios.id"),
        nullable=False,
        unique=True,
        index=True
    )

    nombre = db.Column(db.String(100), nullable=False)

    # Nunca se almacena el código de seis dígitos en texto plano.
    codigo_hash = db.Column(db.String(255), nullable=False)

    activo = db.Column(db.Boolean, nullable=False, default=True)

    # Protección contra intentos repetidos de ingreso.
    intentos_fallidos = db.Column(db.Integer, nullable=False, default=0)
    bloqueado_hasta = db.Column(db.DateTime, nullable=True)

    creado_en = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    actualizado_en = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    paciente = db.relationship(
        "Usuario",
        backref=db.backref("vinculo_cuidador", uselist=False)
    )
