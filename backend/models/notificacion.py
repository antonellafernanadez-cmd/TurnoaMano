"""Modelo de Notificación (HU2, HU3, HU4)."""
from models.turno import ahora_utc

FECHA_PROPUESTA = "fecha_propuesta"
CONFIRMACION = "confirmacion"
RECORDATORIO = "recordatorio"
CAMBIO = "cambio"
MEDICACION = "medicacion"

TIPOS = (FECHA_PROPUESTA, CONFIRMACION, RECORDATORIO, CAMBIO, MEDICACION)


def nueva_notificacion(paciente_id, turno_id, tipo, mensaje):
    return {
        "paciente_id": paciente_id,
        "turno_id": turno_id,
        "tipo": tipo,
        "mensaje": mensaje,
        "leida": False,
        "creado_en": ahora_utc(),
    }


def notificacion_a_json(fila):
    return {
        "id": fila["id"],
        "paciente_id": fila["paciente_id"],
        "turno_id": fila["turno_id"],
        "tipo": fila["tipo"],
        "mensaje": fila["mensaje"],
        "leida": bool(fila["leida"]),
        "creado_en": fila["creado_en"].isoformat(),
    }
