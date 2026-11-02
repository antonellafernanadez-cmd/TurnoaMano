import { useState } from "react";
import { buscarPacientes, enviarRecordatorioToma, obtenerPlan } from "../../api/medicacionApi";
import "../turnos/Turnos.css";

// Pantalla del administrativo (historia 3): busca un paciente, ve su plan de medicación
// y le envía el recordatorio de cada toma.
export default function GestionMedicacion() {
  const [texto, setTexto] = useState("");
  const [pacientes, setPacientes] = useState(null);   // null = todavía no buscó
  const [elegido, setElegido] = useState(null);
  const [plan, setPlan] = useState([]);
  const [mensaje, setMensaje] = useState(null);

  const error = (e, porDefecto) => setMensaje({ ok: false, texto: e.response?.data?.error || porDefecto });

  const buscar = async (ev) => {
    ev.preventDefault();
    setMensaje(null);
    setElegido(null);
    if (texto.trim().length < 3) {
      setMensaje({ ok: false, texto: "Escribí al menos 3 caracteres del DNI o del nombre." });
      return;
    }
    try {
      setPacientes(await buscarPacientes(texto.trim()));
    } catch (e) {
      error(e, "No pudimos buscar pacientes.");
    }
  };

  const elegir = async (paciente) => {
    setMensaje(null);
    try {
      setPlan(await obtenerPlan(paciente.id));
      setElegido(paciente);
    } catch (e) {
      error(e, "No pudimos cargar el plan de medicación.");
    }
  };

  const enviar = async (toma) => {
    try {
      await enviarRecordatorioToma(toma.id);
      setMensaje({ ok: true, texto: `Recordatorio de ${toma.medicamento} enviado.` });
    } catch (e) {
      error(e, "No pudimos enviar el recordatorio.");
    }
  };

  return (
    <main className="turnos ancho">
      <h1>Recordatorio de medicación</h1>

      <form onSubmit={buscar}>
        <label htmlFor="buscar">Buscar paciente por DNI o nombre</label>
        <input id="buscar" type="text" maxLength={40} value={texto} onChange={(e) => setTexto(e.target.value)} />
        <button type="submit" className="btn">Buscar</button>
      </form>

      {mensaje && <p role="status" className={mensaje.ok ? "msg-ok" : "msg-error"}>{mensaje.texto}</p>}

      {pacientes && pacientes.length === 0 && <p>No encontramos pacientes con esa búsqueda.</p>}
      {pacientes && pacientes.length > 0 && !elegido && (
        <div className="grilla">
          {pacientes.map((p) => (
            <section key={p.id} className="turno">
              <h2>{p.nombre}</h2>
              <p>DNI {p.identificador}</p>
              <button type="button" className="btn btn-secundario" onClick={() => elegir(p)}>
                Ver plan de medicación
              </button>
            </section>
          ))}
        </div>
      )}

      {elegido && (
        <>
          <h2>Plan de {elegido.nombre}</h2>
          {plan.length === 0 && <p>Este paciente no tiene plan de medicación cargado.</p>}
          <div className="grilla">
            {plan.map((t) => (
              <section key={t.id} className="turno">
                <h2>{t.medicamento}</h2>
                <p>{t.dosis} · {t.horario} hs</p>
                <button type="button" className="btn" onClick={() => enviar(t)}>Enviar recordatorio</button>
              </section>
            ))}
          </div>
          <button type="button" className="btn btn-secundario" onClick={() => setElegido(null)}>
            Buscar otro paciente
          </button>
        </>
      )}
    </main>
  );
}
