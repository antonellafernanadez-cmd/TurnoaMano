
import { useState } from "react";
import { iniciarSesion } from "../../api/authApi";
import Cabecera from "../../components/Cabecera";
import Logo from "../../components/Logo";
import "./Auth.css";

export default function Login({
  onLogin,
  irARegistro,
  volver,
  rolEsperado = "paciente",
  titulo = "Iniciar sesión",
}) {
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const esPaciente = rolEsperado === "paciente";

  const tipoIdentificador = {
    paciente: "DNI",
    medico: "Número de matrícula",
    administrativo: "Número de legajo",
  };

  const etiqueta = tipoIdentificador[rolEsperado] || "Identificador";

  const enviar = async (e) => {
    e.preventDefault();

    if (enviando) return;

    setEnviando(true);
    setMensaje(null);

    try {
      const resultado = await iniciarSesion({
        identificador: identificador.trim(),
        password,
      });

      const usuario = resultado.usuario ?? {
        rol: resultado.rol,
        nombre: resultado.nombre,
      };

      if (usuario.rol !== rolEsperado) {
        setMensaje({
          ok: false,
          texto:
            "Estas credenciales no corresponden a este tipo de acceso.",
        });
        return;
      }

      if (!resultado.token) {
        throw new Error(
          "El servidor no devolvió un token de acceso."
        );
      }

      localStorage.setItem("token", resultado.token);
      localStorage.setItem("usuario", JSON.stringify(usuario));

      onLogin();
    } catch (err) {
      setMensaje({
        ok: false,
        texto:
          err.response?.data?.error ||
          err.message ||
          "No pudimos iniciar sesión. Revisá tu conexión.",
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <Cabecera titulo={titulo} onVolver={volver} />

      <main className="auth">
        <div className="auth-logo">
          <Logo tamano={84} />
        </div>

        <h2>
          {esPaciente
            ? "¡Hola de nuevo!"
            : rolEsperado === "medico"
              ? "Ingreso para profesionales médicos"
              : "Ingreso para administración"}
        </h2>

        <p className="auth-intro">
          Ingresá con tu {etiqueta.toLowerCase()} y tu contraseña.
        </p>

        <form className="auth-tarjeta" onSubmit={enviar}>
          <label htmlFor="identificador">{etiqueta}</label>

          <input
            id="identificador"
            type="text"
            inputMode="text"
            autoComplete="username"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            placeholder={`Ingresá tu ${etiqueta.toLowerCase()}`}
            required
          />

          <label htmlFor="password">Contraseña</label>

          <div className="campo-clave">
            <input
              id="password"
              type={verClave ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              type="button"
              className="ver-clave"
              aria-pressed={verClave}
              onClick={() => setVerClave(!verClave)}
            >
              {verClave ? "Ocultar" : "Mostrar"}
            </button>
          </div>

          <button
            type="submit"
            className="btn"
            disabled={enviando}
          >
            {enviando ? "Entrando…" : "Entrar"}
          </button>

          {mensaje && (
            <p
              role="alert"
              className={mensaje.ok ? "msg-ok" : "msg-error"}
            >
              {mensaje.texto}
            </p>
          )}
        </form>

        {esPaciente && (
          <div className="auth-pie">
            <p className="ayuda">¿Todavía no tenés cuenta?</p>

            <button
              type="button"
              className="btn btn-secundario"
              onClick={irARegistro}
            >
              Crear cuenta
            </button>
          </div>
        )}
      </main>
    </>
  );
}
