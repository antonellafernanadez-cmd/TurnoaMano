"""PATRÓN OBSERVER (parte 2): quiénes reaccionan a los eventos de turnos que publica el controller.
El controller de turnos no sabe que existen: solo publica "turno.propuesto" y estos avisos salen solos.

Se registran una sola vez, al importar este módulo (lo hace create_app)."""
import logging
from datetime import datetime

from flask import current_app

from events.bus import bus
from models.notificacion import FECHA_PROPUESTA

log = logging.getLogger("notificaciones")


def _formatear(fecha):
    if isinstance(fecha, str):
        fecha = datetime.fromisoformat(fecha)
    return f"{fecha:%d/%m/%Y} a las {fecha:%H:%M}"


def al_proponer_fecha(turno_id, **_):
    """El administrativo propuso fecha y hora: se le avisa al paciente (historia de usuario 2).
    El mensaje lleva solo lo mínimo: especialidad, fecha y hora, sin datos clínicos."""
    try:
        turno = current_app.config["TURNO_REPO"].obtener(turno_id)
        mensaje = (f"Tu turno de {turno['especialidad']} fue propuesto para el {_formatear(turno['fecha_hora'])}. "
                   "Entrá a la app para aceptarlo o rechazarlo.")
        current_app.config["NOTIFICADOR"].avisar(turno["paciente_id"], turno_id, FECHA_PROPUESTA, mensaje)
    except Exception as e:
        # Si el aviso falla, proponer la fecha igual tiene que funcionar.
        log.warning("no se pudo avisar turno=%s motivo=%s", turno_id, type(e).__name__)


bus.suscribir("turno.propuesto", al_proponer_fecha)