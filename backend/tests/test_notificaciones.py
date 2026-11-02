"""Pruebas del aviso automático al proponer fecha (Observer + Strategy). Datos ficticios, sin MySQL ni red."""
import os, sys
from datetime import datetime, timedelta, timezone
import jwt, pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ["JWT_SECRET"] = "secreto-de-prueba-de-32-caracteres-min"
os.environ["SECRET_KEY"] = "secreto-de-prueba-de-32-caracteres-min"

from app import create_app
from tests.fake_repo import FakeNotificacionRepository, FakeTurnoRepository

TELEFONOS = {"12345678": "2610000003"}


def token(uid, rol):
    carga = {"sub": uid, "rol": rol, "exp": datetime.now(timezone.utc) + timedelta(minutes=5)}
    return {"Authorization": "Bearer " + jwt.encode(carga, os.environ["JWT_SECRET"], algorithm="HS256")}


class CanalFalso:
    """Canal de prueba: anota lo que recibe (o falla a propósito)."""
    nombre = "falso"

    def __init__(self, falla=False):
        self.recibidos, self.falla = [], falla

    def enviar(self, destinatario, notificacion):
        if self.falla:
            raise ConnectionError("sin conexión")
        self.recibidos.append((destinatario, notificacion["mensaje"]))
        return True


def armar(canales_extra=None, destinatarios=None):
    repo = FakeNotificacionRepository()
    app = create_app(
        turno_repo=FakeTurnoRepository(),
        notificacion_repo=repo,
        destinatarios=destinatarios or (lambda pid: {"identificador": pid, "telefono": TELEFONOS.get(pid)}),
        canales_extra=canales_extra if canales_extra is not None else [],
    )
    return app.test_client(), repo


def pedir_y_proponer(client, fecha="2030-01-15T10:30"):
    r = client.post("/api/turnos", json={"modo": "manual", "especialidad": "cardiologia", "motivo": "Control"},
                    headers=token("12345678", "paciente"))
    tid = r.json["id"]
    r = client.patch(f"/api/turnos/{tid}/asignar", json={"fecha_hora": fecha}, headers=token("1001", "administrativo"))
    return tid, r


def test_proponer_fecha_crea_el_aviso_para_el_paciente():
    client, repo = armar()
    tid, r = pedir_y_proponer(client)
    assert r.status_code == 200 and r.json["estado"] == "propuesto"
    avisos = repo.listar_por_paciente("12345678")
    assert len(avisos) == 1
    assert avisos[0]["tipo"] == "fecha_propuesta" and avisos[0]["turno_id"] == tid and avisos[0]["leida"] is False
    assert "cardiologia" in avisos[0]["mensaje"] and "15/01/2030 a las 10:30" in avisos[0]["mensaje"]


def test_el_aviso_es_solo_del_paciente_del_turno():
    client, repo = armar()
    pedir_y_proponer(client)
    assert repo.listar_por_paciente("99999999") == []


def test_tambien_se_avisa_por_whatsapp_si_el_canal_esta_activo():
    whatsapp = CanalFalso()
    client, repo = armar(canales_extra=[whatsapp])
    pedir_y_proponer(client)
    assert len(repo.listar_por_paciente("12345678")) == 1          # en la app
    destinatario, mensaje = whatsapp.recibidos[0]                   # y por WhatsApp
    assert destinatario["telefono"] == "2610000003" and "15/01/2030 a las 10:30" in mensaje


def test_si_whatsapp_falla_el_aviso_en_la_app_igual_se_crea():
    client, repo = armar(canales_extra=[CanalFalso(falla=True)])
    _, r = pedir_y_proponer(client)
    assert r.status_code == 200
    assert len(repo.listar_por_paciente("12345678")) == 1


def test_si_falla_el_aviso_la_fecha_se_propone_igual():
    def destinatarios_roto(_):
        raise RuntimeError("la base no responde")
    client, repo = armar(destinatarios=destinatarios_roto)
    _, r = pedir_y_proponer(client)
    assert r.status_code == 200 and r.json["estado"] == "propuesto"
    assert repo.listar_por_paciente("12345678") == []


def test_aceptar_o_rechazar_no_genera_un_aviso_de_fecha():
    client, repo = armar()
    tid, _ = pedir_y_proponer(client)
    client.patch(f"/api/turnos/{tid}/respuesta", json={"respuesta": "aceptar"}, headers=token("12345678", "paciente"))
    assert len(repo.listar_por_paciente("12345678")) == 1           # sigue siendo solo el de la fecha propuesta