
import { useEffect, useRef, useState } from "react";
import {
  cancelarTurno,
  obtenerMisTurnos,
  responderTurno,
} from "../../api/turnosApi";
import { fechaLarga } from "../../utils/fechas";
import { ETIQUETA_ESTADO, fechaLegible } from "../../utils/formato";
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
  const [turnos, setTurnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [turnoCancelar, setTurnoCancelar] = useState(null);

  const reconocimientoRef = useRef(null);
  const iniciadoRef = useRef(false);
  const procesandoRef = useRef(false);

  const volverAlInicio = () => {
    callar();
    reconocimientoRef.current?.abort();
    onInicio?.();
  };

  const cargarTurnos = async () => {
    setCargando(true);
    setError("");

    try {
      const lista = await obtenerMisTurnos();
      const proximos = (Array.isArray(lista) ? lista : [])
        .filter(esProximo)
        .sort(porFecha);

      setTurnos(proximos);
    } catch (e) {
      setError(
        e.response?.data?.error || "No pudimos cargar tus turnos."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTurnos();

    return () => {
      callar();
      reconocimientoRef.current?.abort();
    };
  }, []);

  const responderPropuesta = async (turnoId, respuesta) => {
    if (ocupado) return;

    setOcupado(true);
    setError("");

    try {
      await responderTurno(turnoId, respuesta);
      await cargarTurnos();
    } catch (e) {
      setError(
        e.response?.data?.error ||
        "No pudimos registrar tu respuesta. Intentá nuevamente."
      );
    } finally {
      setOcupado(false);
    }
  };

  const finalizarConVoz = (texto) => {
    hablar(texto, () => {
      setTurnoCancelar(null);
      volverAlInicio();
    });
  };

  const responderCancelacion = async (respuesta) => {
    if (procesandoRef.current || ocupado || !turnoCancelar) return;

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
      await cancelarTurno(turnoCancelar.id);

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
      setError("Tu navegador no permite reconocimiento de voz.");
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

      if (/\b(si|sí|quiero|cancelar|cancelalo|cancelarlo|dale)\b/.test(texto)) {
        responderCancelacion("si");
      } else if (/\b(no|mantener|dejalo|dejarlo|conservar)\b/.test(texto)) {
        responderCancelacion("no");
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

  const iniciarCancelacion = (turno) => {
    setTurnoCancelar(turno);
    setError("");
    iniciadoRef.current = false;
  };

  useEffect(() => {
    if (!turnoCancelar || cargando || iniciadoRef.current) return;

    iniciadoRef.current = true;

    const esp = obtenerEspecialidad(turnoCancelar.especialidad);
    const estado =
      ETIQUETA[turnoCancelar.estado] || turnoCancelar.estado;

    const fecha = turnoCancelar.fecha_hora
      ? fechaLarga(turnoCancelar.fecha_hora)
      : "todavía sin fecha asignada";

    hablar(
      `Tu turno es de ${esp.nombre}, para el ${fecha}. Su estado es: ${estado}. ¿Querés cancelar este turno? Decí sí o no.`,
      escucharRespuesta
    );
  }, [turnoCancelar]);

  if (cargando) {
    return (
      <main className="pantalla turnos">
        <p>Cargando tus turnos...</p>
      </main>
    );
  }

  return (
    <main className="pantalla turnos">
      <h1>Mis turnos</h1>

      {error && (
        <p className="msg-error" role="alert">
          {error}
        </p>
      )}

      {turnoCancelar ? (
        <section className="tarjeta-turno">
          <div className="tarjeta-fila">
            <span className="fila-icono" aria-hidden="true">
              {obtenerEspecialidad(turnoCancelar.especialidad).icono}
            </span>

            <div className="tarjeta-datos">
              <h2>
                {obtenerEspecialidad(turnoCancelar.especialidad).nombre}
              </h2>
              {turnoCancelar.fecha_hora && (
                <p>{fechaLarga(turnoCancelar.fecha_hora)}</p>
              )}
            </div>
          </div>

          <h3>¿Querés cancelar este turno?</h3>
          <p>Podés responder hablando o elegir una opción.</p>

          {escuchando && (
            <p className="msg-ok" role="status">
              Te estoy escuchando...
            </p>
          )}

          <div className="acciones">
            <button
              type="button"
              className="btn btn-peligro-lleno"
              disabled={ocupado}
              onClick={() => responderCancelacion("si")}
            >
              Sí, cancelar turno
            </button>

            <button
              type="button"
              className="btn btn-secundario"
              disabled={ocupado}
              onClick={() => responderCancelacion("no")}
            >
              No, mantener turno
            </button>
          </div>

          <button
            type="button"
            className="btn btn-secundario"
            onClick={() => {
              callar();
              reconocimientoRef.current?.abort();
              setTurnoCancelar(null);
              procesandoRef.current = false;
            }}
          >
            Volver a mis turnos
          </button>
        </section>
      ) : turnos.length === 0 ? (
        <section className="vacio">
          <p>No tenés turnos próximos.</p>

          <button type="button" className="btn" onClick={onPedir}>
            Pedir un turno
          </button>
        </section>
      ) : (
        <div className="lista-turnos">
          {turnos.map((t) => {
            const esp = obtenerEspecialidad(t.especialidad);

            return (
              <section key={t.id} className="turno tarjeta-turno">
                <div className="tarjeta-fila">
                  <span className="fila-icono" aria-hidden="true">
                    {esp.icono}
                  </span>

                  <div className="tarjeta-datos">
                    <h2>{esp.nombre}</h2>

                    {t.fecha_hora && (
                      <p className="cuando">
                        {fechaLegible(t.fecha_hora)}
                      </p>
                    )}
                  </div>
                </div>

                <p className={`chip chip-${t.estado}`}>
                  {ETIQUETA[t.estado] ||
                    ETIQUETA_ESTADO?.[t.estado] ||
                    t.estado}
                </p>

                {t.estado === "propuesto" && (
                  <div className="acciones">
                    <button
                      type="button"
                      className="btn"
                      disabled={ocupado}
                      onClick={() => responderPropuesta(t.id, "aceptar")}
                    >
                      Aceptar propuesta
                    </button>

                    <button
                      type="button"
                      className="btn btn-secundario"
                      disabled={ocupado}
                      onClick={() => responderPropuesta(t.id, "rechazar")}
                    >
                      Rechazar propuesta
                    </button>
                  </div>
                )}

                {t.estado === "confirmado" && (
                  <button
                    type="button"
                    className="btn btn-secundario"
                    onClick={() => iniciarCancelacion(t)}
                  >
                    Cancelar turno
                  </button>
                )}
              </section>
            );
          })}
        </div>
      )}

      <button
        type="button"
        className="btn btn-secundario"
        onClick={volverAlInicio}
      >
        Volver al inicio
      </button>
    </main>
  );
}
