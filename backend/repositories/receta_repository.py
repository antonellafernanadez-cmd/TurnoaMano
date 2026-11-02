from models.db import get_connection


class RecetaRepository:
    def __init__(self, conexion_factory=get_connection):
        self._conectar = conexion_factory

    def crear(self, receta):
        conexion = self._conectar()
        try:
            with conexion.cursor() as cur:
                cur.execute(
                    "INSERT INTO recetas (paciente_id, medico_id, indicaciones, activa, creado_en) "
                    "VALUES (%s, %s, %s, %s, %s)",
                    (receta["paciente_id"], receta["medico_id"], receta["indicaciones"],
                     1 if receta.get("activa", True) else 0, receta["creado_en"]),
                )
                receta_id = cur.lastrowid
                for it in receta.get("items", []):
                    cur.execute(
                        "INSERT INTO receta_items (receta_id, medicamento, dosis, horario) VALUES (%s,%s,%s,%s)",
                        (receta_id, it["medicamento"], it["dosis"], it["horario"]),
                    )
                conexion.commit()
                receta["id"] = receta_id
                return receta
        except Exception:
            conexion.rollback()
            raise
        finally:
            conexion.close()

    def obtener(self, receta_id):
        conexion = self._conectar()
        try:
            with conexion.cursor() as cur:
                cur.execute("SELECT * FROM recetas WHERE id = %s", (receta_id,))
                fila = cur.fetchone()
                if not fila:
                    return None
                fila = dict(fila)
                cur.execute(
                    "SELECT id, medicamento, dosis, horario FROM receta_items WHERE receta_id = %s ORDER BY id",
                    (receta_id,),
                )
                fila["medicamentos"] = list(cur.fetchall())
                return fila
        finally:
            conexion.close()

    def listar_por_medico(self, medico_id):
        conexion = self._conectar()
        try:
            with conexion.cursor() as cur:
                cur.execute(
                    "SELECT * FROM recetas WHERE medico_id = %s ORDER BY creado_en DESC LIMIT 50",
                    (str(medico_id),),
                )
                filas = [dict(f) for f in cur.fetchall()]
                for f in filas:
                    cur.execute(
                        "SELECT id, medicamento, dosis, horario FROM receta_items WHERE receta_id = %s",
                        (f["id"],),
                    )
                    f["medicamentos"] = list(cur.fetchall())
                return filas
        finally:
            conexion.close()

    def listar_por_paciente(self, paciente_id, solo_activas=True):
        conexion = self._conectar()
        try:
            with conexion.cursor() as cur:
                sql = "SELECT * FROM recetas WHERE paciente_id = %s"
                if solo_activas:
                    sql += " AND activa = 1"
                sql += " ORDER BY creado_en DESC LIMIT 50"
                cur.execute(sql, (str(paciente_id),))
                filas = [dict(f) for f in cur.fetchall()]
                for f in filas:
                    cur.execute(
                        "SELECT id, medicamento, dosis, horario FROM receta_items WHERE receta_id = %s",
                        (f["id"],),
                    )
                    f["medicamentos"] = list(cur.fetchall())
                return filas
        finally:
            conexion.close()

    def desactivar(self, receta_id, medico_id):
        conexion = self._conectar()
        try:
            with conexion.cursor() as cur:
                cur.execute(
                    "UPDATE recetas SET activa = 0 WHERE id = %s AND medico_id = %s",
                    (receta_id, str(medico_id)),
                )
                conexion.commit()
                return cur.rowcount > 0
        finally:
            conexion.close()
