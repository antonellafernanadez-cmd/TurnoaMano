import { useState } from "react";
import SolicitarTurno from "./pages/Turnos/SolicitarTurno";
import MisTurnos from "./pages/Turnos/MisTurnos";
import Login from "./pages/Auth/Login";
import Registro from "./pages/Auth/Registro";
import "./App.css";

export default function App() {
  const [pantalla, setPantalla] = useState("nuevo");
  const [autenticado, setAutenticado] = useState(!!localStorage.getItem("token"));
  const [vistaAuth, setVistaAuth] = useState("login");

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setAutenticado(false);
  };

  if (!autenticado) {
    return vistaAuth === "login" ? (
      <Login onLogin={() => setAutenticado(true)} irARegistro={() => setVistaAuth("registro")} />
    ) : (
      <Registro onRegistrado={() => setVistaAuth("login")} irALogin={() => setVistaAuth("login")} />
    );
  }

  return (
    <>
      <nav className="menu" aria-label="Principal">
        <button className={pantalla === "nuevo" ? "activo" : ""} onClick={() => setPantalla("nuevo")}>
          Pedir turno
        </button>
        <button className={pantalla === "mios" ? "activo" : ""} onClick={() => setPantalla("mios")}>
          Mis turnos
        </button>
        <button className="salir" onClick={cerrarSesion}>
          Cerrar sesión
        </button>
      </nav>
      {pantalla === "nuevo" ? <SolicitarTurno /> : <MisTurnos />}
    </>
  );
}