import "./Bienvenida.css";

export default function Bienvenida({ irALogin, irARegistro }) {
  return (
    <main className="bienvenida">
      <div className="icono" aria-hidden="true">
        <svg viewBox="0 0 200 200" width="140" height="140">
          <defs>
            <linearGradient id="gradCorazon" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#14b8a6" />
              <stop offset="1" stopColor="#0b3fa8" />
            </linearGradient>
          </defs>
          <path
            d="M100 170
               C40 130 10 95 10 65
               C10 35 35 15 60 15
               C78 15 92 25 100 40
               C108 25 122 15 140 15
               C165 15 190 35 190 65
               C190 95 160 130 100 170 Z"
            fill="url(#gradCorazon)"
          />
          <rect x="88" y="55" width="24" height="70" rx="8" fill="#fff" />
          <rect x="65" y="78" width="70" height="24" rx="8" fill="#fff" />
        </svg>
      </div>

      <h1>
        <span className="titulo-verde">Mi Turno</span>
        <br />
        <span className="titulo-azul">a Mano</span>
      </h1>

      <p className="subtitulo">
        Tu salud, más cerca.
        <br />
        Más simple. Más fácil.
      </p>

      <button type="button" className="btn" onClick={irALogin}>
        Iniciar sesión
      </button>

      <button type="button" className="btn btn-secundario" onClick={irARegistro}>
        Crear cuenta
      </button>

      <p className="entrar">
        ¿Ya tenés una cuenta?{" "}
        <button type="button" className="link" onClick={irALogin}>
          Entrar
        </button>
      </p>
    </main>
  );
}