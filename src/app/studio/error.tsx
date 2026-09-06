'use client';
export default function StudioError({ reset }: { reset: () => void }) {
  return (
    <div className="sp-studio studio-login">
      <div className="studio-login-card">
        <h1>No hemos podido cargar tu espacio.</h1>
        <p>No se han descartado tus proyectos. Vuelve a intentarlo.</p>
        <button className="studio-button" onClick={reset}>
          Reintentar
        </button>
      </div>
    </div>
  );
}
