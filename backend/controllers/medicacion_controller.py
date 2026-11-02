"""HU3 y HU5: plan de medicación, recordatorios y recetas digitales."""
import re
from flask import current_app, g

from models.notificacion import MEDICACION
from models.plan_medicacion import item_a_json, nuevo_item
from models.receta import nueva_receta, receta_a_json
from utils.errores import ApiError
from utils.mensajes import MENSAJE_MEDICACION_EXTERNO, mensaje_medicacion

_HORARIO = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def _plan_repo():
    return current_app.config["PLAN_REPO"]


def _receta_repo():
    return current_app.config["RECETA_REPO"]


def buscar_pacientes(texto):
    if not isinstance(texto, str) or not 3 <= len(texto.strip()) <= 40:
        raise ApiError("Escribí entre 3 y 40 caracteres para buscar.", 400)
    return current_app.config["PACIENTES"](texto.strip())


def plan_de_paciente(paciente_id):
    return [item_a_json(f) for f in _plan_repo().listar_por_paciente(str(paciente_id))]


def mi_plan():
    return plan_de_paciente(g.usuario["id"])


def enviar_recordatorio_toma(item_id):
    item = _plan_repo().obtener(item_id)
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


def _validar_items(items):
    if not isinstance(items, list) or not items:
        raise ApiError("Agregá al menos un medicamento con dosis y horario.", 400)
    limpios = []
    for it in items:
        if not isinstance(it, dict):
            raise ApiError("Cada medicamento debe ser un objeto.", 400)
        med = (it.get("medicamento") or "").strip()
        dosis = (it.get("dosis") or "").strip()
        horario = (it.get("horario") or "").strip()
        if not med or not dosis:
            raise ApiError("Medicamento y dosis son obligatorios.", 400)
        if not _HORARIO.match(horario):
            raise ApiError(f"Horario inválido ({horario}). Usá formato HH:MM.", 400)
        limpios.append({"medicamento": med, "dosis": dosis, "horario": horario})
    return limpios


def emitir_receta(datos):
    if not isinstance(datos, dict):
        raise ApiError("Cuerpo JSON requerido.", 400)
    paciente_id = str(datos.get("paciente_id") or "").strip()
    if not paciente_id:
        raise ApiError("paciente_id es obligatorio.", 400)
    items = _validar_items(datos.get("medicamentos") or datos.get("items") or [])
    indicaciones = datos.get("indicaciones") or ""
    medico_id = g.usuario["id"]
    receta = nueva_receta(paciente_id, medico_id, indicaciones, items)
    creada = _receta_repo().crear(receta)
    for it in items:
        try:
            _plan_repo().crear(nuevo_item(paciente_id, it["medicamento"], it["dosis"], it["horario"]))
        except ValueError as e:
            raise ApiError(str(e), 400)
    msg = "Tu médico emitió una receta digital. Revisá indicaciones y plan de medicación en la app."
    current_app.config["NOTIFICADOR"].avisar(
        paciente_id, None, MEDICACION, msg,
        mensaje_externo="Tenés una nueva receta digital. Mirá el detalle en la app Mi Turno a Mano.")
    fila = _receta_repo().obtener(creada["id"])
    return receta_a_json(fila, fila.get("medicamentos")), 201


def listar_mis_recetas_medico():
    filas = _receta_repo().listar_por_medico(g.usuario["id"])
    return [receta_a_json(f, f.get("medicamentos")) for f in filas]


def listar_recetas_paciente(paciente_id):
    filas = _receta_repo().listar_por_paciente(str(paciente_id))
    return [receta_a_json(f, f.get("medicamentos")) for f in filas]


def mis_recetas_paciente():
    return listar_recetas_paciente(g.usuario["id"])


def eliminar_receta(receta_id):
    ok = _receta_repo().desactivar(receta_id, g.usuario["id"])
    if not ok:
        raise ApiError("Receta no encontrada o no te pertenece.", 404)
    return {"mensaje": "Receta desactivada."}


def desactivar_toma(item_id):
    item = _plan_repo().obtener(item_id)
    if not item:
        raise ApiError("Toma no encontrada.", 404)
    _plan_repo().desactivar(item_id)
    return {"mensaje": "Toma desactivada del plan."}
