"""PATRÓN OBSERVER: el controller publica eventos y otros componentes reaccionan
sin que el controller los conozca (hoy solo log; luego, notificaciones de las historias 2 y 4)."""
import logging
from collections import defaultdict

log = logging.getLogger("turnos")


class EventBus:
    def __init__(self):
        self._suscriptores = defaultdict(list)

    def suscribir(self, evento, funcion):
        self._suscriptores[evento].append(funcion)

    def publicar(self, evento, **datos):
        for funcion in self._suscriptores[evento]:
            funcion(**datos)


bus = EventBus()


def _registrar(evento):
    # Solo ids y estado: nunca datos clínicos ni tokens en los logs.
    def handler(turno_id, estado, **_):
        log.info("evento=%s turno=%s estado=%s", evento, turno_id, estado)
    return handler


for _e in ("turno.solicitado", "turno.propuesto", "turno.confirmado", "turno.rechazado",
           "turno.reprogramado", "turno.cancelado"):
    bus.suscribir(_e, _registrar(_e))
