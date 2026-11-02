from flask import jsonify


def error(mensaje, codigo=400):
    return jsonify({"error": mensaje}), codigo