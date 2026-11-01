// Barra azul de arriba de las pantallas internas: flecha para volver y el título.
export default function Cabecera({ titulo, onVolver, derecha }) {
  return (
    <header className="cabecera">
      {onVolver && (
        <button type="button" className="cabecera-volver" onClick={onVolver} aria-label="Volver">
          <span aria-hidden="true">←</span>
        </button>
      )}
      <h1 className="cabecera-titulo">{titulo}</h1>
      {derecha}
    </header>
  );
}
