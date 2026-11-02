"""PATRÓN STRATEGY: dos formas intercambiables de solicitar un turno
(manual o por voz) que producen los mismos datos para el controller."""
import unicodedata
from models.turno import ESPECIALIDADES
from utils.errores import ApiError


def _normalizar(texto):
    texto = unicodedata.normalize("NFD", texto.lower())
    return "".join(c for c in texto if unicodedata.category(c) != "Mn").strip()


# Cómo suelen decirlo los pacientes: la especialidad, el profesional o la parte del cuerpo.
# Se busca cada palabra dentro de la frase (ya sin tildes ni mayúsculas).
PALABRAS_CLAVE = {
    "clinica medica": ("clinica", "clinico", "cabecera", "medico general", "general"),
    "cardiologia": ("cardio", "corazon"),
    "traumatologia": ("trauma", "hueso", "fractura", "rodilla", "columna"),
    "oftalmologia": ("oftalmo", "oculista", "ojo", "vista"),
    "dermatologia": ("dermato", "piel"),
    "ginecologia": ("gineco",),
    "neurologia": ("neuro",),
    "odontologia": ("odonto", "dentista", "diente", "muela"),
    "urologia": ("urolog", "prostata", "rinon"),   # va después de neurologia (que contiene "urolog")
}


class SolicitudManual:
    origen = "manual"

    def interpretar(self, datos):
        especialidad = datos.get("especialidad")
        motivo = datos.get("motivo", "")
        if not isinstance(especialidad, str) or _normalizar(especialidad) not in ESPECIALIDADES:
            raise ApiError("Especialidad no válida.", 400)
        return _normalizar(especialidad), motivo


class SolicitudPorVoz:
    """Recibe el texto ya transcripto por el navegador y busca la especialidad nombrada."""
    origen = "voz"

    def interpretar(self, datos):
        texto = datos.get("transcripcion")
        if not isinstance(texto, str) or not texto.strip():
            raise ApiError("No se recibió ninguna frase.", 400)
        limpio = _normalizar(texto)
        for esp in ESPECIALIDADES:
            if esp in limpio:
                return esp, texto
        for esp, palabras in PALABRAS_CLAVE.items():
            if any(p in limpio for p in palabras):
                return esp, texto
        raise ApiError("No entendí la especialidad. Probá de nuevo o pedilo a mano.", 422)


ESTRATEGIAS = {"manual": SolicitudManual(), "voz": SolicitudPorVoz()}
