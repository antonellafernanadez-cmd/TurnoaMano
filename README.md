# Mi Turno a Mano

App para que adultos mayores gestionen sus turnos médicos y reciban avisos.
Flask + MySQL (PyMySQL / SQLAlchemy) en el backend, React + Vite + Axios en el frontend.

## Cómo correrlo
```
# 1. Base de datos (una sola vez)
mysql -u root -p < database/mi_turno_a_mano.sql        # tablas turnos y notificaciones
python database/init_db.py                             # tabla usuarios + admin y médico de prueba
#    Si ya tenías la base del sprint 1: mysql -u root -p -e "source database/migracion_sprint2.sql"
#    Para la historia 3 sobre una base existente: mysql -u root -p -e "source database/migracion_medicacion.sql"

# 2. Backend
cd backend
pip install -r requirements.txt
copy .env.example .env      # completar MySQL y SECRET_KEY
python app.py               # http://localhost:5000
python -m pytest            # no necesita MySQL ni internet

# 3. Frontend
cd frontend
npm install
npm run dev                 # http://localhost:3000
```

## Roles y endpoints
Todos exigen token (`Authorization: Bearer ...`). El backend valida el rol en cada pedido.

| Método | Ruta | Rol |
|---|---|---|
| POST | /api/auth/registro, /api/auth/login | público |
| POST | /api/turnos | paciente |
| GET | /api/turnos/mios | paciente |
| PATCH | /api/turnos/{id}/respuesta | paciente (dueño del turno) |
| GET | /api/turnos?estado=&medico_id=&fecha=AAAA-MM-DD | administrativo, médico |
| PATCH | /api/turnos/{id}/asignar | administrativo |
| PATCH | /api/turnos/{id}/reprogramar | administrativo |
| PATCH | /api/turnos/{id}/cancelar | administrativo |
| POST | /api/turnos/{id}/aviso (demora con minutos predefinidos) | administrativo |
| POST | /api/turnos/{id}/recordatorio | administrativo |
| GET | /api/medicos | administrativo |
| GET | /api/pacientes?buscar= (DNI o nombre, mínimo 3 caracteres) | administrativo |
| GET | /api/pacientes/{id}/medicacion | administrativo |
| POST | /api/medicacion/{id}/recordatorio | administrativo |
| GET | /api/notificaciones/mias | paciente |
| PATCH | /api/notificaciones/{id}/leida | paciente (dueño del aviso) |

Estados del turno: `solicitado → propuesto → confirmado / rechazado`. Un turno propuesto o confirmado
se puede reprogramar (vuelve a `propuesto`, el paciente acepta la nueva fecha) o suspender (`cancelado`).

## Patrones de diseño
- **Factory** (`app.py`): `create_app(...)` arma la app; los tests le inyectan repositorios y canales falsos.
- **Repository** (`repositories/`): todo el SQL está acá, con consultas parametrizadas.
- **Strategy** (`strategies/`): pedir turno manual o por voz; avisar por la app o por WhatsApp.
- **Observer** (`events/`): el controller solo publica `turno.propuesto`, `turno.reprogramado`, `turno.cancelado`...
  y los avisos al paciente salen solos desde `events/suscriptores.py`.

## Historia 4: avisos por demoras o cambios
- El administrativo filtra los turnos por día, médico y estado, los reprograma o suspende,
  y envía avisos de demora con mensajes predefinidos (`utils/mensajes.py`).
- El paciente ve los avisos en la app (con contador de no leídos) y, si está configurado, por WhatsApp.
- Los mensajes llevan solo especialidad, fecha y hora: nunca el motivo ni datos clínicos.

## Historia 3: recordatorio de toma de medicación
- El administrativo busca un paciente por DNI o nombre, ve su plan de medicación (una fila por toma:
  medicamento, dosis y horario) y le envía el recordatorio de cada toma.
- Tabla `plan_medicacion`: la escribe la historia 5 (el médico carga el plan). Mientras tanto se puede cargar un
  plan ficticio con `python database\cargar_plan_prueba.py DNI_DEL_PACIENTE`.
- Privacidad: el medicamento y la dosis son datos de salud. Dentro de la app el aviso lleva el detalle;
  por WhatsApp sale solo un texto genérico (`mensaje_externo`), y los logs no guardan nombres de medicamentos.
- Los avisos de medicación no están ligados a un turno: `notificaciones.turno_id` pasa a ser opcional.

## Seguridad
Contraseñas con hash, bloqueo temporal tras 5 logins fallidos, tokens con vencimiento, roles validados en el backend,
consultas SQL parametrizadas, entradas validadas, CORS restringido y secretos en `.env`.
