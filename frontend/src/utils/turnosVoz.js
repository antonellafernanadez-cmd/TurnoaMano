const normalizar = (texto = "") =>
  String(texto)
    .toLocaleLowerCase("es-AR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,!?¿¡]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const NUMEROS = {
  cero: 0,
  una: 1, uno: 1,
  dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13,
  catorce: 14, quince: 15, dieciseis: 16,
  diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiuno: 21, veintiun: 21,
  veintidos: 22, veintitres: 23,
};

function ajustarPeriodo(hora, dicho) {
  if (/\b(tarde|noche|pm)\b/.test(dicho) && hora < 12) {
    return hora + 12;
  }

  if (/\b(manana|am)\b/.test(dicho) && hora === 12) {
    return 0;
  }

  return hora;
}

function obtenerHoraDicha(dicho) {
  // Formato numérico: 9, 09:30, 14:00.
  const digital = dicho.match(/\b(\d{1,2})(?::(\d{2}))?\b/);

  if (digital) {
    const hora = Number(digital[1]);
    const minutos = Number(digital[2] || 0);

    if (hora > 23 || minutos > 59) return null;

    return {
      hora: ajustarPeriodo(hora, dicho),
      minutos,
    };
  }

  // Formato hablado: nueve, nueve y media, cinco de la tarde.
  const palabras = dicho.split(" ");
  const indice = palabras.findIndex((p) =>
    Object.prototype.hasOwnProperty.call(NUMEROS, p)
  );

  if (indice === -1) return null;

  let hora = NUMEROS[palabras[indice]];
  let minutos = 0;

  const siguiente = palabras[indice + 1];
  const despues = palabras[indice + 2];

  if (siguiente === "y" && despues === "media") {
    minutos = 30;
  } else if (siguiente === "y" && despues === "cuarto") {
    minutos = 15;
  } else if (siguiente === "menos" && despues === "cuarto") {
    hora -= 1;
    minutos = 45;
  }

  if (hora < 0 || hora > 23) return null;

  return {
    hora: ajustarPeriodo(hora, dicho),
    minutos,
  };
}

function obtenerHoraDisponible(valor) {
  const partes = String(valor ?? "").match(
    /^(\d{1,2}):(\d{2})(?::\d{2})?$/
  );

  if (!partes) return null;

  const hora = Number(partes[1]);
  const minutos = Number(partes[2]);

  if (hora > 23 || minutos > 59) return null;

  return { hora, minutos };
}

export function buscarHorarioDicho(texto, horarios = []) {
  const dicho = normalizar(texto);

  if (!dicho || !Array.isArray(horarios)) return null;

  const buscado = obtenerHoraDicha(dicho);

  if (!buscado) return null;

  const coincidencias = horarios.filter((item) => {
    const disponible = obtenerHoraDisponible(item.hora);

    return (
      disponible &&
      disponible.hora === buscado.hora &&
      disponible.minutos === buscado.minutos
    );
  });

  return coincidencias.length === 1 ? coincidencias[0] : null;
}