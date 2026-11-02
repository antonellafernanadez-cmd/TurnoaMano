"""Plan de medicación (HU3 / HU5)."""
import re
from models.turno import ahora_utc

HORARIO = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def nuevo_item(paciente_id, medicamento, dosis, horario):
    for nombre, valor, maximo in (("medicamento", medicamento, 80), ("dosis", dosis, 60)):
        if not isinstance(valor, str) or not valor.strip() or len(valor.strip()) > maximo:
            raise ValueError(f"{nombre} debe ser un texto de 1 a {maximo} caracteres.")
    if not isinstance(horario, str) or not HORARIO.match(horario):
        raise ValueError("horario debe tener formato HH:MM (por ejemplo 08:00).")
    return {
        "paciente_id": str(paciente_id),
        "medicamento": medicamento.strip(),
        "dosis": dosis.strip(),
        "horario": horario,
        "activo": True,
        "creado_en": ahora_utc(),
    }


def item_a_json(fila):
    return {
        "id": fila["id"],
        "paciente_id": fila["paciente_id"],
        "medicamento": fila["medicamento"],
        "dosis": fila["dosis"],
        "horario": fila["horario"],
        "activo": bool(fila["activo"]),
    }
