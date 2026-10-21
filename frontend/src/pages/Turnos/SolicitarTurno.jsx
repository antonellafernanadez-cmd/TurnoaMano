import { useState } from "react";
import { solicitarTurno } from "../../api/turnosApi";
import "./Turnos.css";

const ESPECIALIDADES = [
  "Clínica médica", "Cardiología", "Traumatología", "Oftalmología",
  "Dermatología", "Ginecología", "Neurología", "Odontología",
];

export default function SolicitarTurno() {
  const [especialidad, setEspecialidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [mensaje, setMensaje] = useState(null);

  const enviar = async (datos) => {
    try {
      await solicitarTurno(datos);
      setMensaje({ ok: true, texto: "Pedido enviado. Te avisamos cuando tengas fecha." });
      setEspecialidad("");
      setMotivo("");
    } catch (e) {
      setMensaje({ ok: false, texto: e.response?.data?.error || "No pudimos enviar el pedido." });
    }
  };

  const pedirPorVoz = () => {
    const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Reconocimiento) {
      setMensaje({ ok: false, texto: "Tu navegador no permite pedir por voz. Usá el formulario." });
      return;
    }
    const r = new Reconocimiento();
    r.lang = "es-AR";
    r.onresult = (ev) => enviar({ modo: "voz", transcripcion: ev.results[0][0].transcript });
    r.onerror = () => setMensaje({ ok: false, texto: "No pudimos escucharte. Probá de nuevo." });
    setMensaje({ ok: true, texto: "Te escucho. Decí, por ejemplo: “turno con cardiología”." });
    r.start();
  };

  return (
    <main className="turnos">
      <h1>Pedir turno</h1>

      <button type="button" className="btn btn-voz" onClick={pedirPorVoz}>
        Pedir por voz
      </button>

      <p className="separador">o completá los datos</p>

      <label htmlFor="esp">Especialidad</label>
      <select id="esp" value={especialidad} onChange={(e) => setEspecialidad(e.target.value)}>
        <option value="">Elegí una especialidad</option>
        {ESPECIALIDADES.map((e) => <option key={e} value={e}>{e}</option>)}
      </select>

      <label htmlFor="motivo">Motivo (opcional)</label>
      <textarea id="motivo" maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} />

      <button
        type="button"
        className="btn"
        disabled={!especialidad}
        onClick={() => enviar({ modo: "manual", especialidad, motivo })}
      >
        Enviar pedido
      </button>

      {mensaje && <p role="status" className={mensaje.ok ? "msg-ok" : "msg-error"}>{mensaje.texto}</p>}
    </main>
  );
}
