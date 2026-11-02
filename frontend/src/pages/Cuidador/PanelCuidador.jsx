
import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function obtenerLista(datos, clave) {
  if (Array.isArray(datos)) return datos;
  if (Array.isArray(datos?.[clave])) return datos[clave];
  if (Array.isArray(datos?.data)) return datos.data;
  return datos ? [datos] : [];
}

function formatearFecha(fecha) {
  if (!fecha) return "Fecha no disponible";

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) return "Fecha no disponible";

  return valor.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatearHora(fecha) {
  if (!fecha) return "";

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) return "";

  return valor.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function capitalizar(texto = "") {
  return texto
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function textoEstado(estado) {
  const estados = {
    confirmado: "Confirmado",
    pendiente: "Pendiente",
    cancelado: "Cancelado",
    rechazado: "Rechazado",
    completado: "Completado",
  };

  return estados[estado?.toLowerCase()] || capitalizar(estado || "Sin estado");
}

export default function PanelCuidador({ onSalir }) {
  const [turnos, setTurnos] = useState([]);
  const [avisos, setAvisos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    const opciones = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    async function cargarDatos() {
      try {
        const [respuestaTurnos, respuestaAvisos] = await Promise.all([
          fetch(`${API_URL}/api/turnos/cuidador`, opciones),
          fetch(`${API_URL}/api/notificaciones/cuidador`, opciones),
        ]);

        const datosTurnos = await respuestaTurnos.json();
        const datosAvisos = await respuestaAvisos.json();

        if (!respuestaTurnos.ok) {
          throw new Error(
            datosTurnos.error ||
            datosTurnos.mensaje ||
            "No se pudieron consultar los turnos."
          );
        }

        if (!respuestaAvisos.ok) {
          throw new Error(
            datosAvisos.error ||
            datosAvisos.mensaje ||
            "No se pudieron consultar los avisos."
          );
        }

        setTurnos(obtenerLista(datosTurnos, "turnos"));
        setAvisos(obtenerLista(datosAvisos, "notificaciones"));
      } catch (err) {
        setError(err.message || "No se pudo cargar la información.");
      } finally {
        setCargando(false);
      }
    }

    cargarDatos();
  }, []);

  return (
    <main className="pantalla panel-cuidador">
      <h2>Panel del cuidador</h2>

      <p>
        Desde acá podés acompañar al paciente consultando sus
        turnos médicos y recordatorios.
      </p>

      <p>
        <strong>Acceso de consulta:</strong> no podés modificar
        ni cancelar los turnos.
      </p>

      {cargando && (
        <p role="status">Estamos cargando la información...</p>
      )}

      {error && (
        <p role="alert" className="mensaje-error">
          {error}
        </p>
      )}

      {!cargando && !error && (
        <div className="contenedor-columnas-cuidador">

          {/* COLUMNA IZQUIERDA: TURNOS */}
          <section className="seccion-panel">
            <h3>📅 Turnos del paciente</h3>

            {turnos.length === 0 ? (
              <p>No hay turnos registrados.</p>
            ) : (
              <div className="lista-panel">
                {turnos.map((turno, indice) => (
                  <article
                    className="tarjeta-panel"
                    key={turno.id || indice}
                  >
                    <h4>
                      {capitalizar(turno.especialidad)}
                    </h4>

                    <p>
                      <strong>Fecha:</strong>{" "}
                      {formatearFecha(turno.fecha_hora)}
                    </p>

                    <p>
                      <strong>Horario:</strong>{" "}
                      {formatearHora(turno.fecha_hora) || "No informado"}
                    </p>

                    <p>
                      <strong>Estado:</strong>{" "}
                      <span
                        className={`estado-turno estado-${turno.estado}`}
                      >
                        {textoEstado(turno.estado)}
                      </span>
                    </p>

                    {turno.motivo && (
                      <p>
                        <strong>Motivo:</strong> {turno.motivo}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* COLUMNA DERECHA: AVISOS */}
          <section className="seccion-panel">
            <h3>🔔 Avisos y recordatorios</h3>

            {avisos.length === 0 ? (
              <p>No hay avisos para mostrar.</p>
            ) : (
              <div className="lista-panel">
                {avisos.map((aviso, indice) => (
                  <article
                    className="tarjeta-panel"
                    key={aviso.id || indice}
                  >
                    <p>{aviso.mensaje}</p>

                    <p>
                      <strong>Tipo:</strong>{" "}
                      {capitalizar(aviso.tipo)}
                    </p>

                    <p>
                      <strong>Fecha:</strong>{" "}
                      {formatearFecha(aviso.creado_en)}
                    </p>

                    <p>
                      <strong>Estado:</strong>{" "}
                      {aviso.leida ? "Leído" : "Pendiente de leer"}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

        </div>
      )}

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
