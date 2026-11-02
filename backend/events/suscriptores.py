"""PATRÓN OBSERVER (parte 2): quiénes reaccionan a los eventos de turnos que publica el controller.
El controller de turnos no sabe que existen: solo publica "turno.propuesto" y estos avisos salen solos.

Se registran una sola vez, al importar este módulo (lo hace create_app)."""
import logging

from flask import current_app

from events.bus import bus
from models.notificacion import CAMBIO, FECHA_PROPUESTA
from utils.formato import fecha_legible
from utils.mensajes import mensaje_reprogramado, mensaje_suspendido

log = logging.getLogger("notificaciones")


def al_proponer_fecha(turno_id, **_):
    """El administrativo propuso fecha y hora: se le avisa al paciente (historia de usuario 2).
    El mensaje lleva solo lo mínimo: especialidad, fecha y hora, sin datos clínicos."""
    try:
        turno = current_app.config["TURNO_REPO"].obtener(turno_id)
        mensaje = (f"Tu turno de {turno['especialidad']} fue propuesto para el {fecha_legible(turno['fecha_hora'])}. "
                   "Entrá a la app para aceptarlo o rechazarlo.")
        current_app.config["NOTIFICADOR"].avisar(turno["paciente_id"], turno_id, FECHA_PROPUESTA, mensaje)
    except Exception as e:
        # Si el aviso falla, proponer la fecha igual tiene que funcionar.
        log.warning("no se pudo avisar turno=%s motivo=%s", turno_id, type(e).__name__)


def _avisar_cambio(turno_id, armar_mensaje):
    """Aviso de cambio (historia de usuario 4). Si falla, el cambio del turno igual se guarda."""
    try:
        turno = current_app.config["TURNO_REPO"].obtener(turno_id)
        current_app.config["NOTIFICADOR"].avisar(turno["paciente_id"], turno_id, CAMBIO, armar_mensaje(turno))
    except Exception as e:
        log.warning("no se pudo avisar turno=%s motivo=%s", turno_id, type(e).__name__)


def al_reprogramar(turno_id, **_):
    _avisar_cambio(turno_id, mensaje_reprogramado)


def al_cancelar(turno_id, **_):
    _avisar_cambio(turno_id, mensaje_suspendido)


bus.suscribir("turno.propuesto", al_proponer_fecha)
bus.suscribir("turno.reprogramado", al_reprogramar)
bus.suscribir("turno.cancelado", al_cancelar)