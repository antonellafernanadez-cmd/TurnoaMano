"""Pruebas unitarias de los canales de aviso. Datos ficticios y sin red: nunca se llama a Twilio."""
import os, sys
from types import SimpleNamespace
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ["JWT_SECRET"] = "secreto-de-prueba-de-32-caracteres-min"
os.environ["SECRET_KEY"] = "secreto-de-prueba-de-32-caracteres-min"

from models.notificacion import FECHA_PROPUESTA, nueva_notificacion
from strategies.canales import CanalApp, CanalWhatsApp, normalizar_telefono
from tests.fake_repo import FakeNotificacionRepository

DESTINATARIO = {"identificador": "12345678", "telefono": "2610000003"}


def aviso():
    return nueva_notificacion("12345678", 1, FECHA_PROPUESTA, "Tu turno de cardiologia es el 15/01 a las 10:30")


def test_canal_app_guarda_el_aviso():
    repo = FakeNotificacionRepository()
    assert CanalApp(repo).enviar(DESTINATARIO, aviso()) is True
    guardadas = repo.listar_por_paciente("12345678")
    assert len(guardadas) == 1 and guardadas[0]["leida"] is False


@pytest.mark.parametrize("entrada, esperado", [
    ("2610000003", "+5492610000003"),            # sin 0 ni código de país
    ("02610000003", "+5492610000003"),           # con 0 adelante
    ("261-000-0003", "+5492610000003"),          # con guiones
    ("+5492610000003", "+5492610000003"),        # ya viene internacional
    ("5492610000003", "+5492610000003"),
    ("123", None), ("", None), (None, None), ("abc", None),
])
def test_normalizar_telefono(entrada, esperado):
    assert normalizar_telefono(entrada) == esperado


def test_whatsapp_arma_el_pedido_correcto():
    pedidos = []
    canal = CanalWhatsApp("ACfalso", "token-falso", "whatsapp:+14155238886",
                          transporte=lambda *args: pedidos.append(args))
    assert canal.enviar(DESTINATARIO, aviso()) is True
    url, datos, usuario, clave = pedidos[0]
    assert "ACfalso/Messages.json" in url
    assert datos == {"From": "whatsapp:+14155238886", "To": "whatsapp:+5492610000003",
                     "Body": "Tu turno de cardiologia es el 15/01 a las 10:30"}
    assert (usuario, clave) == ("ACfalso", "token-falso")


def test_whatsapp_con_telefono_invalido_no_envia():
    pedidos = []
    canal = CanalWhatsApp("AC", "t", "whatsapp:+1", transporte=lambda *a: pedidos.append(a))
    assert canal.enviar({"identificador": "1", "telefono": "xx"}, aviso()) is False
    assert pedidos == []


def test_whatsapp_que_falla_no_rompe_el_aviso():
    def transporte_roto(*_):
        raise TimeoutError("sin conexión")
    canal = CanalWhatsApp("AC", "t", "whatsapp:+1", transporte=transporte_roto)
    assert canal.enviar(DESTINATARIO, aviso()) is False        # devuelve False, no lanza el error


def test_whatsapp_queda_desactivado_sin_credenciales():
    assert CanalWhatsApp.desde_config(SimpleNamespace()) is None
    assert CanalWhatsApp.desde_config(SimpleNamespace(TWILIO_ACCOUNT_SID="AC", TWILIO_AUTH_TOKEN="",
                                                      TWILIO_WHATSAPP_FROM="whatsapp:+1")) is None
    activo = CanalWhatsApp.desde_config(SimpleNamespace(TWILIO_ACCOUNT_SID="AC", TWILIO_AUTH_TOKEN="t",
                                                        TWILIO_WHATSAPP_FROM="whatsapp:+1"))
    assert isinstance(activo, CanalWhatsApp)