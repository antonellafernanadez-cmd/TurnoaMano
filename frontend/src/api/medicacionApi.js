
import client from "./client";

// ---- Administrativo ----

export const buscarPacientes = (texto) =>
  client.get("/pacientes", { params: { buscar: texto } }).then((r) => r.data);

export const obtenerPlan = (pacienteId) =>
  client.get(`/pacientes/${pacienteId}/medicacion`).then((r) => r.data);

export const enviarRecordatorioToma = (itemId) =>
  client.post(`/medicacion/${itemId}/recordatorio`).then((r) => r.data);


// ---- Médico ----

export const emitirReceta = (datos) =>
  client.post("/recetas", datos).then((r) => r.data);

export const misRecetasMedico = () =>
  client.get("/recetas/mias").then((r) => r.data);

export const eliminarReceta = (id) =>
  client.delete(`/recetas/${id}`).then((r) => r.data);


// ---- Paciente ----

export const miPlanMedicacion = () =>
  client.get("/medicacion/mia").then((r) => r.data);

export const misRecetasPaciente = () =>
  client.get("/recetas/mis-recetas").then((r) => r.data);
