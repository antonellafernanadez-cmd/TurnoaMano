import os, sys
from datetime import datetime, timedelta, timezone
import jwt, pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ["JWT_SECRET"] = "secreto-de-prueba-de-32-caracteres-min"

from app import create_app
from strategies.solicitud import SolicitudPorVoz
from tests.fake_repo import FakeTurnoRepository
from utils.errores import ApiError


def token(uid, rol):
    return {"Authorization": "Bearer " + jwt.encode({"sub": uid, "rol": rol}, os.environ["JWT_SECRET"], algorithm="HS256")}


@pytest.fixture
def client():
    return create_app(turno_repo=FakeTurnoRepository()).test_client()


# ---- unitarias ----
def test_voz_detecta_especialidad():
    esp, _ = SolicitudPorVoz().interpretar({"transcripcion": "Quiero un turno con Cardiología"})
    assert esp == "cardiologia"


def test_voz_rechaza_frase_sin_especialidad():
    with pytest.raises(ApiError):
        SolicitudPorVoz().interpretar({"transcripcion": "hola buenas tardes"})


# ---- end to end ----
def test_flujo_completo(client):
    r = client.post("/api/turnos", json={"modo": "manual", "especialidad": "cardiologia", "motivo": "Control"},
                    headers=token("12345678", "paciente"))
    assert r.status_code == 201 and r.json["estado"] == "solicitado"
    tid = r.json["id"]

    futuro = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    r = client.patch(f"/api/turnos/{tid}/asignar", json={"fecha_hora": futuro}, headers=token("L-100", "administrativo"))
    assert r.json["estado"] == "propuesto"

    r = client.patch(f"/api/turnos/{tid}/respuesta", json={"respuesta": "aceptar"}, headers=token("12345678", "paciente"))
    assert r.json["estado"] == "confirmado"


def test_permisos_denegados(client):
    r = client.post("/api/turnos", json={"modo": "manual", "especialidad": "cardiologia"}, headers=token("1", "paciente"))
    tid = r.json["id"]
    assert client.get("/api/turnos").status_code == 401
    assert client.get("/api/turnos", headers=token("1", "paciente")).status_code == 403
    assert client.patch(f"/api/turnos/{tid}/asignar", json={}, headers=token("1", "paciente")).status_code == 403
    assert client.patch(f"/api/turnos/{tid}/respuesta", json={"respuesta": "aceptar"},
                        headers=token("2", "paciente")).status_code == 403


def test_validaciones(client):
    h = token("1", "paciente")
    assert client.post("/api/turnos", json={"modo": "manual", "especialidad": "' OR 1=1 --"}, headers=h).status_code == 400
    assert client.post("/api/turnos", json={"modo": "manual", "especialidad": "magia"}, headers=h).status_code == 400
    assert client.post("/api/turnos", json={"modo": "manual", "especialidad": "cardiologia", "motivo": "x" * 301},
                       headers=h).status_code == 400
