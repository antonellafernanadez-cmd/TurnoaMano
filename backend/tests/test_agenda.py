"""Pruebas de la agenda: horarios disponibles, turno confirmado al instante, cancelar y reprogramar."""
import os, sys
from datetime import date, datetime, timedelta
import jwt, pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ["JWT_SECRET"] = "secreto-de-prueba-de-32-caracteres-min"
os.environ["SECRET_KEY"] = "secreto-de-prueba-de-32-caracteres-min"

from app import create_app
from services import agenda
from tests.fake_repo import FakeNotificacionRepository, FakeTurnoRepository

PACIENTE, OTRO, ADMIN = "12345678", "87654321", "1001"


def token(uid, rol):
    return {"Authorization": "Bearer " + jwt.encode({"sub": uid, "rol": rol}, os.environ["JWT_SECRET"], algorithm="HS256")}


def horario(dia_n=0, hora="09:30"):
    """Un horario válido de la grilla: el día hábil número dia_n (0 = el primero) a esa hora."""
    return f"{agenda.dias_disponibles()[dia_n].isoformat()}T{hora}"


@pytest.fixture
def entorno():
    avisos = FakeNotificacionRepository()
    app = create_app(turno_repo=FakeTurnoRepository(), notificacion_repo=avisos,
                     destinatarios=lambda pid: {"identificador": pid, "telefono": "2610000003"}, canales_extra=[])
    return app.test_client(), avisos


def pedir(client, especialidad="cardiologia", fecha=None, paciente=PACIENTE, **extra):
    cuerpo = {"modo": "manual", "especialidad": especialidad, **extra}
    if fecha:
        cuerpo["fecha_hora"] = fecha
    return client.post("/api/turnos", json=cuerpo, headers=token(paciente, "paciente"))


# ---- agenda (funciones puras) ----
def test_los_dias_son_5_habiles_empezando_manana():
    viernes = datetime(2030, 1, 4, 15, 0)                     # un viernes
    dias = agenda.dias_disponibles(viernes)
    assert len(dias) == 5 and dias[0] == date(2030, 1, 7)     # saltea sábado y domingo
    assert all(d.weekday() < 5 for d in dias)


def test_cada_dia_tiene_9_horarios_de_8_a_12():
    horas = [h.strftime("%H:%M") for h in agenda.horarios_del_dia(date(2030, 1, 7))]
    assert horas[0] == "08:00" and horas[-1] == "12:00" and len(horas) == 9


# ---- disponibilidad ----
def test_disponibilidad_muestra_el_horario_tomado_como_ocupado(entorno):
    client, _ = entorno
    assert pedir(client, fecha=horario(0, "09:30")).status_code == 201
    r = client.get("/api/turnos/disponibilidad?especialidad=cardiologia", headers=token(OTRO, "paciente"))
    assert r.status_code == 200 and len(r.json["dias"]) == 5
    primero = {h["hora"]: h["libre"] for h in r.json["dias"][0]["horarios"]}
    assert primero["09:30"] is False and primero["10:00"] is True
    otra = client.get("/api/turnos/disponibilidad?especialidad=neurologia", headers=token(OTRO, "paciente"))
    assert {h["hora"]: h["libre"] for h in otra.json["dias"][0]["horarios"]}["09:30"] is True   # otra especialidad


def test_disponibilidad_pide_sesion_y_especialidad_valida(entorno):
    client, _ = entorno
    assert client.get("/api/turnos/disponibilidad?especialidad=cardiologia").status_code == 401
    assert client.get("/api/turnos/disponibilidad?especialidad=magia", headers=token(PACIENTE, "paciente")).status_code == 400
    assert client.get("/api/turnos/disponibilidad", headers=token(PACIENTE, "paciente")).status_code == 400
    assert client.get("/api/turnos/disponibilidad?especialidad=cardiologia", headers=token("2001", "medico")).status_code == 403


# ---- elegir día y horario ----
def test_con_fecha_elegida_el_turno_queda_confirmado_al_instante(entorno):
    client, _ = entorno
    r = pedir(client, fecha=horario(1, "10:00"), motivo="Control")
    assert r.status_code == 201 and r.json["estado"] == "confirmado" and r.json["fecha_hora"].endswith("10:00:00")


def test_sin_fecha_sigue_el_circuito_original(entorno):
    client, _ = entorno
    assert pedir(client).json["estado"] == "solicitado"


def test_horarios_invalidos_se_rechazan(entorno):
    client, _ = entorno
    dia = agenda.dias_disponibles()[0].isoformat()
    assert pedir(client, fecha=f"{dia}T07:00").status_code == 400                       # fuera de horario
    assert pedir(client, fecha=f"{dia}T09:15").status_code == 400                       # no es múltiplo de 30
    assert pedir(client, fecha=f"{dia}T09:30:30").status_code == 400                    # con segundos
    assert pedir(client, fecha="2020-01-06T09:00").status_code == 400                   # pasado
    assert pedir(client, fecha=f"{dia}T09:30-03:00").status_code == 400                 # con zona horaria
    assert pedir(client, fecha="mañana").status_code == 400                             # no es una fecha
    sabado = agenda.dias_disponibles()[0]
    while sabado.weekday() != 5:
        sabado += timedelta(days=1)
    assert pedir(client, fecha=f"{sabado.isoformat()}T09:00").status_code == 400        # fin de semana


def test_dos_pacientes_no_pueden_tomar_el_mismo_horario(entorno):
    client, _ = entorno
    assert pedir(client, fecha=horario(0), paciente=PACIENTE).status_code == 201
    r = pedir(client, fecha=horario(0), paciente=OTRO)
    assert r.status_code == 409 and "ya fue tomado" in r.json["error"]


def test_un_paciente_no_puede_tener_dos_turnos_a_la_misma_hora(entorno):
    client, _ = entorno
    assert pedir(client, "cardiologia", fecha=horario(0)).status_code == 201
    assert pedir(client, "neurologia", fecha=horario(0)).status_code == 409


def test_no_se_repite_la_especialidad_en_curso(entorno):
    client, _ = entorno
    assert pedir(client, fecha=horario(0)).status_code == 201
    assert pedir(client, fecha=horario(1)).status_code == 409


# ---- voz en dos pasos ----
def test_interpretar_voz_devuelve_la_especialidad(entorno):
    client, _ = entorno
    r = client.post("/api/turnos/interpretar-voz", json={"transcripcion": "turno con el oculista"},
                    headers=token(PACIENTE, "paciente"))
    assert r.status_code == 200 and r.json == {"especialidad": "oftalmologia"}
    r = client.post("/api/turnos/interpretar-voz", json={"transcripcion": "hola"}, headers=token(PACIENTE, "paciente"))
    assert r.status_code == 422


def test_turno_por_voz_con_fecha(entorno):
    client, _ = entorno
    r = client.post("/api/turnos", json={"modo": "voz", "transcripcion": "quiero el cardiólogo", "fecha_hora": horario(2, "11:00")},
                    headers=token(PACIENTE, "paciente"))
    assert r.status_code == 201 and r.json["origen"] == "voz" and r.json["especialidad"] == "cardiologia"


# ---- cancelar ----
def test_el_paciente_cancela_su_turno_y_libera_el_horario(entorno):
    client, avisos = entorno
    tid = pedir(client, fecha=horario(0)).json["id"]
    r = client.patch(f"/api/turnos/{tid}/cancelar", headers=token(PACIENTE, "paciente"))
    assert r.status_code == 200 and r.json["estado"] == "cancelado"
    assert avisos.listar_por_paciente(PACIENTE) == []                                   # si cancela él, no hay aviso
    assert pedir(client, fecha=horario(0), paciente=OTRO).status_code == 201            # el horario quedó libre
    assert pedir(client, fecha=horario(3)).status_code == 201                           # y puede pedir de nuevo


def test_nadie_cancela_el_turno_de_otro_paciente(entorno):
    client, _ = entorno
    tid = pedir(client, fecha=horario(0)).json["id"]
    assert client.patch(f"/api/turnos/{tid}/cancelar", headers=token(OTRO, "paciente")).status_code == 403
    assert client.patch(f"/api/turnos/{tid}/cancelar").status_code == 401
    assert client.patch(f"/api/turnos/{tid}/cancelar", headers=token("2001", "medico")).status_code == 403
    assert client.patch("/api/turnos/999/cancelar", headers=token(PACIENTE, "paciente")).status_code == 404


def test_el_administrativo_cancela_y_el_paciente_recibe_aviso(entorno):
    client, avisos = entorno
    tid = pedir(client, fecha=horario(0)).json["id"]
    assert client.patch(f"/api/turnos/{tid}/cancelar", headers=token(ADMIN, "administrativo")).json["estado"] == "cancelado"
    mensajes = avisos.listar_por_paciente(PACIENTE)
    assert len(mensajes) == 1 and mensajes[0]["tipo"] == "cambio" and "Se canceló tu turno" in mensajes[0]["mensaje"]
    assert client.patch(f"/api/turnos/{tid}/cancelar", headers=token(ADMIN, "administrativo")).status_code == 409   # ya cancelado


# ---- reprogramar ----
def test_el_administrativo_reprograma_y_el_paciente_recibe_aviso(entorno):
    client, avisos = entorno
    tid = pedir(client, fecha=horario(0, "09:30")).json["id"]
    r = client.patch(f"/api/turnos/{tid}/reprogramar", json={"fecha_hora": horario(1, "11:00")},
                     headers=token(ADMIN, "administrativo"))
    assert r.status_code == 200 and r.json["fecha_hora"].endswith("11:00:00") and r.json["estado"] == "confirmado"
    mensajes = avisos.listar_por_paciente(PACIENTE)
    assert len(mensajes) == 1 and mensajes[0]["tipo"] == "cambio" and "11:00" in mensajes[0]["mensaje"]


def test_reprogramar_valida_permisos_y_horario(entorno):
    client, _ = entorno
    tid = pedir(client, fecha=horario(0, "09:30")).json["id"]
    pedir(client, paciente=OTRO, fecha=horario(1, "10:00"))
    nuevo = {"fecha_hora": horario(1, "11:00")}
    assert client.patch(f"/api/turnos/{tid}/reprogramar", json=nuevo, headers=token(PACIENTE, "paciente")).status_code == 403
    assert client.patch(f"/api/turnos/{tid}/reprogramar", json={"fecha_hora": horario(1, "10:00")},
                        headers=token(ADMIN, "administrativo")).status_code == 409          # ya tomado
    assert client.patch(f"/api/turnos/{tid}/reprogramar", json={}, headers=token(ADMIN, "administrativo")).status_code == 400
    assert client.patch(f"/api/turnos/{tid}/reprogramar", json={"fecha_hora": "2020-01-06T09:00"},
                        headers=token(ADMIN, "administrativo")).status_code == 400
    sin_fecha = pedir(client, "neurologia", paciente=OTRO).json["id"]                      # solicitado, sin fecha
    assert client.patch(f"/api/turnos/{sin_fecha}/reprogramar", json=nuevo,
                        headers=token(ADMIN, "administrativo")).status_code == 409
