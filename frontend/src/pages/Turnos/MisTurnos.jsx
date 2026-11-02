
import { useEffect, useRef, useState } from "react";
import {
  cancelarTurno,
  obtenerMisTurnos,
} from "../../api/turnosApi";
import { fechaLarga } from "../../utils/fechas";
import { hablar, callar, normalizarVoz } from "../../utils/voz";
import "./Turnos.css";
import "./MisTurnos.css";

const ETIQUETA = {
  solicitado: "Esperando fecha",
  propuesto: "Tenés que responder",
  confirmado: "Confirmado",
  rechazado: "Rechazado",
  cancelado: "Cancelado",
};

const ESPECIALIDAD = {
  "clinica medica": { nombre: "Clínica médica", icono: "🩺" },
  cardiologia: { nombre: "Cardiología", icono: "❤️" },
  traumatologia: { nombre: "Traumatología", icono: "🦴" },
  oftalmologia: { nombre: "Oftalmología", icono: "👁️" },
  dermatologia: { nombre: "Dermatología", icono: "🧴" },
  ginecologia: { nombre: "Ginecología", icono: "🌸" },
  neurologia: { nombre: "Neurología", icono: "🧠" },
  odontologia: { nombre: "Odontología", icono: "🦷" },
  urologia: { nombre: "Urología", icono: "💧" },
};

const obtenerEspecialidad = (clave) => {
  const normalizada = normalizarVoz(clave || "");
  return (
    Object.entries(ESPECIALIDAD).find(
      ([nombre]) => normalizarVoz(nombre) === normalizada
    )?.[1] || { nombre: clave || "Consulta médica", icono: "🩺" }
  );
};

const esProximo = (turno) => {
  if (turno.estado === "solicitado" || turno.estado === "propuesto") {
    return true;
  }

  return (
    turno.estado === "confirmado" &&
    turno.fecha_hora &&
    new Date(turno.fecha_hora) >= new Date()
  );
};

const porFecha = (a, b) => {
  if (!a.fecha_hora) return 1;
  if (!b.fecha_hora) return -1;
  return new Date(a.fecha_hora) - new Date(b.fecha_hora);
};

export default function MisTurnos({ onPedir, onInicio }) {
  const [turno, setTurno] = useState(null);
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
    hablar(texto, () => {
      volverAlInicio();
    });
  };

  const responder = async (respuesta) => {
    if (procesandoRef.current || ocupado) return;

    procesandoRef.current = true;
    callar();
    reconocimientoRef.current?.abort();
    setEscuchando(false);

    if (respuesta === "no") {
      finalizarConVoz(
        "Está bien. Tu turno seguirá como está. Volvemos a la pantalla principal."
      );
      return;
    }

    setOcupado(true);

    try {
      await cancelarTurno(turno.id);

      finalizarConVoz(
        "Tu turno fue cancelado correctamente. Volvemos a la pantalla principal."
      );
    } catch (e) {
      procesandoRef.current = false;
      setOcupado(false);

      const mensaje =
        e.response?.data?.error ||
        "No pudimos cancelar el turno. Por favor, intentá nuevamente.";

      setError(mensaje);
      hablar(mensaje);
    }
  };

  const escucharRespuesta = () => {
    const Reconocimiento =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Reconocimiento) {
      setEscuchando(false);
      return;
    }

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
        /\b(si|sí|quiero|cancelar|cancelalo|cancelarlo|dale)\b/.test(texto)
      ) {
        responder("si");
      } else if (
        /\b(no|mantener|dejalo|dejarlo|conservar)\b/.test(texto)
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

    obtenerMisTurnos()
      .then((lista) => {
        if (!activo) return;

        const proximos = (Array.isArray(lista) ? lista : [])
          .filter(esProximo)
          .sort(porFecha);

        setTurno(proximos[0] || null);
      })
      .catch(() => {
        if (activo) {
          setError("No pudimos cargar tus turnos.");
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

    if (!turno) {
      finalizarConVoz(
        "No tenés turnos próximos. Volvemos a la pantalla principal."
      );
      return;
    }

    const esp = obtenerEspecialidad(turno.especialidad);
    const estado = ETIQUETA[turno.estado] || turno.estado;

    const fecha = turno.fecha_hora
      ? fechaLarga(turno.fecha_hora)
      : "todavía sin fecha asignada";

    const hora = turno.fecha_hora
      ? String(turno.fecha_hora).split("T")[1]?.slice(0, 5)
      : "";

    const detalleHora = hora ? ` a las ${hora}` : "";

    hablar(
      `Tu próximo turno es de ${esp.nombre}, para el ${fecha}${detalleHora}. Su estado es: ${estado}. ¿Querés cancelar este turno? Decí sí o no.`,
      escucharRespuesta
    );
  }, [cargando, error, turno]);

  useEffect(() => {
    return () => {
      callar();
      reconocimientoRef.current?.abort();
    };
  }, []);

  if (cargando) {
    return (
      <main className="pantalla turnos">
        <p>Cargando tu próximo turno…</p>
      </main>
    );
  }

  if (error && !turno) {
    return (
      <main className="pantalla turnos">
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

  if (!turno) {
    return (
      <main className="pantalla turnos">
        <section className="vacio">
          <p>No tenés turnos próximos.</p>
          <button
            type="button"
            className="btn"
            onClick={onPedir}
          >
            Pedir un turno
          </button>
          <button
            type="button"
            className="btn btn-secundario"
            onClick={volverAlInicio}
          >
            Volver al inicio
          </button>
        </section>
      </main>
    );
  }

  const esp = obtenerEspecialidad(turno.especialidad);

  return (
    <main className="pantalla turnos">
      <section className="tarjeta-turno">
        <div className="tarjeta-fila">
          <span className="fila-icono" aria-hidden="true">
            {esp.icono}
          </span>

          <div className="tarjeta-datos">
            <h2>{esp.nombre}</h2>

            {turno.fecha_hora && (
              <p className="cuando">
                {fechaLarga(turno.fecha_hora)}
              </p>
            )}

            {turno.fecha_hora && (
              <p>
                Horario:{" "}
                {String(turno.fecha_hora).split("T")[1]?.slice(0, 5)}
              </p>
            )}
          </div>
        </div>

        <p className={`chip chip-${turno.estado}`}>
          {ETIQUETA[turno.estado] || turno.estado}
        </p>

        <h3>¿Querés cancelar este turno?</h3>

        <p>
          Podés responder hablando o elegir una de las siguientes opciones.
        </p>

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
            className="btn btn-peligro-lleno"
            disabled={ocupado}
            onClick={() => responder("si")}
          >
            {ocupado ? "Cancelando…" : "Sí, cancelar turno"}
          </button>

          <button
            type="button"
            className="btn btn-secundario"
            disabled={ocupado}
            onClick={() => responder("no")}
          >
            No, mantener turno
          </button>
        </div>
      </section>
    </main>
  );
}
