"""Agenda de turnos: qué días y horarios se pueden elegir. Son funciones puras (sin base de datos),
por eso se prueban fácil. Grilla fija: lunes a viernes, de 08:00 a 12:00 cada 30 minutos."""
from datetime import datetime, time, timedelta, timezone

HORARIOS = ("08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00")
DIAS_VISIBLES = 5                                   # próximos 5 días hábiles, empezando mañana
ZONA_ARGENTINA = timezone(timedelta(hours=-3))      # Argentina no usa horario de verano


def ahora_local():
    """Hora actual de Argentina, sin zona (así se guardan las fechas de los turnos elegidos)."""
    return datetime.now(ZONA_ARGENTINA).replace(tzinfo=None)


def dias_disponibles(ahora=None):
    dia = (ahora or ahora_local()).date()
    dias = []
    while len(dias) < DIAS_VISIBLES:
        dia += timedelta(days=1)
        if dia.weekday() < 5:                       # 0 = lunes ... 4 = viernes
            dias.append(dia)
    return dias


def horarios_del_dia(dia):
    return [datetime.combine(dia, time.fromisoformat(h)) for h in HORARIOS]


def rango_visible(ahora=None):
    """(desde, hasta) que cubre todos los horarios elegibles: sirve para buscar los ya ocupados."""
    dias = dias_disponibles(ahora)
    return datetime.combine(dias[0], time.min), datetime.combine(dias[-1], time.max)


def es_horario_valido(fecha_hora, ahora=None):
    return any(fecha_hora in horarios_del_dia(d) for d in dias_disponibles(ahora))


def armar_disponibilidad(ocupados, ahora=None):
    """ocupados: fechas (datetime) ya tomadas para la especialidad."""
    ocupados = set(ocupados)
    return [
        {"fecha": d.isoformat(),
         "horarios": [{"hora": h.strftime("%H:%M"), "libre": h not in ocupados} for h in horarios_del_dia(d)]}
        for d in dias_disponibles(ahora)
    ]
