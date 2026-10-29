import { useRef, useState } from "react";
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
  const [ocupado, setOcupado] = useState(false);
  const enCurso = useRef(false); // evita que un doble toque (o la voz) mande el pedido dos veces

  const enviar = async (datos) => {
    if (enCurso.current) return;
    enCurso.current = true;
    setOcupado(true);
    try {
      await solicitarTurno(datos);
      setMensaje({ ok: true, texto: "Pedido enviado. Te avisamos cuando tengas fecha." });
      setEspecialidad("");
      setMotivo("");
      } catch (e) {
      const causa = e.response?.data?.error || "No pudimos enviar el pedido.";
      // En el pedido por voz, mostramos qué frase escuchó el navegador para entender qué pasó.
      const escuchado = datos.transcripcion ? ` (Escuchamos: “${datos.transcripcion}”)` : "";
      setMensaje({ ok: false, texto: causa + escuchado });
    } finally {
      enCurso.current = false;
      setOcupado(false);
    }
  };

  const MENSAJES_VOZ = {
    "not-allowed": "El navegador no tiene permiso para usar el micrófono. Tocá el candado de la barra de direcciones y permitilo.",
    "service-not-allowed": "El navegador no tiene permiso para usar el micrófono. Tocá el candado de la barra de direcciones y permitilo.",
    "no-speech": "No escuchamos nada. Probá de nuevo y hablá cerca del micrófono.",
    "audio-capture": "No encontramos un micrófono conectado.",
    "network": "El reconocimiento de voz necesita internet. Revisá tu conexión.",
  };

  const pedirPorVoz = () => {
    if (enCurso.current || ocupado) return;
    const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Reconocimiento) {
      setMensaje({ ok: false, texto: "Este navegador no permite pedir por voz. Abrí la app en Chrome o Edge, o usá el formulario." });
      return;
    }
    const r = new Reconocimiento();
    r.lang = "es-AR";
    r.interimResults = false;
    r.maxAlternatives = 1;
    let atendido = false; // el navegador puede avisar el resultado más de una vez
    r.onresult = (ev) => {
      if (atendido) return;
      atendido = true;
      const frase = ev.results[0][0].transcript;
      setMensaje({ ok: true, texto: `Escuchamos: “${frase}”. Enviando…` });
      enviar({ modo: "voz", transcripcion: frase });
    };
    r.onerror = (ev) =>
      setMensaje({ ok: false, texto: MENSAJES_VOZ[ev.error] || "No pudimos escucharte. Probá de nuevo." });
    setMensaje({ ok: true, texto: "Te escucho. Decí, por ejemplo: “turno con cardiología”." });
    try {
      r.start();
    } catch {
      setMensaje({ ok: false, texto: "No pudimos activar el micrófono. Probá de nuevo." });
    }
  };

  return (
    <main className="turnos">
      <h1>Pedir turno</h1>

      <button type="button" className="btn btn-voz" onClick={pedirPorVoz} disabled={ocupado}>
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
        disabled={!especialidad || ocupado}
        onClick={() => enviar({ modo: "manual", especialidad, motivo })}
      >
        Enviar pedido
      </button>

      {mensaje && <p role="status" className={mensaje.ok ? "msg-ok" : "msg-error"}>{mensaje.texto}</p>}
    </main>
  );
}
