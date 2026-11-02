import { useState } from "react";
import { registrarPaciente } from "../../api/authApi";
import Cabecera from "../../components/Cabecera";
import Logo from "../../components/Logo";
import "./Auth.css";

export default function Registro({ onRegistrado, irALogin, volver }) {
  const [form, setForm] = useState({ nombre: "", telefono: "", email: "", identificador: "", password: "" });
  const [verClave, setVerClave] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setMensaje(null);
    try {
      await registrarPaciente(form);
      setMensaje({ ok: true, texto: "¡Cuenta creada! Ahora vas a iniciar sesión." });
      setTimeout(onRegistrado, 1200);
    } catch (err) {
      setMensaje({ ok: false, texto: err.response?.data?.error || "No pudimos crear la cuenta. Revisá tu conexión." });
      setEnviando(false);
    }
  };

  return (
    <>
      <Cabecera titulo="Crear cuenta" onVolver={volver} />
      <main className="auth">
        <div className="auth-logo"><Logo tamano={84} /></div>
        <h2>Registrate</h2>
        <p className="auth-intro">Completá tus datos para pedir turnos.</p>

        <form className="auth-tarjeta" onSubmit={enviar}>
          <label htmlFor="nombre">Nombre y apellido</label>
          <input id="nombre" type="text" autoComplete="name" value={form.nombre} onChange={cambiar("nombre")} required />

          <label htmlFor="telefono">Teléfono</label>
          <input id="telefono" type="tel" autoComplete="tel" placeholder="+5492611234567" value={form.telefono} onChange={cambiar("telefono")} required />
          <p className="ayuda">Te vamos a avisar por acá y por WhatsApp. Escribilo con código de país, por ejemplo +5492611234567.</p>

          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={form.email} onChange={cambiar("email")} required />

          <label htmlFor="identificador">DNI</label>
          <input id="identificador" type="text" inputMode="numeric" value={form.identificador} onChange={cambiar("identificador")} required />
          <p className="ayuda">Solo números, sin puntos (7 u 8 dígitos).</p>

          <label htmlFor="password">Contraseña</label>
          <div className="campo-clave">
            <input id="password" type={verClave ? "text" : "password"} autoComplete="new-password" value={form.password}
              onChange={cambiar("password")} required />
            <button type="button" className="ver-clave" aria-pressed={verClave} onClick={() => setVerClave(!verClave)}>
              {verClave ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <p className="ayuda">Al menos 8 caracteres.</p>

          <button type="submit" className="btn" disabled={enviando}>{enviando ? "Creando…" : "Crear cuenta"}</button>
          {mensaje && <p role="alert" className={mensaje.ok ? "msg-ok" : "msg-error"}>{mensaje.texto}</p>}
        </form>

        <div className="auth-pie">
          <p className="ayuda">¿Ya tenés cuenta?</p>
          <button type="button" className="btn btn-secundario" onClick={irALogin}>Iniciar sesión</button>
        </div>
      </main>
    </>
  );
}
