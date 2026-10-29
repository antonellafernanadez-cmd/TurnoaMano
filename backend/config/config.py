"""Lee las variables del archivo .env"""
import os
from urllib.parse import quote_plus

from dotenv import load_dotenv

load_dotenv()


class Config:
    # "or" en vez de un segundo parámetro: si la variable existe pero está vacía,
    # también se usa el valor por defecto en lugar de romper.
    DB_HOST = os.getenv("DB_HOST") or "localhost"
    DB_PORT = int(os.getenv("DB_PORT") or "3306")
    DB_USER = os.getenv("DB_USER") or "root"
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME") or "turnoamano"

    # quote_plus evita que una contraseña con @, : o / rompa la URL de conexión
    DATABASE_CONNECTION_URI = (
        f"mysql+pymysql://{quote_plus(DB_USER)}:{quote_plus(DB_PASSWORD)}"
        f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

    JWT_SECRET = os.getenv("JWT_SECRET", "")
    SECRET_KEY = os.getenv("SECRET_KEY", "")
    CORS_ORIGIN = os.getenv("CORS_ORIGIN") or "http://localhost:3000"

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