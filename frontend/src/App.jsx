import { useState } from "react";
import SolicitarTurno from "./pages/Turnos/SolicitarTurno";
import MisTurnos from "./pages/Turnos/MisTurnos";
import Bienvenida from "./pages/Bienvenida/Bienvenida";
import Login from "./pages/Auth/Login";
import Registro from "./pages/Auth/Registro";
import "./App.css";

export default function App() {
  const [pantalla, setPantalla] = useState("nuevo");
  const [autenticado, setAutenticado] = useState(!!localStorage.getItem("token"));
  const [vistaAuth, setVistaAuth] = useState("bienvenida"); // bienvenida | login | registro

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setAutenticado(false);
    setVistaAuth("bienvenida");
  };

  if (!autenticado) {
    if (vistaAuth === "bienvenida") {
      return (
        <Bienvenida
          irALogin={() => setVistaAuth("login")}
          irARegistro={() => setVistaAuth("registro")}
        />
      );
    }
    return vistaAuth === "login" ? (
      <Login
        onLogin={() => setAutenticado(true)}
        irARegistro={() => setVistaAuth("registro")}
        volver={() => setVistaAuth("bienvenida")}
      />
    ) : (
      <Registro
        onRegistrado={() => setVistaAuth("login")}
        irALogin={() => setVistaAuth("login")}
        volver={() => setVistaAuth("bienvenida")}
      />
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