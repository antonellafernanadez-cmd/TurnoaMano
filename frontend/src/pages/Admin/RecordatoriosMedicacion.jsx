import { useState } from "react";
import { buscarPacientes, enviarRecordatorioToma, obtenerPlan } from "../../api/medicacionApi";

/** HU3: administrativo envía recordatorios de toma. */
export default function RecordatoriosMedicacion({ onVolver }) {
  const [texto, setTexto] = useState("");
  const [pacientes, setPacientes] = useState(null);
  const [elegido, setElegido] = useState(null);
  const [plan, setPlan] = useState([]);
  const [mensaje, setMensaje] = useState(null);

  const buscar = async (e) => {
    e.preventDefault();
    setElegido(null);
    setMensaje(null);
    try {
      setPacientes(await buscarPacientes(texto));
    } catch (err) {
      setMensaje({ ok: false, texto: err.response?.data?.error || "Error al buscar." });
    }
  };

  const elegir = async (p) => {
    setElegido(p);
    try {
      setPlan(await obtenerPlan(p.id));
    } catch {
      setPlan([]);
    }
  };

  return (
    <main className="pantalla">
      <h1>Recordatorios de medicación</h1>
      <form onSubmit={buscar}>
        <label htmlFor="b">DNI o nombre (mín. 3)</label>
        <input id="b" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <button className="btn" type="submit">Buscar</button>
      </form>
      {mensaje && <p className={mensaje.ok ? "msg-ok" : "msg-error"}>{mensaje.texto}</p>}
      {pacientes && !elegido && pacientes.map((p) => (
        <button key={p.id} type="button" className="btn btn-secundario" onClick={() => elegir(p)}>
          {p.nombre} · DNI {p.identificador}
        </button>
      ))}
      {elegido && (
        <>
          <h2>{elegido.nombre}</h2>
          {plan.length === 0 && <p>Sin plan cargado (el médico debe emitir la receta).</p>}
          {plan.map((t) => (
            <div key={t.id} style={{ marginTop: 12, padding: 12, background: "#fff", borderRadius: 12 }}>
              <strong>{t.medicamento}</strong>
              <p>{t.dosis} · {t.horario}</p>
              <button type="button" className="btn" onClick={() => enviarRecordatorioToma(t.id).then(() => setMensaje({ ok: true, texto: "Recordatorio enviado." })).catch((e) => setMensaje({ ok: false, texto: e.response?.data?.error || "Error" }))}>
                Enviar recordatorio
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-secundario" onClick={() => setElegido(null)}>Otra búsqueda</button>
        </>
      )}
      {onVolver && <button type="button" className="btn btn-secundario" onClick={onVolver}>Volver</button>}
    </main>
  );
}
