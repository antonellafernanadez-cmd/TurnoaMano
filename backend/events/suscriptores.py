```python
"""PATRÓN OBSERVER (parte 2): quiénes reaccionan a los eventos de turnos que publica el controller.
El controller de turnos no sabe que existen: solo publica "turno.propuesto" y estos avisos salen solos.

Se registran una sola vez, al importar este módulo (lo hace create_app)."""

import logging

from flask import current_app

from events.bus import bus
from models.notificacion import CAMBIO, CONFIRMACION, FECHA_PROPUESTA
from utils.formato import fecha_legible
from utils.mensajes import mensaje_reprogramado, mensaje_suspendido

log = logging.getLogger("notificaciones")


def al_confirmar(turno_id, **_):
    """Avisa al paciente cuando su turno queda confirmado."""
    try:
        turno = current_app.config["TURNO_REPO"].obtener(turno_id)

        if not turno:
            return

        mensaje = (
            f"Tu turno de {turno['especialidad']} quedó confirmado para el "
            f"{fecha_legible(turno['fecha_hora'])}."
        )

        current_app.config["NOTIFICADOR"].avisar(
            turno["paciente_id"],
            turno_id,
            CONFIRMACION,
            mensaje
        )

    except Exception as e:
        log.warning(
            "no se pudo confirmar aviso turno=%s motivo=%s",
            turno_id,
            type(e).__name__
        )


def al_proponer_fecha(turno_id, **_):
    """Avisa al paciente cuando el administrativo propone una fecha."""
    try:
        turno = current_app.config["TURNO_REPO"].obtener(turno_id)

        if not turno:
            return

        mensaje = (
            f"Tu turno de {turno['especialidad']} fue propuesto para el "
            f"{fecha_legible(turno['fecha_hora'])}. "
            "Entrá a la app para aceptarlo o rechazarlo."
        )

        current_app.config["NOTIFICADOR"].avisar(
            turno["paciente_id"],
            turno_id,
            FECHA_PROPUESTA,
            mensaje
        )

    except Exception as e:
        log.warning(
            "no se pudo avisar turno=%s motivo=%s",
            turno_id,
            type(e).__name__
        )


def _avisar_cambio(turno_id, armar_mensaje):
    """Envía avisos de cambios sin impedir que se guarde la operación."""
    try:
        turno = current_app.config["TURNO_REPO"].obtener(turno_id)

        if not turno:
            return

        mensaje = armar_mensaje(turno)

        current_app.config["NOTIFICADOR"].avisar(
            turno["paciente_id"],
            turno_id,
            CAMBIO,
            mensaje
        )

    except Exception as e:
        log.warning(
            "no se pudo avisar turno=%s motivo=%s",
            turno_id,
            type(e).__name__
        )


def al_reprogramar(turno_id, **_):
    """Avisa al paciente cuando cambia la fecha de su turno."""
    _avisar_cambio(turno_id, mensaje_reprogramado)


def al_cancelar(turno_id, por=None, **_):
    """Avisa al paciente solamente cuando cancela el administrativo."""
    if por != "administrativo":
        return

    _avisar_cambio(turno_id, mensaje_suspendido)


# Suscripción a los eventos del sistema.
bus.suscribir("turno.propuesto", al_proponer_fecha)
bus.suscribir("turno.reprogramado", al_reprogramar)
bus.suscribir("turno.cancelado", al_cancelar)
bus.suscribir("turno.confirmado", al_confirmar)
```
