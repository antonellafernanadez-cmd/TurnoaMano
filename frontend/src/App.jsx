import { useState } from "react";
import SolicitarTurno from "./pages/Turnos/SolicitarTurno";
import MisTurnos from "./pages/Turnos/MisTurnos";
import "./App.css";

// Navegación simple entre las dos pantallas del paciente.
// Cuando esté el login, se reemplaza por las rutas protegidas según el rol.
export default function App() {
  const [pantalla, setPantalla] = useState("nuevo");
  const sinToken = !localStorage.getItem("token");

  return (
    <>
      <nav className="menu" aria-label="Principal">
        <button className={pantalla === "nuevo" ? "activo" : ""} onClick={() => setPantalla("nuevo")}>
          Pedir turno
        </button>
        <button className={pantalla === "mios" ? "activo" : ""} onClick={() => setPantalla("mios")}>
          Mis turnos
        </button>
      </nav>
      {sinToken && (
        <p className="aviso">
          Todavía no hay sesión iniciada. Guardá un token de prueba con localStorage.setItem("token", "...") y recargá.
        </p>
      )}
      {pantalla === "nuevo" ? <SolicitarTurno /> : <MisTurnos />}
    </>
  );
}
