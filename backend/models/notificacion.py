"""Modelo de Notificación: los avisos que recibe el paciente
(historias de usuario 2, 3 y 4).

La tabla está en database/mi_turno_a_mano.sql.
"""

from models.turno import ahora_utc


# Tipos de notificaciones
FECHA_PROPUESTA = "fecha_propuesta"
RECORDATORIO = "recordatorio"
CAMBIO = "cambio"
CONFIRMACION = "confirmacion"
MEDICACION = "medicacion"


TIPOS = (
    FECHA_PROPUESTA,
    RECORDATORIO,
    CAMBIO,
    CONFIRMACION,
    MEDICACION,
)


def nueva_notificacion(paciente_id, turno_id, tipo, mensaje):
    """Crea una notificación.

    turno_id puede ser None cuando el aviso no está asociado
    a un turno, por ejemplo, un recordatorio de medicación.
    """
    return {
        "paciente_id": paciente_id,
        "turno_id": turno_id,
        "tipo": tipo,
        "mensaje": mensaje,
        "leida": False,
        "creado_en": ahora_utc(),
    }


def notificacion_a_json(fila):
    """Convierte una fila de notificación a formato JSON."""
    return {
        "id": fila["id"],
        "paciente_id": fila["paciente_id"],
        "turno_id": fila["turno_id"],
        "tipo": fila["tipo"],
        "mensaje": fila["mensaje"],
        "leida": bool(fila["leida"]),
        "creado_en": fila["creado_en"].isoformat(),
    }