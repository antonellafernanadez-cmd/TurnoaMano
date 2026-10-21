"""Conexión a MySQL con PyMySQL (igual que la app de farmacia)."""
import os
import pymysql
from pymysql.cursors import DictCursor


def get_connection():
    return pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "mi_turno_a_mano"),
        charset="utf8mb4",
        cursorclass=DictCursor,
    )
