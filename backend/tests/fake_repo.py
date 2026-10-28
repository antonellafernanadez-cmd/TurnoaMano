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
