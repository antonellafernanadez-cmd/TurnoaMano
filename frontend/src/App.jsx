import { useCallback, useEffect, useState } from "react";
import { misNotificaciones } from "./api/notificacionesApi";
import Notificaciones from "./pages/notificaciones/Notificaciones";
import GestionTurnos from "./pages/turnos/GestionTurnos";
import MisTurnos from "./pages/turnos/MisTurnos";
import SolicitarTurno from "./pages/turnos/SolicitarTurno";
import { rolActual } from "./utils/sesion";
import "./App.css";

// Opciones del menú según el rol. Ocultarlas no protege nada: el backend valida cada pedido.
const MENUS = {
  paciente: [["nuevo", "Pedir turno"], ["mios", "Mis turnos"], ["avisos", "Avisos"]],
  administrativo: [["gestion", "Gestión de turnos"]],
};

// Cuando esté el login, se reemplaza por las rutas protegidas.
export default function App() {
  const rol = rolActual();
  const menu = MENUS[rol] || [];
  const [pantalla, setPantalla] = useState(menu[0]?.[0]);
  const [sinLeer, setSinLeer] = useState(0);

  const contarSinLeer = useCallback(() => {
    if (rol === "paciente") misNotificaciones(true).then((l) => setSinLeer(l.length)).catch(() => {});
  }, [rol]);

  useEffect(() => { contarSinLeer(); }, [pantalla, contarSinLeer]);

  if (!rol) {
    return (
      <p className="aviso-sesion">
        Todavía no hay sesión iniciada. Iniciá sesión, o guardá un token de prueba con localStorage.setItem("token", "...") y recargá.
      </p>
    );
  }
  if (menu.length === 0) {
    return <p className="aviso-sesion">Todavía no hay pantallas para el rol “{rol}”.</p>;
  }

  return (
    <>
      <nav className="menu" aria-label="Principal" style={{ gridTemplateColumns: `repeat(${menu.length}, 1fr)` }}>
        {menu.map(([clave, texto]) => (
          <button key={clave} className={pantalla === clave ? "activo" : ""} onClick={() => setPantalla(clave)}>
            {texto}{clave === "avisos" && sinLeer > 0 ? ` (${sinLeer})` : ""}
          </button>
        ))}
      </nav>
      {pantalla === "nuevo" && <SolicitarTurno />}
      {pantalla === "mios" && <MisTurnos />}
      {pantalla === "avisos" && <Notificaciones onCambio={contarSinLeer} />}
      {pantalla === "gestion" && <GestionTurnos />}
    </>
  );
}
