
from flask import current_app, jsonify
from werkzeug.exceptions import HTTPException


class ApiError(Exception):
    def __init__(self, mensaje, status=400):
        self.mensaje = mensaje
        self.status = status


def registrar_errores(app):
    @app.errorhandler(ApiError)
    def _api(e):
        return jsonify({"error": e.mensaje}), e.status

    @app.errorhandler(404)
    def _404(_):
        return jsonify({"error": "Recurso no encontrado."}), 404

    @app.errorhandler(Exception)
    def _500(e):
        # Los errores HTTP conocidos conservan su código de estado.
        if isinstance(e, HTTPException):
            return jsonify({"error": e.description}), e.code

        # Los errores inesperados se registran en el servidor.
        # Nunca se muestran detalles internos al usuario.
        current_app.logger.exception("Error no controlado")

        return jsonify({"error": "Error interno del servidor."}), 500
