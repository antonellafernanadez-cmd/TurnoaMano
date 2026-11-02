"""Mensajes predefinidos de la historia 4 (cambios y demoras de turnos).
Llevan solo lo mínimo: especialidad, fecha y hora, sin datos clínicos."""
from utils.formato import fecha_legible

# Demoras que el administrativo puede informar (en minutos).
MINUTOS_DEMORA = (10, 15, 30, 45, 60, 90, 120)


def mensaje_demora(turno, minutos):
    return (f"Tu turno de {turno['especialidad']} del {fecha_legible(turno['fecha_hora'])} "
            f"se demora aproximadamente {minutos} minutos. Disculpá las molestias.")


def mensaje_reprogramado(turno):
    return (f"Tu turno de {turno['especialidad']} fue reprogramado para el {fecha_legible(turno['fecha_hora'])}. "
            "Entrá a la app para aceptarlo o rechazarlo.")


def mensaje_suspendido(turno):
    return (f"Tu turno de {turno['especialidad']} del {fecha_legible(turno['fecha_hora'])} fue suspendido. "
            "Te avisamos cuando haya una nueva fecha.")
