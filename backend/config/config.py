"""Lee las variables del archivo .env (ver .env.example).
Acepta DB_* o MYSQL_* para los datos de MySQL.
"""

import os
from urllib.parse import quote_plus

from dotenv import load_dotenv

load_dotenv()


class Config:
    # Acepta DB_* o MYSQL_* y utiliza el valor por defecto si están vacías.
    DB_HOST = os.getenv("DB_HOST") or os.getenv("MYSQL_HOST") or "localhost"
    DB_PORT = int(os.getenv("DB_PORT") or os.getenv("MYSQL_PORT") or "3306")
    DB_USER = os.getenv("DB_USER") or os.getenv("MYSQL_USER") or "root"
    DB_PASSWORD = os.getenv("DB_PASSWORD") or os.getenv("MYSQL_PASSWORD") or ""
    DB_NAME = (
        os.getenv("DB_NAME")
        or os.getenv("MYSQL_DATABASE")
        or "turnoamano"
    )

    JWT_SECRET = os.getenv("JWT_SECRET", "")
    SECRET_KEY = os.getenv("SECRET_KEY", "")
    CORS_ORIGIN = os.getenv("CORS_ORIGIN") or "http://localhost:3000"

    # quote_plus evita que una contraseña con @, : o / rompa la URL de conexión.
    DATABASE_CONNECTION_URI = (
        f"mysql+pymysql://{quote_plus(DB_USER)}:{quote_plus(DB_PASSWORD)}"
        f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

    # WhatsApp (opcional): si falta alguna de estas tres, el canal queda desactivado.
    TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "")

    @classmethod
    def validar(cls):
        """Corta el arranque si falta una clave o es demasiado corta."""
        for nombre in ("JWT_SECRET", "SECRET_KEY"):
            if len(getattr(cls, nombre)) < 32:
                raise RuntimeError(
                    f"Falta {nombre} en el .env o tiene menos de 32 caracteres. "
                    'Generá una con: python -c "import secrets; print(secrets.token_hex(32))"'
                )