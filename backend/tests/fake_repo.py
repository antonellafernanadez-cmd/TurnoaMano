"""Repositorio en memoria con la misma interfaz que TurnoRepository (sin MySQL, datos ficticios)."""
from itertools import count


class FakeTurnoRepository:
    def __init__(self):
        self._filas, self._ids = {}, count(1)

    def crear(self, t):
        t["id"] = next(self._ids)
        self._filas[t["id"]] = dict(t)
        return t

    def obtener(self, turno_id):
        fila = self._filas.get(turno_id)
        return dict(fila) if fila else None

    def listar_por_paciente(self, paciente_id):
        return [dict(f) for f in self._filas.values() if f["paciente_id"] == paciente_id]

    def listar(self, estado=None):
        return [dict(f) for f in self._filas.values() if not estado or f["estado"] == estado]

    def actualizar(self, turno_id, campos):
        self._filas[turno_id].update(campos)
        return self.obtener(turno_id)


class FakeNotificacionRepository:
    """Repositorio en memoria con la misma interfaz que NotificacionRepository."""

    def __init__(self):
        self._filas, self._ids = {}, count(1)

    def crear(self, n):
        n["id"] = next(self._ids)
        self._filas[n["id"]] = dict(n)
        return n

    def obtener(self, notificacion_id):
        fila = self._filas.get(notificacion_id)
        return dict(fila) if fila else None

    def listar_por_paciente(self, paciente_id, solo_no_leidas=False):
        filas = [dict(f) for f in self._filas.values() if f["paciente_id"] == paciente_id]
        if solo_no_leidas:
            filas = [f for f in filas if not f["leida"]]
        return sorted(filas, key=lambda f: f["id"], reverse=True)

    def marcar_leida(self, notificacion_id):
        self._filas[notificacion_id]["leida"] = True
        return self.obtener(notificacion_id)