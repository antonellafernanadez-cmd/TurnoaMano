"""Lógica y validaciones de turnos (historia 1; la 2 y la 4 reutilizan asignar/listar)."""
from datetime import date, datetime, timezone
from flask import current_app
from events.bus import bus
from models import turno as T
from strategies.solicitud import ESTRATEGIAS
from utils.errores import ApiError


def _repo():
    return current_app.config["TURNO_REPO"]


def _cargar(turno_id):
    doc = _repo().obtener(turno_id)
    if not doc:
        raise ApiError("Turno no encontrado.", 404)
    return doc


def _cambiar_estado(doc, nuevo, extra=None):
    if nuevo not in T.TRANSICIONES[doc["estado"]]:
        raise ApiError(f"No se puede pasar de '{doc['estado']}' a '{nuevo}'.", 409)
    actualizado = _repo().actualizar(doc["id"], {"estado": nuevo, **(extra or {})})
    bus.publicar(f"turno.{nuevo}", turno_id=doc["id"], estado=nuevo)
    return actualizado


def _fecha_futura(datos):
    try:
        fecha = datetime.fromisoformat(str(datos.get("fecha_hora")))
    except ValueError:
        raise ApiError("fecha_hora debe tener formato ISO (2026-11-10T09:30).", 400)
    if fecha.tzinfo is not None:
        fecha = fecha.astimezone(timezone.utc).replace(tzinfo=None)
    if fecha <= T.ahora_utc():
        raise ApiError("La fecha del turno debe ser futura.", 400)
    return fecha


def _validar_medico(medico_id):
    """Si viene un médico, tiene que existir en la lista de médicos (usuarios con rol médico)."""
    if medico_id is None:
        return None
    if not isinstance(medico_id, str) or str(medico_id) not in {str(m["id"]) for m in current_app.config["MEDICOS"]()}:
        raise ApiError("El médico indicado no existe.", 400)
    return medico_id


def crear_turno(usuario, datos):
    if not isinstance(datos, dict):
        raise ApiError("Datos inválidos.", 400)
    estrategia = ESTRATEGIAS.get(datos.get("modo", "manual"))
    if not estrategia:
        raise ApiError("Modo de solicitud no válido.", 400)
    especialidad, motivo = estrategia.interpretar(datos)
    if not isinstance(motivo, str) or len(motivo) > 300:
        raise ApiError("El motivo debe ser texto de hasta 300 caracteres.", 400)
    doc = _repo().crear(T.nuevo_turno(usuario["id"], especialidad, motivo.strip(), estrategia.origen))
    bus.publicar("turno.solicitado", turno_id=doc["id"], estado=T.SOLICITADO)
    return T.turno_a_json(doc)


def mis_turnos(usuario):
    return [T.turno_a_json(d) for d in _repo().listar_por_paciente(usuario["id"])]


def listar_turnos(estado=None, medico_id=None, fecha=None):
    if estado and estado not in T.ESTADOS:
        raise ApiError("Estado no válido.", 400)
    if fecha:
        try:
            fecha = date.fromisoformat(fecha).isoformat()
        except ValueError:
            raise ApiError("La fecha debe tener formato AAAA-MM-DD.", 400)
    if medico_id and len(medico_id) > 20:
        raise ApiError("Médico no válido.", 400)
    return [T.turno_a_json(d) for d in _repo().listar(estado, medico_id, fecha)]


def asignar_fecha(turno_id, datos):
    fecha = _fecha_futura(datos)
    extra = {"fecha_hora": fecha}
    if datos.get("medico_id") is not None:
        extra["medico_id"] = _validar_medico(datos.get("medico_id"))
    return T.turno_a_json(_cambiar_estado(_cargar(turno_id), T.PROPUESTO, extra))


def reprogramar_turno(turno_id, datos):
    """Historia 4: cambia la fecha de un turno ya propuesto o confirmado. Vuelve a "propuesto"
    para que el paciente acepte la nueva fecha, y el aviso sale solo (evento turno.reprogramado)."""
    doc = _cargar(turno_id)
    if doc["estado"] not in T.CON_FECHA:
        raise ApiError(f"No se puede reprogramar un turno '{doc['estado']}'.", 409)
    campos = {"estado": T.PROPUESTO, "fecha_hora": _fecha_futura(datos)}
    if datos.get("medico_id") is not None:
        campos["medico_id"] = _validar_medico(datos.get("medico_id"))
    actualizado = _repo().actualizar(doc["id"], campos)
    bus.publicar("turno.reprogramado", turno_id=doc["id"], estado=T.PROPUESTO)
    return T.turno_a_json(actualizado)


def cancelar_turno(turno_id):
    """Historia 4: suspensión de un turno. El aviso al paciente sale solo (evento turno.cancelado)."""
    return T.turno_a_json(_cambiar_estado(_cargar(turno_id), T.CANCELADO))


def responder_turno(usuario, turno_id, datos):
    doc = _cargar(turno_id)
    if doc["paciente_id"] != usuario["id"]:
        raise ApiError("No tenés permiso para esta acción.", 403)
    respuesta = datos.get("respuesta")
    if respuesta not in ("aceptar", "rechazar"):
        raise ApiError("La respuesta debe ser 'aceptar' o 'rechazar'.", 400)
    nuevo = T.CONFIRMADO if respuesta == "aceptar" else T.RECHAZADO
    return T.turno_a_json(_cambiar_estado(doc, nuevo))
