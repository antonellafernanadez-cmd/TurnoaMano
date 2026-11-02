import Logo from "../../components/Logo";
import "./Bienvenida.css";

export default function Bienvenida({
  irALogin,
  irARegistro,
  irALoginCuidador,
}) {
  return (
    <main className="bienvenida">
      <div className="bienvenida-contenido">
        <Logo tamano={150} />

        <h1>
          <span className="titulo-verde">Mi Turno</span>
          <br />
          <span className="titulo-azul">a Mano</span>
        </h1>

        <p className="eslogan">
          Tu salud, más cerca.
          <br />
          Más simple. Más fácil.
        </p>

        <button
          type="button"
          className="btn btn-iniciar"
          onClick={irALogin}
        >
          <span aria-hidden="true">👤</span> Iniciar sesión
        </button>

        <button
          type="button"
          className="btn btn-secundario"
          onClick={irARegistro}
        >
          Crear cuenta
        </button>

        <button
          type="button"
          className="btn btn-secundario"
          onClick={irALoginCuidador}
        >
          <span aria-hidden="true">🤝</span> Soy cuidador
        </button>

        <p className="entrar">
          ¿Ya tenés una cuenta?
          <br />
          <button type="button" className="link" onClick={irALogin}>
            Entrar
          </button>
        </p>
      </div>

      <div className="ola" aria-hidden="true" />
    </main>
  );
}