from datetime import datetime


def fecha_legible(fecha):
    """'2030-01-15T10:30' (o un datetime) -> '15/01/2030 a las 10:30'."""
    if isinstance(fecha, str):
        fecha = datetime.fromisoformat(fecha)
    return f"{fecha:%d/%m/%Y} a las {fecha:%H:%M}"