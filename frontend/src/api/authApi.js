import client from "./client";

// Solo paciente se registra desde la app (DNI). Médico y administrativo
// vienen precargados por el backend (ver database/init_db.py).
export const registrarPaciente = (datos) => client.post("/auth/registro", datos).then((r) => r.data);
export const iniciarSesion = (datos) => client.post("/auth/login", datos).then((r) => r.data);