export const ETIQUETA_ESTADO = {
  solicitado: "Esperando fecha",
  propuesto: "Esperando respuesta del paciente",
  confirmado: "Confirmado",
  rechazado: "Rechazado",
  cancelado: "Suspendido",
};

// Las fechas del turno se guardan tal cual las cargó el administrativo (sin zona horaria).
export const fechaLegible = (iso) =>
  new Date(iso).toLocaleString("es-AR", { dateStyle: "full", timeStyle: "short" });

// "creado_en" se guarda en UTC sin zona: se le agrega la Z para mostrarlo en hora local.
export const fechaCreacion = (iso) =>
  new Date(/Z|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
