import { useCallback, useEffect, useState } from "react";
import {
  avisarDemora, listarMedicos, listarTurnos, proponerFecha, reprogramarTurno, suspenderTurno,
} from "../../api/turnosApi";
import { ETIQUETA_ESTADO, fechaLegible } from "../../utils/formato";
import "./Turnos.css";

const DEMORAS = [10, 15, 30, 45, 60, 90, 120];
const ESTADOS = Object.keys(ETIQUETA_ESTADO);

function TarjetaTurno({ turno, medicos, onResultado }) {
  const [fecha, setFecha] = useState("");
  const [medico, setMedico] = useState(turno.medico_id || "");
  const [minutos, setMinutos] = useState("30");

  const solicitado = turno.estado === "solicitado";
  const conFecha = turno.estado === "propuesto" || turno.estado === "confirmado";
  const nombreMedico = medicos.find((m) => m.id === turno.medico_id)?.nombre;
  const cuerpo = () => ({ fecha_hora: fecha, ...(medico ? { medico_id: medico } : {}) });

  const ejecutar = async (accion, textoOk) => {
    try {
      await accion();
      onResultado({ ok: true, texto: textoOk });
    } catch (e) {
      onResultado({ ok: false, texto: e.response?.data?.error || "No se pudo completar la acción." });
    }
  };

  const suspender = () => {
    if (window.confirm("¿Suspender este turno? Se le avisa al paciente.")) {
      ejecutar(() => suspenderTurno(turno.id), "Turno suspendido. Se avisó al paciente.");
    }
  };

  return (
    <section className="turno">
      <h2>{turno.especialidad}</h2>
      <p className={`estado estado-${turno.estado}`}>{ETIQUETA_ESTADO[turno.estado]}</p>
      <p>Paciente n.º {turno.paciente_id}{nombreMedico ? ` · ${nombreMedico}` : ""}</p>
      {turno.fecha_hora && <p>{fechaLegible(turno.fecha_hora)}</p>}

      {(solicitado || conFecha) && (
        <>
          <label htmlFor={`fecha-${turno.id}`}>{solicitado ? "Fecha y hora a proponer" : "Nueva fecha y hora"}</label>
          <input id={`fecha-${turno.id}`} type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} />

          <label htmlFor={`medico-${turno.id}`}>Médico</label>
          <select id={`medico-${turno.id}`} value={medico} onChange={(e) => setMedico(e.target.value)}>
            <option value="">Sin asignar</option>
            {medicos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>

          <button
            type="button"
            className="btn"
            disabled={!fecha}
            onClick={() =>
              solicitado
                ? ejecutar(() => proponerFecha(turno.id, cuerpo()), "Fecha propuesta. Se avisó al paciente.")
                : ejecutar(() => reprogramarTurno(turno.id, cuerpo()), "Turno reprogramado. Se avisó al paciente.")
            }
          >
            {solicitado ? "Proponer fecha" : "Reprogramar"}
          </button>
        </>
      )}

      {conFecha && (
        <>
          <label htmlFor={`demora-${turno.id}`}>Avisar demora</label>
          <select id={`demora-${turno.id}`} value={minutos} onChange={(e) => setMinutos(e.target.value)}>
            {DEMORAS.map((m) => <option key={m} value={m}>Se demora {m} minutos</option>)}
          </select>
          <button
            type="button"
            className="btn btn-secundario"
            onClick={() => ejecutar(() => avisarDemora(turno.id, Number(minutos)), "Aviso de demora enviado.")}
          >
            Enviar aviso de demora
          </button>
          <button type="button" className="btn btn-peligro" onClick={suspender}>
            Suspender turno
          </button>
        </>
      )}
    </section>
  );
}

export default function GestionTurnos() {
  const [filtros, setFiltros] = useState({ fecha: "", medico_id: "", estado: "" });
  const [turnos, setTurnos] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [mensaje, setMensaje] = useState(null);

  const cargar = useCallback(
    () => listarTurnos(filtros).then(setTurnos).catch(() => setMensaje({ ok: false, texto: "No pudimos cargar los turnos." })),
    [filtros],
  );

  useEffect(() => { listarMedicos().then(setMedicos).catch(() => {}); }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const cambiar = (campo) => (e) => setFiltros({ ...filtros, [campo]: e.target.value });
  const alResultado = (res) => { setMensaje(res); cargar(); };

  return (
    <main className="turnos ancho">
      <h1>Gestión de turnos</h1>

      <div className="filtros">
        <div>
          <label htmlFor="f-fecha">Día</label>
          <input id="f-fecha" type="date" value={filtros.fecha} onChange={cambiar("fecha")} />
        </div>
        <div>
          <label htmlFor="f-medico">Médico</label>
          <select id="f-medico" value={filtros.medico_id} onChange={cambiar("medico_id")}>
            <option value="">Todos</option>
            {medicos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-estado">Estado</label>
          <select id="f-estado" value={filtros.estado} onChange={cambiar("estado")}>
            <option value="">Todos</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{ETIQUETA_ESTADO[e]}</option>)}
          </select>
        </div>
      </div>

      {mensaje && <p role="status" className={mensaje.ok ? "msg-ok" : "msg-error"}>{mensaje.texto}</p>}
      {turnos.length === 0 && <p>No hay turnos con esos filtros.</p>}

      <div className="grilla">
        {turnos.map((t) => (
          <TarjetaTurno key={`${t.id}-${t.estado}-${t.fecha_hora}`} turno={t} medicos={medicos} onResultado={alResultado} />
        ))}
      </div>
    </main>
  );
}
