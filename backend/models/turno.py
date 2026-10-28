"""Modelo de Turno: estados válidos, reglas de transición y forma de los datos.
La tabla está en database/mi_turno_a_mano.sql."""
from datetime import datetime, timezone

ESPECIALIDADES = (
    "clinica medica", "cardiologia", "traumatologia", "oftalmologia",
    "dermatologia", "ginecologia", "neurologia", "odontologia",
)

SOLICITADO, PROPUESTO, CONFIRMADO, RECHAZADO = (
    "solicitado", "propuesto", "confirmado", "rechazado",
)

# estado actual -> estados a los que puede pasar
TRANSICIONES = {
    SOLICITADO: (PROPUESTO,),
    PROPUESTO: (CONFIRMADO, RECHAZADO),
    CONFIRMADO: (),
    RECHAZADO: (),
}


def ahora_utc():
    """Fechas guardadas en UTC, sin zona (formato DATETIME de MySQL)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def nuevo_turno(paciente_id, especialidad, motivo, origen):
    return {
        "paciente_id": paciente_id,
        "especialidad": especialidad,
        "motivo": motivo,
        "origen": origen,            # "manual" | "voz"
        "estado": SOLICITADO,
        "fecha_hora": None,
        "creado_en": ahora_utc(),
    }


def turno_a_json(fila):
    return {
        "id": fila["id"],
        "paciente_id": fila["paciente_id"],
        "especialidad": fila["especialidad"],
        "motivo": fila["motivo"],
        "origen": fila["origen"],
        "estado": fila["estado"],
        "fecha_hora": fila["fecha_hora"].isoformat() if fila.get("fecha_hora") else None,
        "creado_en": fila["creado_en"].isoformat(),
    }
