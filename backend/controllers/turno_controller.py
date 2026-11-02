"""Lógica y validaciones de turnos (historia 1; la 2 y la 4 reutilizan asignar/listar)."""
from datetime import date, datetime, timezone
from flask import current_app
from events.bus import bus
from models import turno as T
from services import agenda
from strategies.solicitud import ESTRATEGIAS
from utils.errores import ApiError


def _repo():
    return current_app.config["TURNO_REPO"]


def _cargar(turno_id):
    doc = _repo().obtener(turno_id)
    if not doc:
        raise ApiError("Turno no encontrado.", 404)
    return doc


def _cambiar_estado(doc, nuevo, extra=None, **evento):
    if nuevo not in T.TRANSICIONES[doc["estado"]]:
        raise ApiError(f"No se puede pasar de '{doc['estado']}' a '{nuevo}'.", 409)
    actualizado = _repo().actualizar(doc["id"], {"estado": nuevo, **(extra or {})})
    bus.publicar(f"turno.{nuevo}", turno_id=doc["id"], estado=nuevo, **evento)
    return actualizado


# ---- elegir día y horario ----
def _leer_fecha_elegida(valor):
    """Convierte una fecha ISO. Devuelve None si no se mandó fecha."""
    if valor in (None, ""):
        return None
    try:
        fecha = datetime.fromisoformat(str(valor))
    except ValueError:
        raise ApiError("fecha_hora debe tener formato ISO (2026-11-10T09:30).", 400)
    if fecha.tzinfo is not None:
        raise ApiError("fecha_hora no debe incluir zona horaria.", 400)
    return fecha


def _verificar_horario_libre(especialidad, fecha, ignorar_id=None):
    """Verifica que el horario esté disponible y no esté ocupado."""
    if not agenda.es_horario_valido(fecha):
        raise ApiError("Ese día u horario no está disponible. Elegí otro.", 400)

    desde, hasta = agenda.rango_visible()

    for ocupado in _repo().ocupados(especialidad, desde, hasta):
        if ocupado["fecha_hora"] == fecha and ocupado["id"] != ignorar_id:
            raise ApiError("Ese horario ya fue tomado. Elegí otro.", 409)


def _en_curso(turno, ahora):
    """Un turno en curso es uno que todavía no pasó ni se cerró."""
    if turno["estado"] in (T.SOLICITADO, T.PROPUESTO):
        return True

    return (
        turno["estado"] == T.CONFIRMADO
        and turno["fecha_hora"] is not None
        and turno["fecha_hora"] >= ahora
    )


def disponibilidad(especialidad):
    esp = ESTRATEGIAS["manual"].interpretar(
        {"especialidad": especialidad}
    )[0]

    desde, hasta = agenda.rango_visible()
    ocupados = [
        o["fecha_hora"]
        for o in _repo().ocupados(esp, desde, hasta)
    ]

    return {
        "especialidad": esp,
        "dias": agenda.armar_disponibilidad(ocupados)
    }


def especialidad_por_voz(datos):
    """Interpreta la especialidad solicitada mediante voz."""
    esp, _ = ESTRATEGIAS["voz"].interpretar(datos or {})
    return {"especialidad": esp}


def _fecha_futura(datos):
    try:
        fecha = datetime.fromisoformat(str(datos.get("fecha_hora")))
    except (ValueError, TypeError):
        raise ApiError("fecha_hora debe tener formato ISO (2026-11-10T09:30).", 400)

    if fecha.tzinfo is not None:
        fecha = fecha.astimezone(timezone.utc).replace(tzinfo=None)

    if fecha <= T.ahora_utc():
        raise ApiError("La fecha del turno debe ser futura.", 400)

    return fecha


def _validar_medico(medico_id):
    """Verifica que el médico exista."""
    if medico_id is None:
        return None

    if not isinstance(medico_id, str) or str(medico_id) not in {
        str(m["id"]) for m in current_app.config["MEDICOS"]()
    }:
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
    fecha = _leer_fecha_elegida(datos.get("fecha_hora"))
    ahora = agenda.ahora_local()
    # Evita duplicados (doble toque, voz repetida) y turnos superpuestos del mismo paciente.
    for existente in _repo().listar_por_paciente(usuario["id"]):
        if existente["especialidad"] == especialidad and _en_curso(existente, ahora):
            raise ApiError("Ya tenés un turno de esa especialidad en curso. Si querés cambiarlo, cancelalo primero.", 409)
        if fecha and existente["fecha_hora"] == fecha and existente["estado"] in (T.PROPUESTO, T.CONFIRMADO):
            raise ApiError("Ya tenés otro turno en ese día y horario.", 409)
    if fecha:
        _verificar_horario_libre(especialidad, fecha)
    # Con fecha elegida el turno queda confirmado al instante; sin fecha, espera la propuesta del administrativo.
    doc = _repo().crear(T.nuevo_turno(usuario["id"], especialidad, motivo.strip(), estrategia.origen, fecha))
    bus.publicar("turno.solicitado", turno_id=doc["id"], estado=T.SOLICITADO)
    if fecha:
        bus.publicar("turno.confirmado", turno_id=doc["id"], estado=T.CONFIRMADO)
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


def reprogramar_turno(turno_id, datos):
    """El administrativo cambia el día u horario de un turno confirmado. El paciente recibe un aviso."""
    doc = _cargar(turno_id)
    if doc["estado"] != T.CONFIRMADO:
        raise ApiError("Solo se puede reprogramar un turno confirmado.", 409)
    fecha = _leer_fecha_elegida(datos.get("fecha_hora"))
    if fecha is None:
        raise ApiError("Falta fecha_hora.", 400)
    _verificar_horario_libre(doc["especialidad"], fecha, ignorar_id=turno_id)
    for otro in _repo().listar_por_paciente(doc["paciente_id"]):
        if otro["id"] != turno_id and otro["fecha_hora"] == fecha and otro["estado"] in (T.PROPUESTO, T.CONFIRMADO):
            raise ApiError("El paciente ya tiene otro turno en ese día y horario.", 409)
    actualizado = _repo().actualizar(turno_id, {"fecha_hora": fecha})
    bus.publicar("turno.reprogramado", turno_id=turno_id, estado=T.CONFIRMADO)
    return T.turno_a_json(actualizado)


def cancelar_turno(usuario, turno_id):
    """El paciente cancela su turno, o el administrativo cancela cualquiera (y se avisa al paciente)."""
    doc = _cargar(turno_id)
    if usuario["rol"] == "paciente" and doc["paciente_id"] != usuario["id"]:
        raise ApiError("No tenés permiso para esta acción.", 403)
    return T.turno_a_json(_cambiar_estado(doc, T.CANCELADO, por=usuario["rol"]))
