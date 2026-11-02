from flask import current_app
from flask_jwt_extended import get_jwt_identity

from models.usuario import Usuario
from models.receta import nueva_receta, receta_a_json
from models.plan_medicacion import nuevo_item, item_a_json
from models.notificacion import MEDICACION
from utils.errores import ApiError
from utils.mensajes import MENSAJE_MEDICACION_EXTERNO, mensaje_medicacion


def _repo():
    return current_app.config["PLAN_REPO"]


def _receta_repo():
    return current_app.config["RECETA_REPO"]


def _usuario_actual():
    identificador = get_jwt_identity()

    usuario = Usuario.query.filter_by(
        identificador=identificador
    ).first()

    if not usuario:
        raise ApiError("No se encontró el usuario autenticado.")

    return usuario


def buscar_pacientes(texto):
    texto = (texto or "").strip()

    if len(texto) < 3 or len(texto) > 40:
        return []

    buscar = current_app.config.get("PACIENTES")

    if not buscar:
        return []

    return buscar(texto)


def plan_de_paciente(paciente_id):
    items = _repo().listar_por_paciente(str(paciente_id))
    return [item_a_json(item) for item in items]


def mi_plan():
    paciente = _usuario_actual()

    items = _repo().listar_por_paciente(str(paciente.id))
    return [item_a_json(item) for item in items]


def emitir_receta(data):
    if not data:
        raise ApiError("No se recibieron los datos de la receta.")

    medico = _usuario_actual()

    if medico.rol != "medico":
        raise ApiError("Solamente un médico puede emitir recetas.")

    paciente_id = str(data.get("paciente_id", "")).strip()

    paciente = Usuario.query.filter_by(
        id=int(paciente_id) if paciente_id.isdigit() else -1,
        rol="paciente"
    ).first()

    if not paciente:
        raise ApiError("El paciente seleccionado no existe.")

    indicaciones = (data.get("indicaciones") or "").strip()
    items = data.get("medicamentos")

    if not isinstance(items, list) or not items:
        raise ApiError("La receta debe contener al menos un medicamento.")

    if len(items) > 20:
        raise ApiError("La receta no puede contener más de 20 medicamentos.")

    # Validar todos los medicamentos antes de guardar cualquier dato.
    items_validados = []

    for item in items:
        if not isinstance(item, dict):
            raise ApiError("Hay un medicamento con datos inválidos.")

        medicamento = (item.get("medicamento") or "").strip()
        dosis = (item.get("dosis") or "").strip()
        horario = (item.get("horario") or "").strip()

        if not medicamento or len(medicamento) > 80:
            raise ApiError("Revisá el nombre del medicamento.")

        if not dosis or len(dosis) > 60:
            raise ApiError("Revisá la dosis del medicamento.")

        if len(horario) != 5:
            raise ApiError("El horario debe tener formato HH:MM.")

        # nuevo_item valida el formato de horario y los límites de campos.
        items_validados.append(
            nuevo_item(
                str(paciente.id),
                medicamento,
                dosis,
                horario
            )
        )

    receta = nueva_receta(
        paciente_id=str(paciente.id),
        medico_id=str(medico.id),
        indicaciones=indicaciones,
        items=[
            {
                "medicamento": item["medicamento"],
                "dosis": item["dosis"],
                "horario": item["horario"],
            }
            for item in items_validados
        ],
    )

    # Se guardan receta y plan juntos, en una única transacción.
    receta_guardada = _receta_repo().crear_con_plan(
        receta,
        items_validados
    )

    return {
        "mensaje": "Receta emitida correctamente.",
        "receta": receta_guardada,
        "paciente_id": str(paciente.id),
    }, 201


def listar_mis_recetas_medico():
    medico = _usuario_actual()

    recetas = _receta_repo().listar_por_medico(str(medico.id))

    return [
        receta_a_json(receta, receta.get("medicamentos", []))
        for receta in recetas
    ]


def mis_recetas_paciente():
    paciente = _usuario_actual()

    recetas = _receta_repo().listar_por_paciente(
        str(paciente.id),
        solo_activas=True
    )

    return [
        receta_a_json(receta, receta.get("medicamentos", []))
        for receta in recetas
    ]


def eliminar_receta(receta_id):
    medico = _usuario_actual()

    if medico.rol != "medico":
        raise ApiError("No tenés permisos para eliminar recetas.")

    eliminada = _receta_repo().desactivar(
        receta_id,
        str(medico.id)
    )

    if not eliminada:
        raise ApiError("No se encontró la receta o no tenés permisos.")

    return {"mensaje": "Receta desactivada correctamente."}


def desactivar_toma(item_id):
    usuario = _usuario_actual()

    if usuario.rol != "medico":
        raise ApiError("Solamente un médico puede modificar el plan.")

    modificados = _repo().desactivar(item_id)

    if not modificados:
        raise ApiError("No se encontró la toma.")

    return {"mensaje": "Toma desactivada correctamente."}



def enviar_recordatorio_toma(item_id):
    item = _repo().obtener(item_id)

    if not item or not item["activo"]:
        raise ApiError("La toma no existe o está inactiva.")

    notificador = current_app.config.get("NOTIFICADOR")

    if not notificador:
        raise ApiError("El servicio de notificaciones no está disponible.")

    resultados = notificador.avisar(
        paciente_id=str(item["paciente_id"]),
        turno_id=None,
        tipo=MEDICACION,
        mensaje=mensaje_medicacion(item),
        mensaje_externo=MENSAJE_MEDICACION_EXTERNO,
    )

    if not resultados:
        raise ApiError("No se encontró el destinatario del recordatorio.")

    if not any(resultados.values()):
        return {
            "mensaje": "Ningún canal pudo enviar el recordatorio.",
            "canales": resultados,
        }, 502
    return {
        "mensaje": "Recordatorio enviado correctamente.",
        "canales": resultados,
    }
