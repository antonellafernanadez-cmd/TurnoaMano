
import { useEffect, useRef, useState } from "react";
import { disponibilidadTurnos, especialidadPorVoz, solicitarTurno } from "../../api/turnosApi";
import { callar, hablar, limpiarDicho, normalizarVoz } from "../../utils/voz";
import { fechaHablada, fechaLarga, nombreDia, partesDia } from "../../utils/fechas";
import { buscarHorarioDicho } from "../../utils/turnosVoz";
import "./Turnos.css";

const ESPECIALIDADES = [
  { clave: "clinica medica", nombre: "Clínica médica", icono: "🩺" },
  { clave: "cardiologia", nombre: "Cardiología", icono: "❤️" },
  { clave: "oftalmologia", nombre: "Oftalmología", icono: "👁️" },
  { clave: "odontologia", nombre: "Odontología", icono: "🦷" },
  { clave: "traumatologia", nombre: "Traumatología", icono: "🦴" },
  { clave: "ginecologia", nombre: "Ginecología", icono: "🌸" },
  { clave: "dermatologia", nombre: "Dermatología", icono: "🧴" },
  { clave: "neurologia", nombre: "Neurología", icono: "🧠" },
  { clave: "urologia", nombre: "Urología", icono: "💧" },
];

const nombreEsp = (clave) =>
  ESPECIALIDADES.find((e) => e.clave === clave)?.nombre || clave;

const MENSAJES_VOZ = {
  "not-allowed": "El navegador no tiene permiso para usar el micrófono. Tocá el candado de la barra de direcciones y permitilo.",
  "service-not-allowed": "El navegador no tiene permiso para usar el micrófono. Tocá el candado de la barra de direcciones y permitilo.",
  "no-speech": "No escuchamos nada. Vamos a intentarlo otra vez.",
  "audio-capture": "No encontramos un micrófono conectado.",
  network: "El reconocimiento de voz necesita internet. Revisá tu conexión.",
};

const numeroDia = (fecha) => Number(fecha.slice(8, 10));

const NUMEROS_DIA = {
  uno: 1, primero: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11,
  doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16,
  diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
  veintiuno: 21, veintiun: 21, veintidos: 22, veintitres: 23,
  veinticuatro: 24, veinticinco: 25, veintiseis: 26,
  veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, treintauno: 31,
};

const mesDia = (fecha) =>
  new Date(`${fecha}T00:00:00`).toLocaleDateString("es-AR", {
    month: "long",
  });

function buscarFechaDicha(texto, dias) {
  const dicho = normalizarVoz(texto);

  const coincidencias = dias.filter((d) => {
    const dia = String(numeroDia(d.fecha));
    const nombre = normalizarVoz(nombreDia(d.fecha));
    const [semana] = nombre.split(" ");
    const mes = normalizarVoz(mesDia(d.fecha));

    const diasSemana = [
      "lunes", "martes", "miercoles", "jueves",
      "viernes", "sabado", "domingo",
    ];

    const semanaMencionada = diasSemana.find((nombreDia) =>
      dicho.includes(nombreDia)
    );

    const mesMencionado = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre",
      "diciembre",
    ].find((nombreMes) => dicho.includes(nombreMes));

    const tieneNumero =
      new RegExp(`\\b${dia}\\b`).test(dicho) ||
      Object.entries(NUMEROS_DIA).some(
        ([palabra, numero]) =>
          numero === Number(dia) &&
          new RegExp(`\\b${palabra}\\b`).test(dicho)
      );

    const coincideSemana =
      !semanaMencionada || semanaMencionada === semana;

    const coincideMes =
      !mesMencionado || mesMencionado === mes;

    return (
      (tieneNumero || Boolean(semanaMencionada)) &&
      coincideSemana &&
      coincideMes
    );
  });

  return coincidencias.length === 1 ? coincidencias[0] : null;
}

export default function SolicitarTurno({
  onVerTurnos,
  onInicio,
  iniciarConVoz = false,
  onVozIniciada,
}) {
  const [paso, setPaso] = useState("especialidad");
  const [especialidad, setEspecialidad] = useState("");
  const [modo, setModo] = useState("manual");
  const [frase, setFrase] = useState("");
  const [dias, setDias] = useState([]);
  const [dia, setDia] = useState("");
  const [hora, setHora] = useState("");
  const [motivo, setMotivo] = useState("");
  const [turno, setTurno] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [vozActiva, setVozActiva] = useState(false);
  const [etapaVoz, setEtapaVoz] = useState("especialidad");
  const [reintento, setReintento] = useState(0);

  const enCurso = useRef(false);
  const reconocimientoRef = useRef(null);
  const cancelarEscuchaRef = useRef(null);
  const temporizadorVozRef = useRef(null);
  const procesarVozRef = useRef(null);

  const diaActual = dias.find((d) => d.fecha === dia);

  const diasConDisponibilidad = dias.filter((d) =>
    d.horarios.some((h) => h.libre)
  );

  const horariosLibres =
    diaActual?.horarios.filter((h) => h.libre) || [];

  const textoGuia = () => {
    if (paso === "especialidad") {
      return "Elegí una especialidad de la lista o pedí tu turno por voz. También podés decir qué especialidad necesitás.";
    }

    if (paso === "horario") {
      return "Elegí una fecha disponible y después un horario libre. Los que aparecen en gris no se pueden seleccionar.";
    }

    if (paso === "listo" && turno) {
      return `Listo. Tu turno de ${nombreEsp(turno.especialidad)} quedó confirmado para el ${fechaHablada(turno.fecha_hora)}.`;
    }

    return "";
  };

  // Registra los errores de reconocimiento y realiza hasta dos intentos.
  const registrarFalloVoz = () => {
    const pregunta =
      etapaVoz === "fecha"
        ? "la fecha"
        : etapaVoz === "hora"
        ? "el horario"
        : etapaVoz === "especialidad"
        ? "la especialidad"
        : "tu respuesta";

    if (reintento >= 1) {
      setVozActiva(false);
      setModo("manual");
      setReintento(0);

      cancelarEscuchaRef.current?.();
      callar();

      setMensaje({
        ok: false,
        texto: `No pude comprenderte. Podés seleccionar ${pregunta} directamente con los botones que aparecen en la pantalla.`,
        leerEnVoz: true,
      });

      return;
    }

    setReintento(1);

    setMensaje({
      ok: false,
      texto: `No pude comprenderte. Volvé a decirme ${pregunta}. Te escucho.`,
    });
  };

  // Si la persona selecciona una opción manualmente, se detiene la escucha.
  const pasarAModoManual = () => {
    cancelarEscuchaRef.current?.();
    clearTimeout(temporizadorVozRef.current);
    callar();

    setVozActiva(false);
    setModo("manual");
    setReintento(0);
  };

  const protegido = async (accion) => {
    if (enCurso.current) return;

    enCurso.current = true;
    setOcupado(true);

    try {
      return await accion();
    } finally {
      enCurso.current = false;
      setOcupado(false);
    }
  };

  const irAHorarios = (clave, deModo, fraseDicha = "") =>
    protegido(async () => {
      try {
        const datos = await disponibilidadTurnos(clave);

        setEspecialidad(clave);
        setModo(deModo);
        setFrase(fraseDicha);
        setDias(datos.dias);
        setDia("");
        setHora("");
        setMensaje(null);
        setPaso("horario");

        return true;
      } catch (e) {
        setMensaje({
          ok: false,
          texto:
            e.response?.data?.error ||
            "No pudimos ver los horarios. Probá de nuevo.",
        });

        return false;
      }
    });

  const escucharAhora = () => {
    const Reconocimiento =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Reconocimiento) {
      setVozActiva(false);

      setMensaje({
        ok: false,
        texto:
          "Este navegador no permite reconocer la voz. Abrí la app en Chrome o Edge, o continuá con los controles de la pantalla.",
      });

      return;
    }

    const r = new Reconocimiento();

    reconocimientoRef.current = r;
    r.lang = "es-AR";
    r.continuous = false;
    r.interimResults = false;

    let texto = "";
    let anulado = false;

    r.onresult = (ev) => {
      texto = Array.from(ev.results)
        .map((parte) => parte[0].transcript)
        .join(" ")
        .trim();

      if (texto) {
        setMensaje({
          ok: true,
          texto: `Te escuché: “${texto}”`,
        });
      }

      try {
        r.stop();
      } catch {
        // El reconocimiento ya terminó.
      }
    };

    r.onerror = (ev) => {
      if (anulado || ev.error === "aborted") return;

      setMensaje({
        ok: false,
        texto:
          MENSAJES_VOZ[ev.error] ||
          "No pudimos escucharte. Vamos a intentarlo otra vez.",
      });

      if (
        ["not-allowed", "service-not-allowed", "audio-capture"].includes(
          ev.error
        )
      ) {
        setVozActiva(false);

        if (etapaVoz === "especialidad") {
          setModo("manual");
        }
      }
    };

    r.onend = () => {
      reconocimientoRef.current = null;
      cancelarEscuchaRef.current = null;
      setEscuchando(false);

      if (anulado || !vozActiva) return;

      if (texto) {
        procesarVozRef.current?.(texto);
      } else {
        registrarFalloVoz();
      }
    };

    cancelarEscuchaRef.current = () => {
      anulado = true;

      try {
        r.abort();
      } catch {
        // El reconocimiento ya terminó.
      }
    };

    try {
      setEscuchando(true);
      setMensaje({ ok: true, texto: "Te escucho…" });
      r.start();
    } catch {
      setEscuchando(false);
      setVozActiva(false);

      setMensaje({
        ok: false,
        texto:
          "No pudimos activar el micrófono. Revisá el permiso del navegador.",
      });
    }
  };

  const confirmar = () =>
    protegido(async () => {
      try {
        const datos = {
          modo,
          especialidad,
          motivo: motivo.trim(),
          fecha_hora: `${dia}T${hora}`,
          ...(modo === "voz" ? { transcripcion: frase } : {}),
        };

        setTurno(await solicitarTurno(datos));
        setMensaje(null);
        setPaso("listo");
      } catch (e) {
        const causa =
          e.response?.data?.error ||
          "No pudimos confirmar el turno. Probá de nuevo.";

        setMensaje({ ok: false, texto: causa });

        if (e.response?.status === 409 && /tomado/i.test(causa)) {
          try {
            setDias((await disponibilidadTurnos(especialidad)).dias);
          } catch {
            // Se mantiene la lista anterior.
          }

          setHora("");

          if (modo === "voz") {
            setVozActiva(true);
            setEtapaVoz("hora");
          }
        } else if (modo === "voz") {
          setVozActiva(true);
          setEtapaVoz("confirmacion");
        }
      }
    });

  const procesarVoz = async (texto) => {
    const dicho = normalizarVoz(limpiarDicho(texto));

    if (!dicho) {
      registrarFalloVoz();
      return;
    }

    if (/\b(cancelar|cancela|cancelarme|salir|no quiero)\b/.test(dicho)) {
      setVozActiva(false);
      setPaso("especialidad");
      setEspecialidad("");
      setModo("manual");
      setFrase("");
      setDias([]);
      setDia("");
      setHora("");
      setMotivo("");
      setEtapaVoz("especialidad");
      setMensaje({
        ok: true,
        texto: "Cancelamos la solicitud. No se creó ningún turno.",
      });

      callar();
      return;
    }

    if (etapaVoz === "especialidad") {
      try {
        const { especialidad: clave } = await especialidadPorVoz(texto);
        const cargado = await irAHorarios(clave, "voz", texto);

        if (cargado) {
          setReintento(0);
          setEtapaVoz("fecha");
        } else {
          registrarFalloVoz();
        }
      } catch (e) {
        setMensaje({
          ok: false,
          texto:
            e.response?.data?.error ||
            "No pude reconocer la especialidad. Decime, por ejemplo, clínica médica o cardiología.",
        });

        registrarFalloVoz();
      }

      return;
    }

    if (etapaVoz === "fecha") {
      if (/\b(volver|atras|especialidad)\b/.test(dicho)) {
        setPaso("especialidad");
        setEtapaVoz("especialidad");
        setDia("");
        setHora("");
        return;
      }

      const elegida = buscarFechaDicha(texto, dias);

      if (!elegida) {
        registrarFalloVoz();
        return;
      }

      if (!elegida.horarios.some((h) => h.libre)) {
        setMensaje({
          ok: false,
          texto: `${nombreDia(elegida.fecha)} no tiene horarios disponibles. Elegí una fecha que aparezca en verde.`,
        });

        registrarFalloVoz();
        return;
      }

      setDia(elegida.fecha);
      setHora("");
      setReintento(0);

      setMensaje({
        ok: true,
        texto: `Elegiste ${nombreDia(elegida.fecha)}.`,
      });

      setEtapaVoz("hora");
      return;
    }

    if (etapaVoz === "hora") {
      if (
        /\b(cambiar (la )?fecha|otra fecha|volver al dia|volver a la fecha|volver)\b/.test(
          dicho
        )
      ) {
        setDia("");
        setHora("");
        setEtapaVoz("fecha");
        return;
      }

      const elegida = buscarHorarioDicho(
        texto,
        diaActual?.horarios || []
      );

      if (!elegida) {
        registrarFalloVoz();
        return;
      }

      if (!elegida.libre) {
        setMensaje({
          ok: false,
          texto: `Las ${elegida.hora} están ocupadas. Elegí otro horario disponible.`,
        });

        registrarFalloVoz();
        return;
      }

      setHora(elegida.hora);
      setReintento(0);
      setEtapaVoz("confirmacion");
      return;
    }

    if (etapaVoz === "confirmacion") {
      if (/\b(cambiar (la )?fecha|otra fecha)\b/.test(dicho)) {
        setDia("");
        setHora("");
        setEtapaVoz("fecha");
        return;
      }

      if (
        /\b(cambiar (el )?horario|otro horario|cambiar (la )?hora)\b/.test(
          dicho
        )
      ) {
        setHora("");
        setEtapaVoz("hora");
        return;
      }

      if (
        /\b(si|confirmo|confirmar|correcto|dale|de acuerdo)\b/.test(dicho)
      ) {
        setVozActiva(false);
        await confirmar();
        return;
      }

      if (
        /\b(mira el horario|mirar el horario|repetir horario|repeti el horario|decime el horario)\b/.test(
          dicho
        )
      ) {
        registrarFalloVoz();
        return;
      }

      if (/\b(no|negativo)\b/.test(dicho)) {
        setHora("");
        setEtapaVoz("hora");
        return;
      }

      setMensaje({
        ok: false,
        texto:
          "Decime sí, confirmo; cambiar horario; cambiar fecha; o cancelar.",
      });

      registrarFalloVoz();
    }
  };

  procesarVozRef.current = procesarVoz;

  // Inicia el asistente cuando se solicita desde la pantalla principal.
  useEffect(() => {
    if (!iniciarConVoz) return;

    setModo("voz");
    setEtapaVoz("especialidad");
    setVozActiva(true);
    onVozIniciada?.();
  }, [iniciarConVoz, onVozIniciada]);

  // Lee las indicaciones y vuelve a escuchar automáticamente.
  useEffect(() => {
    if (!vozActiva) return undefined;

    let indicacion = "";

    if (etapaVoz === "especialidad") {
      indicacion =
        "Decime qué especialidad necesitás. Por ejemplo: quiero un turno con cardiología o clínica médica.";
    } else if (etapaVoz === "fecha") {
      const lista = diasConDisponibilidad
        .map((d) => nombreDia(d.fecha))
        .join("; ");

      indicacion = diasConDisponibilidad.length
        ? `Elegí una fecha de las que aparecen en verde en la pantalla. Las fechas en gris no están disponibles. Podés elegir entre: ${lista}. Decime el día y el número.`
        : "En este momento no hay fechas con horarios disponibles. Podés volver a elegir otra especialidad.";
    } else if (etapaVoz === "hora") {
      const lista = horariosLibres
        .map((h) => h.hora)
        .join(", ");

      indicacion = lista
        ? `Muy bien. Elegiste ${nombreDia(dia)}. Ahora elegí un horario disponible. Podés elegir: ${lista}. Decime la hora.`
        : `No quedan horarios libres para ${nombreDia(dia)}. Volvamos a elegir otra fecha.`;
    } else if (etapaVoz === "confirmacion") {
      indicacion = `Voy a confirmar tu turno de ${nombreEsp(especialidad)} para el ${nombreDia(dia)} a las ${hora}. ¿Está bien? Decí sí, confirmo; cambiar horario; cambiar fecha; o cancelar.`;
    }

    // Si hubo un primer error, primero avisa y luego repite la indicación.
    const textoParaLeer =
      reintento > 0
        ? `No pude comprenderte. Volvé a decirme ${
            etapaVoz === "fecha"
              ? "la fecha"
              : etapaVoz === "hora"
              ? "el horario"
              : etapaVoz === "especialidad"
              ? "la especialidad"
              : "tu respuesta"
          }. Te escucho. ${indicacion}`
        : indicacion;

    let cancelado = false;

    hablar(textoParaLeer, () => {
      if (!cancelado && vozActiva) {
        temporizadorVozRef.current = setTimeout(() => {
          if (!cancelado) {
            escucharAhora();
          }
        }, 350);
      }
    });

    return () => {
      cancelado = true;
      clearTimeout(temporizadorVozRef.current);
      callar();
      cancelarEscuchaRef.current?.();
    };
    // El estado de la etapa determina el texto y el momento de volver a escuchar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    vozActiva,
    etapaVoz,
    paso,
    turno,
    especialidad,
    dias,
    dia,
    hora,
    reintento,
  ]);

  // Lee en voz alta el aviso cuando se agotan los intentos.
  useEffect(() => {
    if (mensaje?.leerEnVoz) {
      hablar(mensaje.texto);
    }
  }, [mensaje]);

  // Lee la confirmación y pregunta si desea volver al inicio.
  // Funciona tanto si el turno se solicitó por voz como si se usaron botones.
  useEffect(() => {
    if (paso === "listo" && turno) {
      const horaConfirmada =
        String(turno.fecha_hora).split("T")[1]?.slice(0, 5) || hora;

      hablar(
        `¡Perfecto! Tu turno quedó confirmado. Tenés un turno para ${nombreEsp(
          turno.especialidad
        )}, el ${fechaLarga(turno.fecha_hora)}, a las ${horaConfirmada}. ¿Querés volver a la pantalla principal? Podés tocar el botón volver al inicio.`
      );
    }
  }, [paso, turno, hora]);

  useEffect(
    () => () => {
      callar();
      clearTimeout(temporizadorVozRef.current);
      cancelarEscuchaRef.current?.();
    },
    []
  );

  const iniciarVoz = () => {
    const Reconocimiento =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Reconocimiento) {
      setMensaje({
        ok: false,
        texto:
          "Este navegador no permite reconocer la voz. Abrí la app en Chrome o Edge.",
      });

      return;
    }

    if (paso === "especialidad") {
      setModo("voz");
    }

    setVozActiva(true);
    setEtapaVoz(paso === "especialidad" ? "especialidad" : "fecha");

    setMensaje({
      ok: true,
      texto:
        "Activamos el asistente de voz. Te va a guiar paso a paso.",
    });
  };

  const empezarDeNuevo = () => {
    setVozActiva(false);
    cancelarEscuchaRef.current?.();
    clearTimeout(temporizadorVozRef.current);
    callar();

    setPaso("especialidad");
    setEspecialidad("");
    setModo("manual");
    setFrase("");
    setDias([]);
    setDia("");
    setHora("");
    setMotivo("");
    setTurno(null);
    setMensaje(null);
    setEtapaVoz("especialidad");
  };

  if (paso === "listo" && turno) {
    return (
      <main className="pantalla turnos">
        <section className="listo" aria-live="polite">
          <p className="check" aria-hidden="true">✓</p>

          <h2>¡Listo!</h2>

          <p className="listo-texto">
            Tu turno ha sido confirmado.
          </p>

          <div className="resumen">
            <p>
              <span aria-hidden="true">🩺</span>
              <strong>{nombreEsp(turno.especialidad)}</strong>
            </p>

            <p>
              <span aria-hidden="true">📅</span>
              <strong>{fechaLarga(turno.fecha_hora)}</strong>
            </p>

            <p>
              <span aria-hidden="true">🕘</span>
              <strong>
                {String(turno.fecha_hora).split("T")[1]?.slice(0, 5) || hora}
              </strong>
            </p>
          </div>

          <p className="ayuda-disponibilidad">
            ¿Querés volver a la pantalla principal?
          </p>

          <button
            type="button"
            className="btn"
            onClick={onInicio}
          >
            Sí, volver al inicio
          </button>

          <button
            type="button"
            className="btn btn-secundario"
            onClick={onVerTurnos}
          >
            No, ver mis turnos
          </button>

          <button
            type="button"
            className="link link-centro"
            onClick={empezarDeNuevo}
          >
            Pedir otro turno
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="pantalla turnos">
      <div className="guia" role="region" aria-label="Guía del paso">
        <p className="paso-numero">
          {paso === "especialidad" ? "Paso 1" : "Paso 2"}
        </p>

        <p className="guia-texto">{textoGuia()}</p>

        <div className="guia-botones">
          <button
            type="button"
            className="btn-chico"
            onClick={() =>
              hablar(
                textoGuia(),
                vozActiva
                  ? () => setTimeout(() => escucharAhora(), 350)
                  : undefined
              )
            }
          >
            🔊 Escuchar indicación
          </button>

          {vozActiva && (
            <button
              type="button"
              className="btn-chico"
              onClick={() => {
                setVozActiva(false);
                cancelarEscuchaRef.current?.();
                callar();
              }}
            >
              🔇 Pausar asistente
            </button>
          )}
        </div>
      </div>

      {paso === "especialidad" && (
        <>
          <button
            type="button"
            className={`banda banda-verde${escuchando ? " escuchando" : ""}`}
            onClick={iniciarVoz}
            disabled={ocupado || escuchando || vozActiva}
          >
            <span className="banda-icono" aria-hidden="true">🎤</span>
            <span>
              {vozActiva
                ? "Asistente de voz activo"
                : "Pedir turno por voz"}
            </span>
          </button>

          <h2 className="subtitulo">Elegí la especialidad</h2>

          <div
            className="lista-esp"
            role="radiogroup"
            aria-label="Especialidades"
          >
            {ESPECIALIDADES.map((e) => (
              <button
                key={e.clave}
                type="button"
                role="radio"
                aria-checked={especialidad === e.clave}
                className={`fila-esp${
                  especialidad === e.clave ? " activa" : ""
                }`}
                disabled={ocupado}
                onClick={() => {
                  pasarAModoManual();
                  setEspecialidad(e.clave);
                }}
              >
                <span className="fila-icono" aria-hidden="true">
                  {e.icono}
                </span>

                <span className="fila-nombre">{e.nombre}</span>

                <span className="radio" aria-hidden="true" />
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn"
            disabled={!especialidad || ocupado}
            onClick={() => {
              pasarAModoManual();
              irAHorarios(especialidad, "manual");
            }}
          >
            Siguiente →
          </button>
        </>
      )}

      {paso === "horario" && (
        <>
          <p className="elegido">
            <span aria-hidden="true">
              {ESPECIALIDADES.find((e) => e.clave === especialidad)?.icono}
            </span>{" "}
            {nombreEsp(especialidad)}
          </p>

          {!vozActiva && (
            <button
              type="button"
              className="banda banda-verde voz-continuar"
              onClick={iniciarVoz}
              disabled={ocupado}
            >
              <span className="banda-icono" aria-hidden="true">🎤</span>
              <span>Continuar con el asistente de voz</span>
            </button>
          )}

          <h2 className="subtitulo">
            <span aria-hidden="true">📅</span> Elegí la fecha
          </h2>

          <p className="ayuda-disponibilidad">
            Verde: disponible. Gris: no disponible.
          </p>

          <div
            className="dias"
            role="radiogroup"
            aria-label="Días disponibles"
          >
            {dias.map((d) => {
              const p = partesDia(d.fecha);
              const disponible = d.horarios.some((h) => h.libre);

              return (
                <button
                  key={d.fecha}
                  type="button"
                  role="radio"
                  aria-checked={dia === d.fecha}
                  disabled={!disponible || ocupado}
                  className={`opcion dia${
                    dia === d.fecha ? " activa" : ""
                  }${!disponible ? " no-disponible" : " disponible"}`}
                  onClick={() => {
                    pasarAModoManual();
                    setDia(d.fecha);
                    setHora("");
                  }}
                >
                  <span>{p.semana}</span>
                  <strong>{p.numero}</strong>
                  <span>{p.mes}</span>

                  {!disponible && <small>No disponible</small>}
                </button>
              );
            })}
          </div>

          {diaActual && (
            <>
              <h2 className="subtitulo">
                <span aria-hidden="true">🕘</span> Horarios disponibles
              </h2>

              <div
                className="horas"
                role="radiogroup"
                aria-label="Horarios"
              >
                {diaActual.horarios.map((h) => (
                  <button
                    key={h.hora}
                    type="button"
                    role="radio"
                    aria-checked={hora === h.hora}
                    disabled={!h.libre || ocupado}
                    className={`opcion hora ${
                      h.libre ? "disponible" : "ocupado"
                    }${hora === h.hora ? " activa" : ""}`}
                    onClick={() => {
                      pasarAModoManual();
                      setHora(h.hora);
                    }}
                  >
                    {h.hora}
                    {!h.libre && (
                      <span className="ocupado-texto">Ocupado</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          <label htmlFor="motivo" className="etiqueta">
            Motivo <span className="opcional">(opcional)</span>
          </label>

          <textarea
            id="motivo"
            maxLength={300}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />

          <button
            type="button"
            className="btn"
            disabled={!dia || !hora || ocupado}
            onClick={confirmar}
          >
            {ocupado ? "Confirmando…" : "Confirmar turno →"}
          </button>

          <button
            type="button"
            className="btn btn-secundario"
            disabled={ocupado}
            onClick={empezarDeNuevo}
          >
            Volver
          </button>
        </>
      )}

      {mensaje && (
        <p
          role="status"
          className={mensaje.ok ? "msg-ok" : "msg-error"}
        >
          {mensaje.texto}
        </p>
      )}
    </main>
  );
}
