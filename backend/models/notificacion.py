"""Modelo de Notificación: los avisos que recibe el paciente (historias de usuario 2, 3 y 4).
La tabla está en database/mi_turno_a_mano.sql."""
from models.turno import ahora_utc

# Para qué es el aviso
FECHA_PROPUESTA = "fecha_propuesta"   # el administrativo propuso fecha y hora de un turno
RECORDATORIO = "recordatorio"         # recordatorio de un turno ya otorgado
CAMBIO = "cambio"                     # cambio o demora de un turno (historia 4, sprint 2)
MEDICACION = "medicacion"             # recordatorio de toma de medicación (historia 3): no depende de un turno

TIPOS = (FECHA_PROPUESTA, RECORDATORIO, CAMBIO, MEDICACION)


def nueva_notificacion(paciente_id, turno_id, tipo, mensaje):
    """turno_id es None cuando el aviso no está ligado a un turno (por ejemplo, la medicación)."""
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
