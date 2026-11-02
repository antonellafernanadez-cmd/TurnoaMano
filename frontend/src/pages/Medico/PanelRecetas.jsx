import { useEffect, useState } from "react";
import {
  buscarPacientes,
  emitirReceta,
  eliminarReceta,
  misRecetasMedico,
  obtenerPlan,
} from "../../api/medicacionApi";

/** HU5: médico emite recetas y actualiza plan. */
export default function PanelRecetas({ onSalir }) {
  const [texto, setTexto] = useState("");
  const [pacientes, setPacientes] = useState(null);
  const [elegido, setElegido] = useState(null);
  const [plan, setPlan] = useState([]);
  const [recetas, setRecetas] = useState([]);
  const [indicaciones, setIndicaciones] = useState("");
  const [items, setItems] = useState([{ medicamento: "", dosis: "", horario: "08:00" }]);
  const [mensaje, setMensaje] = useState(null);

  const cargarRecetas = () => misRecetasMedico().then(setRecetas).catch(() => setRecetas([]));
  useEffect(() => { cargarRecetas(); }, []);

  const buscar = async (e) => {
    e.preventDefault();
    setElegido(null);
    try {
      setPacientes(await buscarPacientes(texto));
    } catch (err) {
      setMensaje({ ok: false, texto: err.response?.data?.error || "Error" });
    }
  };

  const elegir = async (p) => {
    setElegido(p);
    setPlan(await obtenerPlan(p.id).catch(() => []));
  };

  const emitir = async (e) => {
    e.preventDefault();
    if (!elegido) return;
    try {
      await emitirReceta({
        paciente_id: elegido.id,
        indicaciones,
        medicamentos: items.filter((i) => i.medicamento.trim()),
      });
      setMensaje({ ok: true, texto: "Receta emitida y plan actualizado. Paciente notificado." });
      setItems([{ medicamento: "", dosis: "", horario: "08:00" }]);
      setIndicaciones("");
      setPlan(await obtenerPlan(elegido.id));
      cargarRecetas();
    } catch (err) {
      setMensaje({ ok: false, texto: err.response?.data?.error || "No se pudo emitir." });
    }
  };

  return (
    <main className="pantalla">
      <h1>Recetas y plan</h1>
      {mensaje && <p className={mensaje.ok ? "msg-ok" : "msg-error"}>{mensaje.texto}</p>}
      <form onSubmit={buscar}>
        <label>Buscar paciente</label>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} />
        <button className="btn" type="submit">Buscar</button>
      </form>
      {pacientes && !elegido && pacientes.map((p) => (
        <button key={p.id} type="button" className="btn btn-secundario" onClick={() => elegir(p)}>
          {p.nombre} · {p.identificador}
        </button>
      ))}
      {elegido && (
        <form onSubmit={emitir}>
          <h2>{elegido.nombre}</h2>
          <label>Indicaciones</label>
          <textarea value={indicaciones} onChange={(e) => setIndicaciones(e.target.value)} />
          {items.map((it, i) => (
            <div key={i}>
              <label>Medicamento</label>
              <input required value={it.medicamento} onChange={(e) => setItems((xs) => xs.map((x, j) => j === i ? { ...x, medicamento: e.target.value } : x))} />
              <label>Dosis</label>
              <input required value={it.dosis} onChange={(e) => setItems((xs) => xs.map((x, j) => j === i ? { ...x, dosis: e.target.value } : x))} />
              <label>Horario</label>
              <input required value={it.horario} onChange={(e) => setItems((xs) => xs.map((x, j) => j === i ? { ...x, horario: e.target.value } : x))} />
            </div>
          ))}
          <button type="button" className="btn btn-secundario" onClick={() => setItems((xs) => [...xs, { medicamento: "", dosis: "", horario: "08:00" }])}>+ Medicamento</button>
          <button className="btn" type="submit">Emitir receta</button>
          <h3>Plan activo</h3>
          {plan.map((t) => <p key={t.id}>{t.medicamento} · {t.dosis} · {t.horario}</p>)}
        </form>
      )}
      <h2>Mis recetas</h2>
      {recetas.map((r) => (
        <div key={r.id} style={{ marginTop: 10, padding: 10, background: "#fff", borderRadius: 12 }}>
          <p>#{r.id} · paciente {r.paciente_id}</p>
          <p>{r.indicaciones}</p>
          {r.activa && <button type="button" className="btn btn-peligro" onClick={() => eliminarReceta(r.id).then(cargarRecetas)}>Desactivar</button>}
        </div>
      ))}
      <button type="button" className="btn btn-peligro" onClick={onSalir}>Cerrar sesión</button>
    </main>
  );
}
