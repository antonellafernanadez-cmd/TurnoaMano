"""PATRÓN REPOSITORY: único lugar con SQL para turnos.
Todas las consultas usan parámetros (%s): nunca se arma SQL concatenando datos del usuario."""
from models.db import get_connection

COLUMNAS_EDITABLES = {"estado", "fecha_hora"}


class TurnoRepository:
    def __init__(self, conexion_factory=get_connection):
        self._conectar = conexion_factory

    def _ejecutar(self, sql, params=(), uno=False, muchos=False, insertar=False):
        conexion = self._conectar()
        try:
            with conexion.cursor() as cur:
                cur.execute(sql, params)
                if insertar:
                    conexion.commit()
                    return cur.lastrowid
                if uno:
                    return cur.fetchone()
                if muchos:
                    return cur.fetchall()
                conexion.commit()
        finally:
            conexion.close()

    def crear(self, t):
        t["id"] = self._ejecutar(
            "INSERT INTO turnos (paciente_id, especialidad, motivo, origen, estado, fecha_hora, creado_en) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (t["paciente_id"], t["especialidad"], t["motivo"], t["origen"],
             t["estado"], t["fecha_hora"], t["creado_en"]),
            insertar=True,
        )
        return t

    def obtener(self, turno_id):
        return self._ejecutar("SELECT * FROM turnos WHERE id = %s", (turno_id,), uno=True)

    def listar_por_paciente(self, paciente_id):
        return self._ejecutar(
            "SELECT * FROM turnos WHERE paciente_id = %s ORDER BY creado_en DESC",
            (paciente_id,), muchos=True)

    def listar(self, estado=None):
        if estado:
            return self._ejecutar(
                "SELECT * FROM turnos WHERE estado = %s ORDER BY creado_en DESC",
                (estado,), muchos=True)
        return self._ejecutar("SELECT * FROM turnos ORDER BY creado_en DESC", muchos=True)

    def actualizar(self, turno_id, campos):
        if not set(campos) <= COLUMNAS_EDITABLES:
            raise ValueError("Columna no editable.")
        sets = ", ".join(f"{c} = %s" for c in campos)   # nombres fijos del código, valores por parámetro
        self._ejecutar(f"UPDATE turnos SET {sets} WHERE id = %s", (*campos.values(), turno_id))
        return self.obtener(turno_id)
