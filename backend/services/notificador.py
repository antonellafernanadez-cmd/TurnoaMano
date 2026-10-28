"""Notificador: arma un aviso y lo manda por todos los canales configurados (app, WhatsApp...).
No sabe cómo funciona cada canal (eso es del patrón Strategy en strategies/canales.py)."""
import logging

from models.notificacion import nueva_notificacion

log = logging.getLogger("notificaciones")


class Notificador:
    def __init__(self, canales, buscar_destinatario):
        self._canales = canales
        self._buscar_destinatario = buscar_destinatario   # función: paciente_id -> {"identificador", "telefono"} o None

    def avisar(self, paciente_id, turno_id, tipo, mensaje):
        """Devuelve {nombre_del_canal: True/False}. Que un canal falle no frena a los demás."""
        destinatario = self._buscar_destinatario(paciente_id)
        if not destinatario:
            log.warning("aviso omitido: paciente inexistente paciente=%s", paciente_id)
            return {}
        resultados = {}
        for canal in self._canales:
            aviso = nueva_notificacion(paciente_id, turno_id, tipo, mensaje)
            try:
                resultados[canal.nombre] = bool(canal.enviar(destinatario, aviso))
            except Exception as e:
                log.warning("canal %s falló paciente=%s motivo=%s", canal.nombre, paciente_id, type(e).__name__)
                resultados[canal.nombre] = False
        log.info("aviso tipo=%s turno=%s paciente=%s canales=%s", tipo, turno_id, paciente_id, resultados)
        return resultados