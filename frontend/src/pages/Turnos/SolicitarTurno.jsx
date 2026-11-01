import { useEffect, useRef, useState } from "react";
import { disponibilidadTurnos, especialidadPorVoz, solicitarTurno } from "../../api/turnosApi";
import { callar, hablar } from "../../utils/voz";
import { fechaHablada, fechaLarga, partesDia } from "../../utils/fechas";
import "./Turnos.css";

const ESPECIALIDADES = [
  { clave: "clinica medica", nombre: "Clínica médica", icono: "🩺" },
  { clave: "cardiologia", nombre: "Cardiología", icono: "❤️" },
  { clave: "oftalmologia", nombre: "Oftalmología", icono: "👁️" },
  { clave: "odontologia", nombre: "Odontología", icono: "🦷" },
  { clave: "traumatologia", nombre: "Traumatología", icono: "🦴" },
  { clave: "ginecologia", nombre: "Ginecología", icono: "🌸" },
  { clave: "dermatologia", nombre: "Dermatología", icono: "🧴" },
  { clave: "neurologia", nombre: "Neurología", icono: "🧠" },
  { clave: "urologia", nombre: "Urología", icono: "💧" },
];
const nombreEsp = (clave) => ESPECIALIDADES.find((e) => e.clave === clave)?.nombre || clave;

const MENSAJES_VOZ = {
  "not-allowed": "El navegador no tiene permiso para usar el micrófono. Tocá el candado de la barra de direcciones y permitilo.",
  "service-not-allowed": "El navegador no tiene permiso para usar el micrófono. Tocá el candado de la barra de direcciones y permitilo.",
  "no-speech": "No escuchamos nada. Probá de nuevo y hablá cerca del micrófono.",
  "audio-capture": "No encontramos un micrófono conectado.",
  "network": "El reconocimiento de voz necesita internet. Revisá tu conexión.",
};

// Instrucciones de cada paso: se muestran escritas y se pueden escuchar.
const GUIA = {
  especialidad:
    "Paso uno de dos. Elegí la especialidad: tocá una de la lista y después el botón siguiente. O tocá el botón pedir por voz y decí, por ejemplo: quiero un turno con cardiología.",
  horario: (esp, porVoz) =>
    `${porVoz ? `Entendí ${esp}. ` : ""}Paso dos de dos. Tocá el día que querés, después el horario, y por último el botón confirmar turno.`,
};

export default function SolicitarTurno({ onVerTurnos, onInicio }) {
  const [paso, setPaso] = useState("especialidad"); // especialidad | horario | listo
  const [especialidad, setEspecialidad] = useState("");
  const [modo, setModo] = useState("manual");
  const [frase, setFrase] = useState("");
  const [dias, setDias] = useState([]);
  const [dia, setDia] = useState("");
  const [hora, setHora] = useState("");
  const [motivo, setMotivo] = useState("");
  const [turno, setTurno] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [guiada, setGuiada] = useState(false); // la guía hablada se activa al tocar "Escuchar" o "Pedir por voz"
  const enCurso = useRef(false); // evita que un doble toque mande el pedido dos veces

  const textoGuia = () => {
    if (paso === "especialidad") return GUIA.especialidad;
    if (paso === "horario") return GUIA.horario(nombreEsp(especialidad), modo === "voz");
    if (paso === "listo" && turno) return `Listo. Tu turno de ${nombreEsp(turno.especialidad)} quedó confirmado para el ${fechaHablada(turno.fecha_hora)}.`;
    return "";
  };

  // Con la guía activada, cada paso se lee en voz alta al aparecer.
  useEffect(() => {
    if (guiada) hablar(textoGuia());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso, guiada]);
  useEffect(() => callar, []);

  const protegido = async (accion) => {
    if (enCurso.current) return;
    enCurso.current = true;
    setOcupado(true);
    try {
      await accion();
    } finally {
      enCurso.current = false;
      setOcupado(false);
    }
  };

  const irAHorarios = (clave, deModo, fraseDicha = "") =>
    protegido(async () => {
      try {
        const datos = await disponibilidadTurnos(clave);
        setEspecialidad(clave);
        setModo(deModo);
        setFrase(fraseDicha);
        setDias(datos.dias);
        setDia("");
        setHora("");
        setMensaje(null);
        setPaso("horario");
      } catch (e) {
        setMensaje({ ok: false, texto: e.response?.data?.error || "No pudimos ver los horarios. Probá de nuevo." });
      }
    });

  const pedirPorVoz = () => {
    if (enCurso.current || ocupado || escuchando) return;
    const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Reconocimiento) {
      setMensaje({ ok: false, texto: "Este navegador no permite pedir por voz. Abrí la app en Chrome o Edge, o elegí la especialidad en la lista." });
      return;
    }
    setGuiada(true);
    setMensaje({ ok: true, texto: "Escuchá la indicación y después hablá." });

    const escuchar = () => {
      const r = new Reconocimiento();
      r.lang = "es-AR";
      r.interimResults = false;
      r.maxAlternatives = 1;
      let atendido = false; // el navegador puede avisar el resultado más de una vez
      r.onresult = async (ev) => {
        if (atendido) return;
        atendido = true;
        const dicho = ev.results[0][0].transcript;
        setMensaje({ ok: true, texto: `Escuchamos: “${dicho}”.` });
        try {
          const { especialidad: clave } = await especialidadPorVoz(dicho);
          await irAHorarios(clave, "voz", dicho);
        } catch (e) {
          const causa = e.response?.data?.error || "No pudimos entender el pedido.";
          setMensaje({ ok: false, texto: `${causa} (Escuchamos: “${dicho}”)` });
          hablar("No te entendí. Probá de nuevo, o tocá la especialidad en la lista.");
        }
      };
      r.onerror = (ev) => setMensaje({ ok: false, texto: MENSAJES_VOZ[ev.error] || "No pudimos escucharte. Probá de nuevo." });
      r.onend = () => setEscuchando(false);
      try {
        setEscuchando(true);
        setMensaje({ ok: true, texto: "Te escucho… Decí, por ejemplo: “quiero un turno con cardiología”." });
        r.start();
      } catch {
        setEscuchando(false);
        setMensaje({ ok: false, texto: "No pudimos activar el micrófono. Probá de nuevo." });
      }
    };
    // Primero la voz explica qué decir; cuando termina de hablar, se abre el micrófono.
    hablar("Después del aviso, decí por ejemplo: quiero un turno con cardiología.", escuchar);
  };

  const confirmar = () =>
    protegido(async () => {
      try {
        const datos = {
          modo,
          especialidad,
          motivo: motivo.trim(),
          fecha_hora: `${dia}T${hora}`,
          ...(modo === "voz" ? { transcripcion: frase } : {}),
        };
        setTurno(await solicitarTurno(datos));
        setMensaje(null);
        setPaso("listo");
      } catch (e) {
        const causa = e.response?.data?.error || "No pudimos confirmar el turno. Probá de nuevo.";
        setMensaje({ ok: false, texto: causa });
        if (e.response?.status === 409 && /tomado/i.test(causa)) {
          // Alguien ocupó ese horario: se actualiza la lista y se elige otro.
          try {
            setDias((await disponibilidadTurnos(especialidad)).dias);
          } catch { /* se mantiene la lista anterior */ }
          setHora("");
        }
      }
    });

  const empezarDeNuevo = () => {
    setPaso("especialidad");
    setEspecialidad("");
    setModo("manual");
    setFrase("");
    setDias([]);
    setDia("");
    setHora("");
    setMotivo("");
    setTurno(null);
    setMensaje(null);
  };

  const diaActual = dias.find((d) => d.fecha === dia);
  const numeroPaso = paso === "especialidad" ? 1 : 2;

  if (paso === "listo" && turno) {
    return (
      <main className="pantalla turnos">
        <section className="listo" aria-live="polite">
          <p className="check" aria-hidden="true">✓</p>
          <h2>¡Listo!</h2>
          <p className="listo-texto">Tu turno ha sido confirmado.</p>
          <div className="resumen">
            <p><span aria-hidden="true">🩺</span><strong>{nombreEsp(turno.especialidad)}</strong></p>
            <p><span aria-hidden="true">📅</span><strong>{fechaLarga(turno.fecha_hora)}</strong></p>
          </div>
          <button type="button" className="btn" onClick={onVerTurnos}>Ver mis turnos</button>
          <button type="button" className="btn btn-secundario" onClick={onInicio}>Volver al inicio</button>
          <button type="button" className="link link-centro" onClick={empezarDeNuevo}>Pedir otro turno</button>
        </section>
      </main>
    );
  }

  return (
    <main className="pantalla turnos">
      <div className="guia" role="region" aria-label="Guía del paso">
        <p className="paso-numero">Paso {numeroPaso} de 2</p>
        <p className="guia-texto">{textoGuia()}</p>
        <div className="guia-botones">
          <button type="button" className="btn-chico" onClick={() => { setGuiada(true); hablar(textoGuia()); }}>🔊 Escuchar</button>
          {guiada && <button type="button" className="btn-chico" onClick={() => { setGuiada(false); callar(); }}>🔇 Apagar voz</button>}
        </div>
      </div>

      {paso === "especialidad" && (
        <>
          <button type="button" className={`banda banda-verde${escuchando ? " escuchando" : ""}`} onClick={pedirPorVoz} disabled={ocupado || escuchando}>
            <span className="banda-icono" aria-hidden="true">🎤</span>
            <span>{escuchando ? "Te estamos escuchando…" : "Pedir por voz"}</span>
          </button>

          <h2 className="subtitulo">Elegí la especialidad</h2>
          <div className="lista-esp" role="radiogroup" aria-label="Especialidades">
            {ESPECIALIDADES.map((e) => (
              <button key={e.clave} type="button" role="radio" aria-checked={especialidad === e.clave}
                className={`fila-esp${especialidad === e.clave ? " activa" : ""}`} disabled={ocupado || escuchando}
                onClick={() => setEspecialidad(e.clave)}>
                <span className="fila-icono" aria-hidden="true">{e.icono}</span>
                <span className="fila-nombre">{e.nombre}</span>
                <span className="radio" aria-hidden="true" />
              </button>
            ))}
          </div>
          <button type="button" className="btn" disabled={!especialidad || ocupado || escuchando} onClick={() => irAHorarios(especialidad, "manual")}>
            Siguiente →
          </button>
        </>
      )}

      {paso === "horario" && (
        <>
          <p className="elegido"><span aria-hidden="true">{ESPECIALIDADES.find((e) => e.clave === especialidad)?.icono}</span> {nombreEsp(especialidad)}</p>

          <h2 className="subtitulo"><span aria-hidden="true">📅</span> Elegí la fecha</h2>
          <div className="dias" role="radiogroup" aria-label="Días disponibles">
            {dias.map((d) => {
              const p = partesDia(d.fecha);
              return (
                <button key={d.fecha} type="button" role="radio" aria-checked={dia === d.fecha}
                  className={`opcion dia${dia === d.fecha ? " activa" : ""}`} onClick={() => { setDia(d.fecha); setHora(""); }}>
                  <span>{p.semana}</span><strong>{p.numero}</strong><span>{p.mes}</span>
                </button>
              );
            })}
          </div>

          {diaActual && (
            <>
              <h2 className="subtitulo"><span aria-hidden="true">🕘</span> Horarios disponibles</h2>
              <div className="horas" role="radiogroup" aria-label="Horarios">
                {diaActual.horarios.map((h) => (
                  <button key={h.hora} type="button" role="radio" aria-checked={hora === h.hora} disabled={!h.libre}
                    className={`opcion hora${hora === h.hora ? " activa" : ""}`} onClick={() => setHora(h.hora)}>
                    {h.hora}
                    {!h.libre && <span className="ocupado-texto">Ocupado</span>}
                  </button>
                ))}
              </div>
            </>
          )}

          <label htmlFor="motivo" className="etiqueta">Motivo <span className="opcional">(opcional)</span></label>
          <textarea id="motivo" maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} />

          <button type="button" className="btn" disabled={!dia || !hora || ocupado} onClick={confirmar}>
            {ocupado ? "Confirmando…" : "Confirmar turno →"}
          </button>
          <button type="button" className="btn btn-secundario" disabled={ocupado} onClick={empezarDeNuevo}>Volver</button>
        </>
      )}

      {mensaje && <p role="status" className={mensaje.ok ? "msg-ok" : "msg-error"}>{mensaje.texto}</p>}
    </main>
  );
}
