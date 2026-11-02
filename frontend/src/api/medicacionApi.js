import client from "./client";

// ---- administrativo ----
export const buscarPacientes = (texto) =>
  client.get("/pacientes", { params: { buscar: texto } }).then((r) => r.data);
export const obtenerPlan = (pacienteId) =>
  client.get(`/pacientes/${pacienteId}/medicacion`).then((r) => r.data);
export const enviarRecordatorioToma = (itemId) =>
  client.post(`/medicacion/${itemId}/recordatorio`).then((r) => r.data);
