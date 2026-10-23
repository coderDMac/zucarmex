import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="error-page">
      <span className="eyebrow">404</span>
      <h1>No encontramos esta página.</h1>
      <p>El pedido o la sección que buscas no está disponible.</p>
      <Link className="button primary" href="/">
        Volver a mi portal
      </Link>
    </div>
  );
}
