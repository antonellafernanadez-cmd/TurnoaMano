import { useState } from "react";
import { iniciarSesion } from "../../api/authApi";
import "./Auth.css";

export default function Login({ onLogin, irARegistro }) {
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setMensaje(null);
    try {
      const resultado = await iniciarSesion({ identificador, password });
      localStorage.setItem("token", resultado.token);
      localStorage.setItem("usuario", JSON.stringify(resultado.usuario));
      onLogin();
    } catch (err) {
      setMensaje({ ok: false, texto: err.response?.data?.error || "No pudimos iniciar sesión." });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="auth">
      <h1>Iniciar sesión</h1>

      <form onSubmit={enviar}>
        <label htmlFor="identificador">DNI</label>
        <input
          id="identificador"
          type="text"
          inputMode="numeric"
          value={identificador}
          onChange={(e) => setIdentificador(e.target.value)}
          required
        />

        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" className="btn" disabled={enviando}>
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>

      {mensaje && (
        <p role="status" className={mensaje.ok ? "msg-ok" : "msg-error"}>
          {mensaje.texto}
        </p>
      )}

      <button type="button" className="btn btn-secundario" onClick={irARegistro}>
        ¿No tenés cuenta? Registrate
      </button>
      <button type="button" className="link-volver" onClick={volver}>
        ← Volver
      </button>
    </main>
  );
}