"""Historia de usuario 4: avisos por demoras o cambios de turnos. Datos ficticios, sin MySQL ni red."""
import os, sys
from datetime import datetime, timedelta, timezone
import jwt, pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ["JWT_SECRET"] = "secreto-de-prueba-de-32-caracteres-min"
os.environ["SECRET_KEY"] = "secreto-de-prueba-de-32-caracteres-min"

from app import create_app
from models import turno as T
from tests.fake_repo import FakeNotificacionRepository, FakeTurnoRepository
from utils.mensajes import mensaje_demora, mensaje_reprogramado, mensaje_suspendido

PACIENTE, OTRO, ADMIN, MEDICO = "12345678", "87654321", "1001", "2001"
FECHA, FECHA_NUEVA = "2030-01-15T10:30", "2030-01-20T09:00"


def token(uid, rol):
    carga = {"sub": uid, "rol": rol, "exp": datetime.now(timezone.utc) + timedelta(minutes=5)}
    return {"Authorization": "Bearer " + jwt.encode(carga, os.environ["JWT_SECRET"], algorithm="HS256")}


class CanalFalso:
    nombre = "falso"

    def __init__(self):
        self.mensajes = []

    def enviar(self, destinatario, notificacion):
        self.mensajes.append(notificacion["mensaje"])
        return True


@pytest.fixture
def entorno():
    canal = CanalFalso()
    app = create_app(
        turno_repo=FakeTurnoRepository(),
        notificacion_repo=FakeNotificacionRepository(),
        destinatarios=lambda pid: {"identificador": pid, "telefono": "2610000003"} if pid in (PACIENTE, OTRO) else None,
        canales_extra=[canal],
        medicos=lambda: [{"id": MEDICO, "nombre": "Medico Prueba"}, {"id": "2002", "nombre": "Otra Medica"}],
    )
    return app.test_client(), canal


def turno(client, estado="confirmado", fecha=FECHA, medico=MEDICO, paciente=PACIENTE):
    """Crea un turno y lo lleva al estado pedido, por la API."""
    tid = client.post("/api/turnos", json={"modo": "manual", "especialidad": "cardiologia"},
                      headers=token(paciente, "paciente")).json["id"]
    if estado != "solicitado":
        client.patch(f"/api/turnos/{tid}/asignar", json={"fecha_hora": fecha, "medico_id": medico},
                     headers=token(ADMIN, "administrativo"))
    if estado == "confirmado":
        client.patch(f"/api/turnos/{tid}/respuesta", json={"respuesta": "aceptar"}, headers=token(paciente, "paciente"))
    return tid


def avisos(client, paciente=PACIENTE):
    return client.get("/api/notificaciones/mias", headers=token(paciente, "paciente")).json


# ---- unitarias ----
def test_mensajes_predefinidos_llevan_solo_lo_minimo():
    t = {"especialidad": "cardiologia", "fecha_hora": datetime(2030, 1, 15, 10, 30), "motivo": "dolor de pecho"}
    assert "30 minutos" in mensaje_demora(t, 30) and "15/01/2030 a las 10:30" in mensaje_demora(t, 30)
    assert "reprogramado" in mensaje_reprogramado(t) and "suspendido" in mensaje_suspendido(t)
    for texto in (mensaje_demora(t, 30), mensaje_reprogramado(t), mensaje_suspendido(t)):
        assert "dolor" not in texto          # nunca el motivo ni datos clínicos


def test_un_turno_confirmado_se_puede_suspender_pero_uno_rechazado_no():
    assert T.CANCELADO in T.TRANSICIONES[T.CONFIRMADO]
    assert T.TRANSICIONES[T.RECHAZADO] == () and T.TRANSICIONES[T.CANCELADO] == ()


# ---- reprogramar ----
def test_reprogramar_vuelve_a_proponer_y_avisa_al_paciente(entorno):
    client, canal = entorno
    tid = turno(client)
    r = client.patch(f"/api/turnos/{tid}/reprogramar", json={"fecha_hora": FECHA_NUEVA}, headers=token(ADMIN, "administrativo"))
    assert r.status_code == 200 and r.json["estado"] == "propuesto" and r.json["fecha_hora"].startswith("2030-01-20T09:00")
    ultimo = avisos(client)[0]
    assert ultimo["tipo"] == "cambio" and "reprogramado" in ultimo["mensaje"] and "20/01/2030 a las 09:00" in ultimo["mensaje"]
    assert "reprogramado" in canal.mensajes[-1]
    # el paciente tiene que aceptar la nueva fecha
    r = client.patch(f"/api/turnos/{tid}/respuesta", json={"respuesta": "aceptar"}, headers=token(PACIENTE, "paciente"))
    assert r.json["estado"] == "confirmado"


def test_reprogramar_valida_estado_fecha_y_medico(entorno):
    client, _ = entorno
    h = token(ADMIN, "administrativo")
    sin_fecha = turno(client, estado="solicitado")
    assert client.patch(f"/api/turnos/{sin_fecha}/reprogramar", json={"fecha_hora": FECHA_NUEVA}, headers=h).status_code == 409
    tid = turno(client)
    assert client.patch(f"/api/turnos/{tid}/reprogramar", json={"fecha_hora": "2020-01-01T10:00"}, headers=h).status_code == 400
    assert client.patch(f"/api/turnos/{tid}/reprogramar", json={"fecha_hora": "ayer"}, headers=h).status_code == 400
    assert client.patch(f"/api/turnos/{tid}/reprogramar", json={"fecha_hora": FECHA_NUEVA, "medico_id": "9999"}, headers=h).status_code == 400
    assert client.patch("/api/turnos/999/reprogramar", json={"fecha_hora": FECHA_NUEVA}, headers=h).status_code == 404


# ---- suspender ----
def test_suspender_avisa_y_no_se_puede_repetir(entorno):
    client, _ = entorno
    tid = turno(client)
    h = token(ADMIN, "administrativo")
    r = client.patch(f"/api/turnos/{tid}/cancelar", headers=h)
    assert r.status_code == 200 and r.json["estado"] == "cancelado"
    assert "suspendido" in avisos(client)[0]["mensaje"]
    assert client.patch(f"/api/turnos/{tid}/cancelar", headers=h).status_code == 409
    assert client.patch(f"/api/turnos/{tid}/respuesta", json={"respuesta": "aceptar"}, headers=token(PACIENTE, "paciente")).status_code == 409


# ---- demoras ----
def test_aviso_de_demora_llega_por_la_app_y_por_whatsapp(entorno):
    client, canal = entorno
    tid = turno(client)
    r = client.post(f"/api/turnos/{tid}/aviso", json={"minutos": 30}, headers=token(ADMIN, "administrativo"))
    assert r.status_code == 200 and r.json["canales"] == {"app": True, "falso": True}
    assert "30 minutos" in avisos(client)[0]["mensaje"] and "30 minutos" in canal.mensajes[-1]
    assert avisos(client, OTRO) == []


def test_aviso_de_demora_validaciones(entorno):
    client, _ = entorno
    h = token(ADMIN, "administrativo")
    tid = turno(client)
    for cuerpo in ({}, {"minutos": 7}, {"minutos": "30"}, {"minutos": True}, {"minutos": "' OR 1=1"}):
        assert client.post(f"/api/turnos/{tid}/aviso", json=cuerpo, headers=h).status_code == 400
    sin_fecha = turno(client, estado="solicitado")
    assert client.post(f"/api/turnos/{sin_fecha}/aviso", json={"minutos": 30}, headers=h).status_code == 409
    assert client.post("/api/turnos/999/aviso", json={"minutos": 30}, headers=h).status_code == 404


# ---- permisos ----
def test_solo_el_administrativo_puede_cambiar_turnos_y_avisar(entorno):
    client, _ = entorno
    tid = turno(client)
    llamadas = [("patch", f"/api/turnos/{tid}/reprogramar", {"fecha_hora": FECHA_NUEVA}),
                ("patch", f"/api/turnos/{tid}/cancelar", None),
                ("post", f"/api/turnos/{tid}/aviso", {"minutos": 30}),
                ("get", "/api/medicos", None)]
    for metodo, url, cuerpo in llamadas:
        assert getattr(client, metodo)(url, json=cuerpo).status_code == 401
        assert getattr(client, metodo)(url, json=cuerpo, headers=token(PACIENTE, "paciente")).status_code == 403
        assert getattr(client, metodo)(url, json=cuerpo, headers=token(MEDICO, "medico")).status_code == 403


# ---- ver los turnos de un médico en un día ----
def test_listar_turnos_de_un_medico_en_un_dia(entorno):
    client, _ = entorno
    h = token(ADMIN, "administrativo")
    a = turno(client, fecha="2030-01-15T10:30", medico=MEDICO)
    turno(client, fecha="2030-01-16T10:30", medico=MEDICO)
    turno(client, fecha="2030-01-15T11:00", medico="2002")
    r = client.get(f"/api/turnos?medico_id={MEDICO}&fecha=2030-01-15", headers=h)
    assert [t["id"] for t in r.json] == [a]
    assert len(client.get("/api/turnos?fecha=2030-01-15", headers=h).json) == 2
    assert client.get("/api/turnos?fecha=15-01-2030", headers=h).status_code == 400
    assert client.get("/api/turnos?estado=inventado", headers=h).status_code == 400


def test_medicos_disponibles_para_asignar(entorno):
    client, _ = entorno
    r = client.get("/api/medicos", headers=token(ADMIN, "administrativo"))
    assert r.status_code == 200 and r.json[0] == {"id": MEDICO, "nombre": "Medico Prueba"}
