from flask import current_app, jsonify
from werkzeug.exceptions import HTTPException


class ApiError(Exception):
    def __init__(self, mensaje, status=400):
        self.mensaje, self.status = mensaje, status


def registrar_errores(app):
    @app.errorhandler(ApiError)
    def _api(e):
        return jsonify({"error": e.mensaje}), e.status

    @app.errorhandler(404)
    def _404(_):
        return jsonify({"error": "Recurso no encontrado."}), 404

    @app.errorhandler(Exception)
    def _500(e):
        # Errores de HTTP conocidos (405, 400...): se devuelven con su código.
        if isinstance(e, HTTPException):
            return jsonify({"error": e.description}), e.code
        # Error inesperado: el detalle va a la terminal del servidor, nunca a quien hace el pedido.
        current_app.logger.exception("Error no controlado")
        return jsonify({"error": "Error interno del servidor."}), 500
