"""Crea las tablas y carga usuarios ficticios (solo para desarrollo).
Ejecutar desde la raíz del repo:  python database\\init_db.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from werkzeug.security import generate_password_hash

from app import app
from models.db import db
from models.usuario import Usuario

USUARIOS = [
    ("administrativo", "Admin Prueba", "2610000001", "admin@test.com", "1001", "admin12345"),
    ("medico", "Medico Prueba", "2610000002", "medico@test.com", "2001", "medico12345"),
]

with app.app_context():
    db.create_all()
    for rol, nombre, telefono, email, identificador, password in USUARIOS:
        if Usuario.query.filter_by(identificador=identificador).first():
            print(f"Ya existía: {rol} ({identificador})")
            continue
        db.session.add(Usuario(
            nombre=nombre,
            telefono=telefono,
            email=email,
            identificador=identificador,
            password_hash=generate_password_hash(password),
            rol=rol,
        ))
        db.session.commit()
        print(f"Creado: {rol} ({identificador})")