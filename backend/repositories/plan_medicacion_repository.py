
"""PATRÓN REPOSITORY: único lugar con SQL para el plan de medicación.
Todas las consultas usan parámetros (%s): nunca se arma SQL concatenando datos del usuario."""

from models.db import get_connection


class PlanMedicacionRepository:
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
                return cur.rowcount
        finally:
            conexion.close()

    def crear(self, item):
        item["id"] = self._ejecutar(
            "INSERT INTO plan_medicacion (paciente_id, medicamento, dosis, horario, activo, creado_en) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (
                item["paciente_id"],
                item["medicamento"],
                item["dosis"],
                item["horario"],
                item["activo"],
                item["creado_en"],
            ),
            insertar=True,
        )
        return item

    def obtener(self, item_id):
        return self._ejecutar(
            "SELECT * FROM plan_medicacion WHERE id = %s",
            (item_id,),
            uno=True,
        )

    def listar_por_paciente(self, paciente_id):
        """Solo las tomas activas, ordenadas por horario."""
        return self._ejecutar(
            "SELECT * FROM plan_medicacion WHERE paciente_id = %s AND activo = 1 ORDER BY horario, medicamento",
            (paciente_id,),
            muchos=True,
        )

    def desactivar(self, item_id):
        return self._ejecutar(
            "UPDATE plan_medicacion SET activo = 0 WHERE id = %s",
            (item_id,),
        )
