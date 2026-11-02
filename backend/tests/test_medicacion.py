"""Historia de usuario 3: recordatorio de toma de medicación. Datos ficticios, sin MySQL ni red."""
import os, sys
from datetime import datetime, timedelta, timezone
import jwt, pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ["JWT_SECRET"] = "secreto-de-prueba-de-32-caracteres-min"
os.environ["SECRET_KEY"] = "secreto-de-prueba-de-32-caracteres-min"

from app import create_app
from models.plan_medicacion import nuevo_item
from strategies.canales import CanalWhatsApp
from tests.fake_repo import (FakeNotificacionRepository, FakePlanMedicacionRepository, FakeTurnoRepository)
from utils.mensajes import MENSAJE_MEDICACION_EXTERNO, mensaje_medicacion

PACIENTE, OTRO, FANTASMA, ADMIN, MEDICO = "7", "8", "99", "1", "2"     # ids de usuarios (texto)
PACIENTES = [
    {"id": PACIENTE, "nombre": "Ana Prueba", "identificador": "12345678"},
    {"id": OTRO, "nombre": "Beto Prueba", "identificador": "87654321"},
]


def token(uid, rol):
    carga = {"sub": uid, "rol": rol, "exp": datetime.now(timezone.utc) + timedelta(minutes=5)}
    return {"Authorization": "Bearer " + jwt.encode(carga, os.environ["JWT_SECRET"], algorithm="HS256")}


class CanalFalso:
    """Se comporta como WhatsApp: manda el texto externo si el aviso lo trae."""
    nombre = "falso"

    def __init__(self):
        self.mensajes = []

    def enviar(self, destinatario, notificacion):
        self.mensajes.append(notificacion.get("mensaje_externo") or notificacion["mensaje"])
        return True


@pytest.fixture
def entorno():
    plan, canal = FakePlanMedicacionRepository(), CanalFalso()
    ids = {}
    for clave, (pid, med, dosis, hora) in {
        "enalapril": (PACIENTE, "Enalapril", "10 mg", "08:00"),
        "metformina": (PACIENTE, "Metformina", "850 mg", "20:00"),
        "atorva": (OTRO, "Atorvastatina", "20 mg", "21:00"),
        "fantasma": (FANTASMA, "Aspirina", "100 mg", "09:00"),
    }.items():
        ids[clave] = plan.crear(nuevo_item(pid, med, dosis, hora))["id"]
    viejo = nuevo_item(PACIENTE, "Viejo", "1 mg", "12:00")
    viejo["activo"] = False
    ids["inactivo"] = plan.crear(viejo)["id"]

    app = create_app(
        turno_repo=FakeTurnoRepository(), notificacion_repo=FakeNotificacionRepository(), plan_repo=plan,
        destinatarios=lambda pid: {"identificador": "dni" + pid, "telefono": "2610000003"} if pid in (PACIENTE, OTRO) else None,
        canales_extra=[canal],
        pacientes=lambda t: [p for p in PACIENTES if t in p["identificador"] or t.lower() in p["nombre"].lower()],
    )
    return app.test_client(), canal, ids


def avisos(client, paciente):
    return client.get("/api/notificaciones/mias", headers=token(paciente, "paciente")).json


# ---- unitarias ----
def test_mensaje_y_validacion_de_horarios():
    item = nuevo_item(PACIENTE, "Enalapril", "10 mg", "08:00")
    texto = mensaje_medicacion(item)
    assert "Enalapril" in texto and "10 mg" in texto and "08:00" in texto
    for horario in ("25:00", "8:00", "08:60", "", None, "08:00:00"):
        with pytest.raises(ValueError):
            nuevo_item(PACIENTE, "Enalapril", "10 mg", horario)
    with pytest.raises(ValueError):
        nuevo_item(PACIENTE, "  ", "10 mg", "08:00")
    with pytest.raises(ValueError):
        nuevo_item(PACIENTE, "Enalapril", "x" * 61, "08:00")


def test_whatsapp_manda_el_texto_generico_si_el_aviso_lo_trae():
    enviados = []
    canal = CanalWhatsApp("AC123", "tok", "whatsapp:+14155550000", transporte=lambda url, datos, u, c: enviados.append(datos))
    dest = {"identificador": "12345678", "telefono": "2610000003"}
    canal.enviar(dest, {"mensaje": "tomá Enalapril, 10 mg", "mensaje_externo": MENSAJE_MEDICACION_EXTERNO})
    canal.enviar(dest, {"mensaje": "Tenés turno el lunes"})
    assert enviados[0]["Body"] == MENSAJE_MEDICACION_EXTERNO and "Enalapril" not in enviados[0]["Body"]
    assert enviados[1]["Body"] == "Tenés turno el lunes"


# ---- consultar el plan ----
def test_el_administrativo_ve_el_plan_de_un_paciente(entorno):
    client, _, _ = entorno
    r = client.get(f"/api/pacientes/{PACIENTE}/medicacion", headers=token(ADMIN, "administrativo"))
    assert r.status_code == 200
    assert [(t["medicamento"], t["horario"]) for t in r.json] == [("Enalapril", "08:00"), ("Metformina", "20:00")]
    assert all(t["paciente_id"] == PACIENTE and t["activo"] for t in r.json)      # sin tomas de otros ni inactivas
    assert client.get("/api/pacientes/12345/medicacion", headers=token(ADMIN, "administrativo")).json == []


def test_buscar_pacientes_por_dni_o_nombre(entorno):
    client, _, _ = entorno
    h = token(ADMIN, "administrativo")
    r = client.get("/api/pacientes?buscar=1234", headers=h)
    assert [p["id"] for p in r.json] == [PACIENTE]
    assert set(r.json[0]) == {"id", "nombre", "identificador"}                    # nunca el teléfono
    assert [p["id"] for p in client.get("/api/pacientes?buscar=beto", headers=h).json] == [OTRO]
    assert client.get("/api/pacientes?buscar=ab", headers=h).status_code == 400
    assert client.get("/api/pacientes", headers=h).status_code == 400
    assert client.get("/api/pacientes?buscar=" + "x" * 41, headers=h).status_code == 400


# ---- enviar el recordatorio ----
def test_recordatorio_lleva_el_detalle_a_la_app_y_algo_generico_afuera(entorno):
    client, canal, ids = entorno
    r = client.post(f"/api/medicacion/{ids['enalapril']}/recordatorio", headers=token(ADMIN, "administrativo"))
    assert r.status_code == 200 and r.json["canales"] == {"app": True, "falso": True}

    aviso = avisos(client, PACIENTE)[0]
    assert aviso["tipo"] == "medicacion" and aviso["turno_id"] is None and not aviso["leida"]
    assert "Enalapril" in aviso["mensaje"] and "10 mg" in aviso["mensaje"] and "08:00" in aviso["mensaje"]

    assert canal.mensajes[-1] == MENSAJE_MEDICACION_EXTERNO
    assert "Enalapril" not in canal.mensajes[-1]
    assert avisos(client, OTRO) == []                                              # no le llega a otro paciente


def test_recordatorio_validaciones(entorno):
    client, _, ids = entorno
    h = token(ADMIN, "administrativo")
    assert client.post("/api/medicacion/9999/recordatorio", headers=h).status_code == 404
    assert client.post(f"/api/medicacion/{ids['inactivo']}/recordatorio", headers=h).status_code == 409
    assert client.post(f"/api/medicacion/{ids['fantasma']}/recordatorio", headers=h).status_code == 404   # paciente inexistente
    assert client.post("/api/medicacion/abc/recordatorio", headers=h).status_code == 404


# ---- permisos ----
def test_solo_el_administrativo_accede(entorno):
    client, _, ids = entorno
    llamadas = [("get", f"/api/pacientes/{PACIENTE}/medicacion"),
                ("get", "/api/pacientes?buscar=1234"),
                ("post", f"/api/medicacion/{ids['enalapril']}/recordatorio")]
    for metodo, url in llamadas:
        assert getattr(client, metodo)(url).status_code == 401
        assert getattr(client, metodo)(url, headers=token(PACIENTE, "paciente")).status_code == 403
        assert getattr(client, metodo)(url, headers=token(MEDICO, "medico")).status_code == 403
