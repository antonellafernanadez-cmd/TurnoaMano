import client from "./client";

export const solicitarTurno = (datos) => client.post("/turnos", datos).then((r) => r.data);
export const obtenerMisTurnos = () => client.get("/turnos/mios").then((r) => r.data);
export const responderTurno = (id, respuesta) =>
  client.patch(`/turnos/${id}/respuesta`, { respuesta }).then((r) => r.data);
export const disponibilidadTurnos = (especialidad) =>
  client.get("/turnos/disponibilidad", { params: { especialidad } }).then((r) => r.data);
export const especialidadPorVoz = (transcripcion) =>
  client.post("/turnos/interpretar-voz", { transcripcion }).then((r) => r.data);
export const cancelarTurno = (id) => client.patch(`/turnos/${id}/cancelar`).then((r) => r.data);
