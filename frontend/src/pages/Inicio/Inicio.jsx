import Logo from "../../components/Logo";
import "./Inicio.css";

// Pantalla principal del paciente: saludo y accesos grandes a lo que más usa.
export default function Inicio({ nombre, irA, onSalir }) {
  return (
    <main className="inicio">
      <header className="inicio-marca">
        <Logo tamano={52} />
        <p className="inicio-nombre-app"><span>Mi Turno</span> a Mano</p>
      </header>

      <section className="saludo-tarjeta" aria-label="Saludo">
        <p className="saludo-hola">¡Hola, {nombre}!</p>
        <p className="saludo-pregunta">¿Qué querés hacer hoy?</p>
      </section>

      <div className="inicio-botones">
        <button type="button" className="gran gran-azul" onClick={() => irA("pedir")}>
          <span className="gran-icono" aria-hidden="true">📅</span>
          <span className="gran-titulo">Pedir turno</span>
          <span className="gran-texto">Solicitá un turno médico fácilmente</span>
        </button>
        <button type="button" className="gran gran-violeta" onClick={() => irA("mios")}>
          <span className="gran-icono" aria-hidden="true">📋</span>
          <span className="gran-titulo">Mis turnos</span>
          <span className="gran-texto">Consultá tus turnos programados</span>
        </button>
      </div>

      <button type="button" className="banda banda-verde" onClick={() => irA("pedir")}>
        <span className="banda-icono" aria-hidden="true">🎤</span>
        <span>También podés pedir tu turno<br />por voz</span>
        <span className="banda-flecha" aria-hidden="true">›</span>
      </button>

      <button type="button" className="btn btn-peligro" onClick={onSalir}>Cerrar sesión</button>
    </main>
  );
}
