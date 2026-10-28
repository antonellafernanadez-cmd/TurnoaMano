"""PATRÓN STRATEGY: formas intercambiables de avisarle al paciente (dentro de la app o por WhatsApp).
Todos los canales tienen el mismo método `enviar(destinatario, notificacion)`, así que quien
avisa no necesita saber cómo funciona cada uno, y se puede sumar otro canal sin tocar el resto.

  - destinatario: {"identificador": "12345678", "telefono": "2610000003"}
  - notificacion: el diccionario de models/notificacion.py (con "mensaje")

Privacidad: el mensaje solo lleva lo mínimo (especialidad, fecha y hora), sin datos clínicos,
y los logs no guardan teléfonos ni mensajes."""
import base64
import logging
import re
import urllib.parse
import urllib.request

from config.config import Config

log = logging.getLogger("notificaciones")


def normalizar_telefono(telefono):
    """Devuelve el número en formato internacional (+549...) o None si no se puede.
    Supone celulares de Argentina cuando el número no trae el código de país."""
    if not isinstance(telefono, str):
        return None
    digitos = re.sub(r"\D", "", telefono)
    if telefono.strip().startswith("+") and 10 <= len(digitos) <= 15:
        return "+" + digitos
    if digitos.startswith("54") and 12 <= len(digitos) <= 13:
        return "+" + digitos
    if digitos.startswith("0"):
        digitos = digitos[1:]
    if len(digitos) == 10:                 # código de área + número, sin 0 ni 15
        return "+549" + digitos
    return None


class CanalApp:
    """Guarda el aviso en la base: el paciente lo ve dentro de la app. Siempre está activo."""
    nombre = "app"

    def __init__(self, repo):
        self._repo = repo

    def enviar(self, destinatario, notificacion):
        self._repo.crear(notificacion)
        return True


def _enviar_http(url, datos, usuario, clave):
    """Pedido HTTPS con autenticación básica (lo que pide la API de Twilio)."""
    pedido = urllib.request.Request(url, data=urllib.parse.urlencode(datos).encode(), method="POST")
    credenciales = base64.b64encode(f"{usuario}:{clave}".encode()).decode()
    pedido.add_header("Authorization", f"Basic {credenciales}")
    with urllib.request.urlopen(pedido, timeout=5) as respuesta:
        return respuesta.status


class CanalWhatsApp:
    """Envía el aviso por WhatsApp usando la API de Twilio. Es opcional: si no están las
    credenciales en el .env, `desde_config` devuelve None y el canal no se usa."""
    nombre = "whatsapp"

    def __init__(self, cuenta, token, origen, transporte=_enviar_http):
        self._cuenta, self._token, self._origen = cuenta, token, origen
        self._transporte = transporte      # los tests le pasan uno falso: nunca se llama a Twilio

    @classmethod
    def desde_config(cls, config=Config):
        cuenta = getattr(config, "TWILIO_ACCOUNT_SID", "")
        token = getattr(config, "TWILIO_AUTH_TOKEN", "")
        origen = getattr(config, "TWILIO_WHATSAPP_FROM", "")
        if not (cuenta and token and origen):
            return None
        return cls(cuenta, token, origen)

    def enviar(self, destinatario, notificacion):
        numero = normalizar_telefono(destinatario.get("telefono"))
        if not numero:
            log.warning("whatsapp omitido: teléfono no válido paciente=%s", destinatario.get("identificador"))
            return False
        url = f"https://api.twilio.com/2010-04-01/Accounts/{self._cuenta}/Messages.json"
        datos = {"From": self._origen, "To": f"whatsapp:{numero}", "Body": notificacion["mensaje"]}
        try:
            self._transporte(url, datos, self._cuenta, self._token)
        except Exception as e:             # un canal que falla no debe romper el resto del aviso
            log.warning("whatsapp falló paciente=%s motivo=%s", destinatario.get("identificador"), type(e).__name__)
            return False
        return True