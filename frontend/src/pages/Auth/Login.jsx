import { useState } from "react";
import { iniciarSesion } from "../../api/authApi";
import Cabecera from "../../components/Cabecera";
import Logo from "../../components/Logo";
import "./Auth.css";

export default function Login({ onLogin, irARegistro, volver }) {
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setMensaje(null);
    try {
      const resultado = await iniciarSesion({ identificador, password });
      localStorage.setItem("token", resultado.token);
      // El backend puede mandar el usuario anidado o suelto: se guarda igual en los dos casos.
      const usuario = resultado.usuario ?? { rol: resultado.rol, nombre: resultado.nombre };
      localStorage.setItem("usuario", JSON.stringify(usuario));
      onLogin();
    } catch (err) {
      setMensaje({ ok: false, texto: err.response?.data?.error || "No pudimos iniciar sesión. Revisá tu conexión." });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <Cabecera titulo="Iniciar sesión" onVolver={volver} />
      <main className="auth">
        <div className="auth-logo"><Logo tamano={84} /></div>
        <h2>¡Hola de nuevo!</h2>
        <p className="auth-intro">Ingresá con tu DNI y tu contraseña.</p>

        <form className="auth-tarjeta" onSubmit={enviar}>
          <label htmlFor="identificador">DNI</label>
          <input id="identificador" type="text" inputMode="numeric" autoComplete="username" value={identificador}
            onChange={(e) => setIdentificador(e.target.value)} required />
          <p className="ayuda">Solo números, sin puntos.</p>

          <label htmlFor="password">Contraseña</label>
          <div className="campo-clave">
            <input id="password" type={verClave ? "text" : "password"} autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" className="ver-clave" aria-pressed={verClave} onClick={() => setVerClave(!verClave)}>
              {verClave ? "Ocultar" : "Mostrar"}
            </button>
          </div>

          <button type="submit" className="btn" disabled={enviando}>{enviando ? "Entrando…" : "Entrar"}</button>
          {mensaje && <p role="alert" className={mensaje.ok ? "msg-ok" : "msg-error"}>{mensaje.texto}</p>}
        </form>

        <div className="auth-pie">
          <p className="ayuda">¿Todavía no tenés cuenta?</p>
          <button type="button" className="btn btn-secundario" onClick={irARegistro}>Crear cuenta</button>
        </div>
      </main>
    </>
  );
}
