"""Lee las variables del archivo .env (ver .env.example). Acepta DB_* o MYSQL_* para los datos de MySQL."""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    DB_HOST = os.getenv("DB_HOST", os.getenv("MYSQL_HOST", "localhost"))
    DB_PORT = int(os.getenv("DB_PORT", os.getenv("MYSQL_PORT", "3306")))
    DB_USER = os.getenv("DB_USER", os.getenv("MYSQL_USER", "root"))
    DB_PASSWORD = os.getenv("DB_PASSWORD", os.getenv("MYSQL_PASSWORD", ""))
    DB_NAME = os.getenv("DB_NAME", os.getenv("MYSQL_DATABASE", "mi_turno_a_mano"))
    JWT_SECRET = os.getenv("JWT_SECRET", "")
    CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:3000")

    SECRET_KEY = os.getenv("SECRET_KEY", "")
    DATABASE_CONNECTION_URI = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        # WhatsApp (opcional): si falta alguna de estas tres, el canal queda desactivado.
    TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "")