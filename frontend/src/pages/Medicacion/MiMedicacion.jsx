import { useEffect, useState } from "react";
import { miPlanMedicacion, misRecetasPaciente } from "../../api/medicacionApi";

export default function MiMedicacion({ onInicio }) {
  const [plan, setPlan] = useState([]);
  const [recetas, setRecetas] = useState([]);

  useEffect(() => {
    Promise.all([miPlanMedicacion(), misRecetasPaciente()])
      .then(([p, r]) => {
        setPlan(p || []);
        setRecetas(r || []);
      })
      .catch(() => {});
  }, []);

  return (
    <main className="pantalla">
      <h1>Mi medicación</h1>
      <h2>Plan de tomas</h2>
      {plan.length === 0 && <p>No tenés tomas programadas.</p>}
      {plan.map((t) => (
        <p key={t.id}><strong>{t.medicamento}</strong> · {t.dosis} · {t.horario}</p>
      ))}
      <h2>Recetas</h2>
      {recetas.length === 0 && <p>No hay recetas.</p>}
      {recetas.map((r) => (
        <div key={r.id} style={{ marginBottom: 12 }}>
          <p>{r.indicaciones}</p>
          <ul>
            {(r.medicamentos || []).map((m, i) => (
              <li key={i}>{m.medicamento} — {m.dosis} ({m.horario})</li>
            ))}
          </ul>
        </div>
      ))}
      {onInicio && <button type="button" className="btn btn-secundario" onClick={onInicio}>Inicio</button>}
    </main>
  );
}
