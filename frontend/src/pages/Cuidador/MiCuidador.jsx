
import { useCallback, useEffect, useRef, useState } from "react";
import {
  hablar,
  callar,
  normalizarVoz,
} from "../../utils/voz";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function MiCuidador({ onInicio }) {
  const [etapa, setEtapa] = useState("inicio");
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [escuchando, setEscuchando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [vozDisponible, setVozDisponible] = useState(true);

  const reconocimientoRef = useRef(null);
  const cancelarRef = useRef(false);
  const escucharRef = useRef(null);

  const detenerReconocimiento = useCallback(() => {
    if (reconocimientoRef.current) {
      reconocimientoRef.current.abort();
      reconocimientoRef.current = null;
    }

    setEscuchando(false);
  }, []);

  const escuchar = useCallback((alRecibirTexto) => {
    const Reconocimiento =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!Reconocimiento) {
      setVozDisponible(false);
      setMensaje(
        "Tu navegador no permite reconocer la voz. Podés escribir el nombre y continuar con los botones."
      );
      return;
    }

    detenerReconocimiento();

    const reconocimiento = new Reconocimiento();
    reconocimientoRef.current = reconocimiento;

    reconocimiento.lang = "es-AR";
    reconocimiento.continuous = false;
    reconocimiento.interimResults = false;

    let transcripcion = "";

    reconocimiento.onstart = () => {
      setEscuchando(true);
      setMensaje("Te estoy escuchando...");
    };

    reconocimiento.onresult = (evento) => {
      transcripcion = evento.results[0][0].transcript.trim();
    };

    reconocimiento.onerror = (evento) => {
      if (evento.error === "not-allowed") {
        setVozDisponible(false);
        setMensaje(
          "Necesitamos permiso para usar el micrófono. También podés continuar escribiendo."
        );
      }
    };

    reconocimiento.onend = () => {
      reconocimientoRef.current = null;
      setEscuchando(false);

      if (cancelarRef.current) return;

      if (transcripcion) {
        alRecibirTexto(transcripcion);
      } else {
        setMensaje("No te escuché. Podés intentarlo nuevamente.");
      }
    };

    try {
      reconocimiento.start();
    } catch {
      reconocimientoRef.current = null;
      setEscuchando(false);
      setMensaje("No pudimos activar el micrófono. Intentá nuevamente.");
    }
  }, [detenerReconocimiento]);

  escucharRef.current = escuchar;

  const pedirNombre = useCallback(() => {
    setEtapa("nombre");
    setError("");
    setMensaje("Decime el nombre y apellido de tu persona de confianza.");

    hablar(
      "Vamos a vincular a una persona de confianza. Decime su nombre y apellido.",
      () => escucharRef.current?.(procesarNombreRef.current)
    );
  }, []);

  const procesarNombre = (texto) => {
    const nombreIngresado = texto.trim();
    const comando = normalizarVoz(nombreIngresado);

    if (
      comando.includes("cancelar") ||
      comando.includes("salir")
    ) {
      cancelarProceso();
      return;
    }

    if (nombreIngresado.length < 2) {
      hablar(
        "No llegué a reconocer el nombre. Por favor, decilo nuevamente.",
        () => escucharRef.current?.(procesarNombreRef.current)
      );
      return;
    }

    setNombre(nombreIngresado);
    setEtapa("confirmacion");
    setMensaje(`Escuché el nombre: ${nombreIngresado}.`);

    hablar(
      `Escuché ${nombreIngresado}. ¿Querés vincular a esta persona? Decí sí para confirmar o no para corregir el nombre.`,
      () => escucharRef.current?.(procesarConfirmacionRef.current)
    );
  };

  const procesarNombreRef = useRef(procesarNombre);
  procesarNombreRef.current = procesarNombre;

  const procesarConfirmacion = (texto) => {
    const respuesta = normalizarVoz(texto);

    if (
      /\b(si|sí|correcto|confirmo|confirmar|dale)\b/.test(respuesta)
    ) {
      guardarCuidador();
      return;
    }

    if (
      /\b(no|cambiar|corregir|modificar)\b/.test(respuesta)
    ) {
      setNombre("");
      pedirNombre();
      return;
    }

    if (
      respuesta.includes("cancelar") ||
      respuesta.includes("salir")
    ) {
      cancelarProceso();
      return;
    }

    hablar(
      "No entendí tu respuesta. Decí sí para confirmar, no para corregir el nombre o cancelar para salir.",
      () => escucharRef.current?.(procesarConfirmacionRef.current)
    );
  };

  const procesarConfirmacionRef = useRef(procesarConfirmacion);
  procesarConfirmacionRef.current = procesarConfirmacion;

  const guardarCuidador = async () => {
    detenerReconocimiento();
    setEtapa("guardando");
    setCargando(true);
    setError("");

    hablar("Estamos guardando los datos. Por favor, esperá un momento.");

    try {
      const respuesta = await fetch(
        `${API_URL}/api/auth/mi-cuidador`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            nombre: nombre.trim(),
          }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error ||
          datos.mensaje ||
          "No se pudo guardar el cuidador."
        );
      }

      if (!datos.codigo) {
        throw new Error("El servidor no devolvió el código de acceso.");
      }

      setCodigo(String(datos.codigo));
      setEtapa("listo");
      setMensaje("La persona fue vinculada correctamente.");

      const codigoHablado = String(datos.codigo)
        .split("")
        .join(", ");

      hablar(
        `¡Listo! ${nombre} fue vinculado correctamente. El código de acceso es: ${codigoHablado}. Compartí este código únicamente con esa persona. También podés verlo escrito en la pantalla.`
      );
    } catch (err) {
      setEtapa("error");
      setError(err.message);
      hablar(
        `No pudimos completar la vinculación. ${err.message}`
      );
    } finally {
      setCargando(false);
    }
  };

  const repetir = () => {
    if (etapa === "nombre") {
      pedirNombre();
    } else if (etapa === "confirmacion") {
      hablar(
        `El nombre ingresado es ${nombre}. ¿Querés confirmar? Decí sí o no.`,
        () => escucharRef.current?.(procesarConfirmacionRef.current)
      );
    } else if (etapa === "listo") {
      const codigoHablado = codigo.split("").join(", ");
      hablar(`Tu código de acceso es: ${codigoHablado}.`);
    } else {
      hablar(
        "Estamos en la sección para vincular a una persona de confianza."
      );
    }
  };

  const cancelarProceso = () => {
    detenerReconocimiento();
    callar();

    setNombre("");
    setCodigo("");
    setError("");
    setEtapa("inicio");
    setMensaje("La operación fue cancelada.");
  };

  useEffect(() => {
    cancelarRef.current = false;

    const temporizador = setTimeout(() => {
      pedirNombre();
    }, 400);

    return () => {
      clearTimeout(temporizador);
      cancelarRef.current = true;
      reconocimientoRef.current?.abort();
      reconocimientoRef.current = null;
      callar();
    };
  }, [pedirNombre]);

  return (
    <main className="pantalla">
      <h2>Mi cuidador</h2>

      <p>
        Podés utilizar tu voz para vincular a una persona de confianza.
      </p>

      <section aria-live="polite">
        <p>
          <strong>Asistente de voz</strong>
        </p>

        <p>
          {escuchando
            ? "Te estoy escuchando..."
            : mensaje || "Preparando el asistente..."}
        </p>
      </section>

      {etapa === "nombre" && (
        <section>
          <label htmlFor="nombreCuidador">
            Nombre y apellido del cuidador
          </label>

          <input
            id="nombreCuidador"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre y apellido"
            maxLength={100}
          />

          {!vozDisponible && (
            <button
              type="button"
              className="btn btn-iniciar"
              onClick={() => {
                if (nombre.trim().length >= 2) {
                  procesarNombre(nombre);
                } else {
                  setError("Ingresá un nombre válido.");
                }
              }}
            >
              Continuar
            </button>
          )}

          {vozDisponible && (
            <button
              type="button"
              className="btn btn-iniciar"
              onClick={pedirNombre}
            >
              🎤 Decir nombre
            </button>
          )}
        </section>
      )}

      {etapa === "confirmacion" && (
        <section>
          <h3>Confirmar nombre</h3>

          <p>
            ¿Querés vincular a <strong>{nombre}</strong>?
          </p>

          <button
            type="button"
            className="btn btn-iniciar"
            onClick={guardarCuidador}
            disabled={cargando}
          >
            Sí, confirmar
          </button>

          <button
            type="button"
            className="btn btn-secundario"
            onClick={pedirNombre}
          >
            No, corregir nombre
          </button>
        </section>
      )}

      {etapa === "guardando" && (
        <p role="status">
          Estamos guardando los datos. Esperá un momento.
        </p>
      )}

      {etapa === "listo" && (
        <section>
          <h3>¡Cuidador vinculado!</h3>

          <p>
            Nombre: <strong>{nombre}</strong>
          </p>

          <p>Este es el código que tenés que compartir:</p>

          <p
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              letterSpacing: "0.4rem",
              textAlign: "center",
            }}
          >
            {codigo}
          </p>

          <p>
            El cuidador debe ingresar este código y tu DNI desde
            la opción «Soy cuidador».
          </p>

          <button
            type="button"
            className="btn btn-iniciar"
            onClick={repetir}
          >
            🔊 Escuchar código nuevamente
          </button>
        </section>
      )}

      {etapa === "error" && (
        <section>
          <p role="alert">{error}</p>

          <button
            type="button"
            className="btn btn-iniciar"
            onClick={pedirNombre}
          >
            Intentar nuevamente
          </button>
        </section>
      )}

      {error && etapa !== "error" && (
        <p role="alert">{error}</p>
      )}

      <button
        type="button"
        className="btn btn-secundario"
        onClick={repetir}
      >
        🔊 Repetir instrucciones
      </button>

      <button
        type="button"
        className="btn btn-secundario"
        onClick={cancelarProceso}
      >
        Cancelar
      </button>

      <button
        type="button"
        className="btn btn-secundario"
        onClick={onInicio}
      >
        Volver al inicio
      </button>
    </main>
  );
}
