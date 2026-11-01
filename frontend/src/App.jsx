import { useState } from "react";
import Bienvenida from "./pages/Bienvenida/Bienvenida";
import Login from "./pages/Auth/Login";
import Registro from "./pages/Auth/Registro";
import Inicio from "./pages/Inicio/Inicio";
import SolicitarTurno from "./pages/Turnos/SolicitarTurno";
import MisTurnos from "./pages/Turnos/MisTurnos";
import Cabecera from "./components/Cabecera";
import "./App.css";

const TITULOS = { pedir: "Pedir turno", mios: "Mis turnos" };

function usuarioGuardado() {
  try {
    return JSON.parse(localStorage.getItem("usuario") || "{}");
  } catch {
    return {}; // si el dato guardado está dañado, se trata como si no hubiera
  }
}

export default function App() {
  const [pantalla, setPantalla] = useState("inicio"); // inicio | pedir | mios
  const [autenticado, setAutenticado] = useState(!!localStorage.getItem("token"));
  const [vistaAuth, setVistaAuth] = useState("bienvenida"); // bienvenida | login | registro

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setAutenticado(false);
    setPantalla("inicio");
    setVistaAuth("bienvenida");
  };

  if (!autenticado) {
    if (vistaAuth === "login") {
      return <Login onLogin={() => setAutenticado(true)} irARegistro={() => setVistaAuth("registro")} volver={() => setVistaAuth("bienvenida")} />;
    }
    if (vistaAuth === "registro") {
      return <Registro onRegistrado={() => setVistaAuth("login")} irALogin={() => setVistaAuth("login")} volver={() => setVistaAuth("bienvenida")} />;
    }
    return <Bienvenida irALogin={() => setVistaAuth("login")} irARegistro={() => setVistaAuth("registro")} />;
  }

  const usuario = usuarioGuardado();
  const nombre = (usuario.nombre || "").split(" ")[0] || "bienvenido";

  // Médico y administrativo tendrán su propio panel; por ahora esta app es la del paciente.
  if (usuario.rol && usuario.rol !== "paciente") {
    return (
      <>
        <Cabecera titulo="Mi Turno a Mano" />
        <main className="pantalla">
          <p>Hola, {nombre}. El panel de {usuario.rol === "medico" ? "médicos" : "administrativos"} todavía no está disponible.</p>
          <button type="button" className="btn btn-peligro" onClick={cerrarSesion}>Cerrar sesión</button>
        </main>
      </>
    );
  }

  if (pantalla === "inicio") {
    return <Inicio nombre={nombre} irA={setPantalla} onSalir={cerrarSesion} />;
  }

  return (
    <>
      <Cabecera titulo={TITULOS[pantalla]} onVolver={() => setPantalla("inicio")} />
      {pantalla === "pedir" && <SolicitarTurno onVerTurnos={() => setPantalla("mios")} />}
      {pantalla === "mios" && <MisTurnos />}
    </>
  );
}
