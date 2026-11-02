import { useEffect, useState } from "react";
import {
  avisarDemora,
  listarMedicos,
  listarTurnos,
  proponerFecha,
  reprogramarTurno,
  suspenderTurno,
} from "../../api/turnosApi";

/** Panel administrativo HU4: turnos, demoras, reprogramar, suspender. */
export default function GestionTurnos({ onSalir }) {
  const [turnos, setTurnos] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [estado, setEstado] = useState("");
  const [mensaje, setMensaje] = useState(null);
  const [form, setForm] = useState({}); // id -> { medico_id, fecha_hora }

  const cargar = () => {
    listarTurnos(estado ? { estado } : {})
      .then(setTurnos)
      .catch(() => setTurnos([]));
  };

  useEffect(() => {
    listarMedicos().then(setMedicos).catch(() => setMedicos([]));
  }, []);

  useEffect(() => {
    cargar();
  }, [estado]);

  const err = (e, f) => setMensaje({ ok: false, texto: e.response?.data?.error || f });

  const asignar = async (id) => {
    const datos = form[id] || {};
    try {
      await proponerFecha(id, datos);
      setMensaje({ ok: true, texto: "Fecha propuesta al paciente." });
      cargar();
    } catch (e) {
      err(e, "No se pudo asignar.");
    }
  };

  return (
    <main className="pantalla">
      <h1>Gestión de turnos</h1>
      <label htmlFor="filtro">Filtrar por estado</label>
      <select id="filtro" value={estado} onChange={(e) => setEstado(e.target.value)}>
        <option value="">Todos</option>
        <option value="solicitado">Solicitado</option>
        <option value="propuesto">Propuesto</option>
        <option value="confirmado">Confirmado</option>
        <option value="cancelado">Cancelado</option>
      </select>
      {mensaje && <p className={mensaje.ok ? "msg-ok" : "msg-error"}>{mensaje.texto}</p>}
      {turnos.map((t) => (
        <section key={t.id} style={{ marginTop: 16, padding: 14, background: "#fff", borderRadius: 14, border: "2px solid #0b1f4d" }}>
          <strong style={{ textTransform: "capitalize" }}>{t.especialidad}</strong>
          <p>Estado: {t.estado}</p>
          <p>Paciente id: {t.paciente_id}</p>
          {t.fecha_hora && <p>Fecha: {t.fecha_hora}</p>}
          {t.estado === "solicitado" && (
            <>
              <label>Médico</label>
              <select
                value={(form[t.id] || {}).medico_id || ""}
                onChange={(e) => setForm((f) => ({ ...f, [t.id]: { ...f[t.id], medico_id: e.target.value } }))}
              >
                <option value="">Elegir</option>
                {medicos.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
              <label>Fecha y hora</label>
              <input
                type="datetime-local"
                onChange={(e) => setForm((f) => ({ ...f, [t.id]: { ...f[t.id], fecha_hora: e.target.value } }))}
              />
              <button type="button" className="btn" onClick={() => asignar(t.id)}>Proponer fecha</button>
            </>
          )}
          {(t.estado === "propuesto" || t.estado === "confirmado") && (
            <>
              <button type="button" className="btn btn-secundario" onClick={() => avisarDemora(t.id, 15).then(() => setMensaje({ ok: true, texto: "Aviso de demora enviado." })).catch((e) => err(e, "No se pudo avisar."))}>
                Avisar demora 15 min
              </button>
              <button type="button" className="btn btn-peligro" onClick={() => suspenderTurno(t.id).then(() => { setMensaje({ ok: true, texto: "Turno suspendido." }); cargar(); }).catch((e) => err(e, "No se pudo suspender."))}>
                Suspender
              </button>
            </>
          )}
        </section>
      ))}
      <button type="button" className="btn btn-peligro" onClick={onSalir}>Cerrar sesión</button>
    </main>
  );
}
