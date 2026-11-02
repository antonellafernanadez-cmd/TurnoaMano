import { useEffect, useState } from "react";
import { marcarLeida, misNotificaciones } from "../../api/notificacionesApi";
import { fechaCreacion } from "../../utils/formato";
import "../turnos/Turnos.css";

export default function Notificaciones({ onCambio }) {
  const [avisos, setAvisos] = useState([]);
  const [error, setError] = useState("");

  const cargar = () =>
    misNotificaciones().then(setAvisos).catch(() => setError("No pudimos cargar tus avisos."));

  useEffect(() => { cargar(); }, []);

  const marcar = (id) =>
    marcarLeida(id).then(() => { cargar(); onCambio?.(); }).catch(() => setError("No pudimos marcar el aviso."));

  return (
    <main className="turnos">
      <h1>Avisos</h1>
      {error && <p className="msg-error">{error}</p>}
      {!error && avisos.length === 0 && <p>No tenés avisos.</p>}

      {avisos.map((a) => (
        <section key={a.id} className={`turno ${a.leida ? "" : "aviso-nuevo"}`}>
          <p className="aviso-fecha">{a.leida ? "Leído" : "Nuevo"} · {fechaCreacion(a.creado_en)}</p>
          <p className="aviso-texto">{a.mensaje}</p>
          {!a.leida && (
            <button type="button" className="btn btn-secundario" onClick={() => marcar(a.id)}>
              Marcar como leído
            </button>
          )}
        </section>
      ))}
    </main>
  );
}
