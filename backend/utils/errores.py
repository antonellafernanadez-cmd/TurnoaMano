from flask import jsonify


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
    def _500(_):
        return jsonify({"error": "Error interno del servidor."}), 500
