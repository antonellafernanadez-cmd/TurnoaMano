import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Logo from "../../components/Logo";
import { hablar, callar, normalizarVoz } from "../../utils/voz";
import "./Inicio.css";

export default function Inicio({
  nombre,
  irA,
  onPedirPorVoz,
  onSalir,
  avisos = [],
  avisosCargados = false,
  sinLeer = 0,
}) {
  const [estadoVoz, setEstadoVoz] = useState("preparando");
  const [mensajeVoz, setMensajeVoz] = useState("");

  const reconocimientoRef = useRef(null);
  const errorReconocimientoRef = useRef("");
  const cancelarRef = useRef(false);
  const textoBienvenidaRef = useRef("");
  const escucharRef = useRef(null);

  const avisosPendientes = useMemo(
    () => avisos.filter((aviso) => !aviso.leida),
    [avisos]
  );

  const saludo = nombre
    ? `¡Hola, ${nombre}!`
    : "¡Hola!";

  const textoBienvenida = useCallback(() => {
    const partes = [
      `${saludo} Te damos la bienvenida a Mi Turno a Mano.`,
      "Esta es la pantalla principal de la aplicación.",
      "Tenés dos opciones principales. Pedir turno, para solicitar un nuevo turno médico. O Mis turnos, para consultar los turnos que ya tenés programados.",
      `También tenés la sección Recordatorios, donde podés consultar los avisos relacionados con tus turnos. Actualmente tenés ${sinLeer} ${sinLeer === 1 ? "aviso pendiente de leer" : "avisos pendientes de leer"}.`,
    ];

    if (avisosPendientes.length > 0) {
      partes.push("Voy a leerte tus avisos pendientes.");

      avisosPendientes.forEach((aviso, indice) => {
        partes.push(
          `Aviso ${indice + 1}. ${
            aviso.mensaje || "Tenés un nuevo recordatorio."
          }`
        );
      });
    } else {
      partes.push("No tenés avisos pendientes de leer.");
    }

    partes.push(
      "¿Qué querés hacer hoy? Para solicitar un turno, decí pedir turno. Para consultar tus turnos, decí mis turnos. Para volver a escuchar tus avisos, decí avisos. También podés elegir cualquiera de las opciones con los botones de la pantalla."
    );

    return partes.join(" ");
  }, [saludo, sinLeer, avisosPendientes]);

  const procesarRespuesta = (texto) => {
    const dicho = normalizarVoz(texto);

    setMensajeVoz(`Te escuché: “${texto}”`);

    if (
      /\b(pedir|sacar|solicitar|reservar)\b/.test(dicho) ||
      dicho.includes("quiero un turno")
    ) {
      setEstadoVoz("navegando");

      hablar(
        "Muy bien. Vamos a solicitar tu turno.",
        () => {
          if (onPedirPorVoz) {
            onPedirPorVoz();
          } else {
            irA("pedir");
          }
        }
      );

      return;
    }

    if (
      dicho.includes("mis turnos") ||
      dicho.includes("ver mis turnos") ||
      dicho.includes("consultar turnos")
    ) {
      setEstadoVoz("navegando");

      hablar(
        "Muy bien. Vamos a consultar tus turnos.",
        () => irA("mios")
      );

      return;
    }

    if (
      dicho.includes("aviso") ||
      dicho.includes("mensaje") ||
      dicho.includes("recordatorio")
    ) {
      setEstadoVoz("navegando");

      hablar(
        "Vamos a ver tus avisos.",
        () => irA("avisos")
      );

      return;
    }

    if (
      dicho.includes("repetir") ||
      dicho.includes("otra vez")
    ) {
      hablar(
        textoBienvenidaRef.current,
        () => escucharRef.current?.()
      );

      return;
    }

    hablar(
      "No entendí lo que necesitás. Podés decir pedir turno, mis turnos o avisos. Te escucho nuevamente.",
      () => escucharRef.current?.()
    );
  };

  const escuchar = useCallback(() => {
    if (cancelarRef.current) return;

    const Reconocimiento =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!Reconocimiento) {
      setEstadoVoz("sin-microfono");

      setMensajeVoz(
        "Este navegador no permite reconocer la voz. Podés continuar usando los botones de la pantalla. Para usar voz, abrí la aplicación en Chrome o Edge."
      );

      return;
    }

    const reconocimiento = new Reconocimiento();

    reconocimientoRef.current = reconocimiento;
    errorReconocimientoRef.current = "";

    reconocimiento.lang = "es-AR";
    reconocimiento.continuous = false;
    reconocimiento.interimResults = false;

    let transcripcion = "";

    reconocimiento.onstart = () => {
      setEstadoVoz("escuchando");

      setMensajeVoz(
        "Te escucho. Podés decir pedir turno, mis turnos o avisos."
      );
    };

    reconocimiento.onresult = (evento) => {
      transcripcion = Array.from(evento.results)
        .map((resultado) => resultado[0]?.transcript || "")
        .join(" ")
        .trim();
    };

    reconocimiento.onerror = (evento) => {
      errorReconocimientoRef.current = evento.error;

      if (
        cancelarRef.current ||
        evento.error === "aborted"
      ) {
        return;
      }

      if (
        evento.error === "not-allowed" ||
        evento.error === "service-not-allowed"
      ) {
        setEstadoVoz("permiso");

        setMensajeVoz(
          "Para conversar por voz, permití el uso del micrófono desde el candado que aparece junto a la dirección de la página."
        );
      } else if (evento.error === "no-speech") {
        setEstadoVoz("esperando");
      } else {
        setEstadoVoz("error");

        setMensajeVoz(
          "No pudimos escucharte. Podés intentarlo otra vez o usar los botones."
        );
      }
    };

    reconocimiento.onend = () => {
      reconocimientoRef.current = null;

      if (cancelarRef.current) return;

      if (
        [
          "not-allowed",
          "service-not-allowed",
          "audio-capture",
          "network",
        ].includes(errorReconocimientoRef.current)
      ) {
        return;
      }

      if (transcripcion) {
        procesarRespuesta(transcripcion);
      } else {
        setEstadoVoz("esperando");

        hablar(
          "No te escuché. Decime pedir turno, mis turnos o avisos.",
          () => escucharRef.current?.()
        );
      }
    };

    try {
      reconocimiento.start();
    } catch {
      reconocimientoRef.current = null;
      setEstadoVoz("permiso");

      setMensajeVoz(
        "No pudimos activar el micrófono. Revisá los permisos del navegador o usá los botones de la pantalla."
      );
    }
  }, []);

  escucharRef.current = escuchar;

  useEffect(() => {
    if (!avisosCargados) return undefined;

    cancelarRef.current = false;

    const texto = textoBienvenida();

    textoBienvenidaRef.current = texto;

    setEstadoVoz("hablando");

    setMensajeVoz(
      "El asistente está leyendo la pantalla de inicio."
    );

    hablar(texto, () => {
      if (!cancelarRef.current) {
        escucharRef.current?.();
      }
    });

    return () => {
      cancelarRef.current = true;

      reconocimientoRef.current?.abort();
      reconocimientoRef.current = null;

      callar();
    };
  }, [avisosCargados, textoBienvenida]);

  const repetirBienvenida = () => {
    cancelarRef.current = false;

    const texto =
      textoBienvenidaRef.current || textoBienvenida();

    setEstadoVoz("hablando");

    hablar(texto, () => escucharRef.current?.());
  };

  return (
    <main className="inicio">
      <header className="inicio-marca">
        <Logo tamano={52} />

        <p className="inicio-nombre-app">
          <span>Mi Turno</span> a Mano
        </p>
      </header>

      <section className="saludo-tarjeta" aria-label="Saludo">
        <p className="saludo-hola">{saludo}</p>
        <p className="saludo-pregunta">
          ¿Qué querés hacer hoy?
        </p>
      </section>

      <section className="inicio-asistente" aria-live="polite">
        <div className="asistente-icono" aria-hidden="true">
          🎧
        </div>

        <div className="asistente-contenido">
          <strong>Asistente de voz</strong>

          <p>
            {estadoVoz === "escuchando"
              ? "Te estoy escuchando…"
              : estadoVoz === "hablando"
              ? "Estoy leyendo la información de la pantalla…"
              : estadoVoz === "preparando"
              ? "Preparando tu bienvenida…"
              : mensajeVoz || "Podés hablarme o elegir una opción."}
          </p>
        </div>

        <button
          type="button"
          className="asistente-repetir"
          onClick={repetirBienvenida}
          aria-label="Repetir bienvenida"
        >
          🔊
        </button>
      </section>

      {mensajeVoz && (
        <p className="inicio-estado-voz" role="status">
          {mensajeVoz}
        </p>
      )}

      <div className="inicio-botones">
        <button
          type="button"
          className="gran gran-azul"
          onClick={() => irA("pedir")}
        >
          <span className="gran-icono" aria-hidden="true">
            📅
          </span>

          <span className="gran-titulo">
            Pedir turno
          </span>

          <span className="gran-texto">
            Solicitá un turno médico fácilmente
          </span>
        </button>

        <button
          type="button"
          className="gran gran-violeta"
          onClick={() => irA("mios")}
        >
          <span className="gran-icono" aria-hidden="true">
            📋
          </span>

          <span className="gran-titulo">
            Mis turnos
          </span>

          <span className="gran-texto">
            Consultá tus turnos programados
          </span>
        </button>
      </div>

      <button
        type="button"
        className="banda banda-verde"
        onClick={() => {
          if (onPedirPorVoz) {
            onPedirPorVoz();
          } else {
            irA("pedir");
          }
        }}
      >
        <span className="banda-icono" aria-hidden="true">
          🎤
        </span>

        <span>
          También podés pedir tu turno
          <br />
          por voz
        </span>

        <span className="banda-flecha" aria-hidden="true">
          ›
        </span>
      </button>

      <button
        type="button"
        className="banda banda-violeta"
        onClick={() => irA("avisos")}
      >
        <span className="banda-icono" aria-hidden="true">
          🔔
        </span>

        <span>
          Recordatorios

          {sinLeer > 0 && (
            <span
              className="insignia"
              aria-label={`${sinLeer} sin leer`}
            >
              {sinLeer}
            </span>
          )}

          <br />

          <small className="banda-chico">
            Recibí avisos de tus turnos
          </small>
        </span>

        <span className="banda-flecha" aria-hidden="true">
          ›
        </span>
      </button>

      <button
        type="button"
        className="btn btn-peligro"
        onClick={onSalir}
      >
        Cerrar sesión
      </button>
    </main>
  );
}