
import { useCallback, useEffect, useState } from "react";

import Bienvenida from "./pages/Bienvenida/Bienvenida";
import Login from "./pages/Auth/Login";
import Registro from "./pages/Auth/Registro";
import Inicio from "./pages/Inicio/Inicio";

import SolicitarTurno from "./pages/Turnos/SolicitarTurno";
import MisTurnos from "./pages/Turnos/MisTurnos";
import Avisos from "./pages/Avisos/Avisos";

import MiCuidador from "./pages/Cuidador/MiCuidador";
import PanelCuidador from "./pages/Cuidador/PanelCuidador";

import GestionTurnos from "./pages/Admin/GestionTurnos";
import RecordatoriosMedicacion from "./pages/Admin/RecordatoriosMedicacion";

import PanelRecetas from "./pages/Medico/PanelRecetas";
import MiMedicacion from "./pages/Medicacion/MiMedicacion";

import Cabecera from "./components/Cabecera";
import { obtenerAvisos } from "./api/turnosApi";

import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const TITULOS = {
  pedir: "Pedir turno",
  mios: "Mis turnos",
  avisos: "Avisos",
  cuidador: "Mi cuidador",
  medicacion: "Mi medicación",
  admin_turnos: "Gestión de turnos",
  admin_med: "Recordatorios",
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

  // Datos para el ingreso del cuidador.
  const [dniPaciente, setDniPaciente] = useState("");
  const [codigoCuidador, setCodigoCuidador] = useState("");
  const [errorCuidador, setErrorCuidador] = useState("");
  const [cargandoCuidador, setCargandoCuidador] = useState(false);

  // Cuenta los avisos del paciente.
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

  // Navegación entre pantallas.
  const irA = (destino) => {
    setIniciarPedidoPorVoz(false);
    setPantalla(destino);
  };

  const pedirPorVoz = () => {
    setIniciarPedidoPorVoz(true);
    setPantalla("pedir");
  };

  // Cierre de sesión.
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

    setDniPaciente("");
    setCodigoCuidador("");
    setErrorCuidador("");
  };

  // Inicio de sesión para cuidadores.
  const ingresarComoCuidador = async (e) => {
    e.preventDefault();
    setErrorCuidador("");

    if (!dniPaciente.trim() || !codigoCuidador.trim()) {
      setErrorCuidador(
        "Completá el DNI del paciente y el código."
      );
      return;
    }

    setCargandoCuidador(true);

    try {
      const respuesta = await fetch(
        `${API_URL}/api/auth/login-cuidador`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            identificador: dniPaciente.trim(),
            codigo: codigoCuidador.trim(),
          }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error ||
          datos.mensaje ||
          "No se pudo iniciar sesión."
        );
      }

      if (!datos.token || !datos.usuario) {
        throw new Error(
          "El servidor no devolvió los datos de acceso."
        );
      }

      const usuario = {
        ...datos.usuario,
        rol: "cuidador",
        tipo_acceso: "cuidador",
        cuidador: datos.cuidador,
      };

      localStorage.setItem("token", datos.token);
      localStorage.setItem("usuario", JSON.stringify(usuario));

      setAutenticado(true);
      setPantalla("inicio");
      setVistaAuth("bienvenida");

      setDniPaciente("");
      setCodigoCuidador("");
      setErrorCuidador("");
    } catch (error) {
      setErrorCuidador(
        error.message || "Ocurrió un error al ingresar."
      );
    } finally {
      setCargandoCuidador(false);
    }
  };

  // Si no hay sesión iniciada, muestra las pantallas de autenticación.
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

    if (vistaAuth === "loginCuidador") {
      return (
        <>
          <Cabecera
            titulo="Acceso para cuidadores"
            onVolver={() => {
              setVistaAuth("bienvenida");
              setErrorCuidador("");
            }}
          />

          <main className="pantalla">
            <h2>Ingresar como cuidador</h2>

            <p>
              Ingresá el DNI del paciente y el código de seis
              dígitos que te compartió.
            </p>

            <form onSubmit={ingresarComoCuidador}>
              <div className="campo">
                <label htmlFor="dniPaciente">
                  DNI del paciente
                </label>

                <input
                  id="dniPaciente"
                  type="text"
                  inputMode="numeric"
                  value={dniPaciente}
                  onChange={(e) =>
                    setDniPaciente(e.target.value)
                  }
                  placeholder="Ingresá el DNI"
                  maxLength={8}
                  required
                />
              </div>

              <div className="campo">
                <label htmlFor="codigoCuidador">
                  Código de acceso
                </label>

                <input
                  id="codigoCuidador"
                  type="text"
                  inputMode="numeric"
                  value={codigoCuidador}
                  onChange={(e) =>
                    setCodigoCuidador(e.target.value)
                  }
                  placeholder="Código de 6 dígitos"
                  maxLength={6}
                  required
                />
              </div>

              {errorCuidador && (
                <p role="alert" className="mensaje-error">
                  {errorCuidador}
                </p>
              )}

              <button
                type="submit"
                className="btn btn-iniciar"
                disabled={cargandoCuidador}
              >
                {cargandoCuidador
                  ? "Ingresando..."
                  : "Ingresar"}
              </button>
            </form>

            <button
              type="button"
              className="btn btn-secundario"
              onClick={() => setVistaAuth("bienvenida")}
            >
              Volver
            </button>
          </main>
        </>
      );
    }

    return (
      <Bienvenida
        irALogin={() => setVistaAuth("login")}
        irARegistro={() => setVistaAuth("registro")}
        irALoginCuidador={() =>
          setVistaAuth("loginCuidador")
        }
      />
    );
  }

  // Datos del usuario autenticado.
  const usuario = usuarioGuardado();
  const nombre = (usuario.nombre || "").split(" ")[0] || "";

  // Panel del cuidador.
  if (usuario.rol === "cuidador") {
    return (
      <>
        <Cabecera titulo="Mi Turno a Mano" />
        <PanelCuidador onSalir={cerrarSesion} />
      </>
    );
  }

  // Panel del médico.
  if (usuario.rol === "medico") {
    return (
      <>
        <Cabecera titulo="Panel médico" />
        <PanelRecetas onSalir={cerrarSesion} />
      </>
    );
  }

  // Panel del administrativo.
  if (usuario.rol === "administrativo") {
    if (pantalla === "admin_med") {
      return (
        <>
          <Cabecera
            titulo="Recordatorios"
            onVolver={() => setPantalla("inicio")}
          />

          <RecordatoriosMedicacion
            onVolver={() => setPantalla("inicio")}
          />
        </>
      );
    }

    if (
      pantalla === "admin_turnos" ||
      pantalla === "inicio"
    ) {
      return (
        <>
          <Cabecera titulo="Administración" />

          {pantalla === "inicio" ? (
            <main className="pantalla">
              <p>Hola, {nombre || "bienvenido"}.</p>

              <button
                type="button"
                className="btn"
                onClick={() => setPantalla("admin_turnos")}
              >
                Gestión de turnos
              </button>

              <button
                type="button"
                className="btn btn-secundario"
                onClick={() => setPantalla("admin_med")}
              >
                Recordatorios de medicación
              </button>

              <button
                type="button"
                className="btn btn-peligro"
                onClick={cerrarSesion}
              >
                Cerrar sesión
              </button>
            </main>
          ) : (
            <>
              <main className="pantalla">
                <button
                  type="button"
                  className="btn btn-secundario"
                  onClick={() => setPantalla("inicio")}
                >
                  Menú administración
                </button>
              </main>

              <GestionTurnos onSalir={cerrarSesion} />
            </>
          )}
        </>
      );
    }
  }

  // Pantalla principal del paciente.
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

  // Navegación de las demás pantallas del paciente.
  return (
    <>
      <Cabecera
        titulo={TITULOS[pantalla] || "Mi Turno a Mano"}
        onVolver={() => irA("inicio")}
      />

      {pantalla === "pedir" && (
        <SolicitarTurno
          onVerTurnos={() => irA("mios")}
          onInicio={() => irA("inicio")}
          iniciarConVoz={iniciarPedidoPorVoz}
          onVozIniciada={() =>
            setIniciarPedidoPorVoz(false)
          }
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

      {pantalla === "cuidador" && (
        <MiCuidador
          onInicio={() => irA("inicio")}
        />
      )}

      {pantalla === "medicacion" && (
        <MiMedicacion
          onInicio={() => irA("inicio")}
        />
      )}
    </>
  );
}
