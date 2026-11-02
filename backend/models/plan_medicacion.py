"""Plan de medicación del paciente (historia 3). La tabla está en database/mi_turno_a_mano.sql.

Cada fila es una toma: un medicamento, su dosis y el horario. Un medicamento que se toma
tres veces al día son tres filas. La historia de usuario 5 (el médico carga recetas y plan)
va a escribir en esta misma tabla; este módulo solo la lee y avisa."""
import re

from models.turno import ahora_utc

HORARIO = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")     # HH:MM, 24 horas


def nuevo_item(paciente_id, medicamento, dosis, horario):
    """Arma una toma validada. Lanza ValueError con un mensaje claro si algo no es válido."""
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