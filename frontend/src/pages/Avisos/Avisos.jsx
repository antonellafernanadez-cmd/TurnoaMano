import { useEffect, useState } from "react";
import { marcarAvisoLeido, obtenerAvisos } from "../../api/turnosApi";
import "./Avisos.css";

const ICONO = { fecha_propuesta: "📅", recordatorio: "🔔", cambio: "⚠️" };
const TITULO = { fecha_propuesta: "Fecha propuesta", recordatorio: "Recordatorio", cambio: "Cambio en tu turno" };

const cuando = (iso) =>
  new Date(iso + "Z").toLocaleString("es-AR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false });

export default function Avisos({ onCambio }) {
  const [avisos, setAvisos] = useState([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  const cargar = () =>
    obtenerAvisos()
      .then((a) => { setAvisos(a); setError(""); })
      .catch(() => setError("No pudimos cargar tus avisos."))
      .finally(() => setCargando(false));

  useEffect(() => { cargar(); }, []);

  const marcar = async (id) => {
    try {
      await marcarAvisoLeido(id);
      await cargar();
      onCambio?.();
    } catch {
      setError("No pudimos marcar el aviso como leído.");
    }
  };

  return (
    <main className="pantalla">
      <p className="avisos-intro">Acá ves los avisos sobre tus turnos.</p>
      {error && <p className="msg-error" role="alert">{error}</p>}
      {cargando && !error && <p>Cargando tus avisos…</p>}
      {!cargando && !error && avisos.length === 0 && <p className="avisos-vacio">No tenés avisos por ahora.</p>}

      {avisos.map((a) => (
        <article key={a.id} className={`aviso${a.leida ? " leido" : ""}`}>
          <span className="aviso-icono" aria-hidden="true">{ICONO[a.tipo] || "🔔"}</span>
          <div className="aviso-cuerpo">
            <h2>{TITULO[a.tipo] || "Aviso"}{!a.leida && <span className="nuevo">Nuevo</span>}</h2>
            <p>{a.mensaje}</p>
            <p className="aviso-fecha">{cuando(a.creado_en)}</p>
            {!a.leida && <button type="button" className="btn btn-secundario btn-medio" onClick={() => marcar(a.id)}>Marcar como leído</button>}
          </div>
        </article>
      ))}
    </main>
  );
}
