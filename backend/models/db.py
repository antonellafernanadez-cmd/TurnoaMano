from flask_sqlalchemy import SQLAlchemy
db=SQLAlchemy()
"""Conexión a MySQL con PyMySQL. Los datos de conexión vienen de config/config.py (.env)."""
import pymysql
from pymysql.cursors import DictCursor
from config.config import Config


def get_connection():
    return pymysql.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME,
        charset="utf8mb4",
        cursorclass=DictCursor,
    )
