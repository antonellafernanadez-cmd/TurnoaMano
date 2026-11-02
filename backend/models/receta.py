"""Receta digital (HU5)."""
from models.turno import ahora_utc


def nueva_receta(paciente_id, medico_id, indicaciones, items):
    return {
        "paciente_id": str(paciente_id),
        "medico_id": str(medico_id),
        "indicaciones": (indicaciones or "").strip()[:500],
        "activa": True,
        "creado_en": ahora_utc(),
        "items": [
            {
                "medicamento": (it.get("medicamento") or "").strip()[:80],
                "dosis": (it.get("dosis") or "").strip()[:60],
                "horario": (it.get("horario") or "").strip()[:5],
            }
            for it in (items or [])
            if (it.get("medicamento") or "").strip()
        ],
    }


def receta_a_json(fila, items=None):
    return {
        "id": fila["id"],
        "paciente_id": fila["paciente_id"],
        "medico_id": fila["medico_id"],
        "indicaciones": fila.get("indicaciones") or "",
        "activa": bool(fila.get("activa", True)),
        "creado_en": fila["creado_en"].isoformat() if fila.get("creado_en") else None,
        "medicamentos": items if items is not None else fila.get("medicamentos", []),
    }
