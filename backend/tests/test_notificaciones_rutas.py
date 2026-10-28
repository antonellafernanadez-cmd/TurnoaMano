"""Pruebas de las rutas de notificaciones: permisos por rol, validaciones y recordatorios. Datos ficticios."""
import os, sys
from datetime import datetime, timedelta, timezone
import jwt, pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ["JWT_SECRET"] = "secreto-de-prueba-de-32-caracteres-min"
os.environ["SECRET_KEY"] = "secreto-de-prueba-de-32-caracteres-min"

from app import create_app
from tests.fake_repo import FakeNotificacionRepository, FakeTurnoRepository

PACIENTE, OTRO_PACIENTE, ADMIN, MEDICO = "12345678", "87654321", "1001", "2001"


def token(uid, rol):
    carga = {"sub": uid, "rol": rol, "exp": datetime.now(timezone.utc) + timedelta(minutes=5)}
    return {"Authorization": "Bearer " + jwt.encode(carga, os.environ["JWT_SECRET"], algorithm="HS256")}


class CanalFalso:
    nombre = "falso"

    def __init__(self):
        self.recibidos = []

    def enviar(self, destinatario, notificacion):
        self.recibidos.append(notificacion["mensaje"])
        return True


@pytest.fixture
def entorno():
    whatsapp = CanalFalso()
    app = create_app(
        turno_repo=FakeTurnoRepository(),
        notificacion_repo=FakeNotificacionRepository(),
        destinatarios=lambda pid: {"identificador": pid, "telefono": "2610000003"} if pid in (PACIENTE, OTRO_PACIENTE) else None,
        canales_extra=[whatsapp],
    )
    return app.test_client(), whatsapp


def nuevo_turno(client, paciente=PACIENTE):
    r = client.post("/api/turnos", json={"modo": "manual", "especialidad": "cardiologia"}, headers=token(paciente, "paciente"))
    return r.json["id"]


def proponer(client, tid):
    return client.patch(f"/api/turnos/{tid}/asignar", json={"fecha_hora": "2030-01-15T10:30"}, headers=token(ADMIN, "administrativo"))


def confirmar(client, tid, paciente=PACIENTE):
    proponer(client, tid)
    return client.patch(f"/api/turnos/{tid}/respuesta", json={"respuesta": "aceptar"}, headers=token(paciente, "paciente"))


# ---- el paciente ve sus avisos ----
def test_el_paciente_ve_sus_avisos_y_solo_los_suyos(entorno):
    client, _ = entorno
    proponer(client, nuevo_turno(client))
    mios = client.get("/api/notificaciones/mias", headers=token(PACIENTE, "paciente"))
    assert mios.status_code == 200 and len(mios.json) == 1 and mios.json[0]["tipo"] == "fecha_propuesta"
    ajenos = client.get("/api/notificaciones/mias", headers=token(OTRO_PACIENTE, "paciente"))
    assert ajenos.json == []


def test_marcar_como_leida_y_filtrar_no_leidas(entorno):
    client, _ = entorno
    proponer(client, nuevo_turno(client))
    h = token(PACIENTE, "paciente")
    aviso_id = client.get("/api/notificaciones/mias", headers=h).json[0]["id"]
    r = client.patch(f"/api/notificaciones/{aviso_id}/leida", headers=h)
    assert r.status_code == 200 and r.json["leida"] is True
    assert client.get("/api/notificaciones/mias?solo_no_leidas=1", headers=h).json == []
    assert len(client.get("/api/notificaciones/mias", headers=h).json) == 1


def test_no_se_puede_marcar_el_aviso_de_otro_paciente(entorno):
    client, _ = entorno
    proponer(client, nuevo_turno(client))
    aviso_id = client.get("/api/notificaciones/mias", headers=token(PACIENTE, "paciente")).json[0]["id"]
    assert client.patch(f"/api/notificaciones/{aviso_id}/leida", headers=token(OTRO_PACIENTE, "paciente")).status_code == 404
    assert client.patch("/api/notificaciones/999/leida", headers=token(PACIENTE, "paciente")).status_code == 404


# ---- permisos por rol ----
def test_permisos_denegados(entorno):
    client, _ = entorno
    tid = confirmar(client, nuevo_turno(client)).json["id"]
    assert client.get("/api/notificaciones/mias").status_code == 401                                   # sin sesión
    assert client.get("/api/notificaciones/mias", headers=token(ADMIN, "administrativo")).status_code == 403
    assert client.get("/api/notificaciones/mias", headers=token(MEDICO, "medico")).status_code == 403
    assert client.post(f"/api/turnos/{tid}/recordatorio", headers=token(PACIENTE, "paciente")).status_code == 403
    assert client.post(f"/api/turnos/{tid}/recordatorio", headers=token(MEDICO, "medico")).status_code == 403
    assert client.post(f"/api/turnos/{tid}/recordatorio").status_code == 401


# ---- recordatorio del administrativo ----
def test_el_administrativo_envia_recordatorio_de_un_turno_confirmado(entorno):
    client, whatsapp = entorno
    tid = confirmar(client, nuevo_turno(client)).json["id"]
    r = client.post(f"/api/turnos/{tid}/recordatorio", headers=token(ADMIN, "administrativo"))
    assert r.status_code == 200 and r.json["canales"] == {"app": True, "falso": True}
    avisos = client.get("/api/notificaciones/mias", headers=token(PACIENTE, "paciente")).json
    recordatorio = [a for a in avisos if a["tipo"] == "recordatorio"]
    assert len(recordatorio) == 1 and "15/01/2030 a las 10:30" in recordatorio[0]["mensaje"]
    assert any("Recordatorio" in m for m in whatsapp.recibidos)                                       # también por WhatsApp


def test_no_se_recuerda_un_turno_que_no_esta_confirmado(entorno):
    client, _ = entorno
    h = token(ADMIN, "administrativo")
    pendiente = nuevo_turno(client)
    assert client.post(f"/api/turnos/{pendiente}/recordatorio", headers=h).status_code == 409        # solicitado
    proponer(client, pendiente)
    assert client.post(f"/api/turnos/{pendiente}/recordatorio", headers=h).status_code == 409        # propuesto
    assert client.post("/api/turnos/999/recordatorio", headers=h).status_code == 404                 # no existe