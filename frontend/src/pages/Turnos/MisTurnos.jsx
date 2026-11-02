import { useEffect, useState } from "react";
import { obtenerMisTurnos, responderTurno } from "../../api/turnosApi";
import { ETIQUETA_ESTADO, fechaLegible } from "../../utils/formato";
import "./Turnos.css";

export default function MisTurnos() {
  const [turnos, setTurnos] = useState([]);
  const [error, setError] = useState("");

  const cargar = () =>
    obtenerMisTurnos().then(setTurnos).catch(() => setError("No pudimos cargar tus turnos."));

  useEffect(() => { cargar(); }, []);

  const responder = (id, respuesta) => responderTurno(id, respuesta).then(cargar);

  return (
    <main className="turnos">
      <h1>Mis turnos</h1>
      {error && <p className="msg-error">{error}</p>}
      {!error && turnos.length === 0 && <p>Todavía no pediste ningún turno.</p>}

      {turnos.map((t) => (
        <section key={t.id} className="turno">
          <h2>{t.especialidad}</h2>
          <p className={`estado estado-${t.estado}`}>
            {t.estado === "propuesto" ? "Tenés que responder" : ETIQUETA_ESTADO[t.estado]}
          </p>
          {t.fecha_hora && <p>{fechaLegible(t.fecha_hora)}</p>}
          {t.estado === "propuesto" && (
            <div className="acciones">
              <button className="btn" onClick={() => responder(t.id, "aceptar")}>Aceptar</button>
              <button className="btn btn-secundario" onClick={() => responder(t.id, "rechazar")}>Rechazar</button>
            </div>
          )}
        </section>
      ))}
    </main>
  );
}
