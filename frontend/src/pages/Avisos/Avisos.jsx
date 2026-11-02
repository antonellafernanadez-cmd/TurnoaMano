
import { useEffect, useRef, useState } from "react";
import {
  marcarAvisoLeido,
  obtenerAvisos,
} from "../../api/turnosApi";
import { hablar, callar, normalizarVoz } from "../../utils/voz";
import "./Avisos.css";

const ICONO = {
  fecha_propuesta: "📅",
  recordatorio: "🔔",
  cambio: "⚠️",
};

const TITULO = {
  fecha_propuesta: "Fecha propuesta",
  recordatorio: "Recordatorio",
  cambio: "Cambio en tu turno",
};

const cuando = (iso) =>
  new Date(iso + "Z").toLocaleString("es-AR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

export default function Avisos({ onCambio, onInicio }) {
  const [aviso, setAviso] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [escuchando, setEscuchando] = useState(false);

  const reconocimientoRef = useRef(null);
  const iniciadoRef = useRef(false);
  const procesandoRef = useRef(false);

  const volverAlInicio = () => {
    callar();
    reconocimientoRef.current?.abort();
    onInicio?.();
  };

  const finalizarConVoz = (texto) => {
    hablar(texto, volverAlInicio);
  };

  const responder = async (respuesta) => {
    if (procesandoRef.current || ocupado) return;

    procesandoRef.current = true;
    callar();
    reconocimientoRef.current?.abort();
    setEscuchando(false);

    if (respuesta === "no") {
      finalizarConVoz(
        "Está bien. Dejamos este aviso sin marcar, para que puedas leerlo más tarde. Volvemos a la pantalla principal."
      );
      return;
    }

    procesandoRef.current = true;
    setOcupado(true);

    try {
      await marcarAvisoLeido(aviso.id);

      onCambio?.();

      finalizarConVoz(
        "Perfecto. El aviso quedó marcado como leído. Volvemos a la pantalla principal."
      );
    } catch {
      procesandoRef.current = false;
      setOcupado(false);
      setError("No pudimos marcar el aviso como leído. Podés intentarlo nuevamente.");
      hablar(
        "No pudimos marcar el aviso como leído. Podés intentarlo nuevamente con el botón de la pantalla."
      );
    }
  };

  const escucharRespuesta = () => {
    const Reconocimiento =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Reconocimiento) return;

    const reconocimiento = new Reconocimiento();
    reconocimientoRef.current = reconocimiento;

    reconocimiento.lang = "es-AR";
    reconocimiento.continuous = false;
    reconocimiento.interimResults = false;

    reconocimiento.onresult = (evento) => {
      const texto = normalizarVoz(
        Array.from(evento.results)
          .map((resultado) => resultado[0].transcript)
          .join(" ")
      );

      if (
        /\b(si|sí|quiero|marcar|marcalo|marcarlo|dale)\b/.test(texto)
      ) {
        responder("si");
      } else if (
        /\b(no|mantener|dejalo|dejarlo|despues|después)\b/.test(texto)
      ) {
        responder("no");
      } else {
        setEscuchando(false);
        hablar(
          "No pude reconocer tu respuesta. Podés decir sí o no, o usar los botones de la pantalla."
        );
      }
    };

    reconocimiento.onerror = () => {
      setEscuchando(false);
    };

    reconocimiento.onend = () => {
      setEscuchando(false);
    };

    try {
      setEscuchando(true);
      reconocimiento.start();
    } catch {
      setEscuchando(false);
    }
  };

  useEffect(() => {
    let activo = true;

    obtenerAvisos()
      .then((lista) => {
        if (!activo) return;

        const pendientes = (Array.isArray(lista) ? lista : []).filter(
          (a) => !a.leida
        );

        setAviso(pendientes[0] || null);
      })
      .catch(() => {
        if (activo) {
          setError("No pudimos cargar tus avisos.");
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
      callar();
      reconocimientoRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (cargando || error || iniciadoRef.current) return;

    iniciadoRef.current = true;

    if (!aviso) {
      finalizarConVoz(
        "No tenés avisos pendientes de leer. Volvemos a la pantalla principal."
      );
      return;
    }

    const titulo = TITULO[aviso.tipo] || "Aviso";
    const fecha = cuando(aviso.creado_en);

    hablar(
      `Bueno, te leo este aviso que todavía no tenés leído. ${titulo}. ${aviso.mensaje}. Fecha del aviso: ${fecha}. ¿Querés marcarlo como leído? Decí sí o no.`,
      escucharRespuesta
    );
  }, [cargando, error, aviso]);

  useEffect(() => {
    return () => {
      callar();
      reconocimientoRef.current?.abort();
    };
  }, []);

  if (cargando) {
    return (
      <main className="pantalla">
        <p>Cargando tus avisos…</p>
      </main>
    );
  }

  if (error && !aviso) {
    return (
      <main className="pantalla">
        <p className="msg-error" role="alert">{error}</p>

        <button
          type="button"
          className="btn"
          onClick={volverAlInicio}
        >
          Volver al inicio
        </button>
      </main>
    );
  }

  if (!aviso) {
    return (
      <main className="pantalla">
        <p className="avisos-vacio">
          No tenés avisos pendientes por ahora.
        </p>

        <button
          type="button"
          className="btn"
          onClick={volverAlInicio}
        >
          Volver al inicio
        </button>
      </main>
    );
  }

  return (
    <main className="pantalla">
      <p className="avisos-intro">
        Este es tu aviso pendiente de lectura.
      </p>

      <article className="aviso">
        <span className="aviso-icono" aria-hidden="true">
          {ICONO[aviso.tipo] || "🔔"}
        </span>

        <div className="aviso-cuerpo">
          <h2>
            {TITULO[aviso.tipo] || "Aviso"}
            <span className="nuevo">Nuevo</span>
          </h2>

          <p>{aviso.mensaje}</p>

          <p className="aviso-fecha">
            {cuando(aviso.creado_en)}
          </p>
        </div>
      </article>

      <h3>¿Querés marcar este aviso como leído?</h3>

      {escuchando && (
        <p className="msg-ok" role="status">
          Te estoy escuchando…
        </p>
      )}

      {error && (
        <p className="msg-error" role="alert">
          {error}
        </p>
      )}

      <div className="acciones">
        <button
          type="button"
          className="btn"
          disabled={ocupado}
          onClick={() => responder("si")}
        >
          {ocupado ? "Marcando…" : "Sí, marcar como leído"}
        </button>

        <button
          type="button"
          className="btn btn-secundario"
          disabled={ocupado}
          onClick={() => responder("no")}
        >
          No, mantener pendiente
        </button>
      </div>
    </main>
  );
}

