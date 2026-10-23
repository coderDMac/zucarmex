'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="error-page">
      <span className="eyebrow">UN MOMENTO</span>
      <h1>No pudimos cargar esta información.</h1>
      <p>
        Revisa tu conexión. Si acabas de configurar Supabase, comprueba que las migraciones y el
        seed estén aplicados.
      </p>
      <button className="button primary" onClick={() => reset()}>
        Intentar de nuevo
      </button>
    </div>
  );
}
