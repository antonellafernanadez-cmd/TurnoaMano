
"""Mensajes predefinidos de la historia 4 (cambios y demoras de turnos).
Llevan solo lo mínimo: especialidad, fecha y hora, sin datos clínicos."""

from utils.formato import fecha_legible


# Demoras que el administrativo puede informar (en minutos).
MINUTOS_DEMORA = (10, 15, 30, 45, 60, 90, 120)


def mensaje_demora(turno, minutos):
    return (
        f"Tu turno de {turno['especialidad']} del "
        f"{fecha_legible(turno['fecha_hora'])} "
        f"se demora aproximadamente {minutos} minutos. Disculpá las molestias."
    )


def mensaje_reprogramado(turno):
    return (
        f"Tu turno de {turno['especialidad']} fue reprogramado para el "
        f"{fecha_legible(turno['fecha_hora'])}. "
        "Entrá a la app para aceptarlo o rechazarlo."
    )


def mensaje_suspendido(turno):
    return (
        f"Tu turno de {turno['especialidad']} del "
        f"{fecha_legible(turno['fecha_hora'])} fue suspendido. "
        "Te avisamos cuando haya una nueva fecha."
    )


# ---- Historia 3: recordatorio de toma de medicación ----

# El detalle (medicamento y dosis) es un dato de salud: va solo dentro de la app.
# Por canales externos (WhatsApp) sale el texto genérico.

MENSAJE_MEDICACION_EXTERNO = (
    "Tenés un recordatorio de medicación. "
    "Mirá el detalle en la app Mi Turno a Mano."
)


def mensaje_medicacion(item):
    return (
        f"Recordatorio de medicación: tomá {item['medicamento']}, "
        f"{item['dosis']}, a las {item['horario']}."
    )
