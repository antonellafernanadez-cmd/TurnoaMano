import client from "./client";

export const misNotificaciones = (soloNoLeidas = false) =>
  client.get("/notificaciones/mias", { params: soloNoLeidas ? { solo_no_leidas: 1 } : {} }).then((r) => r.data);
export const marcarLeida = (id) => client.patch(`/notificaciones/${id}/leida`).then((r) => r.data);
