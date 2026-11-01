import { useEffect, useState } from "react";
import { cancelarTurno, obtenerMisTurnos, responderTurno } from "../../api/turnosApi";
import { fechaLarga } from "../../utils/fechas";
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
  "clinica medica": { nombre: "Clínica médica", icono: "🩺" }, cardiologia: { nombre: "Cardiología", icono: "❤️" },
  traumatologia: { nombre: "Traumatología", icono: "🦴" }, oftalmologia: { nombre: "Oftalmología", icono: "👁️" },
  dermatologia: { nombre: "Dermatología", icono: "🧴" }, ginecologia: { nombre: "Ginecología", icono: "🌸" },
  neurologia: { nombre: "Neurología", icono: "🧠" }, odontologia: { nombre: "Odontología", icono: "🦷" },
  urologia: { nombre: "Urología", icono: "💧" },
};

// Un turno es "próximo" si todavía está vigente; el resto va al historial.
const esProximo = (t) => {
  if (t.estado === "solicitado" || t.estado === "propuesto") return true;
  return t.estado === "confirmado" && t.fecha_hora && new Date(t.fecha_hora) >= new Date();
};
const porFecha = (a, b) => (a.fecha_hora || "9999").localeCompare(b.fecha_hora || "9999");

export default function MisTurnos({ onPedir }) {
  const [turnos, setTurnos] = useState([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [pestana, setPestana] = useState("proximos");
  const [confirmando, setConfirmando] = useState(null); // id del turno que se está por cancelar
  const [ocupado, setOcupado] = useState(false);

  const cargar = () =>
    obtenerMisTurnos()
      .then((t) => { setTurnos(t); setError(""); })
      .catch(() => setError("No pudimos cargar tus turnos."))
      .finally(() => setCargando(false));

  useEffect(() => { cargar(); }, []);

  const hacer = async (accion) => {
    if (ocupado) return;
    setOcupado(true);
    try {
      await accion();
      await cargar();
    } catch (e) {
      setError(e.response?.data?.error || "No pudimos completar la acción.");
    } finally {
      setOcupado(false);
      setConfirmando(null);
    }
  };

  const proximos = turnos.filter(esProximo).sort(porFecha);
  const historial = turnos.filter((t) => !esProximo(t)).sort((a, b) => porFecha(b, a));
  const lista = pestana === "proximos" ? proximos : historial;

  return (
    <main className="pantalla turnos">
      <div className="pestanas" role="tablist">
        <button type="button" role="tab" aria-selected={pestana === "proximos"} className={pestana === "proximos" ? "activa" : ""} onClick={() => setPestana("proximos")}>
          Próximos ({proximos.length})
        </button>
        <button type="button" role="tab" aria-selected={pestana === "historial"} className={pestana === "historial" ? "activa" : ""} onClick={() => setPestana("historial")}>
          Historial ({historial.length})
        </button>
      </div>

      {error && <p className="msg-error" role="alert">{error}</p>}
      {cargando && !error && <p>Cargando tus turnos…</p>}
      {!cargando && !error && lista.length === 0 && (
        <div className="vacio">
          <p>{pestana === "proximos" ? "No tenés turnos próximos." : "Todavía no tenés turnos anteriores."}</p>
          {pestana === "proximos" && onPedir && <button type="button" className="btn" onClick={onPedir}>Pedir un turno</button>}
        </div>
      )}

      {lista.map((t) => {
        const esp = ESPECIALIDAD[t.especialidad] || { nombre: t.especialidad, icono: "🩺" };
        return (
          <section key={t.id} className="tarjeta-turno">
            <div className="tarjeta-fila">
              <span className="fila-icono" aria-hidden="true">{esp.icono}</span>
              <div className="tarjeta-datos">
                <h2>{esp.nombre}</h2>
                {t.fecha_hora && <p className="cuando">{fechaLarga(t.fecha_hora)}</p>}
              </div>
            </div>
            <p className={`chip chip-${t.estado}`}>{ETIQUETA[t.estado]}</p>

            {t.estado === "propuesto" && (
              <div className="acciones">
                <button className="btn" disabled={ocupado} onClick={() => hacer(() => responderTurno(t.id, "aceptar"))}>Aceptar</button>
                <button className="btn btn-secundario" disabled={ocupado} onClick={() => hacer(() => responderTurno(t.id, "rechazar"))}>Rechazar</button>
              </div>
            )}

            {esProximo(t) && confirmando !== t.id && (
              <button type="button" className="btn btn-peligro btn-medio" disabled={ocupado} onClick={() => setConfirmando(t.id)}>Cancelar turno</button>
            )}
            {confirmando === t.id && (
              <div role="alertdialog" aria-label="Confirmar cancelación">
                <p className="msg-error">¿Seguro que querés cancelar este turno?</p>
                <div className="acciones">
                  <button type="button" className="btn btn-peligro-lleno" disabled={ocupado} onClick={() => hacer(() => cancelarTurno(t.id))}>Sí, cancelar</button>
                  <button type="button" className="btn btn-secundario" disabled={ocupado} onClick={() => setConfirmando(null)}>No, mantener</button>
                </div>
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}
