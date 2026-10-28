import client from "./client";

// ---- paciente ----
export const solicitarTurno = (datos) => client.post("/turnos", datos).then((r) => r.data);
export const obtenerMisTurnos = () => client.get("/turnos/mios").then((r) => r.data);
export const responderTurno = (id, respuesta) =>
  client.patch(`/turnos/${id}/respuesta`, { respuesta }).then((r) => r.data);

// ---- administrativo ----
// Los filtros vacíos no se mandan.
export const listarTurnos = (filtros = {}) => {
  const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
  return client.get("/turnos", { params }).then((r) => r.data);
};
export const listarMedicos = () => client.get("/medicos").then((r) => r.data);
export const proponerFecha = (id, datos) => client.patch(`/turnos/${id}/asignar`, datos).then((r) => r.data);
export const reprogramarTurno = (id, datos) =>
  client.patch(`/turnos/${id}/reprogramar`, datos).then((r) => r.data);
export const suspenderTurno = (id) => client.patch(`/turnos/${id}/cancelar`).then((r) => r.data);
export const avisarDemora = (id, minutos) => client.post(`/turnos/${id}/aviso`, { minutos }).then((r) => r.data);
