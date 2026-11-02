"""Historia de usuario 3: el administrativo consulta el plan de medicación de un paciente
y le envía recordatorios de toma. No guarda ni escribe datos clínicos en los logs."""
from flask import current_app

from models.notificacion import MEDICACION
from models.plan_medicacion import item_a_json
from utils.errores import ApiError
from utils.mensajes import MENSAJE_MEDICACION_EXTERNO, mensaje_medicacion


def _repo():
    return current_app.config["PLAN_REPO"]


def buscar_pacientes(texto):
    """Busca por DNI o nombre. Pide al menos 3 caracteres para no listar a todos los pacientes."""
    if not isinstance(texto, str) or not 3 <= len(texto.strip()) <= 40:
        raise ApiError("Escribí entre 3 y 40 caracteres para buscar.", 400)
    return current_app.config["PACIENTES"](texto.strip())


def plan_de_paciente(paciente_id):
    return [item_a_json(f) for f in _repo().listar_por_paciente(str(paciente_id))]


def enviar_recordatorio_toma(item_id):
    item = _repo().obtener(item_id)
    if not item:
        raise ApiError("Toma de medicación no encontrada.", 404)
    if not item["activo"]:
        raise ApiError("Esa toma ya no está activa en el plan del paciente.", 409)
    canales = current_app.config["NOTIFICADOR"].avisar(
        item["paciente_id"], None, MEDICACION, mensaje_medicacion(item),
        mensaje_externo=MENSAJE_MEDICACION_EXTERNO)
    if not canales:
        raise ApiError("No se pudo enviar el recordatorio: paciente no encontrado.", 404)
    return {"mensaje": "Recordatorio enviado.", "canales": canales}
