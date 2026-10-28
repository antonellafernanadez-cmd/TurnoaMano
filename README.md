# Mi Turno a Mano — módulo de solicitud de turnos

Estructura heredada de la app de farmacia (Flask + React/Axios), con MySQL y PyMySQL, igual que farmacia.

## Backend
```
cd backend
pip install -r requirements.txt
cp .env.example .env     # completar datos de MySQL y JWT_SECRET
# crear la base: mysql -u root -p < ../database/mi_turno_a_mano.sql
python app.py
pytest                   # usa un repositorio en memoria, no necesita MySQL
```

## Patrones usados (módulo turnos)
- **Factory** (`app.py`): `create_app(turno_repo)` arma la app; los tests inyectan un repositorio falso.
- **Repository** (`repositories/`): aísla el SQL (consultas parametrizadas) de la lógica.
- **Strategy** (`strategies/`): solicitud manual o por voz, intercambiables.
- **Observer** (`events/`): los cambios de estado publican eventos (hoy solo log).

## Endpoints
| Método | Ruta | Rol |
|---|---|---|
| POST | /api/turnos | paciente |
| GET | /api/turnos/mios | paciente |
| PATCH | /api/turnos/{id}/respuesta | paciente (dueño del turno) |
| GET | /api/turnos | administrativo, médico |
| PATCH | /api/turnos/{id}/asignar | administrativo |

Estados: solicitado → propuesto → confirmado / rechazado.
