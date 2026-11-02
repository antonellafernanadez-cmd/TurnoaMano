
"""Notificador: arma un aviso y lo manda por todos los canales configurados (app, WhatsApp...).
No sabe cómo funciona cada canal (eso es del patrón Strategy en strategies/canales.py)."""

import logging

from models.notificacion import nueva_notificacion

log = logging.getLogger("notificaciones")


class Notificador:
    def __init__(self, canales, buscar_destinatario):
        self._canales = canales
        self._buscar_destinatario = buscar_destinatario

    def avisar(self, paciente_id, turno_id, tipo, mensaje, mensaje_externo=None):
        """Devuelve {nombre_del_canal: True/False}. Que un canal falle no frena a los demás.

        mensaje_externo: texto genérico para canales fuera de la app (WhatsApp),
        cuando el detalle es un dato de salud que no conviene mandar por afuera.
        """
        destinatario = self._buscar_destinatario(paciente_id)

        if not destinatario:
            log.warning(
                "aviso omitido: paciente inexistente paciente=%s",
                paciente_id,
            )
            return {}

        resultados = {}

        for canal in self._canales:
            es_app = canal.nombre == "app"

            # La app conserva el mensaje completo.
            # Los canales externos utilizan el mensaje genérico si está disponible.
            texto = mensaje if es_app or not mensaje_externo else mensaje_externo

            aviso = nueva_notificacion(
                paciente_id,
                turno_id,
                tipo,
                texto,
            )

            # Conservamos también el mensaje externo para las estrategias
            # que necesiten acceder a él directamente.
            if mensaje_externo:
                aviso["mensaje_externo"] = mensaje_externo

            try:
                resultados[canal.nombre] = bool(
                    canal.enviar(destinatario, aviso)
                )
            except Exception as e:
                log.warning(
                    "canal %s falló paciente=%s motivo=%s",
                    canal.nombre,
                    paciente_id,
                    type(e).__name__,
                )
                resultados[canal.nombre] = False

        log.info(
            "aviso tipo=%s turno=%s paciente=%s canales=%s",
            tipo,
            turno_id,
            paciente_id,
            resultados,
        )

        return resultados
