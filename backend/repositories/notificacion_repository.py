"""PATRÓN REPOSITORY: único lugar con SQL para notificaciones.
Todas las consultas usan parámetros (%s): nunca se arma SQL concatenando datos del usuario."""
from models.db import get_connection


class NotificacionRepository:
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

    def crear(self, n):
        n["id"] = self._ejecutar(
            "INSERT INTO notificaciones (paciente_id, turno_id, tipo, mensaje, leida, creado_en) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (n["paciente_id"], n["turno_id"], n["tipo"], n["mensaje"], n["leida"], n["creado_en"]),
            insertar=True,
        )
        return n

    def obtener(self, notificacion_id):
        return self._ejecutar(
            "SELECT * FROM notificaciones WHERE id = %s", (notificacion_id,), uno=True)

    def listar_por_paciente(self, paciente_id, solo_no_leidas=False):
        if solo_no_leidas:
            return self._ejecutar(
                "SELECT * FROM notificaciones WHERE paciente_id = %s AND leida = 0 "
                "ORDER BY creado_en DESC, id DESC", (paciente_id,), muchos=True)
        return self._ejecutar(
            "SELECT * FROM notificaciones WHERE paciente_id = %s ORDER BY creado_en DESC, id DESC",
            (paciente_id,), muchos=True)

    def marcar_leida(self, notificacion_id):
        self._ejecutar("UPDATE notificaciones SET leida = 1 WHERE id = %s", (notificacion_id,))
        return self.obtener(notificacion_id)