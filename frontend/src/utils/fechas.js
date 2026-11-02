const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// "2026-10-29" -> "Jueves 29 de octubre"
export function nombreDia(fechaISO) {
  const fecha = new Date(`${fechaISO}T00:00:00`);
  return mayuscula(fecha.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }));
}

// "2026-10-29T09:30:00" -> "Jueves 29 de octubre, 09:30 hs"
export function fechaLarga(fechaHoraISO) {
  const fecha = new Date(fechaHoraISO);
  const dia = mayuscula(fecha.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }));
  const hora = fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${dia}, ${hora} hs`;
}

// Para decirlo en voz alta: "jueves 29 de octubre a las 09:30"
export const fechaHablada = (fechaHoraISO) => fechaLarga(fechaHoraISO).replace(", ", " a las ").replace(" hs", "");

// "2026-10-29" -> { semana: "Jue", numero: 29, mes: "Oct" } (para los botones de día)
export function partesDia(fechaISO) {
  const fecha = new Date(`${fechaISO}T00:00:00`);
  const corto = (opciones) => mayuscula(fecha.toLocaleDateString("es-AR", opciones).replace(".", ""));
  return { semana: corto({ weekday: "short" }), numero: fecha.getDate(), mes: corto({ month: "short" }) };
}
