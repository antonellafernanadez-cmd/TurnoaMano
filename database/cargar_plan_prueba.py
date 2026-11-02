"""Carga un plan de medicación FICTICIO para probar la historia 3, hasta que la historia 5
(el médico carga recetas y plan) escriba en la tabla.
Ejecutar desde la raíz del repo:  python database\\cargar_plan_prueba.py 12345678
(el número es el DNI de un paciente ya registrado)"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app import create_app
from models.plan_medicacion import nuevo_item
from models.usuario import Usuario
from repositories.plan_medicacion_repository import PlanMedicacionRepository

TOMAS = [
    ("Enalapril", "10 mg", "08:00"),
    ("Metformina", "850 mg", "13:00"),
    ("Metformina", "850 mg", "21:00"),
]

if len(sys.argv) != 2:
    sys.exit("Uso: python database\\cargar_plan_prueba.py DNI_DEL_PACIENTE")

app = create_app()
with app.app_context():
    paciente = Usuario.query.filter_by(identificador=sys.argv[1], rol="paciente").first()
    if not paciente:
        sys.exit("No hay un paciente con ese DNI. Registralo primero (POST /api/auth/registro).")
    repo = PlanMedicacionRepository()
    for medicamento, dosis, horario in TOMAS:
        repo.crear(nuevo_item(paciente.id, medicamento, dosis, horario))
    print(f"Plan de prueba cargado para {paciente.nombre} (id {paciente.id}): {len(TOMAS)} tomas.")
