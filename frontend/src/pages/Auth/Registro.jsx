import { useState } from "react";
import { registrarPaciente } from "../../api/authApi";
import "./Auth.css";

export default function Registro({ onRegistrado, irALogin }) {
  const [form, setForm] = useState({
    nombre: "", telefono: "", email: "", identificador: "", password: "",
  });
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setMensaje(null);
    try {
      await registrarPaciente(form);
      setMensaje({ ok: true, texto: "Cuenta creada. Ya podés iniciar sesión." });
      setTimeout(onRegistrado, 1200);
    } catch (err) {
      setMensaje({ ok: false, texto: err.response?.data?.error || "No pudimos crear la cuenta." });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="auth">
      <h1>Crear cuenta</h1>

      <form onSubmit={enviar}>
        <label htmlFor="nombre">Nombre y apellido</label>
        <input id="nombre" type="text" value={form.nombre} onChange={cambiar("nombre")} required />

        <label htmlFor="telefono">Teléfono</label>
        <input id="telefono" type="tel" value={form.telefono} onChange={cambiar("telefono")} required />

        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={form.email} onChange={cambiar("email")} required />

        <label htmlFor="identificador">DNI</label>
        <input
          id="identificador"
          type="text"
          inputMode="numeric"
          value={form.identificador}
          onChange={cambiar("identificador")}
          required
        />

        <label htmlFor="password">Contraseña</label>
        <input id="password" type="password" value={form.password} onChange={cambiar("password")} required />

        <button type="submit" className="btn" disabled={enviando}>
          {enviando ? "Creando..." : "Crear cuenta"}
        </button>
      </form>

      {mensaje && (
        <p role="status" className={mensaje.ok ? "msg-ok" : "msg-error"}>
          {mensaje.texto}
        </p>
      )}

      <button type="button" className="btn btn-secundario" onClick={irALogin}>
        Ya tengo cuenta
      </button>
      <button type="button" className="link-volver" onClick={volver}>
        ← Volver
      </button>
    </main>
  );
}