
import client from "./client";

// =====================================================
// PACIENTE
// =====================================================

// Solicitar un turno.
export const solicitarTurno = (datos) =>
  client.post("/turnos", datos).then((r) => r.data);

// Obtener los turnos del paciente.
export const obtenerMisTurnos = () =>
  client.get("/turnos/mios").then((r) => r.data);

// Aceptar o rechazar una fecha propuesta.
export const responderTurno = (id, respuesta) =>
  client.patch(`/turnos/${id}/respuesta`, { respuesta }).then((r) => r.data);

// Consultar disponibilidad de fechas y horarios.
export const disponibilidadTurnos = (especialidad) =>
  client
    .get("/turnos/disponibilidad", { params: { especialidad } })
    .then((r) => r.data);

// Interpretar la especialidad solicitada por voz.
export const especialidadPorVoz = (transcripcion) =>
  client
    .post("/turnos/interpretar-voz", { transcripcion })
    .then((r) => r.data);

// Cancelar un turno.
export const cancelarTurno = (id) =>
  client.patch(`/turnos/${id}/cancelar`).then((r) => r.data);

// Obtener los avisos del paciente.
export const obtenerAvisos = () =>
  client.get("/notificaciones/mias").then((r) => r.data);

// Marcar un aviso como leído.
export const marcarAvisoLeido = (id) =>
  client.patch(`/notificaciones/${id}/leida`).then((r) => r.data);


// =====================================================
// ADMINISTRATIVO
// =====================================================

// Listar turnos aplicando filtros.
// Los filtros vacíos no se mandan.
export const listarTurnos = (filtros = {}) => {
  const params = Object.fromEntries(
    Object.entries(filtros).filter(([, v]) => v)
  );

  return client.get("/turnos", { params }).then((r) => r.data);
};

// Obtener la lista de médicos.
export const listarMedicos = () =>
  client.get("/medicos").then((r) => r.data);

// Proponer una fecha y horario para un turno.
export const proponerFecha = (id, datos) =>
  client.patch(`/turnos/${id}/asignar`, datos).then((r) => r.data);

// Reprogramar un turno.
export const reprogramarTurno = (id, datos) =>
  client.patch(`/turnos/${id}/reprogramar`, datos).then((r) => r.data);

// Suspender un turno desde el panel administrativo.
export const suspenderTurno = (id) =>
  client.patch(`/turnos/${id}/cancelar`).then((r) => r.data);

// Avisar al paciente sobre una demora.
export const avisarDemora = (id, minutos) =>
  client.post(`/turnos/${id}/aviso`, { minutos }).then((r) => r.data);
