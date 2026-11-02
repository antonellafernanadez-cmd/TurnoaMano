import { useCallback, useEffect, useState } from "react";
import Bienvenida from "./pages/Bienvenida/Bienvenida";
import Login from "./pages/Auth/Login";
import Registro from "./pages/Auth/Registro";
import Inicio from "./pages/Inicio/Inicio";
import SolicitarTurno from "./pages/Turnos/SolicitarTurno";
import MisTurnos from "./pages/Turnos/MisTurnos";
import Avisos from "./pages/Avisos/Avisos";
import { obtenerAvisos } from "./api/turnosApi";
import Cabecera from "./components/Cabecera";
import "./App.css";

const TITULOS = {
  pedir: "Pedir turno",
  mios: "Mis turnos",
  avisos: "Avisos",
};

function usuarioGuardado() {
  try {
    return JSON.parse(localStorage.getItem("usuario") || "{}");
  } catch {
    return {};
  }
}

export default function App() {
  const [pantalla, setPantalla] = useState("inicio");
  const [autenticado, setAutenticado] = useState(
    !!localStorage.getItem("token")
  );
  const [vistaAuth, setVistaAuth] = useState("bienvenida");

  const [avisos, setAvisos] = useState([]);
  const [sinLeer, setSinLeer] = useState(0);
  const [avisosCargados, setAvisosCargados] = useState(false);

  const [iniciarPedidoPorVoz, setIniciarPedidoPorVoz] = useState(false);

  const contarAvisos = useCallback(() => {
    setAvisosCargados(false);

    obtenerAvisos()
      .then((lista) => {
        const seguros = Array.isArray(lista) ? lista : [];

        setAvisos(seguros);
        setSinLeer(
          seguros.filter((aviso) => !aviso.leida).length
        );
      })
      .catch(() => {
        setAvisos([]);
        setSinLeer(0);
      })
      .finally(() => setAvisosCargados(true));
  }, []);

  useEffect(() => {
    if (autenticado && pantalla === "inicio") {
      contarAvisos();
    }
  }, [autenticado, pantalla, contarAvisos]);

  const irA = (destino) => {
    setIniciarPedidoPorVoz(false);
    setPantalla(destino);
  };

  const pedirPorVoz = () => {
    setIniciarPedidoPorVoz(true);
    setPantalla("pedir");
  };

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    setAutenticado(false);
    setPantalla("inicio");
    setVistaAuth("bienvenida");

    setAvisos([]);
    setSinLeer(0);
    setAvisosCargados(false);
    setIniciarPedidoPorVoz(false);
  };

  if (!autenticado) {
    if (vistaAuth === "login") {
      return (
        <Login
          onLogin={() => setAutenticado(true)}
          irARegistro={() => setVistaAuth("registro")}
          volver={() => setVistaAuth("bienvenida")}
        />
      );
    }

    if (vistaAuth === "registro") {
      return (
        <Registro
          onRegistrado={() => setVistaAuth("login")}
          irALogin={() => setVistaAuth("login")}
          volver={() => setVistaAuth("bienvenida")}
        />
      );
    }

    return (
      <Bienvenida
        irALogin={() => setVistaAuth("login")}
        irARegistro={() => setVistaAuth("registro")}
      />
    );
  }

  const usuario = usuarioGuardado();
  const nombre = (usuario.nombre || "").split(" ")[0] || "";

  if (usuario.rol && usuario.rol !== "paciente") {
    return (
      <>
        <Cabecera titulo="Mi Turno a Mano" />

        <main className="pantalla">
          <p>
            Hola, {nombre || "bienvenido"}. El panel de{" "}
            {usuario.rol === "medico"
              ? "médicos"
              : "administrativos"}{" "}
            todavía no está disponible.
          </p>

          <button
            type="button"
            className="btn btn-peligro"
            onClick={cerrarSesion}
          >
            Cerrar sesión
          </button>
        </main>
      </>
    );
  }

  if (pantalla === "inicio") {
    return (
      <Inicio
        nombre={nombre}
        irA={irA}
        onPedirPorVoz={pedirPorVoz}
        onSalir={cerrarSesion}
        avisos={avisos}
        avisosCargados={avisosCargados}
        sinLeer={sinLeer}
      />
    );
  }

  return (
    <>
      <Cabecera
        titulo={TITULOS[pantalla]}
        onVolver={() => irA("inicio")}
      />

      {pantalla === "pedir" && (
        <SolicitarTurno
          onVerTurnos={() => irA("mios")}
          onInicio={() => irA("inicio")}
          iniciarConVoz={iniciarPedidoPorVoz}
          onVozIniciada={() => setIniciarPedidoPorVoz(false)}
        />
      )}

      {pantalla === "mios" && (
        <MisTurnos
          onPedir={() => irA("pedir")}
          onInicio={() => irA("inicio")}
        />
      )}

      {pantalla === "avisos" && (
        <Avisos
          onCambio={contarAvisos}
          onInicio={() => irA("inicio")}
        />
      )}
    </>
  );
}